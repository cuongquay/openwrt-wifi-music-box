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
define(['angular', 'app', 'lodash', 'jquery', 'require', 'd3', 'classie'], function(angular, app, _, $, require, d3, classie) {
	'use strict';

	var module = angular.module('go4smac.panels.scanner', []);
	app.useModule(module);

	module.controller('scanner', ['$scope', '$rootScope', '$timeout', '$window', '$sce', '$q', '$compile', '$http', 'alertSrv',
	function($scope, $rootScope, $timeout, $window, $sce, $q, $compile, $http, alertSrv) {
		$scope.panelMeta = {
			status : "Stable",
			description : "A static text panel that can use plain text, markdown, or (sanitized) HTML"
		};

		// Set and populate defaults
		var _d = {
		};
		_.defaults($scope.panel, _d);

		$scope.init = function() {
			$scope.validAddr = "192.168.1.*";
			$scope.devices = angular.fromJson(localStorage.getItem('device-list') || "[]");
			$scope.selectedUid = localStorage.getItem('selected-uid');
			$scope.getLocalIPAddress().then(function(addresses) {
				if (addresses.length) {
					var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
					angular.forEach(addresses, function(addr) {
						if (addr.match(ipformat)) {
							$scope.validAddr = addr;
							return true;
						}
					});
					if (!_.isUndefined($scope.validAddr)) {
						var addrs = $scope.validAddr.split(".");
						(addrs[3] = $scope.panel.start) && ($scope.startAddr = addrs.join("."));
						(addrs[3] = $scope.panel.end) && ($scope.endAddr = addrs.join("."));
						(addrs[3] = "*") && ($scope.validAddr = addrs.join("."));
					}
				}
			});
			if (!$scope.devices.length) {
				$scope.showScanner = true;
			}
			$scope.initButtonEffect();		};

		$scope.$on("onDeviceDiscovered", function(event, devices) {
			$scope.selectedUid = localStorage.getItem('selected-uid');
		});

		$scope.onWiFiSettings = function() {
			$scope.next();
		};

		$scope.onDemoMode = function(event) {
			$http.get("app/panels/scanner/devices.json").success(function(data) {
				$scope.showScanner = false;
				$scope.devices = data;
				localStorage.setItem('device-list', angular.toJson($scope.devices));
				$rootScope.$broadcast("onDeviceDiscovered", $scope.devices);
			});
		};
		$scope.onShowScanner = function() {
			$scope.showScanner = !$scope.showScanner;
		};
		$scope.onIpChange = function(value) {
			var addrs = value.split(".");
			(addrs[3] = $scope.panel.start) && ($scope.startAddr = addrs.join("."));
			(addrs[3] = $scope.panel.end) && ($scope.endAddr = addrs.join("."));
			$scope.validAddr = value;
		};

		$scope.onStartChange = function(value) {
			var addrs = value.split(".");
			$scope.panel.start = addrs[3];
			$scope.startAddr = value;
		};

		$scope.onEndChange = function(value) {
			var addrs = value.split(".");
			$scope.panel.end = addrs[3];
			$scope.endAddr = value;
		};
		
		/* $scope.onScanDevices = function(event, resetAllDevices) {
			var count = 0;
			$scope.devices = angular.fromJson(localStorage.getItem('device-list') || "[]");
			if (resetAllDevices) {
				$scope.devices = [];
			}
			if (!$scope.devices.length) {
				$scope.showScanner = true;
				for (var i = $scope.panel.start; i < $scope.panel.end; i++) {
					(function(index) {
						var addrs = $scope.validAddr.split("."); addrs[3] = index;						
						var currentURL = "http://" + addrs.join(".") + "/api/";
						$http.jsonp(currentURL + "info?callback=JSON_CALLBACK", {
							timeout : 250
						}).success(function(data) {
							if (data.WiFiOneR && data.WiFiOneR.version == "v1") {
								var idx = _.chain($scope.devices).pluck("uid").indexOf(data.WiFiOneR.uid).value();
								if (!_.isUndefined(data) && (idx < 0)) {
									$scope.devices.push({
										name : data.WiFiOneR.name,
										service : data.WiFiOneR.service,
										location : currentURL,
										uid : data.WiFiOneR.uid,
										avatar : data.WiFiOneR.avatar,
										mode : 0
									});
								} else {
									$scope.devices[idx].name = data.WiFiOneR.name;
									$scope.devices[idx].location = currentURL;
									$scope.devices[idx].service = data.WiFiOneR.service;
									$scope.devices[idx].uid = data.WiFiOneR.uid;
									$scope.devices[idx].avatar = data.WiFiOneR.avatar;
									$scope.devices[idx].mode = 0;
								}
							}
							$scope.searchingProgressBar(++count, $scope.devices.length);
						}).error(function(error) {
							$scope.searchingProgressBar(++count, $scope.devices.length);
						});
					})(i);
				}
			}
		};*/

		$scope.onScanDevices = function(event, resetAllDevices) {
			var count = 0,
			    addrs = $scope.validAddr.split(".");
			$scope.devices = angular.fromJson(localStorage.getItem('device-list') || "[]");
			if (resetAllDevices) {
				$scope.devices = [];
			}
			if (!$scope.devices.length) {
				$scope.showScanner = true;
				for (var i = $scope.panel.start; i < $scope.panel.end; i++) {
					addrs[3] = i;
					/* replace the last netmask with the index */
					$http({
						method : "GET",
						url : "http://" + addrs.join(".") + "/api/",
						timeout : 100
					}).then(function(result) {
						if (result.status == 200 && result.data.WiFiOneR && result.data.WiFiOneR.version == "v1") {
							var idx = _.chain($scope.devices).pluck("location").indexOf(result.config.url).value();
							if (!_.isUndefined(result.data) && (idx < 0)) {
								$scope.devices.push({
									name : result.data.WiFiOneR.name,
									service : result.data.WiFiOneR.service,
									location : result.config.url,
									uid : result.data.WiFiOneR.uid,
									avatar : result.data.WiFiOneR.avatar,
									mode : 0
								});
							} else {
								$scope.devices[idx].name = result.data.WiFiOneR.name;
								$scope.devices[idx].location = result.config.url;
								$scope.devices[idx].service = result.data.WiFiOneR.service;
								$scope.devices[idx].uid = result.data.WiFiOneR.uid;
								$scope.devices[idx].avatar = result.data.WiFiOneR.avatar;
								$scope.devices[idx].mode = 0;
							}
						}
						$scope.searchingProgressBar(++count, $scope.devices.length);
					}, function(error) {
						$scope.searchingProgressBar(++count, $scope.devices.length);
					});
				}
			}
		};

		$scope.onDeviceClick = function(event, item) {
			item.mode = item.mode || 0;
			if (item.mode <= 2 && item.mode >= 0) {
				item.mode++;
			} else {
				item.mode = 0;
			}
			localStorage.setItem('device-list', angular.toJson($scope.devices));
		};

		$scope.searchingProgressBar = function(count, found) {
			var total = $scope.panel.end - $scope.panel.start;
			$scope.statusText = "Remaining: " + (total - count);
			if (count >= total) {
				$scope.statusText = !found ? "No WiFiOneR found." : "Result: " + found + " device" + (found > 1 ? "s" : "") + " found.";
				localStorage.setItem('device-list', angular.toJson($scope.devices));
				$rootScope.$broadcast("onDeviceDiscovered", $scope.devices);
				$scope.showScanner = false;
			}
			var margin = {
				top : 0,
				right : 0,
				bottom : 0,
				left : 0
			};
			var element = $("#id-search-progress-bar");
			var width = element.width(),
			    height = 2;
			element.empty();
			/* cleanup the existing svg */
			var aspect = (width + margin.left + margin.right) / (height + margin.top + margin.bottom);
			var xScale = d3.time.scale().domain([$scope.panel.start, $scope.panel.end]).range([1, width - 1]);
			var xAxis = d3.svg.axis().scale(xScale).tickSize(10);
			var svg = d3.select(element[0]).append("svg").attr("width", width + margin.left + margin.right).attr("height", (height + margin.top + margin.bottom)).attr("viewBox", "0 0 " + (width + margin.left + margin.right) + " " + (height + margin.top + margin.bottom)).attr("preserveAspectRatio", "xMidYMid").style("margin", margin.left + "px");
			svg.append("line").attr("x1", 0).attr("y1", 1).attr("x2", xScale(252)).attr("y2", 1).style("stroke-width", 2).style("stroke", "gray").style("fill", "none");
			svg.append("line").attr("x1", 0).attr("y1", 1).attr("x2", xScale(count)).attr("y2", 1).style("stroke-width", 2).style("stroke", "#e44c65").style("fill", "none");
		};

		$scope.getLocalIPAddress = function() {
			var defer = $q.defer();
			var displayAddrs = null;
			// NOTE: window.RTCPeerConnection is "not a constructor" in FF22/23
			var RTCPeerConnection = /*$window.RTCPeerConnection ||*/
			$window.webkitRTCPeerConnection || $window.mozRTCPeerConnection;
			if (RTCPeerConnection) {
				var rtc = new RTCPeerConnection({
					iceServers : []
				});
				if (1 || $window.mozRTCPeerConnection) {// FF [and now Chrome!] needs a channel/stream to proceed
					rtc.createDataChannel('', {
						reliable : false
					});
				};
				rtc.onicecandidate = function(evt) {
					// convert the candidate to SDP so we can run it through our general parser
					// see https://twitter.com/lancestout/status/525796175425720320 for details
					if (evt.candidate)
						grepSDP("a=" + evt.candidate.candidate);
				};
				rtc.createOffer(function(offerDesc) {
					grepSDP(offerDesc.sdp);
					rtc.setLocalDescription(offerDesc);
				}, function(e) {
					console.warn("offer failed", e);
				});
				var addrs = Object.create(null);
				addrs["0.0.0.0"] = false;
				function resolveAddresses(newAddr) {
					if ( newAddr in addrs)
						return;
					else
						addrs[newAddr] = true;
					displayAddrs = Object.keys(addrs).filter(function(k) {
						return addrs[k];
					});
					defer.resolve(displayAddrs);
				}

				function grepSDP(sdp) {
					var hosts = [];
					sdp.split('\r\n').forEach(function(line) {// c.f. http://tools.ietf.org/html/rfc4566#page-39
						if (~line.indexOf("a=candidate")) {// http://tools.ietf.org/html/rfc4566#section-5.13
							var parts = line.split(' '), // http://tools.ietf.org/html/rfc5245#section-15.1
							    addr = parts[4],
							    type = parts[7];
							if (type === 'host')
								resolveAddresses(addr);
						} else if (~line.indexOf("c=")) {// http://tools.ietf.org/html/rfc4566#section-5.7
							var parts = line.split(' '),
							    addr = parts[2];
							resolveAddresses(addr);
						}
					});
				}

			}
			return defer.promise;
		};
	}]);

	module.directive('smartSuperBox', ['$compile', '$q', '$rootScope',
	function($compile, $q, $rootScope) {
		return {
			restrict : 'AE',
			link : function(scope, element) {
				scope.onSuperboxClose = function(event, details, activated) {
					$('.superbox-list').removeClass('active');
					$('.superbox-current-box').animate({
						opacity : 0
					}, 200, function() {
						$('.superbox-show').slideUp();
					});
					if (activated) {
						localStorage.setItem('device-list', angular.toJson(scope.devices));
						localStorage.setItem('selected-uid', details.uid);
						$rootScope.$broadcast("onDeviceDiscovered", scope.devices);
					}
				};
				scope.onSuperboxToggle = function(event, item) {
					if (!scope.panel.scanmode) {
						localStorage.setItem('selected-uid', item.uid);
						$rootScope.$broadcast("onDeviceDiscovered", scope.devices);
					} else {
						var newScope = scope.$new();
						scope.require(['jquery', 'text!panels/scanner/superbox.html'], function($, moduleTemplate) {
							var defered = $q.defer();
							$(".superbox-show").remove();
							var compiledContents = $compile($(moduleTemplate));
							newScope.details = item;
							// Re-add the compiled contents to the element
							compiledContents(newScope, function(clone) {
								defered.resolve(clone);
							});
							defered.promise.then(function(superbox) {
								superbox.appendTo(element.parent()[0]);
								$('.superbox-list').removeClass('active');
								element.addClass('active');
								if ($('.superbox-current-img').css('opacity') == 0) {
									$('.superbox-current-img').animate({
										opacity : 1
									});
								}
								if (element.next().hasClass('superbox-show')) {
									$('.superbox-list').removeClass('active');
									superbox.toggle();
								} else {
									superbox.insertAfter(element).css('display', 'block');
									element.addClass('active');
								}
								$('html, body').animate({
									scrollTop : superbox.position().top - element.find('.superbox-img > img').height()
								}, 'medium', function() {
								});
							});
						});
					}
				};
			}
		};
	}]);
});
