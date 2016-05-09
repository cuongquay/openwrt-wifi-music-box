define([
    'angular',
    'app',
    'config',
    'require',
    'd3',
    'lodash',
    'jquery',
    'css!./module.css'
],
        function(angular, app, config, require, d3, _, $) {
            'use strict';
            var module = angular.module('go4smac.panels.sunburn', []);
            app.useModule(module);
            module.controller('sunburnController', ['$scope', '$rootScope', '$timeout', 'alertSrv', 'ejsResource', "querySrv", "dashboard", "filterSrv", "fields", function($scope, $rootScope, $timeout, alertSrv, ejsResource, querySrv, dashboard, filterSrv, fields) {
                    $scope.init = function() {
                        $scope.request = $scope.ejs.Request();

                        var date = new Date();
                        $scope.get_data();
                    };

                    $scope.$on('refresh', function(event) {
                        $scope.get_data();
                    });

                    $scope.get_data = function() {
                        $rootScope.lock();
                        $scope.chartSelector = "#" + $scope.panel.panel_id + '-sunburn-chart';
                        d3.select($scope.chartSelector).html("");
                        var field = $scope.panel.value_field;
                        var request = $scope.ejs.Request().indices(dashboard.indices);
                        var flag = false;
                        var aggs = $scope.ejs.TermsAggregation(field)
                                .field(field)
                                .order('_count', 'desc');

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
                            data = data.aggregations[field].buckets;
                            var total = 0;
                            for (var i = 0; i < data.length; i++)
                                total += data[i].doc_count;
                            $scope.root = {key: 'All', doc_count: total, version: {buckets: data}};
                            if (!$scope.tooltip) {
                                $scope.tooltip = d3.select("body")
                                    .append("div")
                                    .attr("class", "d3-tooltip");
                            }

                            $scope.draw_chart($scope.root, $scope.tooltip);
                        }, function(error) {
                            console.log(error);
                        });
                    };

                    $scope.draw_chart = function(root, tooltip) {
                        var width = d3.select($scope.chartSelector).style('width').replace('px', '');
                        width = Math.floor(parseInt(width) * 0.8);
                        var height = width + 30,
                                radius = Math.min(width, height) / 2;
                        if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0)
                            return false;
                        var x = d3.scale.linear()
                                .range([0, 2 * Math.PI]);

                        var y = d3.scale.sqrt()
                                .range([0, radius]);

                        var color = d3.scale.category20c();
                        var color2 = d3.scale.category20c();
                        var svg = d3.select($scope.chartSelector).append("svg")
                                .attr("width", width)
                                .attr("height", height)
                                .append("g")
                                .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

                        var inner = d3.select($scope.chartSelector).append('div')
                                .attr('class', 'chart-summary').append('div')
                                .attr('class', 'item').append('div')
                                .attr('class', 'inner');

                        inner.append('div').attr('class', 'title').text('Top ' + $scope.panel.value_field);
                        var bar = inner.append('div').attr('class', 'bar');
                        var d = $scope.root.version.buckets[0];
                        var top = d.key;
                        top = top + '<br/>' + d.doc_count + ' / ' + $scope.root.doc_count + '<br/>' + (d.doc_count * 100 / $scope.root.doc_count).toFixed(2) + '%';
                        var number = inner.append('div').attr('class', 'number').html(top);
                        var total3 = 0;
                        _.each($scope.root.version.buckets.slice(0, 3), function(item) {
                            total3 += (item && item.doc_count) || 0;
                        });
                        total3 = total3 || 1;
                        bar.selectAll('div')
                                .data($scope.root.version.buckets.slice(0, 3))
                                .enter()
                                .append('div')
                                .attr('class', 'bar-inner')
                                .style('width', function(d) {
                                    return (d.doc_count * 100 / total3).toFixed(2) + '%';
                                })
                                .style('background-color', function(d) {
                                    return color2(d.key);
                                })
                                .on('mouseover', function(d) {
                                    number.html(d.key + '<br/>' + d.doc_count + ' / ' + $scope.root.doc_count + '<br/>' + (d.doc_count * 100 / $scope.root.doc_count).toFixed(2) + '%');
                                })
                                .on('mouseout', function(d) {
                                    number.html(top);
                                });

                        var partition = d3.layout.partition()
                                .children(function(d) {
                                    return d.version ? d.version.buckets : d.version;
                                })
                                .value(function(d) {
                                    return d.doc_count;
                                });

                        var arc = d3.svg.arc()
                                .startAngle(function(d) {
                                    return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
                                })
                                .endAngle(function(d) {
                                    return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
                                })
                                .innerRadius(function(d) {
                                    return Math.max(0, y(d.y));
                                })
                                .outerRadius(function(d) {
                                    return Math.max(0, y(d.y + d.dy));
                                });

                        var path = svg.selectAll("path")
                                .data(partition.nodes(root))
                                .enter().append("path")
                                .attr("d", arc)
                                .style("fill", function(d) {
                                    return color(d.children ? d.key : d.parent.key + ' ' + d.key);
                                })
                                .on("click", click)
                                .on("mouseout", hide)
                                .on("mouseover", show)
                                .on("mousemove", move);

                        function click(d) {
                            path.transition()
                                    .duration(750)
                                    .attrTween("d", arcTween(d));
                        }

                        function hide() {
                            tooltip.style('opacity', 0);
                        }

                        function show(d) {
                            tooltip.html(function() {
                                return d.key + ' (' + d.doc_count + ')';
                            })
                            .style("left", (d3.event.pageX + 10) + 'px')
                            .style("top", (d3.event.pageY + 10) + 'px')
                            .style("opacity", 1);
                        }

                        function move() {
                            tooltip.style("left", (d3.event.pageX + 10) + 'px')
                                    .style("top", (d3.event.pageY + 10) + 'px');
                        }

                        // Interpolate the scales!
                        function arcTween(d) {
                            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                                    yd = d3.interpolate(y.domain(), [d.y, 1]),
                                    yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
                            return function(d, i) {
                                return i
                                        ? function(t) {
                                            return arc(d);
                                        }
                                : function(t) {
                                    x.domain(xd(t));
                                    y.domain(yd(t)).range(yr(t));
                                    return arc(d);
                                };
                            };
                        }
                    };
                }]);
        });