define(['angular', 'jquery', 'kbn', 'lodash', 'config', 'moment', 'modernizr'], function(angular, $, kbn, _, config, moment, Modernizr) {
	'use strict';

	var module = angular.module('go4smac.services');

	module.service('dashboard', function($routeParams, $http, $rootScope, $injector, $location, $timeout, ejsResource, timer, kbnIndex, alertSrv, esVersion, esMinVersion) {
		// A hash of defaults to use when loading a dashboard

		var _dash = {
			services : {
				"query" : {
					"list" : {
						"0" : {
							"query" : "*",
							"alias" : "",
							"color" : "#7EB26D",
							"id" : 0,
							"pin" : false,
							"type" : "lucene"
						}
					},
					"ids" : [0]
				},
				"filter" : {
					"list" : {},
					"ids" : []
				}
			},
			index : {
				interval : 'none',
				pattern : '_all',
				default : '_all',
				warm_fields : true
			},
			refresh : false
		};

		// An elasticJS client to use
		var ejs = ejsResource(config.elasticsearch);

		// Store a reference to this
		var self = this;
		var filterSrv, querySrv;

		this.current = _.clone(_dash);
		this.last = {};

		this.init = function(dashboard) {
			self.indices = [];
			if (!_.isUndefined(dashboard) && dashboard) {
				self.current = dashboard;	
			}
			// Delay this until we're sure that querySrv and filterSrv are ready
			$timeout(function() {				
				// Ok, now that we've setup the current dashboard, we can inject our services
				if (!_.isUndefined(self.current.services.query)) {					
					querySrv = $injector.get('querySrv');
					querySrv.init();					
				}
				if (!_.isUndefined(self.current.services.filter)) {
					filterSrv = $injector.get('filterSrv');
					filterSrv.init();
				}
			}, 0).then(function() {
				if (!_.isUndefined(self.current.services.query)) {
					// Call refresh to calculate the indices and notify the panels that we're ready to roll
					self.refresh();
				}
			});
		};
		// Since the dashboard is responsible for index computation, we can compute and assign the indices
		// here before telling the panels to refresh
		this.refresh = function(object) {			
			if (self.current.index.interval !== 'none') {
				if (_.isUndefined(filterSrv)) {
					return;
				}
				if (filterSrv.idsByType('time').length > 0) {
					var _range = filterSrv.timeRange('last');
					kbnIndex.indices(_range.from, _range.to, self.current.index.pattern, self.current.index.interval).then(function(p) {
						if (p.length > 0) {
							self.indices = p;
						} else {
							// Option to not failover
							if (self.current.failover) {								
								self.indices = [self.current.index.default];
							} else {
								// Do not issue refresh if no indices match. This should be removed when panels
								// properly understand when no indices are present
								alertSrv.set('No results', 'There were no results because no indices were found that match your' + ' selected time span', 'info', 5000);
								return false;
							}
						}
						// Don't resolve queries until indices are updated
						querySrv.resolve().then(function() {
							$rootScope.$broadcast('refresh', object);
						});
					});
				} else {
					if (self.current.failover) {						
						self.indices = [self.current.index.default];
						querySrv.resolve().then(function() {
							$rootScope.$broadcast('refresh', object);
						});
					} else {
						alertSrv.set("No time filter", 'Timestamped indices are configured without a failover. Waiting for time filter.', 'info', 5000);
					}
				}
			} else {				
				self.indices = [self.current.index.default];
				querySrv.resolve().then(function() {
					$rootScope.$broadcast('refresh', object);
				});
			}
		};
	});
});
