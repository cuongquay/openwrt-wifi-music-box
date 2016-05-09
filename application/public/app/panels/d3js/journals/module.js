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
define(['angular', 'app', 'jquery', 'lodash', 'kbn', 'moment', './timeSeries', 'numeral', 'd3', 'css!./module.css'], function(angular, app, $, _, kbn, moment, timeSeries, numeral, d3) {

	'use strict';

	var module = angular.module('go4smac.panels.journals', []);
	app.useModule(module);

	module.controller('journals', ["$rootScope", "$scope", "$http", "querySrv", "dashboard", "filterSrv",
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
			/** @scratch /panels/histogram/3
			 * time_field:: x-axis field. This must be defined as a date type in Elasticsearch.
			 */
			time_field : '@timestamp',
			/** @scratch /panels/histogram/3
			 * value_field:: y-axis field if +mode+ is set to mean, max, min or total. Must be numeric.
			 */
			field : "_type",
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
			/** @scratch /panels/terms/5
			 * size:: Show this many terms
			 */
			size : 10,
			/** @scratch /panels/histogram/3
			 * ==== Interval options
			 * auto_int:: Automatically scale intervals?
			 */
			auto_int : true,
			/** @scratch /panels/histogram/3
			 * resolution:: If auto_int is true, shoot for this many bars.
			 */
			resolution : 100,
			/** @scratch /panels/histogram/3
			 * interval:: If auto_int is set to false, use this as the interval.
			 */
			interval : '1M'
		};

		var savedQueryObj = null;

		_.defaults($scope.panel, _d);

		$scope.buildQueries = function(query) {
			if (dashboard.indices.length == 0)
				return;
			var request = $scope.ejs.Request().indices(dashboard.indices);
			var qr = $scope.ejs.QueryFilter($scope.ejs.FilteredQuery($scope.ejs.BoolQuery(), filterSrv.getBoolFilter(filterSrv.ids())));
			request = request.facet($scope.ejs.TermsFacet('terms').field($scope.panel.field).size($scope.panel.size).facetFilter(qr)).size(0);
			request.doSearch().then(function(data) {
				dashboard.current.services.query.list = {};
				dashboard.current.services.query.ids = [];
				$scope.panel.queries.ids = [];
				if (data && data.facets) {
					var addedQueryStr = "";
					savedQueryObj = query || savedQueryObj;
					if (savedQueryObj && savedQueryObj.query && savedQueryObj.query.length) {
						var queryStr = null;
						angular.forEach(savedQueryObj.query, function(obj) {
							var query_added = obj.field + ": \"" + obj.value + "\"";
							if (queryStr) {
								queryStr += " " + savedQueryObj.mode + " " + query_added;
							} else {
								queryStr = query_added;
							}
						});
						if (queryStr && queryStr != "")
							addedQueryStr = " AND (" + queryStr + ")";
					}
					for (var i = 0; i < data.facets.terms.terms.length; i++) {
						dashboard.current.services.query.list[(i).toString()] = {
							"query" : $scope.panel.field + ": \"" + data.facets.terms.terms[i].term + "\"" + addedQueryStr,
							"alias" : data.facets.terms.terms[i].term,
							"id" : i,
							"pin" : false,
							"type" : "lucene"
						};
						dashboard.current.services.query.ids.push(i);
						$scope.panel.queries.ids.push(i);
					};
				}
				if (dashboard.current.services.query.ids.length > 0) {
					querySrv.init();
				}
				querySrv.resolve().then(function() {
					$scope.get_data();
					if (savedQueryObj && savedQueryObj.query && savedQueryObj.query.length) {
						$scope.is_process = true;
						dashboard.refresh();
					}
				});
			});
		};

		$scope.init = function() {
			$scope.options = false;
			$scope.buildQueries();
		};
		$scope.is_process = false;

		$scope.set_interval = function(interval) {
			if (interval !== 'auto') {
				$scope.panel.auto_int = false;
				$scope.panel.interval = interval;
			} else {
				$scope.panel.auto_int = true;
			}
		};

		$scope.interval_label = function(interval) {
			return $scope.panel.auto_int && interval === $scope.panel.interval ? interval + " (auto)" : interval;
		};

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
		 * render_timeline function to create the historgram.
		 *
		 * @param {number} segment   The segment count, (0 based)
		 * @param {number} query_id  The id of the query, generated on the first run and passed back when
		 *                            this call is made recursively for more segments
		 */
		$scope.get_data = function(data, segment, query_id) {
			try {
				var _range,
				    _interval,
				    request,
				    queries,
				    results;
				$scope.is_process = true;
				$rootScope.lock();

				if (_.isUndefined(segment)) {
					segment = 0;
				}
				delete $scope.panel.error;

				// Make sure we have everything for the request to complete
				if (dashboard.indices.length === 0) {
					$scope.is_process = false;
					$rootScope.unlock();
					return;
				}
				_range = $scope.get_time_range();
				_interval = $scope.get_interval(_range);

				$scope.panelMeta.loading = true;

				request = $scope.ejs.Request().indices(dashboard.indices[segment]);
				if (request && Object.keys(request).length > 0) {
					if (request.searchType) {
						request.searchType("count");
					}
					$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

					queries = querySrv.getQueryObjs($scope.panel.queries.ids);
					_.each(queries, function(q) {
						var query = $scope.ejs.FilteredQuery(querySrv.toEjsObj(q), filterSrv.getBoolFilter(filterSrv.ids()));

						var facet = $scope.ejs.DateHistogramFacet(q.id);

						if ($scope.panel.mode === 'count') {
							facet = facet.field($scope.panel.time_field).global(true);
						} else {
							if (_.isNull($scope.panel.value_field)) {
								$scope.panel.error = "In " + $scope.panel.mode + " mode a field must be specified";
								return;
							}
							facet = facet.keyField($scope.panel.time_field).valueField($scope.panel.value_field).global(true);
						}
						facet = facet.interval(_interval).facetFilter($scope.ejs.QueryFilter(query));
						request = request.facet(facet).size(0);
					});

					var query = $scope.ejs.FilteredQuery($scope.ejs.QueryStringQuery('*'), filterSrv.getBoolFilter(filterSrv.idsByType('time')));
					request = request.query(query);

					// This is a hack proposed by @boaz to work around the fact that we can't get
					// to field data values directly, and we need timestamps as normalized longs
					request = request.sort([$scope.ejs.Sort('_score').order('desc').ignoreUnmapped(true), $scope.ejs.Sort($scope.panel.time_field).desc().ignoreUnmapped(true)]);

					// Then run it
					results = request.doSearch();
					// Populate scope when we have results
					return results.then(function(results) {
						$scope.panelMeta.loading = false;
						if (segment === 0) {
							$scope.hits = 0;
							data = [];
							query_id = $scope.query_id = new Date().getTime();
						}
						// Check for error and abort if found
						if (!(_.isUndefined(results.error))) {
							$scope.panel.error = $scope.parse_error(results.error);
						}
						// Make sure we're still on the same query/queries
						else if ($scope.query_id === query_id) {
							var i = 0,
							    time_series,
							    hits,
							    counters;
							// Stores the bucketed hit counts.
							_.each(queries, function(q) {
								if (_.isUndefined(results.facets)) {
									return false;
								}
								var query_results = results.facets[q.id];

								// we need to initialize the data variable on the first run,
								// and when we are working on the first segment of the data.
								if (_.isUndefined(data[i]) || segment === 0) {
									var tsOpts = {
										interval : _interval,
										start_date : _range && _range.from,
										end_date : _range && _range.to,
										fill_style : $scope.panel.derivative ? 'null' : $scope.panel.zerofill ? 'minimal' : 'no'
									};
									time_series = new timeSeries.ZeroFilled(tsOpts);
									hits = 0;
									counters = [];
								} else {
									time_series = data[i].time_series;
									hits = data[i].hits;
									counters = data[i].counters;
								}
								var value = 0;
								// push each entry into the time series, while incrementing counters
								_.each(query_results.entries, function(entry) {
									hits += entry.count;
									// The series level hits counter
									$scope.hits += entry.count;
									// Entire dataset level hits counter
									counters.push([new Date(entry.time), (counters[entry.time] || 0) + entry.count, {
										name : q.alias,
										time : entry.time,
										interval : _interval
									}]);

									if ($scope.panel.mode === 'count') {
										if ($scope.panel.accumulate) {
											value += (time_series._data[entry.time] || 0) + entry.count;
										} else {
											value = (time_series._data[entry.time] || 0) + entry.count;
										}
									}
									time_series.addValue(entry.time, value);
								});
								data[i] = {
									info : q,
									time_series : time_series,
									hits : hits,
									counters : counters
								};
								i++;
							});
						}

						// Tell the histogram directive to render.
						$scope.$emit('render', data);

						// If we still have segments left, get them
						if (segment < dashboard.indices.length - 1) {
							$scope.get_data(data, segment + 1, query_id);
						} else {
							$scope.is_process = false;
						}
						$rootScope.unlock();
					});
				} else {
					$rootScope.unlock();
				}
			} catch (ex) {
				$rootScope.unlock();
				console.error(ex);
			}
		};

		$scope.set_refresh = function(state) {
			$scope.refresh = state;
		};

		$scope.render = function() {
			$scope.$emit('refresh');
		};
	}]);
	module.directive('ngJournalsPanel', ["$rootScope", "$window", "$timeout", "filterSrv",
	function($rootScope, $window, $timeout, filterSrv) {
		return {
			restrict : 'A',
			template : '<div></div>',
			link : function(scope, element) {
				var data,
				    plot,
				    isHiddenOnMobile = false;
				scope.$on('refresh', function(event, query) {
					if (!scope.is_process) {
						scope.buildQueries(query);
					}
				});

				// Receive render events
				scope.$on('render', function(event, d) {
					data = d || data;
					if ($(".d3-journals-mobile-checker").is(':hidden')) {
						isHiddenOnMobile = true;
					} else {
						isHiddenOnMobile = false;
					}
					render_timeline(data);
				});

				// Function for rendering panel
				function render_timeline(data) {
					scope.ready = true;
					$(element).empty();

					function truncate(str, maxLength, suffix) {
						if (str.length > maxLength) {
							str = str.substring(0, maxLength + 1);
							str = str.substring(0, Math.min(str.length, str.lastIndexOf(" ")));
							str = str + suffix;
						}
						return str;
					}

					var margin = {
						top : isHiddenOnMobile ? 10 : 40,
						right : 200,
						bottom : isHiddenOnMobile ? 10 : 40,
						left : isHiddenOnMobile ? 10 : 20
					};
					var width = element.width() - 300;
					var height = (data.length || 0) * 25,
					    topMargin = isHiddenOnMobile ? 10 : 40;
					var aspect = (width + margin.left + margin.right) / (height + margin.top + margin.bottom);
					var _range = scope.get_time_range();
					var _interval = scope.get_interval(_range);
					var customTimeFormat = d3.time.format.multi([[".%L",
					function(d) {
						return d.getMilliseconds();
					}], [":%S",
					function(d) {
						return d.getSeconds();
					}], ["%I:%M",
					function(d) {
						return d.getMinutes();
					}], ["%I %p",
					function(d) {
						return d.getHours();
					}], ["%a %d",
					function(d) {
						return d.getDay() && d.getDate() != 1;
					}], ["%b %d",
					function(d) {
						return d.getDate() != 1;
					}], ["%B",
					function(d) {
						return d.getMonth();
					}], ["%Y",
					function() {
						return true;
					}]]);
					/* define x time scale and format the x-axis */
					var from = _.clone(_range.from).setHours(_range.from.getHours() - 1);
					var xScale = d3.time.scale().domain([from, _range.to]).range([1, width - 1]);
					var xAxis = d3.svg.axis().scale(xScale).tickSize(10).tickFormat(customTimeFormat);
					var monthsTickAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(d3.time.month, 1).tickFormat('').tickSize(15).tickPadding(0);
					var yearsTickAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(d3.time.year, 1).tickFormat('').tickSize(20).tickPadding(0);

					var rsvg = d3.select(element[0]).append("svg").attr("width", width + margin.left + margin.right).attr("height", height + margin.top + margin.bottom).attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom)).attr("preserveAspectRatio", "xMidYMid").style("margin", margin.left + "px");
					var svg = rsvg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
					if (!isHiddenOnMobile) {
						svg.append('g').classed('axis', true).classed('months', true).attr("transform", "translate(0, 0)").call(monthsTickAxis);
						svg.append('g').classed('axis', true).classed('years', true).attr("transform", "translate(0, 0)").call(yearsTickAxis);
						svg.append('g').attr('class', 'x axis hidden-xs').attr('transform', 'translate(0, 0)').call(xAxis).selectAll("text").style("text-anchor", "start").attr("transform", "translate(-20,-10) rotate(-65)");
					}

					angular.element($window).on("resize", function() {
						$timeout(function() {
							var targetWidth = element.parent().width() - 300 + margin.left + margin.right;
							if (targetWidth >= 0) {
								rsvg.attr("width", targetWidth);
								rsvg.attr("height", targetWidth / aspect);
							}
						}, 500);
					});

					if (moment.duration(_range.to - _range.from).asDays() <= 31) {
						if (!isHiddenOnMobile) {
							var hoursAxis = d3.svg.axis().scale(xScale).orient('bottom').ticks(d3.time.hour, 1).tickPadding(6).tickSize(8).tickFormat(function(d) {
								var hours = d.getHours();
								if (hours == 6)
									// font awesome's sun icon
									return '';
								else if (hours == 18)
									// font awesome's moon icon
									return '';
								else
									// don't label anything else
									return null;
							});
							svg.append('g').classed('axis hidden-xs', true).classed('hours', true).classed('labeled', true).attr("transform", "translate(0.5,0.5)").call(hoursAxis);
						}
					} else {
						topMargin = isHiddenOnMobile ? 10 : 30;
					}

					var c = d3.scale.category20c();
					for (var j = 0; j < data.length; j++) {
						var g = svg.append("g").classed('axis', true).attr("transform", "translate(0, 0)");

						var indicators = g.selectAll( isHiddenOnMobile ? "rect" : "circle").data(data[j]['counters']).enter().append( isHiddenOnMobile ? "rect" : "circle");

						var text = g.selectAll("text").data(data[j]['counters']).enter().append("text");

						var rScale = d3.scale.linear().domain([0, d3.max(data[j]['counters'], function(d) {
							return d[1];
						})]).range([2, 9]);

						if (isHiddenOnMobile) {
							indicators.attr("x", function(d, i) {
								return xScale(d[0]);
							}).attr("y", j * 20 + topMargin).attr("width", 2).attr("height", function(d) {
								return xScale(d[0]) > 0 ? rScale(d[1]) : 0;
							}).style("fill", function(d) {
								return c(j);
							});
						} else {
							indicators.attr("cx", function(d, i) {
								return xScale(d[0]);
							}).attr("cy", j * 20 + topMargin).attr("r", function(d) {
								return xScale(d[0]) > 0 ? rScale(d[1]) : 0;
							}).style("fill", function(d) {
								return c(j);
							}).style("cursor", "pointer").on("click", function(d) {
								var _filter = getFilterObject(d[2].time, d[2].interval);
								$(filterSrv.ids()).each(function(p, id) {
									filterSrv.set(_filter, id, false);
									return false;
								});
								$rootScope.$broadcast("update", {
									type : "filter",
									data : d[2].name,
									field : scope.panel.field
								});
							});
						}

						text.attr("y", j * 20 + topMargin + 5).attr("x", function(d, i) {
							return xScale(d[0]) - 5;
						}).attr("class", "value").text(function(d) {
							return xScale(d[0]) > 0? format(d[1]) : "";
						}).style("fill", function(d) {
							return c(j);
						}).style("display", "none");

						g.data(data[j]['counters']).append("text").attr("y", j * 20 + topMargin + 5).attr("x", width + 20).attr("class", "label").text(truncate(data[j]['info'].alias, 30, "...") + "(" + format(data[j].hits) + ")").style("fill", function(d) {
							return c(j);
						}).on("mouseover", mouseover).on("mouseout", mouseout).on("click", function(d) {
							$rootScope.$broadcast("update", {
								type : "filter",
								data : d[2].name,
								field : scope.panel.field
							});
						});
					};

					function format(n) {
						var base = Math.floor(Math.log(Math.abs(n)) / Math.log(1000));
						var suffix = 'kmb'[base - 1];
						return suffix ? String(n / Math.pow(1000, base)).substring(0, 3) + suffix : '' + n;
					}

					function mouseover(p) {
						if (!isHiddenOnMobile) {
							var g = d3.select(this).node().parentNode;
							d3.select(g).selectAll("circle").style("display", "none");
							d3.select(g).selectAll("text.value").style("display", "block");
						}
					}

					function mouseout(p) {
						if (!isHiddenOnMobile) {
							var g = d3.select(this).node().parentNode;
							d3.select(g).selectAll("circle").style("display", "block");
							d3.select(g).selectAll("text.value").style("display", "none");
						}
					}

					function getFilterObject(time, interval) {
						var _filter = {};
						_filter.from = new Date(time);
						_filter.to = _.clone(_filter.from);
						switch (interval) {
						case "1h":
							_filter.to.setHours(_filter.from.getHours() + 1);
							filterSrv.set_interval("5m");
							break;
						case "2h":
							_filter.to.setHours(_filter.from.getHours() + 2);
							filterSrv.set_interval("10m");
							break;
						case "3h":
							_filter.to.setHours(_filter.from.getHours() + 3);
							filterSrv.set_interval("15m");
							break;
						case "4h":
							_filter.to.setHours(_filter.from.getHours() + 4);
							filterSrv.set_interval("30m");
							break;
						case "6h":
							_filter.to.setHours(_filter.from.getHours() + 6);
							filterSrv.set_interval("30m");
							break;
						case "12h":
							_filter.to.setHours(_filter.from.getHours() + 12);
							filterSrv.set_interval("1h");
							break;
						case "1d":
							_filter.to.setDate(_filter.from.getDate() + 1);
							filterSrv.set_interval("2h");
							break;
						case "2d":
							_filter.to.setDate(_filter.from.getDate() + 2);
							filterSrv.set_interval("4h");
							break;
						case "1w":
							_filter.to.setDate(_filter.from.getDate() + 7);
							filterSrv.set_interval("12h");
							break;
						case "1M":
							_filter.to.setMonth(_filter.from.getMonth() + 1);
							filterSrv.set_interval("2d");
							break;
						case "1y":
							_filter.to.setMonth(_filter.from.getMonth() + 12);
							filterSrv.set_interval("1M");
							break;
						default:
							_filter.from = filterSrv.timeRange().from;
							_filter.to = filterSrv.timeRange().to;
							break;
						}
						return angular.extend(filterSrv.timeRange(), _filter);
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
