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

	var module = angular.module('go4smac.panels.follow', []);
	app.useModule(module);

	module.controller('follow', ['$scope', '$rootScope', '$timeout', '$window', 'soundcloud', 'alertSrv',
	function($scope, $rootScope, $timeout, $window, soundcloud, alertSrv) {
		$scope.panelMeta = {
			status : "Stable",
			description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
		};

		// Set and populate defaults
		var _d = {
		};
		_.defaults($scope.panel, _d);		

		$scope.init = function() {
			$scope.onLoadFollows(true);
		};

		$scope.onLoadFollows = function(reload) {						
			$scope.ready = reload ? false : true;
			if (reload || !$scope.ready) {
				$scope.items = [];
				if ($scope.panel.mode && $scope.panel.mode != "all") {
					soundcloud.getFollows($rootScope.userInfo.id, $scope.panel.partition, $scope.panel.mode).success(function(result) {
						Array.prototype.push.apply($scope.items, result.collection);
						if (result.next_href) {
							soundcloud.getPartitioning($scope.items, result.next_href, $scope.panel.limit, "collection");
						}
						$scope.ready = true;
					});	
				} else {
					soundcloud.getFollows($rootScope.userInfo.id, $scope.panel.partition, "followers").success(function(result) {
						Array.prototype.push.apply($scope.items, result.collection);
						if (result.next_href) {
							soundcloud.getPartitioning($scope.items, result.next_href, $scope.panel.limit, "collection");
						}
						$scope.ready = true;
					});
					soundcloud.getFollows($rootScope.userInfo.id, $scope.panel.partition, "followings").success(function(result) {
						Array.prototype.push.apply($scope.items, result.collection);
						if (result.next_href) {
							soundcloud.getPartitioning($scope.items, result.next_href, $scope.panel.limit, "collection");
						}
						$scope.ready = true;
					});
				}
				
			}
		};

		$scope.onFollowItemClick = function(item) {
			if (item.kind === 'user') {
				$rootScope.$broadcast("onLoadPlaylistByUser", item);
				$scope.next();
			}
		};
	}]);
});
