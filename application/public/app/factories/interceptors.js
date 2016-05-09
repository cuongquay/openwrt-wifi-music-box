define(['angular', 'lodash'], function(angular, _) {
	'use strict';
	var module = angular.module('go4smac.factories');
	module.factory('sessionInjector', ['$rootScope',
	function($rootScope) {
		var sessionInjector = {
			request : function(config) {
				if ($rootScope.access_token) {
					console.log(config);
				}
				return config;
			}
		};
		return sessionInjector;
	}]);

	module.factory('errorHandleInterceptor', ['$q',
	function($q) {
		var requestRecoverer = {
			requestError : function(rejectReason) {				
				return $q.reject(rejectReason);
			},
			responseError : function(rejectReason) {
				if (rejectReason.status == 0) {					
				}
				return $q.reject(rejectReason);
			}
		};
		return requestRecoverer;
	}]);
	module.config(['$httpProvider',
	function($httpProvider) {
		//$httpProvider.interceptors.push('errorHandleInterceptor');		
	}]);
});
