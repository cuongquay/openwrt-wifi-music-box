define([
   'angular',
   'app',
   'config',
   'require',
   'd3'
],
        function(angular, app, config, require, d3) {
           'use strict';

           var module = angular.module('kibana.panels.platforms', []);
           app.useModule(module);
           module.controller('platformsCtrl', ['$scope', 'alertSrv', 'ejsResource', 'querySrv', function($scope, alertSrv, ejsResource, querySrv) {
                 function search(options) {
                    var date = new Date();
                    $scope.get_platforms('log-' + date.getFullYear() + '.*');
                 }

                 $scope.init = function() {
                    var userEmail = 'guest';
                    if ($scope.userInfo && $scope.userInfo.email) {
                       userEmail = $scope.userInfo.email;
                    }
                    $scope.userEmail = userEmail;
                    $scope.ejs = ejsResource(config.elasticsearch);
                    $scope.request = $scope.ejs.Request();

                    var date = new Date();
                    $scope.get_platforms('log-' + date.getFullYear() + '.*');
                 };

                 if (!$scope.panel.isUser) {
                    $scope.$on('refresh', function(event) {
                       search();
                    });
                 }

                 $scope.get_platforms = function(indices, options) {
                    $scope.request.indices(indices).searchType('count');
                    if ($scope.panel.isUser)
                       $scope.request.query($scope.ejs.MatchQuery('email', $scope.userEmail));
                    else {
                       var queryArr = querySrv.getQueryObjs($scope.panel.queries);
                       var flag = false;
                       if (queryArr) {
                          var bQuery = $scope.ejs.BoolQuery();
                          for (var i in queryArr) {
                             var qrObj = queryArr[i];
                             if (qrObj.query.trim() !== '*' && qrObj.query.trim() !== '') {
                                var tQuery = $scope.ejs.TermsQuery(qrObj.field, qrObj.query);
                                bQuery.must(tQuery);
                                flag = true;
                             }
                          }
                          if (flag) {
                             $scope.request.query(bQuery);
                          }
                       }
                    }
                    var aggs = $scope.ejs.TermsAggregation('platform')
                            .field('platform')
                            .order('_count', 'desc');

                    var version_aggs = $scope.ejs.TermsAggregation('version')
                            .field('platform_major')
                            .order('_count', 'desc');

                    $scope.request.aggs(aggs.aggregation(version_aggs));
                    $scope.request.doSearch(function(data) {
                       var platform_data = data.aggregations.platform.buckets;
                       var total = 0;
                       for (var i = 0; i < platform_data.length; i++)
                          total += platform_data[i].doc_count;
                       $scope.root = {key: '', doc_count: total, version: {buckets: platform_data}};
                       $scope.tooltip = d3.select("body")
                               .append("div")
                               .attr("class", "d3-tooltip");

                       $scope.draw_chart($scope.root, $scope.tooltip);

                       $scope.$on('tab_select', function(e, panel) {
                          if (panel.panels) {
                             for (var i = 0; i < panel.panels.length; i++) {
                                if (panel.panels[i].type == 'platforms') {
                                   $scope.draw_chart($scope.root, $scope.tooltip);
                                   break;
                                }
                             }
                          }
                          if (panel.type == 'platforms') {
                             $scope.draw_chart($scope.root, $scope.tooltip);
                          }
                       });

                       //Re-render if the window is resized
                       angular.element(window).bind('resize', function() {
                          $scope.draw_chart($scope.root, $scope.tooltip);
                       });
                    }, function(error) {
                       console.log(error);
                    });
                 };

                 $scope.draw_chart = function(root, tooltip) {
                    d3.select('#platform-chart').html("");
                    // d3 start here
                    var width = d3.select('#platform-chart').style('width').replace('px', '');
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
                    color2('blah blah blah');

                    var svg = d3.select("#platform-chart").append("svg")
                            .attr("width", width)
                            .attr("height", height)
                            .append("g")
                            .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

                    var inner = d3.select('#platform-chart').append('div')
                            .attr('class', 'chart-summary').append('div')
                            .attr('class', 'item').append('div')
                            .attr('class', 'inner');

                    inner.append('div').attr('class', 'title').text('Top Platforms');
                    var bar = inner.append('div').attr('class', 'bar');
                    var d = $scope.root.version.buckets[0];
                    var top = d.key + '<br/>' + d.doc_count + ' / ' + $scope.root.doc_count + '<br/>' + (d.doc_count * 100 / $scope.root.doc_count).toFixed(2) + '%';
                    var number = inner.append('div').attr('class', 'number').html(top);
                    bar.selectAll('div')
                            .data($scope.root.version.buckets.slice(0, 3))
                            .enter()
                            .append('div')
                            .attr('class', 'bar-inner')
                            .style('width', function(d) {
                               return (d.doc_count * 100 / $scope.root.doc_count).toFixed(2) + '%';
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
                          if (d.key == '')
                             return 'All Platforms (' + d.doc_count + ')';
                          return (d.children ? d.key : d.parent.key + ' ' + d.key) + ' (' + d.doc_count + ')';
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