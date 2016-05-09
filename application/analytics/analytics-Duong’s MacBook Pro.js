var _ = require('lodash'),
    express = require('express'),
    bodyParser = require('body-parser'),
    UAParser = require('ua-parser-js');
var pmx = require('pmx').init();    
var http = require('http');
var app = express();
app.use(bodyParser());
var env = process.env.NODE_ENV || "production";

var geoip = require('geoip'),
    geoCountry = new geoip.Country('./geoip/GeoIP.dat'),
    geoCity = new geoip.City('./geoip/GeoLiteCity.dat'),
    geoOrg = new geoip.Org('./geoip/GeoIPASNum.dat');

var probe = pmx.probe();

/**
 * Probe system #1 - Histograms
 *
 * Measuring the event loop delay
 */

// refresh in one hour
var TIME_INTERVAL = 60*60*1000; 

var oldTime = process.hrtime();

var histogram = probe.histogram({
  name        : 'Loop delay',
  measurement : 'mean',
  unit        : 'ms'
});

setInterval(function() {
  var newTime = process.hrtime();
  var delay = (newTime[0] - oldTime[0]) * 1e3 + (newTime[1] - oldTime[1]) / 1e6 - TIME_INTERVAL;
  oldTime = newTime;
  histogram.update(delay);
}, TIME_INTERVAL);

/**
 * Probe system #3 - Meter
 *
 * Probe things that are measured as events / interval.
 */
var meter = probe.meter({
  name    : 'req/min',
  seconds : 60
});

/**
 * Probe system #4 - Counter
 *
 * Measure things that increment or decrement
 */
var counter = probe.counter({
  name : 'Downloads'
});

var req_counter = 0;
/**
 * Probe system #2 - Metrics
 *
 * Probe values that can be read instantly.
 */
var rt_users = probe.metric({
  name : 'Req count',
  value : function() {
    return req_counter;
  }
});
/**
 * Now let's create some remote action
 * And act on the Counter probe we just created
 */
pmx.action('decrement', {comment : 'Increment downloads'}, function(reply) {
  // Decrement the previous counter
  counter.dec();
  reply({success : true});
});

pmx.action('increment', {comment : 'Decrement downloads'}, function(reply) {
  // Increment the previous counter
  counter.inc();
  reply({success : true});
});

pmx.action('throw error', {comment : 'Throw a random error'}, function(reply) {
  // Increment the previous counter
  throw new Error('This error will be caught!');
});

pmx.action('get env', function(reply) {
  // Increment the previous counter
  reply(process.env);
});

pmx.action('modules version', {comment : 'Get modules version'}, function(reply) {
  // Increment the previous counter
  reply(process.versions);
});

pmx.action('Action with params', {comment: 'Returns sent params'}, function(data, reply) {
  // Replies the received data
  reply("Data received: " + JSON.stringify(data));
});

function parseRealIPAddress(data, header, socket) {
	var ipRegex = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/i;
	var ipaddr = (header && header['x-forwarded-for'].split(',')[0].trim());
	if (ipaddr && ipRegex.test(ipaddr)) {
		data['x-real-ip'] = ipaddr;
	}
	return data;
}

function parseUserAgent(data, header, socket) {
	var source = (header && header['user-agent']);
	if (source) {
		var parser = new UAParser();
		data = _.extend(data, parser.setUA(source).getResult());
		data.device.model = data.device.model || "Desktop";
		data.device.vendor = data.device.vendor || "generic";
		data.device.type = data.device.type || "desktop";
		data.cpu.architecture = data.cpu.architecture || "generic";
		delete data.ua;
	}
	return data;
}

function parseGeolocation(data, header, socket) {
	var ipRegex = /^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/i;
	var ipaddr = (data && data['x-real-ip']) || (socket && socket['remoteAddress']) || '';
	data.location = {};
	if (ipaddr && ipRegex.test(ipaddr) /* server based geolocation */ ) {
		data.location = _.extend(data.location, geoCountry.lookupSync(ipaddr));
		data.location = _.extend(data.location, geoCity.lookupSync(ipaddr));
		data.location.carrier = geoOrg.lookupSync(ipaddr) || '';
	}	
	return data;
}

function parseScreenInfo(data, header, socket) {
	try {
		if (data.window_screen) {
			data.screeninfo = JSON.parse(data.window_screen);
			delete data.window_screen;
		} else if (data.screen) {
			data.screeninfo = JSON.parse(data.screen);
			delete data.screen;
		}			
		if (data.screeninfo && data.screeninfo.width && data.screeninfo.height) {
			data.screeninfo.size = data.screeninfo.width + "x" + data.screeninfo.height;
		}
	} catch(error) {
		console.error('Error: ', error);
	}
	return data;
}

function parseStreamEvents(data, header, socket) {
	try {
		if (data.stream_events) {
			var streamEvents = JSON.parse(data.stream_events);
			data.stream_events = streamEvents;
		}
	} catch(error) {
		console.error('Error: ', error);
	}
	return data;
}

function parseActionValue(data, header, socket) {
	try {
		if (data.action_value) {
			data.action_object = JSON.parse(data.action_value);
			delete data.action_value;			
		}
	} catch(error) {
		console.error('Error: ', error);
	}
	return data;	
}

function insert(data) {	
	var _type = data.owa_event_type || data.event_type;
	delete data.owa_event_type;
	delete data.event_type;
	data["@timestamp"] = new Date().getTime();
	if (data.timestamp) {
		data.localtime = parseInt(data.timestamp, 10);
		delete data.timestamp;
	}
	var options = {
		host : 'localhost',
		port : 8080,
		method : 'POST',
		headers : {
			'Content-Type' : 'application/json',
			'Cache-Control' : 'no-cache'
		},
		path : "/es/analytics-owa/" + _type
	};
	var esPostHttpReq = http.request(options, function(res) {
		res.setEncoding('utf-8');
		res.on('data', function(data) {
		});
		res.on('end', function() {
		});
	});
	esPostHttpReq.on('error', function(error) {
		esPostHttpReq.status(451).send("Unavailable For Legal Reasons");
	});
	esPostHttpReq.write(JSON.stringify(data));
	esPostHttpReq.end();
	return true;
}

function verify(data, header, socket) {
	if (!data) {
		return false;
	}
	data = parseRealIPAddress(data, header, socket);	
	data = parseGeolocation(data, header, socket);
	data = parseScreenInfo(data, header, socket);
	data = parseStreamEvents(data, header, socket);	
	data = parseUserAgent(data, header, socket);	
	data = parseActionValue(data, header, socket);
	return insert(data);	
}

app.get('/ZXZlbnQtbG9nZ2Vy', function(req, res, next) {
	req.accepts('image/webp');
	req.accepts('image/gif');
	req.accepts('gif');
	var data = _.mapValues(_.clone(req.query), function(arg) {
		return decodeURIComponent(arg);
	});
	req_counter++;
	if (verify(data, req.headers, req.socket)) {
		res.status(200).sendFile(__dirname + '/log.gif');
	} else {
		next();
	}
});

/*
 * curl -H "Content-Type: application/json" -X POST -d '{"event_type":"test-app.domain","application_data":{"xyz": "foo"}}' http://owa.neopostlabs.com/events
 */
app.post('/ZXZlbnQtbG9nZ2Vy', function(req, res, next) {
	var data = _.mapValues(_.extend({}, req.query, req.body), function(arg) {
		return decodeURIComponent(arg);
	});
	req_counter++;
	if (verify(data, req.headers, req.socket)) {
		res.status(200);
		res.send();
	}
	next();
});

app.listen(3000, function() {	
	console.log("SERVER STARTED");
	meter.mark();
});