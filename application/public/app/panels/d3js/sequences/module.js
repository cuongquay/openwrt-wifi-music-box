define(['angular', 'app', 'lodash', 'require', 'd3', 'jquery', 'css!./css/module.css'], function(angular, app, _, require, d3, $) {
	'use strict';

	var module = angular.module('go4smac.panels.sequences', []);
	app.useModule(module);

	module.controller('sequences', ['$scope', 'querySrv',
	function($scope, querySrv) {
		$scope.init = function() {
			$scope.userEmail = 'guest';
			if ($scope.userInfo && $scope.userInfo.email) {
				$scope.userEmail = $scope.userInfo.email;
			}
		};

		function drawChart() {
			function getWidth() {
				return Math.floor($(window).width() * 0.4);
			}

			d3.select('#sunburn-chart svg').remove();
			// Dimensions of sunburst.
			var width = getWidth();
			var height = Math.floor(width * 0.8);
			var scl = d3.scale.linear().domain([0, 500]).range([0, width]);
			width = scl(500);
			height = scl(400);
			var radius = Math.min(width, height) / 2;

			// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
			var b = {
				w : 75,
				h : 30,
				s : 3,
				t : 10
			};

			// Mapping of step names to colors.
			var colors = {
				"GMS" : "#5687d1",
				"GMS Portal" : "#a173d1",
				"GMS Network" : "#bbbbbb",
				"GMS Admin" : "#20124d",
				"LMS" : "#7b615c",
				"LMS Home" : "#674ea7",
				"LMS Admin" : "#783f04",
				"LMS Calendar" : "#6aa84f",
				"Git" : "#de783b",
				"Git Home" : "#0c343d",
				"Wiki" : "#6ab975",
				"Wiki Home" : "#274e13"
			};

			// Total size of all segments; we set this later, after loading the data.
			var totalSize = 0;

			var vis = d3.select("#sunburn-chart").append("svg:svg").attr("width", width).attr("height", height).append("svg:g").attr("id", "container").attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

			var surnburnExplain = vis.append('g').style('visibility', 'hidden');

			var percentageText = surnburnExplain.append('text').attr('text-anchor', 'middle').attr('font-size', scl(2.5) + 'em');

			var explainText = surnburnExplain.append('text').text('of visits pages').attr('text-anchor', 'middle').attr('transform', 'translate(0, ' + scl(15) + ')').attr('font-size', scl(1.5) + 'em').style('color', '#666');

			var partition = d3.layout.partition().size([2 * Math.PI, radius * radius]).value(function(d) {
				return d.size;
			});

			var arc = d3.svg.arc().startAngle(function(d) {
				return d.x;
			}).endAngle(function(d) {
				return d.x + d.dx;
			}).innerRadius(function(d) {
				return Math.sqrt(d.y);
			}).outerRadius(function(d) {
				return Math.sqrt(d.y + d.dy);
			});

			// Use d3.text and d3.csv.parseRows so that we do not need to have a header
			// row, and can receive the csv as an array of arrays.
			var dataURL = $scope.panel.data_url;
			if ($scope.panel.isUser) {
				dataURL = $scope.panel.data_url + "?e=" + $scope.userEmail;
			} else if ($scope.efilter) {
				dataURL = $scope.panel.data_url + '?e=' + $scope.efilter;
			}
			$scope.loading = true;
			if (!$scope.$$phase) {
				$scope.$apply();
			}
			d3.text(dataURL, function(text) {
				$scope.loading = false;
				var csv = d3.csv.parseRows(text);
				var json = buildHierarchy(csv);
				createVisualization(json);
				if (!$scope.$$phase) {
					$scope.$apply();
				}
			});

			// Main function to draw and set up the visualization, once we have the data.
			function createVisualization(json) {
				// Basic setup of page elements.
				initializeBreadcrumbTrail();
				drawLegend();
				d3.select("#sunburn-togglelegend").on("click", toggleLegend);

				// Bounding circle underneath the sunburst, to make it easier to detect
				// when the mouse leaves the parent g.
				vis.append("svg:circle").attr("r", radius).style("opacity", 0);

				// For efficiency, filter nodes to keep only those large enough to see.
				var nodes = partition.nodes(json).filter(function(d) {
					return (d.dx > 0.005);
					// 0.005 radians = 0.29 degrees
				});

				var path = vis.data([json]).selectAll("path").data(nodes).enter().append("svg:path").attr("display", function(d) {
					return d.depth ? null : "none";
				}).attr("d", arc).attr("fill-rule", "evenodd").style("fill", function(d) {
					return colors[d.name];
				}).style("opacity", 1).on("mouseover", mouseover).on('click', mouseclick).append('title').text(function(d) {
					return d.name;
				});

				// Add the mouseleave handler to the bounding circle.
				d3.select("#container").on("mouseleave", mouseleave);

				// Get total size of the tree = value of root node from partition.
				totalSize = path.node().__data__.value;
			}

			;

			// Fade all but the current sequence, and show it in the breadcrumb trail.
			function mouseclick(d) {
				if (!d.name || d.name === 'root')
					return;
				var patt = /^[a-z]+/i;
				if (patt.test(d.name)) {
					var rege = new RegExp('^' + (patt.exec(d.name))[0]);
					var cl = {};
					_.keys(colors).forEach(function(color) {
						if (rege.test(color)) {
							cl[color] = colors[color];
						}
					});
					drawLegend(cl);
				}
			}

			// Fade all but the current sequence, and show it in the breadcrumb trail.
			function mouseover(d) {
				var percentage = (100 * d.value / totalSize).toPrecision(3);
				var percentageString = percentage + "%";
				if (percentage < 0.1) {
					percentageString = "< 0.1%";
				}

				var sequenceArray = getAncestors(d);
				updateBreadcrumbs(sequenceArray, percentageString);

				// Fade all the segments.
				var container = d3.select("#container");
				container.selectAll("path").style("opacity", 0.3);

				// Then highlight only those that are an ancestor of the current segment.
				vis.selectAll("path").filter(function(node) {
					return (sequenceArray.indexOf(node) >= 0);
				}).style("opacity", 1);

				surnburnExplain.style('visibility', '');
			}

			// Restore everything to full opacity when moving off the visualization.
			function mouseleave(d) {

				// Hide the breadcrumb trail
				d3.select("#trail").style("visibility", "hidden");

				// Deactivate all segments during transition.
				var container = d3.select("#container");
				container.selectAll("path").on("mouseover", null);

				// Transition each segment to full opacity and then reactivate it.
				container.selectAll("path").transition().duration(1000).style("opacity", 1).each("end", function() {
					d3.select(this).on("mouseover", mouseover);
				});

				surnburnExplain.style('visibility', 'hidden');
			}

			// Given a node in a partition layout, return an array of all of its ancestor
			// nodes, highest first, but excluding the root.
			function getAncestors(node) {
				var path = [];
				var current = node;
				while (current.parent) {
					path.unshift(current);
					current = current.parent;
				}
				return path;
			}

			function initializeBreadcrumbTrail() {
				// Add the svg area.
				var trail = d3.select("#sunburn-sequence").append("svg:svg").attr("width", width).attr("height", 50).attr("id", "trail");
				// Add the label at the end, for the percentage.
				trail.append("svg:text").attr("id", "endlabel").style("fill", "#000");
			}

			// Generate a string that describes the points of a breadcrumb polygon.
			function breadcrumbPoints(d, i) {
				var points = [];
				points.push("0,0");
				points.push(b.w + ",0");
				points.push(b.w + b.t + "," + (b.h / 2));
				points.push(b.w + "," + b.h);
				points.push("0," + b.h);
				if (i > 0) {// Leftmost breadcrumb; don't include 6th vertex.
					points.push(b.t + "," + (b.h / 2));
				}
				return points.join(" ");
			}

			// Update the breadcrumb trail to show the current sequence and percentage.
			function updateBreadcrumbs(nodeArray, percentageString) {

				// Data join; key function combines name and depth (= position in sequence).
				var g = d3.select("#trail").selectAll("g").data(nodeArray, function(d) {
					return d.name + d.depth;
				});

				// Add breadcrumb and label for entering nodes.
				var entering = g.enter().append("svg:g");

				entering.append("svg:polygon").attr("points", breadcrumbPoints).style("fill", function(d) {
					return colors[d.name];
				});

				entering.append("svg:text").attr("x", (b.w + b.t) / 2).attr("y", b.h / 2).attr("dy", "0.35em").attr("text-anchor", "middle").text(function(d) {
					return d.name;
				});

				// Set position for entering and updating nodes.
				g.attr("transform", function(d, i) {
					return "translate(" + i * (b.w + b.s) + ", 0)";
				});

				// Remove exiting nodes.
				g.exit().remove();

				percentageText.text(percentageString);

				// Now move and update the percentage at the end.
				d3.select("#trail").select("#endlabel").attr("x", (nodeArray.length + 0.5) * (b.w + b.s)).attr("y", b.h / 2).attr("dy", "0.35em").attr("text-anchor", "middle").text(percentageString);

				// Make the breadcrumb trail visible, if it's hidden.
				d3.select("#trail").style("visibility", "");

			}

			function drawLegend(colorArr) {
				var cl = colorArr || colors;
				// Dimensions of legend item: width, height, spacing, radius of rounded rect.
				var li = {
					w : 75,
					h : 30,
					s : 3,
					r : 3
				};
				$("#sunburn-legend").html('');
				var legend = d3.select("#sunburn-legend").append("svg:svg").attr("width", li.w).attr("height", d3.keys(cl).length * (li.h + li.s));

				var g = legend.selectAll("g").data(d3.entries(cl)).enter().append("svg:g").attr("transform", function(d, i) {
					return "translate(0," + i * (li.h + li.s) + ")";
				});

				g.append("svg:rect").attr("rx", li.r).attr("ry", li.r).attr("width", li.w).attr("height", li.h).style("fill", function(d) {
					return d.value;
				});

				g.append("svg:text").attr("x", li.w / 2).attr("y", li.h / 2).attr("dy", "0.35em").attr("text-anchor", "middle").text(function(d) {
					return d.key;
				});
			}

			function toggleLegend() {
				var legend = d3.select("#sunburn-legend");
				if (legend.style("visibility") == "hidden") {
					legend.style("visibility", "");
				} else {
					legend.style("visibility", "hidden");
				}
			}

			// Take a 2-column CSV and transform it into a hierarchical structure suitable
			// for a partition layout. The first column is a sequence of step names, from
			// root to leaf, separated by hyphens. The second column is a count of how
			// often that sequence occurred.
			function buildHierarchy(csv) {
				var root = {
					"name" : "root",
					"children" : []
				};
				for (var i = 0; i < csv.length; i++) {
					var sequence = csv[i][0];
					var size = +csv[i][1];
					if (isNaN(size)) {// e.g. if this is a header row
						continue;
					}
					var parts = sequence.split("-");
					var currentNode = root;
					for (var j = 0; j < parts.length; j++) {
						var children = currentNode["children"];
						var nodeName = parts[j];
						var childNode;
						if (j + 1 < parts.length) {
							// Not yet at the end of the sequence; move down the tree.
							var foundChild = false;
							for (var k = 0; k < children.length; k++) {
								if (children[k]["name"] == nodeName) {
									childNode = children[k];
									foundChild = true;
									break;
								}
							}
							// If we don't already have a child node for this branch, create it.
							if (!foundChild) {
								childNode = {
									"name" : nodeName,
									"children" : []
								};
								children.push(childNode);
							}
							currentNode = childNode;
						} else {
							// Reached the end of the sequence; create a leaf node.
							childNode = {
								"name" : nodeName,
								"size" : size
							};
							children.push(childNode);
						}
					}
				}
				return root;
			}

			;
		}


		$scope.$on('tab_select', function(e, panel) {
			if (panel.type === 'sequences') {
				drawChart();
			}
		});

		angular.element(window).bind('resize', function() {
			drawChart();
		});

		$scope.search = function() {
			drawChart();
		};

		drawChart();		
	}]);
});
