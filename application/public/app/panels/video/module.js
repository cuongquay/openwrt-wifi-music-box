define(['angular', 'app', 'config', 'jquery'], function(angular, app, config, jQuery) {
	var module = angular.module('go4smac.panels.video', []);
	app.useModule(module);

	module.controller('video', ['$window', '$scope',
	function($window, $scope) {
		// Set and populate defaults
		$scope.init = function() {			
			
		};
	}]);
});
