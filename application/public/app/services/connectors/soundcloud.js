define(['angular', 'config'], function(angular, config) {
	'use strict';

	var module = angular.module('go4smac.services');
	module.service('soundcloud', ['$rootScope', '$window', '$cookies', '$http', '$q', 'alertSrv',
	function($rootScope, $window, $cookies, $http, $q, alertSrv) {
		var self = this;

		this.getI1TrackById = function(trackId) {
			return $http.get("http://wifioner.com/i1/tracks/" + trackId + "/streams?oauth_token=" + $rootScope.access_token + "&client_id=02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea&app_version=fb374fe&_t=" + (new Date().getTime()));
		};

		this.exploreTracks = function(limit) {
			return $http.get("http://wifioner.com/explore/Popular+Music?tag=out-of-experiment&limit=" + (limit || 100) + "&offset=0&linked_partitioning=1&client_id=02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea");
		};

		this.searchFor = function(keyword, limit) {
			return $http.get("http://wifioner.com/search?q=" + encodeURIComponent(keyword) + "&limit=" + (limit || 100) + "&offset=0&linked_partitioning=1&client_id=02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea");
		};

		this.suggestFor = function(keyword, limit) {
			return $http.get("http://wifioner.com/search/autocomplete?q=" + encodeURIComponent(keyword) + "&limit=" + (limit || 100) + "&offset=0&linked_partitioning=1&client_id=02gUJC0hH2ct1EGOcYXQIzRFU91c72Ea");
		};

		this.getPlaylists = function(userId, limit) {
			return $http.get("https://api.soundcloud.com/playlists?user_id=" + userId + "&linked_partitioning=1&limit=" + (limit || 100) + "&oauth_token=" + $rootScope.access_token + "&format=json&_status_code_map[302]=200&_t=" + (new Date().getTime()));
		};

		this.getStreamById = function(trackId) {
			return $http.get("https://api.soundcloud.com/tracks/" + trackId + "/streams?oauth_token=" + $rootScope.access_token + "&format=json&_status_code_map[302]=200&_t=" + (new Date().getTime()));
		};

		this.getTrackById = function(trackId) {
			return $http.get("https://api.soundcloud.com/tracks/" + trackId + "?oauth_token=" + $rootScope.access_token + "&format=json&_status_code_map[302]=200&_t=" + (new Date().getTime()));
		};

		this.getSpectrumByUrl = function(url) {
			return $http.get(url + "?oauth_token=" + $rootScope.access_token + "&_t=" + (new Date().getTime()));
		};

		this.getFollows = function(userId, limit, mode) {
			return $http.get("https://api.soundcloud.com/users/" + userId + "/" + mode + "?linked_partitioning=1&limit=" + (limit || 100) + "&oauth_token=" + $rootScope.access_token + "&format=json&_status_code_map[302]=200&_t=" + (new Date().getTime()));
		};
		this.getFollowingTracks = function(userId, limit) {
			return $http.get("https://api.soundcloud.com/users/" + userId + "/tracks?linked_partitioning=1&limit=" + (limit || 100) + "&oauth_token=" + $rootScope.access_token + "&format=json&_status_code_map[302]=200&_t=" + (new Date().getTime()));
		};

		this.getPartitioning = function(array, next_href, limit, prop, baseHref, newHref) {
			if (next_href) {
				if (baseHref && newHref) {
					next_href = next_href.replace(baseHref, newHref);
				}
				$http.get(next_href).success(function(data) {
					Array.prototype.push.apply(array, data[prop]);
					if (array.length < limit) {
						self.getPartitioning(array, data.next_href, limit, prop, baseHref, newHref);
					}
				});
			}
		};
	}]);
});
