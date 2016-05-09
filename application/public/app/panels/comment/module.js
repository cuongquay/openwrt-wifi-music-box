define(['angular', 'app', 'config', 'jquery'], function(angular, app, config, jQuery) {
	var module = angular.module('go4smac.panels.comment', []);
	app.useModule(module);

	module.controller('comment', ['$http', '$scope', "$window", "$rootScope",
	function($http, $scope, $window, $rootScope) {
		// Set and populate defaults
		$scope.init = function() {
			$scope.options = [{
				type: "issue",
				name: "I have got an issue"	
			}, {
				type: "suggestion",
				name: "I want to suggest"	
			}];
			$scope.subject = "issue";
			$scope.content = "";			
		};
		$scope.onSubmit = function() {			
			$window.owa_cmds.push(['trackAction', $scope.subject, $rootScope.userInfo.id, $rootScope.userInfo.username, $scope.content]);
			$window.location.href = "#/v1/audio/home";			
		};
	}]);
});
