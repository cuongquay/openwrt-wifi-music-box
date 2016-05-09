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

	var module = angular.module('go4smac.panels.stream', []);
	app.useModule(module);

	module.controller('stream', ['$scope', '$rootScope', '$timeout', '$window', 'wifioner', 'soundcloud',
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
			$scope.error = false;
			$scope.ready = false;
			$scope.tracks = [];
			$scope.title = $scope.panel.title.replace("{@USER}", $rootScope.userInfo.username);
			$scope.onReload();			
		};
		$scope.onReload = function() {			
			wifioner.list().success(function(data) {
				var devices = angular.fromJson(localStorage.getItem('device-list') || "[]");
				$rootScope.$broadcast("onDeviceDiscovered", devices);
				if (data.Items && data.Items.length) {
					var count = 0;
					angular.forEach(data.Items, function(id) {
						var idx = _.chain($scope.tracks).pluck("id").indexOf(id).value();
						if ($scope.tracks && idx < 0) {							
							soundcloud.getTrackById(id).success(function(item) {
								item.spectrum_url = "https://wis.sndcdn.com" + (/.+?\:\/\/.+?(\/.+?)(?:#|\?|$)/.exec( item.waveform_url )[1]).replace(".png",".json");
								$scope.tracks.push(item);
								if (++count >= data.Items.length) {									
									$scope.ready = true;
									$scope.error = false;
								}
							}).error(function(data, status) {
								if (++count >= data.Items.length) {									
									$scope.ready = true;
									$scope.error = false;			
								}
							});
						} else {
							if (++count >= data.Items.length) {								
								$scope.ready = true;
								$scope.error = false;					
							}
						}
					});
				} else {
					$scope.ready = true;
					$scope.error = false;
				}
			}).error(function(data, status) {
				$scope.ready = true;
				$scope.error = true;
			});
		};

		$scope.$on("onAddTrackToList", function(event, item) {
			var idx = _.chain($scope.tracks).pluck("id").indexOf(item.id).value();
			if ($scope.tracks && idx < 0) {
				wifioner.add(item.id, item.http_mp3_128_url.replace("https","http")).success(function(data) {
					$scope.tracks.push(item);
				});
			}
		});		

		$scope.onTrackClick = function(event, item) {			
			$rootScope.$broadcast("onStartRunningPlayer", item, $scope.tracks);
			$scope.next();
		};
	}]);

	module.directive('wisSpectrumPanel', ['soundcloud',
	function(soundcloud) {
		return {
			restrict : 'AE',
			scope : {
				ngModel : "="
			},
			link : function(scope, element) {				
				function refresh(spectrum_url) {
					soundcloud.getSpectrumByUrl(spectrum_url).success(function(data) {						
						element.empty();
						var margin = {
							top : 0,
							right : 0,
							bottom : 0,
							left : 0
						};
						var width = element.width(),
						    height = element.parent().height();
						var today = new Date();
						/* cleanup the existing svg */
						var aspect = (width + margin.left + margin.right) / (height + margin.top + margin.bottom);
						var xScale = d3.scale.linear().domain([0, data.width]).range([0, 5 * width]);
						var xAxis = d3.svg.axis().scale(xScale).tickSize(100);
						var yScaleUp = d3.scale.linear().domain([0, data.height]).range([0, height * 2 / 3]);
						var yScaleDown = d3.scale.linear().domain([0, data.height]).range([0, height / 3]);
						var svgUp = d3.select(element[0]).append("svg").attr("width", width + margin.left + margin.right).attr("height", height * 2 / 3).attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height * 2 / 3 + margin.top + margin.bottom)).attr("preserveAspectRatio", "xMidYMid").style("margin", margin.left + "px");
						var svgDown = d3.select(element[0]).append("svg").attr("width", width + margin.left + margin.right).attr("height", height / 3).attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height / 3 + margin.top + margin.bottom)).attr("preserveAspectRatio", "xMidYMid").style("margin", margin.left + "px");
						svgUp.selectAll("rect").data(data.samples).enter().append("rect").attr("transform", "translate(" + margin.left + "," + margin.top + ")").attr("x", function(d, i) {
							return xScale(i);
						}).attr("y", function(d) {
							return yScaleUp(d);
						}).attr("width", 3).attr("height", function(d, i) {
							return xScale(i) < width ? height * 2 / 3 - yScaleUp(d) : 0;
						}).style("fill", "whitesmoke");
						svgDown.selectAll("rect").data(data.samples).enter().append("rect").attr("transform", "translate(" + margin.left + "," + margin.top + ")").attr("x", function(d, i) {
							return xScale(i);
						}).attr("y", 0).attr("width", 3).attr("height", function(d, i) {
							return xScale(i) < width ? height / 3 - yScaleDown(d) : 0;
						}).style("fill", "gray");
					});
				}
				refresh(scope.ngModel.spectrum_url);
			}
		};
	}]);
});
