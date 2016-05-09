define(['angular', 'jquery', 'lodash', 'config', 'modernizr', 'moment'], function(angular, $, _, config, Modernizr, moment) {
	'use strict';

	var module = angular.module('go4smac.services');

	module.service('contentSrv', ['$routeParams', '$http', '$rootScope', '$injector', '$location', '$timeout', 'alertSrv', 'dashboard', '$q', '$cookies',
	function($routeParams, $http, $rootScope, $injector, $location, $timeout, alertSrv, dashboard, $q, $cookies) {
		var _dash = {
			title : "",
			style : "light",
			editable : true,
			failover : false,
			panel_hints : true,
			rows : [],
			services : {},
			refresh : false
		};

		var gist_pattern = /(^\d{5,}$)|(^[a-z0-9]{10,}$)|(gist.github.com(\/*.*)\/[a-z0-9]{5,}\/*$)/;

		// Store a reference to this
		var self = this;
		var filterSrv,
		    querySrv;

		this.current = _.clone(_dash);
		this.last = {};
		this.availablePanels = [];
		this.application = {};
		this.selectedContent = {};

		$rootScope.$on('$routeChangeSuccess', function() {
			// Clear the current router to prevent reloading
			self.current = {};
			route();
		});

		this.getUserInfo = function(oauth2_token) {
			var defered = $q.defer();
			var access_token_encode = oauth2_token.split('|')[0];
			$rootScope.access_token = atob(access_token_encode);
			$http.get('https://api.soundcloud.com/me?oauth_token=' + $rootScope.access_token + "&_t=" + (new Date().getTime()), {
				headers : {
					'Content-Type' : 'application/json'
				}
			}).success(function(data) {
				defered.resolve(data);
			}).error(function(data) {
				defered.resolve({
					name : "anonymous",
					picture : {
						url : "images/anonymous.jpg"
					}
				});
			});
			return defered.promise;
		};

		var route = function() {
			var oauth2_token = $cookies._soundcloud_tk;
			if (_.isUndefined(oauth2_token) || oauth2_token.length == 0) {
				window.location = "http://wifioner.com/oauth2/start";
			} else {
				self.getUserInfo(oauth2_token).then(function(userInfo) {
					function setSelectedDevice(devices, param) {
						var idx = _.chain(devices).pluck("uid").indexOf(param).value();
						if (devices.length && (idx >= 0)) {
							localStorage.setItem('selected-uid', param);
							return true;
						}
						return false;
					}
					$rootScope.userInfo = userInfo;
					var devices = angular.fromJson(localStorage.getItem('device-list') || "[]");
					window.owa_cmds.push(['trackAction', 'user.info', userInfo.id, userInfo.username, {
						permalink_url: userInfo.permalink_url,
						avatar: userInfo.avatar_url,
						uri: userInfo.uri
					}]);
					// Is there a route type and id in the URL?
					if (!(_.isUndefined($routeParams.routeType)) && !(_.isUndefined($routeParams.routeName))) {
						var _type = $routeParams.routeType;
						var _name = $routeParams.routeName;
						var _page = $routeParams.routePage;
						var _param = $routeParams.params;
						if (_page === "home" && !_.isUndefined(_param) && _param != "") {
							if (!setSelectedDevice(devices, _param)) {
								_page = "scanner";
							}
						} if (_page === "search" && !_.isUndefined(_param) && _param != "") {
							localStorage.setItem('search-key', _param);
						} else {							
							if (!setSelectedDevice(devices, localStorage.getItem('selected-uid'))) {
								_page = "scanner";	
							}
						}
						switch(_type) {
						case ('v1'):
							self.file_load(_name, _page, _param);
							break;
						default:
							self.file_load("audio", "home");
						}
					} else {
						if (!setSelectedDevice(devices, localStorage.getItem('selected-uid'))) {
							self.file_load("audio", "scanner");	
						} else {
							self.file_load("audio", "home");
						}
					}
					$rootScope.$broadcast("onDeviceDiscovered", devices);
				});
			}
		};

		var dash_defaults = function(content) {
			_.defaults(content, _dash);
			return content;
		};

		this.dash_load = function(content) {
			// Make sure the content being loaded has everything required
			content = dash_defaults(content);

			// Set the current pages
			self.current = _.clone(content);

			dashboard.init(self.current);

			// Set the available panels for the "Add Panel" drop down
			self.availablePanels = _.difference(config.panel_names, _.pluck(_.union({}), 'type'));

			// Take out any that we're not allowed to add from the gui.
			self.availablePanels = _.difference(self.availablePanels, config.hidden_panels);

			return true;
		};

		var renderTemplate = function(json, params) {
			var _r;
			_.templateSettings = {
				interpolate : /\{\{(.+?)\}\}/g
			};
			var template = _.template(json);
			var rendered = template({
				ARGS : params
			});
			try {
				_r = angular.fromJson(rendered);
			} catch(e) {
				_r = false;
			}
			return _r;
		};

		this.file_load = function(app, file, param) {
			return $http({
				url : "app/contents/" + app + "/" + (file + ".json").replace(/(?!json)/, "/") + '?' + new Date().getTime(),
				method : "GET",
				transformResponse : function(response) {
					return renderTemplate(response, $routeParams);
				}
			}).then(function(result) {
				if (!result) {
					return false;
				}
				self.dash_load(dash_defaults(result.data));
				return true;
			}, function() {
				alertSrv.set('Error', "Could not load <i>dashboards/" + file + "</i>. Please make sure it exists", 'error');
				return false;
			});
		};

	}]);

});
