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
define(['angular', 'app', 'lodash', 'jquery', 'require', 'd3', 'classie'], function(angular, app, _, $, require, d3, classie) {
	'use strict';

	var module = angular.module('go4smac.panels.running', []);
	app.useModule(module);

	module.controller('running', ['$scope', '$rootScope', '$timeout', '$window', 'wifioner', 'soundcloud',
	function($scope, $rootScope, $timeout, $window, wifioner, soundcloud) {
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
			$scope.isVolumeControl = false;
			$scope.initButtonEffect();
		};

		$scope.onBackGroundClick = function() {
			$scope.isVolumeControl = !$scope.isVolumeControl;
		};

		$scope.onVolumeSet = function(value) {
			wifioner.volume(value).then(function(data) {
				$rootScope.device.volume = value;
			});
		};

		$scope.getBackgroundStyle = function() {
			return {
				'background-image' : 'url(' + $scope.backgroundImage + ')',
				'background-repeat' : 'no-repeat',
				'background-size' : '100%'
			};
		};

		$scope.$on("onStartRunningPlayer", function(event, item, tracks) {
			if (!$rootScope.playingItem || ($rootScope.playingItem && $rootScope.playingItem.id != item.id)) {
				$scope.isPlaying = false;
				$scope.ready = true;
			} else {				
				$scope.isPlaying = true;
			}
			$scope.selectedItem = item;
			$scope.tracks = _.sortBy(tracks, "playback_count").reverse();
			var coverUrl = item.artwork_url || item.user.avatar_url;
			$scope.backgroundImage = coverUrl.replace("large", "t500x500");
		});

		$scope.onStartClick = function(event, item) {
			if (!$scope.isPlaying) {
				wifioner.play(item.id).then(function(data) {
					$rootScope.playingItem = item;
					$scope.isPlaying = true;
				});
			} else {
				wifioner.stop().then(function(data) {
					$scope.isPlaying = false;
				});
			}
		};
		$scope.onNextClick = function(event, item) {
			if ( typeof (item) !== "undefined" && item) {
				var idx = _.chain($scope.tracks).pluck("id").indexOf(item.id).value();
				if (idx < $scope.tracks.length - 1) {
					$rootScope.playingItem = $scope.tracks[idx + 1];
				} else {
					$rootScope.playingItem = $scope.tracks[0];
				}
			} else {
				$rootScope.playingItem = $scope.tracks[0];
			}
			var coverUrl = $rootScope.playingItem.artwork_url || $rootScope.playingItem.user.avatar_url;
			$scope.backgroundImage = coverUrl.replace("large", "t500x500");
			wifioner.play($rootScope.playingItem.id).then(function(data) {
				$scope.isPlaying = true;
			});
		};
		$scope.onPrevClick = function(event, item) {
			if ( typeof (item) !== "undefined" && item) {
				var idx = _.chain($scope.tracks).pluck("id").indexOf(item.id).value();
				if (idx > 0) {
					$rootScope.playingItem = $scope.tracks[idx - 1];
				} else {
					$rootScope.playingItem = $scope.tracks[$scope.tracks.length - 1];
				}
			} else {
				$rootScope.playingItem = $scope.tracks[0];
			}
			var coverUrl = $rootScope.playingItem.artwork_url || $rootScope.playingItem.user.avatar_url;
			$scope.backgroundImage = coverUrl.replace("large", "t500x500");
			wifioner.play($rootScope.playingItem.id).then(function(data) {
				$scope.isPlaying = true;
			});
		};
		$scope.onMinusClick = function(event, item) {
			wifioner.down().then(function(data) {
				$scope.isPlaying = false;
			});
		};
		$scope.onPlusClick = function(event, item) {
			wifioner.up().then(function(data) {
				$scope.isPlaying = false;
			});
		};
	}]);

	module.directive('progressIndicator', ['wifioner',
	function(wifioner) {
		return {
			restrict : 'AE',
			link : function(scope, element) {
				function refresh() {
				}

				refresh();
			}
		};
	}]);
});
