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

local function play(id)
	local file, error = io.open ("/www/data/".. id, "rb")
	if error then
        io.close()
        uhttpd.send("Status: 404 Not Found\r\n")
		uhttpd.send("Access-Control-Allow-Origin: *\r\n")
		uhttpd.send("Content-Type: application/json\r\n\r\n")			
		uhttpd.send("{ \"Result\": \"NOK\", \"Message\": \"" ..error.. "\" }")
    else
		local oauth_token = file:read()
		file:close()
		command("/www/api/stop-stream")
		command("/www/api/play-stream " .. id .. " " .. oauth_token .. " &")
		uhttpd.send("Status: 200 OK\r\n")
		uhttpd.send("Access-Control-Allow-Origin: *\r\n")
		uhttpd.send("Content-Type: application/json\r\n\r\n")			
		uhttpd.send("{ \"Result\": \"OK\" }")
	end
end

local function stop()
	command("/www/api/stop-stream")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function pause()
	command("/www/api/stop-stream")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function add(id, token)
	local file, error = io.open ("/www/data/".. id, "w+")
	if error then
        io.close()
        uhttpd.send("Status: 404 Not Found\r\n")
		uhttpd.send("Access-Control-Allow-Origin: *\r\n")
		uhttpd.send("Content-Type: application/json\r\n\r\n")
		uhttpd.send("{ \"Result\": \"NOK\", \"Message\": \"" ..error.. "\" }")
    else
        file:write(token)
		file:close()
        uhttpd.send("Status: 200 OK\r\n")
		uhttpd.send("Access-Control-Allow-Origin: *\r\n")
		uhttpd.send("Content-Type: application/json\r\n\r\n")			
		uhttpd.send("{ \"Result\": \"OK\" }")
    end
end

local function remove(id)
	command("rm -f /www/data/".. id)
    uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Content-Type: text/plain\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

-- Lua implementation of PHP scandir function
function scandir(directory)
    local i, t, popen = 0, {}, io.popen
    for filename in popen('ls "'..directory..'"'):lines() do
    	i = i + 1
        t[i] = filename
    end
    return t
end

local function list()
	local data = scandir("/www/data/")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")
	uhttpd.send("{ \"Result\": \"OK\", \"Items\":[" .. table.concat(data, ",") .. "] }")
end

local function volumeLR(left, right)
	command("/usr/bin/amixer -c 0 cset numid=3 " .. left .. "," .. right)
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function volume(value)
	command("/usr/bin/amixer -q set PCM " .. value .. "%")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function volumeup()
	command("/usr/bin/amixer -q set PCM 10%+")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function volumedown()
	command("/usr/bin/amixer -q set PCM 10%-")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")			
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function mode(type)
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")	
	uhttpd.send("{ \"Result\": \"OK\" }")
end

local function status()
	local status = io.open("/tmp/status", "rb")
	local result = status:read("*a")
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")
	uhttpd.send("{ \"Result\": \"OK\", \"Message\": \"" .. result .. "\" }")
	status:close()
end

local function info()
	uhttpd.send("Status: 200 OK\r\n")
	uhttpd.send("Access-Control-Allow-Origin: *\r\n")
	uhttpd.send("Content-Type: application/json\r\n\r\n")
	uhttpd.send("{ \"WiFiOneR\": { \"name\": \"" .. string.gsub(command("uci get system.@system[0].hostname"), "\n", "") .. "\", \"volume\": \"" .. string.gsub(command("amixer get PCM  | egrep -o \"[0-9]+%\""), "\n", "") .. "\", \"version\": \"v1\", \"uid\": \"" .. string.gsub(command("cat /sys/class/net/eth0/address"), "\n", "") .. "\", \"service\": \"audio\", \"avatar\": \"images/speaker-double.png\" }}")
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
		play(string.gsub(args["id"], "(.*/)(.*)", "%1"))
	elseif env.PATH_INFO == "/stop" 
	then
		stop()
	elseif env.PATH_INFO == "/pause" 
	then
		pause()
	elseif env.PATH_INFO == "/add" 
	then
		add(string.gsub(args["id"], "(.*/)(.*)", "%1"), args["token"])
	elseif env.PATH_INFO == "/remove" 
	then
		remove(string.gsub(args["id"], "(.*/)(.*)", "%1"))
	elseif env.PATH_INFO == "/list" 
	then
		list()
	elseif env.PATH_INFO == "/up"
	then	
		volumeup()
	elseif env.PATH_INFO == "/down" 
	then
		volumedown()
	elseif env.PATH_INFO == "/volume" 
	then
		volume(string.gsub(args["value"], "(.*/)(.*)", "%1"))
	elseif env.PATH_INFO == "/mode"
	then
		mode(args["type"])
	elseif env.PATH_INFO == "/status"
	then
		status()
	end
end