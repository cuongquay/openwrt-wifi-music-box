local os = require "os"
local handle = nil

local function isEmpty(s)
  return s == nil or s == ''
end

local function isExist(s)
  return not isEmpty(s)
end

local function command(s)
  	local file = io.popen(s)
	local result = file:read("*a")
	file:close()
	return result
end

local function play(url)
	command("/www/api/stop-stream")
	command("/www/api/play-stream " .. url .. " &")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function stop()
	command("/www/api/stop-stream")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function info()
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")
	uhttpd.send("{ \"OpenWRT\": { \"name\": \"" .. string.gsub(command("uci get system.@system[0].hostname"), "\n", "") .. "\", \"volume\": \"" .. string.gsub(command("amixer get PCM  | egrep -o \"[0-9]+%\""), "\n", "") .. "\", \"version\": \"v1\", \"uid\": \"" .. string.gsub(command("cat /sys/class/net/eth0/address"), "\n", "") .. "\", \"service\": \"audio\", \"avatar\": \"images/speaker-double.png\" }}")
end

function handle_request(env)	
	local params = {}
	local args = {}
	local query = env["QUERY_STRING"]
	local basename = string.gsub(env.REQUEST_URI, "(.*/)(.*)", "%1")
	if isExist(query) then
		for name, value in string.gmatch(query .. '&', '(.-)%=(.-)%&') do
			value = string.gsub(value , '%+', ' ')
			value = string.gsub(value , '%%(%x%x)', function(dpc)
				return string.char(tonumber(dpc,16))
			end )
			params[name] = value
			value = string.gsub(value, "%&", "&amp;")
			value = string.gsub(value, "%<", "&lt;")
			value = string.gsub(value, '%"', "&quot;")
			args[name] = value
		end
	end
	if env.PATH_INFO == "/" 
	then
	    info()
	elseif env.PATH_INFO == "/play" 
	then
		play(args["url"])
	elseif env.PATH_INFO == "/stop" 
	then
		stop()
	elseif env.PATH_INFO == "/info"
	then
		info()
	end
end