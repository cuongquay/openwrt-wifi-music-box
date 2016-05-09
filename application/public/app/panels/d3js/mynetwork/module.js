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
define(['angular', 'app', 'lodash', 'require', 'd3', 'topojson',
'app/panels/mynetwork/lib/modernizr-2.js', 'css!./module.css', 'css!./css/main.css'], function(angular, app, _, require, d3, topojson) {'use strict';

   var module = angular.module('kibana.panels.mynetwork', []);
   app.useModule(module);

   module.controller('mynetwork', ['$scope',
   function($scope) {
      $scope.panelMeta = {
         status : "Stable",
         description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
      };
      $scope.showhide = 0;
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
         var getColorVal = "da7c00";
         var styleVal = 0;

         d3Example(0, styleVal);
      };
      var styleColors = ['fd78bd', 'a186be', '662d91', '5ea95c', 'ffdd00', '6dcff6', 'd74d94', '46142e', 'f26d7d', '5dbab9', '80bb42', 'cacec2', 'f1b867', '003663', 'f5989d', 'cd6f3c', '00a99d', '2e5a59', 'fff799', 'fbaf5d', '003663', '052a24', 'fff799', 'fbaf5d', '007236', 'aa71aa', 'bbbb42', '9ac2b9', '1d3b56', 'f26c4f', 'ee3224', 'fed42a', '82ca9c', 'aaa6ce', '455870', '0b6e5f', '00aeef', '448ccb', '7b0046', 'c4d9ec'];
      var root = function(classes) {
         var map = {};

//         console.log("classes", classes);
         var userBeerType = $('#beerType').val();
//         console.log("userBeerType in packages.js", userSrvBeerType);
         var filteredClasses = [];
         var beerStyles = [];
         var beerStylesColors = [];

         for (var i = 0; i < classes.length; i++) {

            if (userBeerType == 0) {
               //light beer

               if (classes[i].color > 6 && classes[i].color <= 10) {
                  filteredClasses.push(classes[i]);

                  var newStyle = classes[i].style;

                  if (beerStyles.indexOf(newStyle) === -1) {
                     beerStyles.push(newStyle);
                     beerStylesColors.push(classes[i].style_color);
                  }

               }
            }

            if (userBeerType == 1) {
               //medium beer
               if (classes[i].color > 13 && classes[i].color <= 15) {
                  filteredClasses.push(classes[i]);

                  var newStyle = classes[i].style;

                  if (beerStyles.indexOf(newStyle) === -1) {
                     beerStyles.push(newStyle);
                     beerStylesColors.push(classes[i].style_color);
                  }
               }
            }

            if (userBeerType == 2) {
               //dark beer
               if (classes[i].color > 38 && classes[i].color <= 40) {
                  filteredClasses.push(classes[i]);

                  var newStyle = classes[i].style;

                  if (beerStyles.indexOf(newStyle) === -1) {
                     beerStyles.push(newStyle);
                     beerStylesColors.push(classes[i].style_color);
                  }
               }
            }

         }

         renderBeerStyles(beerStyles, beerStylesColors);

         function find(name, data) {
            var node = map[name], i;
            if (!node) {
               node = map[name] = data || {
                  name : name,
                  children : []
               };

               // console.log("node:", node);

               if (name.length) {
                  i = name.lastIndexOf(".");
                  // console.log("i:", i);

                  node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
                  // console.log("node parent:", node.parent);
                  // node.parent = ["shreyas"]
                  node.parent.children.push(node);
                  node.key = name.substring(i + 1);

               }
            }
            return node;
         }


         filteredClasses.forEach(function(d) {
            find(d.name, d);
         });

         return map[""];
      };

      function renderBeerStyles(bStyles, bStylesColors) {
         // console.log("beer styles:", bStyles, bStyles.length, typeof bStyles, typeof bStyles.length);

         // console.log("style colors:", styleColors);

         var styleContainer = jQuery('#list-beerstyle');
         styleContainer.html('');

         styleContainer.html('');
         var header = jQuery('#styleHead');
         header.html('');
         var type = "Light";
         // header.append("<h3>Site Styles<h3>");
         // console.log("bStyles: ", bStyles);
         if (bStyles && bStyles.length > -1) {
            // console.log("beer styles:", bStyles, bStyles.length, typeof bStyles, typeof bStyles.length, bStylesColors, styleColors[bStylesColors]);

            for (var i = 0; i < bStyles.length; i++) {
               var tempInsertElement = '<li><span class="beerstyle-name">' + bStyles[i] + '</span><span class="beerstyle-color" style="background-color:#' + styleColors[bStylesColors[i] - 1] + '">&nbsp;</span></li>';
               styleContainer.append(tempInsertElement);
            }
         }
      };

      // Return a list of imports for the given array of nodes.
      var imports = function(nodes) {
         var map = {}, imports = [];

         // Compute a map from name to node.
         nodes.forEach(function(d) {
            map[d.name] = d;
         });

         // For each import, construct a link from the source to target node.
         nodes.forEach(function(d) {
            if (d.related)
               d.related.forEach(function(i) {
                  imports.push({
                     source : map[d.name],
                     target : map[i]
                  });
               });
         });

         return imports;
      };

      var d3Example = function(colorVal, styleVal) {

         // console.log("color Value:", colorVal, "style Value:", styleVal);

         var w = 900, h = 800, rx = w / 2 -20, ry = h / 2 - 20, m0, rotate = 0;

         var splines = [];

         var cluster = d3.layout.cluster().size([360, ry - 120]).sort(function(a, b) {
            return d3.ascending(a.key, b.key);
         });

         var bundle = d3.layout.bundle();

         var line = d3.svg.line.radial().interpolate("bundle").tension(.85).radius(function(d) {
            return d.y;
         }).angle(function(d) {
            return d.x / 180 * Math.PI;
         });

         // Chrome 15 bug: <http://code.google.com/p/chromium/issues/detail?id=98951>
         jQuery('#wrapper-viz').html('');
         var div = d3.select("#wrapper-viz");

         var svg = div.append("svg:svg").attr("width", w).attr("height", w).append("svg:g").attr("transform", "translate(" + rx + "," + (ry + 100) + ")");

         svg.append("svg:path").attr("class", "arc").attr("d", d3.svg.arc().outerRadius(ry - 120).innerRadius(0).startAngle(0).endAngle(2 * Math.PI)).on("mousedown", mousedown);

         var filename = 'app/panels/mynetwork/data/data.json';
         // console.log("filename", filename);
         d3.json(filename, function(error, classes) {

            var nodes = cluster.nodes(root(classes)), links = imports(nodes), splines = bundle(links);
            var path = svg.selectAll("path.link").data(links).enter().append("svg:path").attr("class", function(d) {
               return "link source-" + d.source.key + " target-" + d.target.key;
            }).attr("stroke", function(d, i) {
               // console.log("style value", d.style_color, "line:", d.source.style_color);
               return '#' + styleColors[d.source.style_color - 1];
            }).attr("d", function(d, i) {
               return line(splines[i]);
            });

            var label = svg.selectAll("g.node").data(nodes.filter(function(n) {
               return !n.children;
            })).enter().append("svg:g").attr("class", "node1").attr("id", function(d) {
               return "node-" + d.key;
            }).attr("transform", function(d) {
               return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
            });

            label.append("circle").attr("cx", 0).attr("cy", 0).attr("fill", function(d, i) {
               return '#' + styleColors[d.style_color - 1];
            }).attr("opacity", 1.0).attr("r", function(d, i) {
               return Math.round(Math.pow(d.size, 1 / 3));
            });

            label.append("svg:text").attr("dx", function(d) {
               return d.x < 180 ? 30 : -30;
            }).attr("dy", "0.31em").attr("font-size", function(d, i) {
               // console.log("font-size", d.size);

               // var textSize = 1 + (d.size/1000);
               var textSize = 1.2;
               return textSize + 'em';
            }).attr("fill", function(d, i) {

               return '#' + styleColors[d.style_color - 1];
            }).attr("beerid", function(d, i) {
               // console.log("beer id:", d.id);

               return d.id;
            }).attr("text-anchor", function(d) {
               return d.x < 180 ? "start" : "end";
            }).attr("transform", function(d) {
               return d.x < 180 ? null : "rotate(180)";
            }).text(function(d) {

               var beerName = d.key;

               // console.log("beer name:", beerName, beerName.length, beerName.slice(0, 10));

               if (beerName.length > 20) {
                  beerName = d.key.slice(0, 19);

                  beerName = beerName + '...';
               }

               return beerName;
            }).on("mouseover", function(d, i) {
               // console.log("style color:", d.id);

               loadData(d.id);

               mouseover(d, i);
            }).on("mouseout", mouseout).append("svg:title").text(function(d) {
               return d.key;
            });
         });

         // d3.select(window)
         //     .on("mousemove", mousemove)
         //     .on("mouseup", mouseup);

         function mouse(e) {
            return [e.pageX - rx, e.pageY - ry];
         }

         function mousedown() {
            m0 = mouse(d3.event);
            d3.event.preventDefault();
         }

         function mousemove() {
            if (m0) {
               var m1 = mouse(d3.event), dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;
               div.style("-webkit-transform", "translate3d(0," + (ry - rx) + "px,0)rotate3d(0,0,0," + dm + "deg)translate3d(0," + (rx - ry) + "px,0)");
            }
         }

         function loadData(id) {
            var subPlotData;
            var code = id.slice(0, 2);
            // console.log(code);
            // Added to display the block only when user hovers
            if (code != 'DF') {
               $('#wrapper-details').css("display", "block");
               $('#wrapper-details').css("background", "rgba(190, 215, 53, 0.77)");
               $('#list-beersummary').css("display", "block");
            }
            var path = 'app/panels/mynetwork/data/aroma.json';
            jQuery.getJSON(path, function(data) {

               jQuery.each(data, function(key, val) {
                  if (val.id == id) {
                     // console.log("hover values:", val);
                     $('#beersummary-name').html(val.name.split(".")[1]);
                     $('#beersummary-style').text('Style: ' + val.style);
                     $('#beersummary-ABV').text('ABV: ' + val.ABV);
                     $('#beersummary-rating').html('Average Rating of <span class=highlight>  ' + val.avg_rating + ' / 5</span> by <b>' + val.size + '</b> users');
                     $('#beersummary-rating').text(val.user);

                  }

               });
            });
         }

         function mouseup() {
            if (m0) {
               var m1 = mouse(d3.event), dm = Math.atan2(cross(m0, m1), dot(m0, m1)) * 180 / Math.PI;

               rotate += dm;
               if (rotate > 360)
                  rotate -= 360;
               else if (rotate < 0)
                  rotate += 360;
               m0 = null;

               div.style("-webkit-transform", "rotate3d(0,0,0,0deg)");

               svg.attr("transform", "translate(" + rx + "," + ry + ")rotate(" + rotate + ")").selectAll("g.node text").attr("dx", function(d) {
                  return (d.x + rotate) % 360 < 180 ? 30 : -30;
               }).attr("text-anchor", function(d) {
                  return (d.x + rotate) % 360 < 180 ? "start" : "end";
               }).attr("transform", function(d) {
                  return (d.x + rotate) % 360 < 180 ? null : "rotate(180)";
               });
            }
         }

         var pathOriginalColor = '';

         function mouseover(d) {
            jQuery('#wrapper-viz').addClass('chordhover');

            // svg.selectAll("path").attr("stroke", "#999999");

            svg.selectAll("path.link.target-" + d.key)
            // .attr("stroke", "red")
            .classed("target", true).each(updateNodes("source", true));

            svg.selectAll("path.link.source-" + d.key).classed("source", true).each(updateNodes("target", true));

         }

         function mouseout(d) {

            jQuery('#wrapper-viz').removeClass('chordhover');

            svg.selectAll("path.link.source-" + d.key).classed("source", false).each(updateNodes("target", false));

            svg.selectAll("path.link.target-" + d.key).classed("target", false).each(updateNodes("source", false));
         }

         function updateNodes(name, value) {
            return function(d) {
               if (value)
                  this.parentNode.appendChild(this);
               svg.select("#node-" + d[name].key).classed(name, value);
            };
         }

         function cross(a, b) {
            return a[0] * b[1] - a[1] * b[0];
         }

         function dot(a, b) {
            return a[0] * b[0] + a[1] * b[1];
         }

      };

   }]);

});
