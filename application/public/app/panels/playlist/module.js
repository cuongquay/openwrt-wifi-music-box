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

	var module = angular.module('go4smac.panels.playlist', []);
	app.useModule(module);

	module.controller('playlist', ['$scope', '$rootScope', '$timeout', '$window', 'soundcloud', 'alertSrv',
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
			$scope.ready = false;
			if ($scope.panel.auto) {
				$scope.onLoadPlaylists();
			}
		};

		$scope.$on("onLoadPlaylistByUser", function(event, item) {
			$scope.user = item;
			$scope.title = $scope.panel.title.replace("{@USER}", $scope.user.full_name);
			$scope.onLoadPlaylists(item.id);
		});

		$scope.onLoadPlaylists = function(userId) {
			userId = userId || $rootScope.userInfo.id;
			$scope.items = [];
			soundcloud.getPlaylists(userId, $scope.panel.partition).success(function(result) {
				Array.prototype.push.apply($scope.items, result.collection);
				if (result.next_href) {
					soundcloud.getPartitioning($scope.items, result.next_href, $scope.panel.limit, "collection");
				}
				$scope.ready = true;
			}).error(function(error) {
				alertSrv.set(null, error, null, 0);
			});
		};

		$scope.onPlaylistClick = function(event, item) {
			if ( typeof (item) !== "undefined" && item) {
				$rootScope.$broadcast("onLoadTracksByUser", item);
				$scope.next();
			} else {
				var newItem = {
					tracks: []
				};
				soundcloud.getFollowingTracks($scope.user.id, $scope.panel.partition).success(function(result) {
					Array.prototype.push.apply(newItem.tracks, result.collection);
					if (result.next_href) {
						soundcloud.getPartitioning(newItem.tracks, result.next_href, $scope.panel.limit, "collection");
					}
					console.log(newItem);
				}).error(function(error) {
					alertSrv.set(null, error, null, 0);
				});
			}
		};
	}]);
});
