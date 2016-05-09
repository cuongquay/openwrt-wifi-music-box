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
define(['angular', 'app', 'lodash', 'require', 'd3', 'topojson', 'css!./module.css'], function(angular, app, _, require, d3, topojson) {
	'use strict';

	var module = angular.module('kibana.panels.network', []);
	app.useModule(module);

	module.controller('network', ['$scope',
	function($scope) {
		$scope.showhide = 0;
		$scope.panelMeta = {
			status : "Stable",
			description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
		};
		$scope.range = function(n) {
			return new Array(n);
		};
		
		$scope.hideStatus = function(n) {
			$scope.showhide = n;
		};
		// Set and populate defaults
		var _d = {
			/** @scratch /panels/text/5
			 * === Parameters
			 *
			 * mode:: `html', `markdown' or `text'
			 */
			mode : "markdown", // 'html','markdown','text'
			/** @scratch /panels/text/5
			 * content:: The content of your panel, written in the mark up specified in +mode+
			 */
			content : "",
			style : {}
		};
		_.defaults($scope.panel, _d);

		$scope.init = function() {
			$scope.ready = false;

			var width = 960,
			    height = 500;
			var path = d3.geo.path(),
			    force = d3.layout.force().size([width, height]);
			var svg = d3.select(".network-collection").append("svg").attr("width", width).attr("height", height);
			d3.json("app/panels/network/us.json", function(error, us) {
				var states = topojson.feature(us, us.objects.states),
				    nodes = [],
				    links = [];
				states.features.forEach(function(d, i) {
					if (d.id === 2 || d.id === 15 || d.id === 72)
						return;
					// lower 48
					var centroid = path.centroid(d);
					if (centroid.some(isNaN))
						return;
					centroid.x = centroid[0];
					centroid.y = centroid[1];
					centroid.feature = d;
					nodes.push(centroid);
				});

				d3.geom.voronoi().links(nodes).forEach(function(link) {
					var dx = link.source.x - link.target.x,
					    dy = link.source.y - link.target.y;
					link.distance = Math.sqrt(dx * dx + dy * dy);
					links.push(link);
				});

				force.gravity(0).nodes(nodes).links(links).linkDistance(function(d) {
					return d.distance;
				}).start();

				var link = svg.selectAll("line").data(links).enter().append("line").attr("x1", function(d) {
					return d.source.x;
				}).attr("y1", function(d) {
					return d.source.y;
				}).attr("x2", function(d) {
					return d.target.x;
				}).attr("y2", function(d) {
					return d.target.y;
				});

				var node = svg.selectAll("g").data(nodes).enter().append("g").attr("transform", function(d) {
					return "translate(" + -d.x + "," + -d.y + ")";
				}).call(force.drag).append("path").attr("transform", function(d) {
					return "translate(" + d.x + "," + d.y + ")";
				}).attr("class", "network-path").attr("d", function(d) {
					return path(d.feature);
				});

				force.on("tick", function(e) {
					link.attr("x1", function(d) {
						return d.source.x;
					}).attr("y1", function(d) {
						return d.source.y;
					}).attr("x2", function(d) {
						return d.target.x;
					}).attr("y2", function(d) {
						return d.target.y;
					});

					node.attr("transform", function(d) {
						return "translate(" + d.x + "," + d.y + ")";
					});
				});
			});
		};

	}]);

	module.directive('html', [
	function() {
		return {
			restrict : 'E',
			link : function(scope, element) {
				scope.$on('render', function() {
					render_panel();
				});

				function render_panel() {
					scope.ready = true;
					var htmlText = scope.panel.content;
					element.html(htmlText);
					// For whatever reason, this fixes chrome. I don't like it, I think
					// it makes things slow?
					if (!scope.$$phase) {
						scope.$apply();
					}
				}

				render_panel();
			}
		};
	}]);

	module.filter('newlines', [
	function() {
		return function(input) {
			return input.replace(/\n/g, '<br/>');
		};
	}]);

	module.filter('striphtml', [
	function() {
		return function(text) {
			return text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
		};
	}]);
});
