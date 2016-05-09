define(['angular', 'app', 'config', 'require', 'd3', 'lodash', 'jquery', 'css!./module.css'], function(angular, app, config, require, d3, _, $) {
	'use strict';
	var module = angular.module('go4smac.panels.hierarchicalchart', []);
	app.useModule(module);
	module.controller('hierarchicalchartController', ['$scope', '$rootScope', 'alertSrv', 'ejsResource', "querySrv", "dashboard", "filterSrv", "fields", "$window",
	function($scope, $rootScope, alertSrv, ejsResource, querySrv, dashboard, filterSrv, fields, $window) {
		function search(options) {
			var date = new Date();
			$scope.get_data();
		}


		$scope.init = function() {
			$scope.request = $scope.ejs.Request();
			var date = new Date();
			$scope.get_data();
		};

		if (!$scope.panel.isUser) {
			$scope.$on('refresh', function(event) {
				search();
			});
		}

		$scope.get_data = function() {
			$rootScope.lock();
			var total = 0;
			var othersText = "Others";
			var othersKey = "###Other###s###";
			var minValue = 0;
			var chartSelector = "#" + $scope.panel.panel_id + '-chart';
			$(chartSelector).html("");
			var field = $scope.panel.value_field;
			var default_field = $scope.panel.default_field || "Unknown";
			
			// Make sure we have everything for the request to complete
			if (dashboard.indices.length === 0) {
				$rootScope.unlock();
				return;
			}
			var request = $scope.ejs.Request().indices(dashboard.indices);
			var flag = false;
			var aggs = $scope.ejs.TermsAggregation(field).field(field).order('_count', 'desc');

			var boolQuery = $scope.ejs.BoolQuery();
			var query = $scope.ejs.FilteredQuery(boolQuery, filterSrv.getBoolFilter(filterSrv.ids()));
			var queries = querySrv.getQueryObjs($scope.panel.queries.ids);
			_.each(queries, function(q) {
				boolQuery = boolQuery.should(querySrv.toEjsObj(q));
			});

			request.query(query).aggs(aggs).searchType('count');
			request.doSearch(function(data) {
				$rootScope.unlock();
				if (!(data && data.aggregations && data.aggregations[field] && data.aggregations[field].buckets && data.aggregations[field].buckets.length)) {
					return false;
				}
				total = data.hits.total;
				data = data.aggregations[field].buckets;

				if (data && data.length > $scope.panel.maxItems - 1) {
					var fisrtSubArray = data.slice(0, $scope.panel.maxItems - 1);
					var secondSubArray = data.slice($scope.panel.maxItems - 1, data.length);

					var subData = {
						key : othersKey,
						children : secondSubArray,
					};
					fisrtSubArray[$scope.panel.maxItems - 1] = (subData);
					data = fisrtSubArray;
				}

				data = {
					children : data,
					key : field
				};

				if (!$scope.tooltip) {
					$scope.tooltip = d3.select("body").append("div").attr("class", "d3-tooltip");
				}

				var duration = 750,
				    delay = 25,
				    barHeight = 20;
				var svg;
				var width;
				var height;
				var x;
				var xAxis;
				var partition = d3.layout.partition().value(function(d) {
					return d.doc_count;
				});
				var margin = {
					top : 30,
					right : $(chartSelector).parent().width() * 1.5 / 10,
					bottom : 0,
					left : $(chartSelector).parent().width() * 2.5 / 10
				};
				width = $(chartSelector).parent().width() * 6 / 10;
				height = ($scope.panel.maxItems) * barHeight * 1.2 + margin.top + margin.bottom;
				x = d3.scale.linear().range([0, width]);
				xAxis = d3.svg.axis().scale(x).orient("top").tickFormat(d3.format("s"));
				partition.nodes(data);
				var otherIndex = -1;
				var temp = [];
				for (var i = 0; i < data.children.length; i++) {
					if (data.children[i].key == othersKey) {
						otherIndex = i;
					} else {
						temp.push(data.children[i]);
					}
				}
				if (otherIndex != -1) {
					minValue = temp[temp.length - 1].value * 80 / 100;
					temp.push(data.children[otherIndex]);
					data.children = temp;
				}
				x.domain([0, data.value]).nice();

				svg = d3.select(chartSelector).append("svg").attr("id", "myhierarchicalchart").attr("width", "100%").attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
				svg.append("rect").attr("class", "hierarchicalchart background").attr("width", "55%").attr("height", height).on("click", up);
				svg.append("g").attr("class", "x hierarchicalchart axis");
				svg.append("g").attr("class", "y hierarchicalchart axis").append("line").attr("y1", "100%");
				down(data, 0);

				function down(d, i) {
					if (!d.children || $window.__transition__)
						return;
					var end = duration + d.children.length * delay;

					// Mark any currently-displayed bars as exiting.
					var exit = svg.selectAll(".enter").attr("class", "exit");

					// Entering nodes immediately obscure the clicked-on bar, so hide it.
					exit.selectAll("rect").filter(function(p) {
						return p === d;
					}).style("fill-opacity", 1e-6);

					// Enter the new bars for the clicked-on data.
					// Per above, entering bars are immediately visible.
					var enter = bar(d).attr("transform", stack(i)).style("opacity", 1);

					// Have the text fade-in, even though the bars are visible.
					// Color the bars as parents; they will fade to children if appropriate.
					enter.select("text").style("fill-opacity", 1e-6);
					enter.select("rect").attr("class", function(d) {
						return !d.children ? "jarviswidget-histogram-rect" : "jarviswidget-histogram-rect-clickable";
					});

					// Update the x-scale domain.
					var max = d3.max(d.children, function(d) {
						return d.value;
					});
					x.domain([0, max]);
					x = x.nice();
					svg.selectAll(".x.hierarchicalchart.axis").transition().duration(duration).call(xAxis.ticks(5).tickFormat(d3.format(max > 999 ? "s" : "d")));

					// Transition entering bars to their new position.
					var enterTransition = enter.transition().duration(duration).delay(function(d, i) {
						return i * delay;
					}).attr("transform", function(d, i) {
						return "translate(0," + barHeight * i * 1.2 + ")";
					});

					// Transition entering text.
					enterTransition.select("text").style("fill-opacity", 1);
					enterTransition.select("text").style("text-transform", "capitalize");
					// Transition entering rects to the new x-scale.
					enterTransition.select("rect").attr("width", function(d) {
						return x(d.key == othersKey ? minValue : d.value);
					}).attr("class", function(d) {
						return !d.children ? "jarviswidget-histogram-rect" : "jarviswidget-histogram-rect-clickable";
					});

					// Transition exiting bars to fade out.
					var exitTransition = exit.transition().duration(duration).style("opacity", 1e-6).remove();
					// Transition exiting bars to the new x-scale.
					exitTransition.selectAll("rect").attr("width", function(d) {
						return x(d.value);
					});

					// Rebind the current node to the background.
					svg.select(".hierarchicalchart.background").datum(d).transition().duration(end);

					d.index = i;
				}

				function up(d) {
					if (!d.parent || this.__transition__)
						return;
					var end = duration + d.children.length * delay;

					// Mark any currently-displayed bars as exiting.
					var exit = svg.selectAll(".enter").attr("class", "exit");

					// Enter the new bars for the clicked-on data's parent.
					var enter = bar(d.parent).attr("transform", function(d, i) {
						return "translate(0," + barHeight * i * 1.2 + ")";
					}).style("opacity", 1e-6);

					// Color the bars as appropriate.
					// Exiting nodes will obscure the parent bar, so hide it.
					enter.select("rect").attr("class", function(d) {
						return !d.children ? "jarviswidget-histogram-rect" : "jarviswidget-histogram-rect-clickable";
					}).filter(function(p) {
						return p === d;
					}).style("fill-opacity", 1e-6);

					// Update the x-scale domain.
					var max = d3.max(d.parent.children, function(d) {
						return d.value;
					});
					x.domain([0, max]);
					x = x.nice();

					// Update the x-axis.
					svg.selectAll(".x.hierarchicalchart.axis").transition().duration(duration).call(xAxis.ticks(5).tickFormat(d3.format(max > 999 ? "s" : "d")));

					// Transition entering bars to fade in over the full duration.
					var enterTransition = enter.transition().duration(end).style("opacity", 1);

					// Transition entering rects to the new x-scale.
					// When the entering parent rect is done, make it visible!
					enterTransition.select("rect").attr("width", function(d) {
						return x(d.key == othersKey ? minValue : d.value);
					}).each("end", function(p) {
						if (p === d)
							d3.select(this).style("fill-opacity", null);
					});

					// Transition exiting bars to the parent's position.
					var exitTransition = exit.selectAll("g").transition().duration(duration).delay(function(d, i) {
						return i * delay;
					}).attr("transform", stack(d.index));

					// Transition exiting text to fade out.
					exitTransition.select("text").style("fill-opacity", 1e-6);

					// Transition exiting rects to the new scale and fade to parent color.
					exitTransition.select("rect").attr("width", function(d) {
						return x(d.value);
					}).attr("class", function(d) {
						return !d.children ? "jarviswidget-histogram-rect" : "jarviswidget-histogram-rect-clickable";
					});
					// Remove exiting nodes when the last child has finished transitioning.
					exit.transition().duration(end).remove();

					// Rebind the current parent to the background.
					svg.select(".hierarchicalchart.background").datum(d.parent).transition().duration(end);
				}

				// Creates a set of bars for the given data node, at the specified index.
				function bar(d) {
					// Update the x-scale domain.
					var max = d3.max(d.children, function(d) {
						return d.value;
					});
					x.domain([0, max]);
					x = x.nice();

					var bar = svg.insert("g", ".y.hierarchicalchart.axis").attr("class", "enter").attr("transform", "translate(0,5)").selectAll("g").data(d.children).enter().append("g").style("cursor", function(d) {
						return !d.children ? null : "pointer";
					}).on("click", down).on("mouseout", hide).on("mouseover", show).on("mousemove", move);

					bar.append("text").attr("x", -6).attr("y", barHeight / 2).attr("dy", ".35em").style("text-anchor", "end").text(function(d) {
						return d.key == othersKey ? othersText : (d.key == "" ? default_field : d.key );
					}).each(wrap);
					bar.append("rect").attr("width", function(d) {
						return x(d.value);
					}).attr("height", barHeight);
					bar.append("text").classed("percent", true).attr("x", function(d) {
						return x(d.value) + 5;
					}).attr("y", barHeight / 2).attr("dy", ".35em").style("text-anchor", "start").text(function(d) {
						return (d.value * 100 / total).toFixed(1) + "%";
					});

					return bar;
				}

				function wrap() {
					var self = d3.select(this),
					    textLength = self.node().getComputedTextLength(),
					    text = self.text();
					while (textLength > margin.left - 5 && text.length > 0) {
						text = text.slice(0, -1);
						self.text(text + '...');
						textLength = self.node().getComputedTextLength();
					}
				}

				// A stateful closure for stacking bars horizontally.
				function stack(i) {
					var x0 = 0;
					return function(d) {
						var tx = "translate(" + x0 + "," + barHeight * i * 1.2 + ")";
						x0 += x(d.value);
						return tx;
					};
				}

				function hide() {
					$scope.tooltip.style('opacity', 0);
				}

				function show(d) {
					if (d.children)
						return;
					$scope.tooltip.html(function() {
						return d.key + ' (' + d.doc_count + ')';
					}).style("left", (d3.event.pageX + 10) + 'px').style("top", (d3.event.pageY + 10) + 'px').style("opacity", 1);
				}

				function move() {
					$scope.tooltip.style("left", (d3.event.pageX + 10) + 'px').style("top", (d3.event.pageY + 10) + 'px');
				}

			}, function(error) {
				$rootScope.unlock();
				console.log(error);
			});
		};
	}]);
});
