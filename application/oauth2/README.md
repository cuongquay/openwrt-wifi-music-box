Origin From: https://github.com/bitly/google_auth_proxy

Neopostlabs OAuth2 Proxy
=================


A reverse proxy that provides authentication using Neopostlabs OAuth2 to validate individual accounts, or a whole google apps domain.

[![Build Status](https://secure.travis-ci.org/bitly/google_auth_proxy.png?branch=master)](http://travis-ci.org/bitly/google_auth_proxy)


## Architecture

```
    _______       ___________________       __________
    |Nginx| ----> |   oauth2_proxy  | ----> |upstream| 
    -------       -------------------       ----------
                          ||
                          \/
            [neopostlabs oauth2 api]
```


## Installation

1. [Install Go](http://golang.org/doc/install)
2. `$ go get github.com/bitly/google_auth_proxy`. This should put the binary in `$GOROOT/bin`
3. sudo GOPATH=/var/www/go go build -a

## OAuth Configuration

You will need to register an OAuth2 application with sso.neopostlabs.com, and configure it with Redirect URI(s) for the domain you
intend to run `oauth2_proxy` on.

1. Create a new clients: http://sso.neopostlabs.com/?q=admin/structure/oauth2-servers/manage/neopostlabs_sso/clients/add
   * The Application Type should be **Web application**
   * Enter your domain in the Authorized Javascript Origins `https://internal.yourcompany.com`
   * Enter the correct Authorized Redirect URL `https://internal.yourcompany.com/oauth2/callback`
     * NOTE: `oauth2_proxy` will _only_ callback on the path `/oauth2/callback`
   * Fill in the necessary fields and Save (this is _required_)
2. Take note of the **Client ID** and **Client Secret**


## Command Line Options

```
Usage of ./oauth2_proxy:
  -authenticated-emails-file="": authenticate against emails via file (one per line)
  -client-id="": the Neopostlabs OAuth2 Client ID: ie: "123456.apps.neopostlabs.com"
  -client-secret="": the OAuth Client Secret
  -cookie-domain="": an optional cookie domain to force cookies to
  -cookie-secret="": the seed string for secure cookies
  -oauth2-apps-domain="": authenticate against the given google apps domain
  -htpasswd-file="": additionally authenticate against a htpasswd file. Entries must be created with "htpasswd -s" for SHA encryption
  -http-address="127.0.0.1:4180": <addr>:<port> to listen on for HTTP clients
  -pass-basic-auth=true: pass HTTP Basic Auth information to upstream
  -redirect-url="": the OAuth Redirect URL. ie: "https://internalapp.yourcompany.com/oauth2/callback"
  -upstream=[]: the http url(s) of the upstream endpoint. If multiple, routing is based on path
  -version=false: print version string
```


## Example Configuration

This example has a [Nginx](http://nginx.org/) SSL endpoint proxying to `oauth2_proxy` on port `4180`. 
`oauth2_proxy` then authenticates requests for an upstream application running on port `8080`. The external 
endpoint for this example would be `https://internal.yourcompany.com/`.

An example Nginx config follows. Note the use of `Strict-Transport-Security` header to pin requests to SSL 
via [HSTS](http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security):

```
server {
    listen 443 default ssl;
    server_name internal.yourcompany.com;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/cert.key;
    add_header Strict-Transport-Security max-age=1209600;

    location / {
        proxy_pass http://127.0.0.1:4180;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Scheme $scheme;
        proxy_connect_timeout 1;
        proxy_send_timeout 30;
        proxy_read_timeout 30;
    }
}
```

The command line to run `oauth2_proxy` would look like this:

```bash
./oauth2_proxy \
   --redirect-url="https://internal.yourcompany.com/oauth2/callback"  \
   --oauth2-apps-domain="yourcompany.com"  \
   --upstream=http://127.0.0.1:8080/ \
   --cookie-secret=... \
   --client-id=... \
   --client-secret=...
```

## Environment variables

The environment variables `oauth2_client_id`, `oauth2_secret` and `oauth2_cookie_secret` can be used in place of the corresponding command-line arguments.

## Endpoint Documentation

Oauth2 proxy responds directly to the following endpoints. All other endpoints will be authenticated.

* /oauth2/sign_in - the login page, which also doubles as a sign out page (it clears cookies)
* /oauth2/start - a URL that will redirect to start the oauth cycle
* /oauth2/callback - the URL used at the end of the oauth cycle
