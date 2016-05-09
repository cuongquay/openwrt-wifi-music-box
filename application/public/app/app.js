/**
 * main app level module
 */
define(['angular', 'jquery', 'lodash', 'require', 'angular-route', 'angular-loading-bar', 'angular-touch', 'angular-animate', 'angular-sanitize', 'angular-strap', 'angular-cookies', 'extend-jquery', 'bindonce', 'elasticjs'], function(angular, $, _, appLevelRequire) {
	"use strict";

	var app = angular.module('SmartAppController', ["ngRoute", "ngTouch", "ngAnimate", 'ngCookies', 'angular-loading-bar']).config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
	    cfpLoadingBarProvider.includeSpinner = false;
	  }]),
	// we will keep a reference to each module defined before boot, so that we can
	// go back and allow it to define new features later. Once we boot, this will be false
	    pre_boot_modules = [],
	// these are the functions that we need to call to register different
	// features if we define them after boot time
	    register_fns = {};

	// This stores the app revision number, @REV@ is replaced by grunt.
	app.constant('appVersion', "@REV@");

	// The minimum version that must be in the cluster
	app.constant('esMinVersion', '0.90.9');
	// Use this for cache busting partials
	app.constant('cacheBust', "cache-bust=" + Date.now());
	/**
	 * Tells the application to watch the module, once bootstraping has completed
	 * the modules controller, service, etc. functions will be overwritten to register directly
	 * with this application.
	 * @param  {[type]} module [description]
	 * @return {[type]}        [description]
	 */
	app.useModule = function(module) {
		if (pre_boot_modules) {
			pre_boot_modules.push(module);
		} else {
			_.extend(module, register_fns);
		}
		return module;
	};

	app.safeApply = function($scope, fn) {
		switch($scope.$$phase) {
		case '$apply':
			// $digest hasn't started, we should be good
			$scope.$eval(fn);
			break;
		case '$digest':
			// waiting to $apply the changes
			setTimeout(function() {
				app.safeApply($scope, fn);
			}, 10);
			break;
		default:
			// clear to begin an $apply $$phase
			$scope.$apply(fn);
			break;
		}
	};
	app.config(['$routeProvider', '$httpProvider', '$controllerProvider', '$compileProvider', '$filterProvider', '$provide',
	function($routeProvider, $httpProvider, $controllerProvider, $compileProvider, $filterProvider, $provide) {

		$routeProvider.when('/', {
			templateUrl : 'app/partials/content.html'
		}).when('/:routeType/:routeName', {
			templateUrl : 'app/partials/content.html'
		}).when('/:routeType/:routeName/:routePage', {
			templateUrl : 'app/partials/content.html'
		}).when('/:routeType/:routeName/:routePage/:params*', {
			templateUrl : 'app/partials/content.html'
		}).otherwise({
			redirectTo : ''
		});

		$httpProvider.defaults.withCredentials = false;
		$httpProvider.defaults.useXDomain = false;

		// this is how the internet told me to dynamically add modules :/
		register_fns.controller = $controllerProvider.register;
		register_fns.directive = $compileProvider.directive;
		register_fns.factory = $provide.factory;
		register_fns.service = $provide.service;
		register_fns.filter = $filterProvider.register;
	}]);

	var apps_deps = ['elasticjs.service', '$strap.directives', 'ngSanitize', 'ngCookies', 'pasvaz.bindonce', 'SmartAppController'];

	_.each('controllers directives factories services filters'.split(' '), function(type) {
		var module_name = 'go4smac.' + type;
		// create the module
		app.useModule(angular.module(module_name, []));
		// push it into the apps dependencies
		apps_deps.push(module_name);
	});

	app.panel_helpers = {
		partial : function(name) {
			return 'app/partials/' + name + '.html';
		}
	};

	// load the core components
	require(['services/all', 'controllers/all', 'directives/all', 'factories/all', 'filters/all'], function() {
		// bootstrap the app
		angular.element(document).ready(function() {
			$('html').attr('ng-controller', 'DashCtrl');
			angular.bootstrap(document, apps_deps).invoke(['$rootScope', '$q',
			function($rootScope, $q) {
				_.each(pre_boot_modules, function(module) {
					_.extend(module, register_fns);
				});
				pre_boot_modules = false;
				$rootScope.lockCount = 0;
				$rootScope.lockPercent = 0;
				$rootScope.background = null;
				$rootScope.requireContext = appLevelRequire;
				$rootScope.context = function(context, name) {
					$rootScope.lockContext = context || $rootScope.lockContext;
					$rootScope.lockName = name || $rootScope.lockName;
				};				
				$rootScope.lock = function(context, name) {
					var defer = $q.defer();
					$rootScope.lockContext = context || $rootScope.lockContext;
					$rootScope.lockName = name || $rootScope.lockName;					
					if ($rootScope.lockCount <= 0) {
						var appLoadingElement = $(".app-content-loading");
						if (appLoadingElement.hasClass('ng-hide')) {
							appLoadingElement.removeClass('ng-hide');
							setTimeout(function() {
								appLoadingElement.removeClass('app-content-loading-hide');
								defer.resolve();
							}, 20);
						} else {
							defer.resolve();
						}
					} else {
						defer.resolve();
					}
					$rootScope.lockCount++;
					return defer.promise;
				};
				$rootScope.progress = function(val, text) {
					$rootScope.lockPercent = val;
					$rootScope.lockName = text || $rootScope.lockName;
				};
				$rootScope.unlock = function() {
					var defer = $q.defer();
					$rootScope.lockCount--;
					if ($rootScope.lockCount <= 0) {
						$rootScope.lockCount = 0;
						var appLoadingElement = $(".app-content-loading");
						appLoadingElement.addClass('app-content-loading-hide');
						appLoadingElement.one('transitionend', function(e) {
							appLoadingElement.removeClass('app-content-loading-hide');
							appLoadingElement.addClass('ng-hide');
							defer.resolve();
						});
					} else {
						defer.resolve();
					}
					return defer.promise;
				};
				$rootScope.require = function(deps, fn) {
					var $scope = this;
					$scope.requireContext(deps, function() {
						var deps = _.toArray(arguments);
						// Check that this is a valid scope.
						if ($scope.$id) {
							$scope.$apply(function() {
								fn.apply($scope, deps);
							});
						}
					});
				};
			}]);
		});
	});

	return app;
});
