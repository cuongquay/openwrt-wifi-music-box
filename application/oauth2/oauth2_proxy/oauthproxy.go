package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"crypto/tls"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"time"

	"github.com/bitly/go-simplejson"
)

const signInPath = "/oauth2/logout"
const oauthStartPath = "/oauth2/start"
const oauthCallbackPath = "/oauth2/callback"
const oauthUserInfoPath = "/oauth2/UserInfo"

type OauthProxy struct {
	CookieSeed string
	CookieKey  string
	CookieKeyOther  string
	Validator  func(string) bool

	redirectUrl        *url.URL // the url to receive requests at
	oauthRedemptionUrl *url.URL // endpoint to redeem the code
	oauthLoginUrl      *url.URL // to redirect the user to
	oauthScope         string
	clientID           string
	clientSecret       string
	SignInMessage      string
	serveMux           *http.ServeMux
}

func NewOauthProxy(proxyUrls []*url.URL, clientID string, clientSecret string, validator func(string) bool) *OauthProxy {
	login, _ := url.Parse("https://soundcloud.com/connect")
	redeem, _ := url.Parse("https://api.soundcloud.com/oauth2/token")
	serveMux := http.NewServeMux()
	for _, u := range proxyUrls {
		path := u.Path
		u.Path = ""
		log.Printf("mapping %s => %s", path, u)
		serveMux.Handle(path, httputil.NewSingleHostReverseProxy(u))
	}
	return &OauthProxy{
		CookieKey:  "_soundcloud_tk",
		CookieKeyOther: "_soundcloud_obj",
		CookieSeed: *cookieSecret,
		Validator:  validator,

		clientID:           clientID,
		clientSecret:       clientSecret,
		oauthScope:         "non-expiring",
		oauthRedemptionUrl: redeem,
		oauthLoginUrl:      login,
		serveMux:           serveMux,
	}
}

func (p *OauthProxy) SetUrls(redirectUrl *url.URL, oauthLoginUrl *url.URL, oauthRedemptionUrl *url.URL) {
	log.Printf("redirectUrl: %s", redirectUrl.Path)
	log.Printf("oauthLoginUrl: %s", oauthLoginUrl.Path)
	log.Printf("oauthRedemptionUrl: %s", oauthRedemptionUrl.Path)
	
	p.redirectUrl = redirectUrl
	p.oauthLoginUrl = oauthLoginUrl
	p.oauthRedemptionUrl = oauthRedemptionUrl
}

func (p *OauthProxy) GetLoginURL(redirectUrl string) string {
	params := url.Values{}
	params.Add("redirect_uri", p.redirectUrl.String())
	params.Add("approval_prompt", "force")
	params.Add("scope", p.oauthScope)
	params.Add("client_id", p.clientID)
	params.Add("response_type", "code")
	if strings.HasPrefix(redirectUrl, "/") {
		params.Add("state", redirectUrl)
	}
	return fmt.Sprintf("%s?%s", p.oauthLoginUrl, params.Encode())
}

func apiRequest(req *http.Request) (*simplejson.Json, error) {
	tr := &http.Transport{
		TLSClientConfig:    &tls.Config{InsecureSkipVerify: true},
		DisableCompression: true,
	}
	httpclient := &http.Client{Transport: tr}
	resp, err := httpclient.Do(req)
	if err != nil {
		return nil, err
	}
	body, err := ioutil.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != 200 {
		log.Printf("got response code %d - %s", resp.StatusCode, body)
		return nil, errors.New("api request returned non 200 status code")
	}
	data, err := simplejson.NewJson(body)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (p *OauthProxy) redeemCode(code string) (int, string, string, error) {
	if code == "" {
		return 0, "", "", errors.New("missing code")
	}
	params := url.Values{}
	params.Add("redirect_uri", p.redirectUrl.String())
	params.Add("client_id", p.clientID)
	params.Add("client_secret", p.clientSecret)
	params.Add("code", code)
	params.Add("grant_type", "authorization_code")
	log.Printf("redeemCode START: %s %s", p.clientID, code)
	
	req, err := http.NewRequest("POST", p.oauthRedemptionUrl.String(), bytes.NewBufferString(params.Encode()))

	if err != nil {
		log.Printf("failed building request %s", err.Error())
		return 0, "", "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	json, err := apiRequest(req)
	if err != nil {
		log.Printf("failed making request %s", err)
		return 0, "", "", err
	}
	log.Printf("redeemCode RESULT: %s", json)
	access_token, err := json.Get("access_token").String()
	if err != nil {
		return 0, "", "", err
	}
	
	return 1209600, access_token, "{ \"name\": \"WiFiOneR\" }", nil
}

func jwtDecodeSegment(seg string) ([]byte, error) {
	if l := len(seg) % 4; l > 0 {
		seg += strings.Repeat("=", 4-l)
	}

	return base64.URLEncoding.DecodeString(seg)
}

func (p *OauthProxy) ClearCookie(rw http.ResponseWriter, req *http.Request) {
	domain := strings.Split(req.Host, ":")[0]
	if *cookieDomain != "" && strings.HasSuffix(domain, *cookieDomain) {
		domain = *cookieDomain
	}
	cookie := &http.Cookie{
		Name:     p.CookieKey,
		Value:    "",
		Path:     "/",
		Domain:   domain,
		Expires:  time.Now().Add(time.Duration(1) * time.Hour * -1),
		HttpOnly: false,
	}
	http.SetCookie(rw, cookie)
}

func (p *OauthProxy) SetCookie(rw http.ResponseWriter, req *http.Request, val string, other string, expired_hours int) {

	domain := strings.Split(req.Host, ":")[0] // strip the port (if any)
	if *cookieDomain != "" && strings.HasSuffix(domain, *cookieDomain) {
		domain = *cookieDomain
	}
	cookie := &http.Cookie{
		Name:     p.CookieKey,
		Value:    signedCookieValue(p.CookieSeed, p.CookieKey, val),
		Path:     "/",
		Domain:   domain,
		Expires:  time.Now().Add(time.Duration(expired_hours) * time.Second),
		HttpOnly: false,
		// Secure: req. ... ? set if X-Scheme: https ?
	}	
	http.SetCookie(rw, cookie)
	
	other_cookie := &http.Cookie{
		Name:     p.CookieKeyOther,
		Value:    signedCookieValue(p.CookieSeed, p.CookieKeyOther, other),
		Path:     "/",
		Domain:   domain,
		Expires:  time.Now().Add(time.Duration(expired_hours) * time.Second),
		HttpOnly: false,
		// Secure: req. ... ? set if X-Scheme: https ?
	}	
	http.SetCookie(rw, other_cookie)
}

func (p *OauthProxy) ErrorPage(rw http.ResponseWriter, code int, title string, message string) {
	log.Printf("ErrorPage %d %s %s", code, title, message)
	rw.WriteHeader(code)
	templates := getTemplates()
	t := struct {
		Title   string
		Message string
	}{
		Title:   fmt.Sprintf("%d %s", code, title),
		Message: message,
	}
	templates.ExecuteTemplate(rw, "error.html", t)
}

func (p *OauthProxy) GetRedirect(req *http.Request) (string, error) {
	err := req.ParseForm()

	if err != nil {
		return "", err
	}

	redirect := req.FormValue("rd")

	if redirect == "" {
		redirect = "/"
	}

	return redirect, err
}

func (p *OauthProxy) ServeHTTP(rw http.ResponseWriter, req *http.Request) {
	// check if this is a redirect back at the end of oauth
	remoteIP := req.Header.Get("X-Real-IP")
	if remoteIP == "" {
		remoteIP = req.RemoteAddr
	}
	log.Printf("%s %s %s", remoteIP, req.Method, req.URL.Path)

	var ok bool

	if req.URL.Path == oauthStartPath {		
		redirect, err := p.GetRedirect(req)
		if err != nil {
			p.ErrorPage(rw, 303, "Internal Error", err.Error())
			return
		}
		http.Redirect(rw, req, p.GetLoginURL(redirect), 302)
		return
	}
	if req.URL.Path == oauthCallbackPath {
		// finish the oauth cycle
		err := req.ParseForm()
		if err != nil {
			p.ErrorPage(rw, 500, "Internal Error", err.Error())
			return
		}
		errorString := req.Form.Get("error")
		if errorString != "" {
			p.ErrorPage(rw, 401, "Unauthorized", errorString)
			return
		}

		expired_hours, access_token, json, err := p.redeemCode(req.Form.Get("code"))
		if err != nil {
			log.Printf("error while redeeming code %s", err)
			p.ErrorPage(rw, 303, "See Other", err.Error())			
			return
		}

		redirect := req.Form.Get("state")
		if redirect == "" {
			redirect = "/"
		}

		// set cookie, or deny
		if err == nil {
			log.Printf("OK redeeming code. Redirect to %s", redirect)
			p.SetCookie(rw, req, access_token, json, expired_hours)			
			http.Redirect(rw, req, redirect, 302)
			return
		} else {
			p.ErrorPage(rw, 401, "Unauthorized", "Invalid Account")
			return
		}
	}
 	if req.URL.Path == oauthUserInfoPath {
		// finish the oauth cycle
		p.ErrorPage(rw, 500, "Under Construction", "User Information Page!")
		return
	}
	if !ok {
		cookie, err := req.Cookie(p.CookieKey)
		if err == nil {
			_, ok = validateCookie(cookie, p.CookieSeed)
		}
	}	
	if !ok {
		log.Printf("Unauthorized! Session has been expired or not found.")
		p.ErrorPage(rw, 401, "Unauthorized", "Session has been expired or not found")
		return
	}
	p.serveMux.ServeHTTP(rw, req)
}
