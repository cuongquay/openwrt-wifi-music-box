define(['angular', 'config'], function(angular, config) {
	'use strict';	
	
	var module = angular.module('go4smac.services');
	module.service('wifioner', ['$rootScope', '$window', '$cookies', '$http', '$q', 'alertSrv',
	function($rootScope, $window, $cookies, $http, $q, alertSrv) {
		var self = this;
		
		this.logit = function(action, trackId, value) {
			$window.owa_cmds.push(['trackAction', action, $rootScope.userInfo.id, $rootScope.userInfo.username, {
				device_uid: $rootScope.device.uid,
				track_id: trackId,
				value: value
			}]);
		};
		
		this.play = function(trackId) {
			this.logit('play.stream', trackId);
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";			
			return $http.get(location + "play?id=" + trackId + "&_t=" + (new Date().getTime()));
		};
		this.pause = function() {			
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/?";			
			return $http.get(location + "pause?_t=" + (new Date().getTime()));
		};
		this.resume = function() {			
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/?";			
			return $http.get(location + "resume?_t=" + (new Date().getTime()));
		};		
		this.stop = function() {
			this.logit('stop.stream');
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/?";			
			return $http.get(location + "stop?_t=" + (new Date().getTime()));
		};
		this.mode = function(mode) {
			this.logit('mode.stream', null, mode);
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";		
			return $http.get(location + "mode?type=" + mode + "&_t=" + (new Date().getTime()));
		};
		this.up = function() {			
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";			
			return $http.get(location + "up?_t=" + (new Date().getTime()));
		};
		this.down = function() {
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";			
			return $http.get(location + "down?_t=" + (new Date().getTime()));
		};
		this.volume = function(value) {
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";
			return $http.get(location + "volume?value=" +  value + "&_t=" + (new Date().getTime()));
		};
		this.add = function(trackId, streamurl) {
			this.logit('add.stream', trackId, streamurl);
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";			
			return $http.get(location + "add?id=" + trackId + "&token=" + $rootScope.access_token + "&_t=" + (new Date().getTime()));
		};
		this.list = function() {
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";
			return $http.get(location + "list?_t=" + (new Date().getTime()));
		};
		this.status = function() {
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";
			return $http.get(location + "status?_t=" + (new Date().getTime()));
		};
		this.info = function() {
			var location = $rootScope.device ? $rootScope.device.location : "//wifioner.com/api/";
			return $http.get(location + "?_t=" + (new Date().getTime()));
		};
	}]);
});
