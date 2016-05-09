/** @scratch /panels/5
 *
 * include::panels/histogram.asciidoc[]
 */

/** @scratch /panels/histogram/0
 *
 * == Histogram
 * Status: *Stable*
 *
 * The histogram panel allow for the display of time charts. It includes several modes and tranformations
 * to display event counts, mean, min, max and total of numeric fields, and derivatives of counter
 * fields.
 *
 */
define(['angular', 'app', 'jquery', 'lodash', 'kbn', 'moment', 'numeral', 'd3', 'tooltip-tipsy', 'css!./module.css'], function(angular, app, $, _, kbn, moment, numeral, d3) {

	'use strict';

	var module = angular.module('go4smac.panels.collapsible-tree', []);
	app.useModule(module);

	module.controller('collapsible-tree', ["$rootScope", "$scope", "$http", "querySrv", "dashboard", "filterSrv",
	function($rootScope, $scope, $http, querySrv, dashboard, filterSrv) {
		$scope.panelMeta = {
			status : "Stable",
			description : "A bucketed time series chart of the current query or queries. Uses the " + "Elasticsearch date_histogram facet. If using time stamped indices this panel will query" + " them sequentially to attempt to apply the lighest possible load to your Elasticsearch cluster"
		};

		// Set and populate defaults
		var _d = {
			/** @scratch /panels/histogram/3
			 *
			 * === Parameters
			 * ==== Axis options
			 * mode:: Value to use for the y-axis. For all modes other than count, +value_field+ must be
			 * defined. Possible values: count, mean, max, min, total, cardinality or accumulate.
			 */
			mode : 'count',
			/** @scratch /panels/terms/5
			 * height:: Show this height
			 */
			height : 400,
			/** @scratch /panels/terms/5
			 * size:: Show this many terms
			 */
			size : 10,
			/** @scratch /panels/histogram/3
			 * maxSize:: the max circle size
			 */
			maxSize : 50,
			/** @scratch /panels/histogram/3
			 * minSize:: the min circle size
			 */
			minSize : 5,
			/** @scratch /panels/histogram/3
			 * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
			 */
			field01 : null,
			/** @scratch /panels/histogram/3
			 * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
			 */
			field02 : null,
			/** @scratch /panels/histogram/3
			 * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
			 */
			field03 : null,
			/** @scratch /panels/histogram/5
			 *
			 * ==== Queries
			 * queries object:: This object describes the queries to use on this panel.
			 * queries.mode::: Of the queries available, which to use. Options: +all, pinned, unpinned, selected+
			 * queries.ids::: In +selected+ mode, which query ids are selected.
			 */
			queries : {
				mode : 'all',
				ids : []
			},
			root : ""
		};
		_.defaults($scope.panel, _d);

		$scope.init = function() {
			$scope.get_data();
		};
		$scope.is_process = false;

		/**
		 * The time range effecting the panel
		 * @return {[type]} [description]
		 */
		$scope.get_time_range = function() {
			var range = $scope.range = filterSrv.timeRange('last');
			return range;
		};
		$scope.get_interval = function(range) {
			$scope.panel.interval = filterSrv.get_interval();
			return $scope.panel.interval;
		};

		/**
		 * Fetch the data for a chunk of a queries results. Multiple segments occur when several indicies
		 * need to be consulted (like timestamped logstash indicies)
		 *
		 * The results of this function are stored on the scope's data property. This property will be an
		 * array of objects with the properties info, time_series, and hits. These objects are used in the
		 * render_panel function to create the historgram.
		 *
		 * @param {number} segment   The segment count, (0 based)
		 * @param {number} query_id  The id of the query, generated on the first run and passed back when
		 *                            this call is made recursively for more segments
		 */
		$scope.get_data = function() {
			if (dashboard.indices.length == 0)
				return;
			var request,
			    results,
			    boolQuery,
			    queries;
			$scope.is_process = true;
			$rootScope.lock();
			request = $scope.ejs.Request().indices(dashboard.indices);

			$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
			$scope.queries = queries = querySrv.getQueryObjs($scope.panel.queries.ids);

			var sg = $scope.ejs.TermsAggregation('terms').field($scope.panel.field03).size($scope.panel.size),
			    ag = $scope.ejs.TermsAggregation('terms').field($scope.panel.field02).size($scope.panel.size),
			    tg = $scope.ejs.TermsAggregation('terms').field($scope.panel.field01).size($scope.panel.size);

			if ($scope.panel.precision_threshold) {
				ag.precisionThreshold($scope.panel.precision_threshold);
			}
			var fiAggs = $scope.ejs.FilterAggregation("0").filter($scope.ejs.QueryFilter(querySrv.toEjsObj({
				id : 0,
				type : "lucene",
				query : "*"
			})));
			request = request.aggs(fiAggs.agg(tg.agg(ag.agg(sg))));
			var qr = $scope.ejs.FilteredQuery($scope.ejs.BoolQuery(), filterSrv.getBoolFilter(filterSrv.ids()));
			request = request.searchType($scope.panel.search_type || 'count').query(qr);

			// Populate the inspector panel
			$scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
			results = request.doSearch();

			// Populate scope when we have results
			results.then(function(results) {
				$scope.is_process = false;
				$scope.hits = results.hits.total;
				$scope.results = _.clone(results);
				$scope.$emit('render');
				$rootScope.unlock();
			});
		};
	}]);
	module.directive('ngCollapsibleTree', ["$window", "$timeout",
	function($window, $timeout) {
		return {
			restrict : 'AE',
			template : '<div></div>',
			link : function(scope, element) {
				scope.$on('refresh', function() {
					console.log("refresh", scope.is_process);
					if (!scope.is_process) {
						scope.get_data();
					}
				});

				// Receive render events
				scope.$on('render', function(event) {
					render_panel();
				});

				// Function for rendering panel
				function render_panel() {
					scope.ready = true;

					var margin = 40,
					    padding = 20,
					    width = element.width() - margin,
					    height = (width / 1015) * ((scope.panel.height || 400) - margin);
					var aspect = (width + margin) / (height + margin);
					var i = 0,
					    duration = 750,
					    root;

					var tree = d3.layout.tree().size([height, width]);

					var diagonal = d3.svg.diagonal().projection(function(d) {
						return [d.y, d.x];
					});

					element.empty();
					// flush the element content for adding new graph
					var svg = d3.select(element[0]).append("svg").attr("width", width + margin).attr("height", height + margin).attr("viewBox", "0 0 " + (width + margin) + " " + (height + padding)).attr("preserveAspectRatio", "xMidYMid");
					var gNode = svg.append("g").attr("transform", "translate(" + (margin + padding) + "," + padding + ")").style("margin", 10);
					angular.element($window).on("resize", function() {						
						$timeout(function() {
							var targetWidth = element.parent().width();
							svg.attr("width", targetWidth);
							svg.attr("height", targetWidth / aspect);
						}, 500);
					});

					if (scope.results && scope.results.aggregations) {
						root = {};
						root.terms = {};
						root.terms.buckets = scope.results.aggregations["0"].terms.buckets;
						root.x0 = height / 2;
						root.y0 = 0;
						var c = d3.scale.category20c();
						function shadeColor(color, percent) {
							var num = parseInt(color.slice(1), 16),
							    amt = Math.round(2.55 * percent),
							    R = (num >> 16) + amt,
							    G = (num >> 8 & 0x00FF) + amt,
							    B = (num & 0x0000FF) + amt;
							return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
						}

						function collapse(d) {
							if (d.terms && d.terms.buckets) {
								d._children = d.terms.buckets;
								for (var i = 0; i < d._children.length; i++) {
									d._children[i].color = d.color;
									d._children[i].alpha = d.alpha + 0.25;
									collapse(d._children[i]);
								}
								delete d.terms.buckets;
								delete d.terms;
								d.children = null;
							}
						}

						function expand(d) {
							if (d.terms && d.terms.buckets) {
								d.children = d.terms.buckets;
								for (var i = 0; i < d.children.length; i++) {
									d.children[i].color = d.color;
									d.children[i].alpha = d.alpha + 0.25;
									expand(d.children[i]);
								}
								delete d.terms.buckets;
								delete d.terms;
								d._children = null;
							}
						}


						root.children = root.terms.buckets;
						for (var i = 0; i < root.children.length; i++) {
							root.children[i].color = c(i);
							root.children[i].alpha = 0.25;
							expand(root.children[i]);
						}
						root.key = ( typeof (root.key) == 'undefined' || !root.key) ? '' : root.key;
						if ( typeof (root.doc_count) == 'undefined' || !root.doc_count) {
							root.doc_count = 0;
							root.color = c(0);
							root.alpha = 0.15;
							root.key = scope.panel.root;
							$(root.children).each(function(num, obj) {
								root.doc_count = obj.doc_count + root.doc_count;
							});
						}
						update(root);
					};

					function get_cicle_r(d) {
						var val = d.parent ? d.doc_count : 0;
						if (val > 0) {
							var minVal = d3.min(root.children, function(d) {
								return d.doc_count;
							});
							var maxVal = d3.max(root.children, function(d) {
								return d.doc_count;
							});
							if (minVal == maxVal) {
								minVal = 0;
							}
							return (width / 1015) * ((scope.panel.maxSize - scope.panel.minSize) * val + scope.panel.minSize * maxVal - scope.panel.maxSize * minVal) / (maxVal - minVal);
						}
						return 0;
					}

					function update(source) {
						// Compute the new tree layout.
						var nodes = tree.nodes(root).reverse(),
						    links = tree.links(nodes);
						// Normalize for fixed-depth.
						nodes.forEach(function(d) {
							d.y = d.depth * (width - margin - padding - scope.panel.maxSize) / 3;
						});

						// Update the nodes…
						var node = gNode.selectAll("g.node").data(nodes, function(d) {
							return d.id || (d.id = ++i);
						});

						// Enter any new nodes at the parent's previous position.
						var nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", function(d) {
							return "translate(" + source.y0 + "," + source.x0 + ")";
						}).on("click", click);

						nodeEnter.append("circle").attr("r", 1e-6).style("fill", function(d) {
							return d.color;
						});

						nodeEnter.append("text").attr("class", "text hidden-xs").attr("x", function(d) {
							return (d.children || d._children) ? -10 : 10;
						}).attr("dy", width < 640 ? ".01em" : ".35em").attr("text-anchor", function(d) {
							return (d.children || d._children) ? "end" : "start";
						}).text(function(d) {
							return d.key;
						}).style("fill-opacity", 1e-6);

						// Transition nodes to their new position.
						var nodeUpdate = node.transition().duration(duration).attr("transform", function(d) {
							return "translate(" + d.y + "," + d.x + ")";
						});

						nodeUpdate.select("circle").attr("r", function(d) {
							return get_cicle_r(d);
						}).style("fill", function(d) {
							return d.color;
						}).style("stroke", function(d) {
							return d.color;
						}).style("fill-opacity", 0.4);

						nodeUpdate.select("text").style("fill-opacity", 1);

						// Transition exiting nodes to the parent's new position.
						var nodeExit = node.exit().transition().duration(duration).attr("transform", function(d) {
							return "translate(" + source.y + "," + source.x + ")";
						}).remove();

						nodeExit.select("circle").attr("r", 1e-6);

						nodeExit.select("text").style("fill-opacity", 1e-6);

						// Update the links…
						var link = gNode.selectAll("path.link").data(links, function(d) {
							return d.target.id;
						});

						// Enter any new links at the parent's previous position.
						link.enter().insert("path", "g").attr("class", "link").attr("d", function(d) {
							var o = {
								x : source.x0,
								y : source.y0
							};
							return diagonal({
								source : o,
								target : o
							});
						}).style("stroke", function(d) {
							return d.target.color;
						}).style("stroke-width", function(d) {
							return get_cicle_r(d.target) * 2;
						}).style("stroke-opacity", function(d) {
							return d.target.alpha;
						}).style("stroke-linecap", "round");

						// Transition links to their new position.
						link.transition().duration(duration).attr("d", diagonal);

						// Transition exiting nodes to the parent's new position.
						link.exit().transition().duration(duration).attr("d", function(d) {
							var o = {
								x : source.x,
								y : source.y
							};
							return diagonal({
								source : o,
								target : o
							});
						}).remove();

						// Stash the old positions for transition.
						nodes.forEach(function(d) {
							d.x0 = d.x;
							d.y0 = d.y;
						});

						//add tooltip
						$('circle', $(element)).tipsy({
							gravity : 'w',
							html : true,
							prefixClass : 'collapsible-tree',
							title : function() {
								return '<h4>' + this.__data__.key + '</h4><br/>Articles : ' + this.__data__.doc_count;
							}
						});
					}

					// Toggle children.
					function click(d) {
						if (d.children) {
							d._children = d.children;
							d.children = null;
						} else {
							d.children = d._children;
							d._children = null;
						}
						update(d);
					}

					// For whatever reason, this fixes chrome. I don't like it, I think
					// it makes things slow?
					if (!scope.$$phase) {
						scope.$apply();
					}
				}

			}
		};
	}]);
});
