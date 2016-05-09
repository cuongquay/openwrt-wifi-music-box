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
define(['angular', 'app', 'lodash', 'require', 'd3', 'topojson', 'spectrum', 'css!./module.css', 'css!./spectrum.css'], function(angular, app, _, require, d3, topojson, spectrum) {
	'use strict';

	var module = angular.module('kibana.panels.hitsmap', []);
	app.useModule(module);

	module.controller('hitsmap', ['$scope', 'querySrv', 'dashboard', 'filterSrv', 'fields',
	function($scope, querySrv, dashboard, filterSrv, fields) {

		$scope.panelMeta = {
			modals : [{
				description : "Inspect",
				icon : "icon-info-sign",
				partial : "app/partials/inspector.html",
				show : $scope.panel.spyable
			}],
			editorTabs : [{
				title : 'Queries',
				src : 'app/partials/querySelect.html'
			}],
			status : "Stable",
			description : "Displays the summary of user tracking over the world"
		};

		// Set and populate defaults
		var defaults = {
			/** @scratch /panels/terms/5
			 * === Parameters
			 *
			 * field:: The field on which to computer the facet
			 */
			field : 'country_code2',
			/** @scratch /panels/terms/5
			 * exclude:: terms to exclude from the results
			 */
			exclude : [],
			/** @scratch /panels/terms/5
			 * missing:: Set to false to disable the display of a counter showing how much results are
			 * missing the field
			 */
			missing : true,
			/** @scratch /panels/terms/5
			 * other:: Set to false to disable the display of a counter representing the aggregate of all
			 * values outside of the scope of your +size+ property
			 */
			other : true,
			/** @scratch /panels/terms/5
			 * size:: Show this many terms
			 */
			size : 10,
			/** @scratch /panels/terms/5
			 * order:: In terms mode: count, term, reverse_count or reverse_term,
			 * in terms_stats mode: term, reverse_term, count, reverse_count,
			 * total, reverse_total, min, reverse_min, max, reverse_max, mean or reverse_mean
			 */
			order : 'count',
			style : {
				"font-size" : '10pt'
			},
			/** @scratch /panels/terms/5
			 * arrangement:: In bar or pie mode, arrangement of the legend. horizontal or vertical
			 */
			arrangement : 'horizontal',
			/** @scratch /panels/terms/5
			 * counter_pos:: The location of the legend in respect to the chart, above or below.
			 */
			counter_pos : 'above',
			/** @scratch /panels/terms/5
			 * spyable:: Set spyable to false to disable the inspect button
			 */
			spyable : true,
			/** @scratch /panels/terms/5
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
			 * tmode:: Facet mode: terms or terms_stats
			 */
			tmode : 'terms',
			/** @scratch /panels/terms/5
			 * tstat:: Terms_stats facet stats field
			 */
			tstat : 'total',
			/** @scratch /panels/terms/5
			 * valuefield:: Terms_stats facet value field
			 */
			valuefield : '',
			/**
			 * density_min: Density min
			 */
			density_min : 0,
			/**
			 * density_min: Density max
			 */
			density_max : 500,
			/**
			 * density_min_color: color of density min point
			 */
			density_min_color : '#ff0000',
			/**
			 * density_min_color: color of density max point
			 */
			density_max_color : '#00ff00'
		};
		_.defaults($scope.panel, defaults);

		$scope.hits = 0;
		$scope.options = false;

		$scope.init = function() {
			$scope.$on('refresh', function() {
				$scope.get_data();
			});
			$scope.get_data();
		};

		$scope.get_data = function() {

			// Make sure we have everything for the request to complete
			if (dashboard.indices.length === 0) {
				return;
			}
			$scope.panelMeta.loading = true;

			var request,
			    boolQuery,
			    queries;
			
			$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);
			request = $scope.ejs.Request().indices(dashboard.indices);
			queries = querySrv.getQueryObjs($scope.panel.queries.ids);

			boolQuery = $scope.ejs.BoolQuery();
			_.each(queries, function(q) {
				boolQuery = boolQuery.should(querySrv.toEjsObj(q));
			});

			// Then the insert into facet and make the request
			request = request.facet($scope.ejs.TermsFacet('hitsmap').field($scope.panel.field).size($scope.panel.size).exclude($scope.panel.exclude).facetFilter($scope.ejs.QueryFilter($scope.ejs.FilteredQuery(boolQuery, filterSrv.getBoolFilter(filterSrv.ids()))))).size(0);

			$scope.populate_modal(request);

			var results = request.doSearch();

			// Populate scope when we have results
			results.then(function(results) {
				$scope.panelMeta.loading = false;
				$scope.hits = results.hits.total;
				$scope.data = {};
				if ($scope.hits && results.facets && results.facets.hitsmap) {
					_.each(results.facets.hitsmap.terms, function(v) {
						if (v.term)
							$scope.data[v.term.toUpperCase()] = v.count;
					});
				}
				$scope.$emit('render');
			});
		};

		// I really don't like this function, too much dom manip. Break out into directive?
		$scope.populate_modal = function(request) {
			$scope.inspector = angular.toJson(JSON.parse(request.toString()), true);
		};

		$scope.build_search = function(field, value) {
			filterSrv.set({
				type : 'field',
				field : field,
				query : value,
				mandate : "must"
			});
		};
				
		$scope.set_refresh = function(state) {
			$scope.refresh = state;
		};

		$scope.renderChart = function() {
			$scope.$emit('render');
		};
	}]);

	module.directive('mapChart', ['querySrv',
	function(querySrv) {
		return {
			restrict : 'A',
			template : '<div></div>',
			link : function(scope, elem) {
				var contentElement = uniqueIdGenerator();
				var headerElement = uniqueIdGenerator();

				elem.append('<div id="' + contentElement + '" style="margin:10px"></div>');
				elem.append('<div id="' + headerElement + '"></div>');

				// Receive render events
				scope.$on('render', function() {
					render_panel();
				});

				//Re-render if the window is resized
				angular.element(window).bind('resize', function() {
					render_panel();
				});

				function getDensityValue(data, code) {
					if ( typeof (data) !== "undefined" && data != '' && data[code.toUpperCase()] != undefined) {
						return data[code.toUpperCase()];
					}
					return 0;
				}

				function randomString(length) {
					var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');

					if (!length) {
						length = Math.floor(Math.random() * chars.length);
					}

					var str = '';
					for (var i = 0; i < length; i++) {
						str += chars[Math.floor(Math.random() * chars.length)];
					}
					return str;
				}

				function uniqueIdGenerator() {
					return randomString(5) + Date.now();
				}

				function caculateGradient(color1, color2, ratio) {
					var hex = function(x) {
						x = x.toString(16);
						return (x.length == 1) ? '0' + x : x;
					};

					var r = Math.ceil(parseInt(color1.substring(0, 2), 16) * ratio + parseInt(color2.substring(0, 2), 16) * (1 - ratio));
					var g = Math.ceil(parseInt(color1.substring(2, 4), 16) * ratio + parseInt(color2.substring(2, 4), 16) * (1 - ratio));
					var b = Math.ceil(parseInt(color1.substring(4, 6), 16) * ratio + parseInt(color2.substring(4, 6), 16) * (1 - ratio));

					var middle = hex(r) + hex(g) + hex(b);
					return '#' + middle;
				}

				function handleLabels(layer, svg, projection, path, options) {
					options = options || {};
					var labelStartCoodinates = projection([-67.707617, 42.722131]);
					svg.selectAll(".datamaps-subunit").attr("data-foo", function(d) {
						var center = path.centroid(d);
						var xOffset = 7.5,
						    yOffset = 5;

						if (["FL", "KY", "MI"].indexOf(d.id) > -1)
							xOffset = -2.5;
						if (d.id === "NY")
							xOffset = -1;
						if (d.id === "MI")
							yOffset = 18;
						if (d.id === "LA")
							xOffset = 13;
						var x = center[0] - xOffset;
						var y = center[1] + yOffset;

						var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
						if (smallStateIndex > -1) {
							var yStart = labelStartCoodinates[1];
							x = labelStartCoodinates[0];
							y = yStart + (smallStateIndex * (2 + (options.fontSize || 12)));
							layer.append("line").attr("x1", x - 3).attr("y1", y - 5).attr("x2", center[0]).attr("y2", center[1]).style("stroke", options.labelColor || "#000").style("stroke-width", options.lineWidth || 1);
						}

						layer.append("text").attr("x", x).attr("y", y).style("font-size", (options.fontSize || 10) + 'px').style("font-family", options.fontFamily || "Verdana").style("fill", options.labelColor || "#000").text(d.id);
						return "bar";
					});
				}

				function val(datumValue, optionsValue, context) {
					if ( typeof context === 'undefined') {
						context = optionsValue;
						optionsValues = undefined;
					}
					var value = typeof datumValue !== 'undefined' ? datumValue : optionsValue;

					if ( typeof value === 'undefined') {
						return null;
					}

					if ( typeof value === 'function') {
						var fnContext = [context];
						if (context.geography) {
							fnContext = [context.geography, context.data];
						}
						return value.apply(null, fnContext);
					} else {
						return value;
					}
				}

				function handleGeographyConfig(svg, self, data) {
					var hoverover;
					var options = {
						dataUrl : null,
						hideAntarctica : true,
						borderWidth : 1,
						borderColor : '#FDFDFD',
						popupTemplate : function(geography, data) {
							return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
						},
						popupOnHover : true,
						highlightOnHover : true,
						highlightFillColor : '#FC8D59',
						highlightBorderColor : 'rgba(250, 15, 160, 0.2)',
						highlightBorderWidth : 2
					};

					if (options.highlightOnHover || options.popupOnHover) {
						svg.selectAll('.datamaps-subunit').on('mouseover', function(d) {
							var $this = d3.select(this);
							var datum = data[d.id] || {};
							if (options.highlightOnHover) {
								var previousAttributes = {
									'fill' : $this.style('fill'),
									'stroke' : $this.style('stroke'),
									'stroke-width' : $this.style('stroke-width'),
									'fill-opacity' : $this.style('fill-opacity')
								};

								$this.style('fill', val(datum.highlightFillColor, options.highlightFillColor, datum)).style('stroke', val(datum.highlightBorderColor, options.highlightBorderColor, datum)).style('stroke-width', val(datum.highlightBorderWidth, options.highlightBorderWidth, datum)).style('fill-opacity', val(datum.highlightFillOpacity, options.highlightFillOpacity, datum)).attr('data-previousAttributes', JSON.stringify(previousAttributes));

								//as per discussion on https://github.com/markmarkoh/datamaps/issues/19
								if (!/((MSIE)|(Trident))/.test) {
									moveToFront.call(this);
								}
							}

							if (options.popupOnHover) {
								updatePopup(elem, d, options, svg);
							}
						}).on('mouseout', function() {
							var $this = d3.select(this);

							if (options.highlightOnHover) {
								//reapply previous attributes
								var previousAttributes = JSON.parse($this.attr('data-previousAttributes'));
								for (var attr in previousAttributes ) {
									$this.style(attr, previousAttributes[attr]);
								}
							}
							$this.on('mousemove', null);
							d3.selectAll('.datamaps-hoverover').style('display', 'none');
						});
					}

					function moveToFront() {
						this.parentNode.appendChild(this);
					}

				}

				function updatePopup(element, d, options, svg) {
					/*
					 element.on('mousemove', null);
					 element.on('mousemove', function() {
					 var position = d3.mouse(element);
					 d3.select(svg[0][0].parentNode).select('.datamaps-hoverover').style('top', ((position[1] + 30)) + "px").html(function() {
					 var data = JSON.parse(element.attr('data-info'));
					 //if ( !data ) return '';
					 return options.popupTemplate(d, data);
					 }).style('left', (position[0]) + "px");
					 });

					 d3.select(svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
					 */
				};

				function render_panel() {
					$("#" + contentElement).html("");
					$("#" + headerElement).html("");

					var margin = {
						top : 0,
						left : 0,
						bottom : 0,
						right : 0
					},
					    m_width = elem.width(),
					    width = 938,
					    height = 550;

					var densityMin = (scope.panel.density_max - scope.panel.density_min) / 5;
					var color1 = scope.panel.density_min_color.substring(1, scope.panel.density_min_color.length);
					var color2 = scope.panel.density_max_color.substring(1, scope.panel.density_min_color.length);
					var color = d3.scale.threshold().domain([scope.panel.density_min, densityMin + scope.panel.density_min, scope.panel.density_min + densityMin * 2, scope.panel.density_min + densityMin * 3, scope.panel.density_min + densityMin * 4, scope.panel.density_min + densityMin * 5]).range([scope.panel.density_min_color, caculateGradient(color1, color2, 0.95), caculateGradient(color1, color2, 0.8), caculateGradient(color1, color2, 0.6), caculateGradient(color1, color2, 0.4), caculateGradient(color1, color2, 0.25), scope.panel.density_max_color]);

					// A position encoding for the key only.
					var x = d3.scale.linear().domain([scope.panel.density_min, scope.panel.density_max]).range([0, width / 2]);

					var xAxis = d3.svg.axis().scale(x).orient("bottom").tickSize(13).tickValues(color.domain());

					// ftp://kygeonet.ky.gov/kygeodata/standards/Ky_StatePlane.pdf
					var projection = (scope.panel.scope == "usa") ? d3.geo.albersUsa().scale(width).translate([width / 2, height / 2]) : d3.geo.mercator().scale(150).translate([width / 2, height / 1.5]);
					var path = d3.geo.path().projection(projection);

					var svg = d3.select('#' + contentElement).append("svg").attr("preserveAspectRatio", "xMidYMid").attr("viewBox", "10 10 " + width + " " + height).attr("width", m_width).attr("height", m_width * height / width);
					svg.append("rect").attr("class", "hitsmap-background").attr("width", width).attr("height", height).on("click", handle_clicked);

					var svgCaption = d3.select('#' + headerElement).append("svg").attr("width", m_width - 20).attr("height", 70);
					var g = svgCaption.append("g").attr("class", "key").attr("transform", "translate(10,40)");
					var country,
					    gmain = svg.append("g");

					g.selectAll("rect").data(color.range().map(function(d, i) {
						return {
							x0 : i ? x(color.domain()[i - 1]) : x.range()[0],
							x1 : i < color.domain().length ? x(color.domain()[i]) : x.range()[1],
							z : d
						};
					})).enter().append("rect").attr("height", 8).attr("x", function(d) {
						return d.x0;
					}).attr("width", function(d) {
						return width / 10;
					}).style("fill", function(d) {
						return d.z;
					});

					d3.select('#' + contentElement).append('div').attr('class', 'datamaps-hoverover').style('z-index', 10001).style('position', 'absolute');

					g.call(xAxis).append("text").attr("class", "caption").attr("y", -6).text("Density range by color");

					if (!scope.panel.scope) {
						scope.panel.scope = "world";
					}
					fill_map(scope.panel.scope);

					function fill_map(name) {
						d3.json("app/panels/d3js/hitsmap/data/" + name + ".topo.json", function(error, topo) {
							gmain.append("g").attr("id", "datamaps-" + name).selectAll("path").data(topojson.feature(topo, topo.objects.subunits).features).enter().append("path").attr("id", function(d) {
								return d.id;
							}).attr("class", "datamaps-subunit").attr("d", path).style("fill", function(d) {
								var val = getDensityValue(scope.data, d.id);
								return val > 0 ? color(val) : "rgb(196, 196, 196)";
							}).on("click", handle_clicked).append("title").text(function(d) {
								return d.properties.name + ": Total " + getDensityValue(scope.data, d.id);
							});
							if (scope.panel.scope != "world") {
								handleLabels(gmain, svg, projection, path);
							}
							handleGeographyConfig(svg, this, scope.data);
						});
					}

					function zoom(xyz) {
						gmain.transition().duration(750).attr("transform", "translate(" + projection.translate() + ")scale(" + xyz[2] + ")translate(-" + xyz[0] + ",-" + xyz[1] + ")").select("#map-countries").style("stroke-width", 1.0 / xyz[2] + "px");
					}

					function get_xyz(d) {
						var bounds = path.bounds(d);
						var w_scale = (bounds[1][0] - bounds[0][0]) / width;
						var h_scale = (bounds[1][1] - bounds[0][1]) / height;
						var z = 0.70 / Math.max(w_scale, h_scale);
						var x = (bounds[1][0] + bounds[0][0]) / 2;
						var y = (bounds[1][1] + bounds[0][1]) / 2 + (height / z / 6);
						return [x, y, z];
					}

					function handle_clicked(d) {
						if (d && country !== d) {
							var xyz = get_xyz(d);
							country = d;
							if (d.id == 'USA' || d.id == 'GBR') {
								d3.select('.datamaps-world').style('display', 'none');
								fill_map(d.id);
								zoom(xyz);
							} else {
								zoom(xyz);
							}
						} else {
							var xyz = [width / 2, height / 1.5, 1];
							country = null;
							zoom(xyz);
						}
					}

				}

			}
		};
	}]);

	function isEmpty(value) {
		return angular.isUndefined(value) || value === '' || value === null || value !== value;
	}


	module.directive('ngMin', function() {
		return {
			restrict : 'A',
			require : 'ngModel',
			link : function(scope, elem, attr, ctrl) {
				scope.$watch(attr.ngMin, function() {
					ctrl.$setViewValue(ctrl.$viewValue);
				});
				var minValidator = function(value) {
					var min = scope.$eval(attr.ngMin) || 0;
					if (!isEmpty(value) && value < min) {
						ctrl.$setValidity('ngMin', false);
						return undefined;
					} else {
						ctrl.$setValidity('ngMin', true);
						return value;
					}
				};

				ctrl.$parsers.push(minValidator);
				ctrl.$formatters.push(minValidator);
			}
		};
	});

	module.directive('ngMax', function() {
		return {
			restrict : 'A',
			require : 'ngModel',
			link : function(scope, elem, attr, ctrl) {
				scope.$watch(attr.ngMax, function() {
					ctrl.$setViewValue(ctrl.$viewValue);
				});
				var maxValidator = function(value) {
					var max = scope.$eval(attr.ngMax) || Infinity;
					if (!isEmpty(value) && value > max) {
						ctrl.$setValidity('ngMax', false);
						return undefined;
					} else {
						ctrl.$setValidity('ngMax', true);
						return value;
					}
				};

				ctrl.$parsers.push(maxValidator);
				ctrl.$formatters.push(maxValidator);
			}
		};
	});
});
