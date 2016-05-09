/** @scratch /panels/5
 * include::panels/text.asciidoc[]
 */

/** @scratch /panels/text/0
 * == text
 * Status: *Stable*
 *
 * The text panel is used for displaying static text formated as markdown, sanitized html or as plain
 * text.
 *
 */
define(['angular', 'app', 'lodash', 'jquery', 'require', 'd3'], function(angular, app, _, $, require, d3) {
	'use strict';

	var module = angular.module('go4smac.panels.wifiset', []);
	app.useModule(module);

	module.controller('wifiset', ['$scope', '$rootScope', '$timeout', '$window', '$sce', '$q', '$compile', '$http', 'alertSrv',
	function($scope, $rootScope, $timeout, $window, $sce, $q, $compile, $http, alertSrv) {
		$scope.panelMeta = {
			status : "Stable",
			description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
		};

		// Set and populate defaults
		var _d = {
		};
		_.defaults($scope.panel, _d);

		$scope.init = function() {			
			$scope.wifiSSID = "Your WiFi SSID";
			$scope.wifiPass = "********";		};
		
		$scope.onWiFiSet = function() {
			$scope.back();
		};
	}]);
});
