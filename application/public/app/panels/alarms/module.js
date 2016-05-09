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

	var module = angular.module('go4smac.panels.alarms', []);
	app.useModule(module);

	module.controller('alarms', ['$scope', '$rootScope', '$timeout', '$window', '$sce', '$q', '$compile', '$http', 'alertSrv',
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
			$scope.alarmValue = "0 7 * * * ?";
			$scope.alarmActive = false;
			$scope.initClock();
			$scope.initButtonEffect();		};

		$scope.initClock = function() {
			// Cache some selectors

			var clock = $('#clock'),
			    alarm = clock.find('.alarm'),
			    ampm = clock.find('.ampm');

			// Map digits to their names (this will be an array)
			var digit_to_name = 'zero one two three four five six seven eight nine'.split(' ');

			// This object will hold the digit elements
			var digits = {};

			// Positions for the hours, minutes, and seconds
			var positions = ['h1', 'h2', ':', 'm1', 'm2', ':', 's1', 's2'];

			// Generate the digits with the needed markup,
			// and add them to the clock

			var digit_holder = clock.find('.digits');

			$.each(positions, function() {
				if (this == ':') {
					digit_holder.append('<div class="dots">');
				} else {

					var pos = $('<div>');

					for (var i = 1; i < 8; i++) {
						pos.append('<span class="d' + i + '">');
					}

					// Set the digits as key:value pairs in the digits object
					digits[this] = pos;

					// Add the digit elements to the page
					digit_holder.append(pos);
				}
			});

			// Add the weekday names

			var weekday_names = 'MON TUE WED THU FRI SAT SUN'.split(' '),
			    weekday_holder = clock.find('.weekdays');

			$.each(weekday_names, function() {
				weekday_holder.append('<span>' + this + '</span>');
			});

			var weekdays = clock.find('.weekdays span');

			// Run a timer every second and update the clock

			(function update_time() {

				// Use moment.js to output the current time as a string
				// hh is for the hours in 12-hour format,
				// mm - minutes, ss-seconds (all with leading zeroes),
				// d is for day of week and A is for AM/PM

				var now = moment().format("hhmmssdA");

				digits.h1.attr('class', digit_to_name[now[0]]);
				digits.h2.attr('class', digit_to_name[now[1]]);
				digits.m1.attr('class', digit_to_name[now[2]]);
				digits.m2.attr('class', digit_to_name[now[3]]);
				digits.s1.attr('class', digit_to_name[now[4]]);
				digits.s2.attr('class', digit_to_name[now[5]]);

				// The library returns Sunday as the first day of the week.
				// Stupid, I know. Lets shift all the days one position down,
				// and make Sunday last

				var dow = now[6];
				dow--;

				// Sunday!
				if (dow < 0) {
					// Make it last
					dow = 6;
				}

				// Mark the active day of the week
				weekdays.removeClass('active').eq(dow).addClass('active');

				// Set the am/pm text:
				ampm.text(now[7] + now[8]);

				// Schedule this function to be run again in 1 sec
				setTimeout(update_time, 1000);

			})();
		};

		$scope.onAlarmSetting = function() {
			$scope.alarmActive = !$scope.alarmActive;
		};
		$scope.onUpdateAlarm = function(event, value) {
			console.log(value);
		};
	}]);

	module.directive('cronSelection', ['cronService',
	function(cronService) {
		return {
			restrict : 'EA',
			replace : true,
			transclude : true,
			scope : {
				config : '=',
				output : '=?',
				init : '=?'
			},
			templateUrl : 'app/panels/alarms/setting.html',
			link : function($scope) {
				var originalInit = undefined;
				var initChanged = false;
				$scope.frequency = [{
					value : 3,
					label : 'Daily'
				}, {
					value : 4,
					label : 'Weekly'
				}];

				if (angular.isDefined($scope.init)) {
					originalInit = angular.copy($scope.init);
					$scope.myFrequency = cronService.fromCron($scope.init);
				}

				$scope.$watch('init', function(newValue) {
					if (angular.isDefined(newValue) && newValue && (newValue !== originalInit)) {
						initChanged = true;
						$scope.myFrequency = cronService.fromCron(newValue);
					}
				});

				if ( typeof $scope.config === 'object' && !$scope.config.length) {
					var optionsKeyArray = Object.keys($scope.config.options);
					for (var i in optionsKeyArray) {
						var currentKey = optionsKeyArray[i].replace(/^allow/, '');
						var originalKey = optionsKeyArray[i];
						if (!$scope.config.options[originalKey]) {
							for (var b in $scope.frequency) {
								if ($scope.frequency[b] === currentKey) {
									delete $scope.frequency[b];
								}
							}
						}
					}
				}

				$scope.minuteValue = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
				$scope.hourValue = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
				$scope.dayOfMonthValue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
				$scope.dayValue = [0, 1, 2, 3, 4, 5, 6];
				$scope.monthValue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

				$scope.$watch('myFrequency', function(n, o) {
					if (n && (!o || n.base !== o.base) && !initChanged) {
						if (n && n.base) {
							n.base = parseInt(n.base);
						}
						if (n && n.base && n.base >= 2) {
							n.minuteValue = $scope.minuteValue[0];
						}

						if (n && n.base && n.base >= 3) {
							n.hourValue = $scope.hourValue[0];
						}

						if (n && n.base && n.base === 4) {
							n.dayValue = $scope.dayValue[0];
						}

						if (n && n.base && n.base >= 5) {
							n.dayOfMonthValue = $scope.dayOfMonthValue[0];
						}

						if (n && n.base && n.base === 6) {
							n.monthValue = $scope.monthValue[0];
						}
					} else if (n && n.base && o && o.base) {
						initChanged = false;
					}
					$scope.output = cronService.setCron(n);
				}, true);

			}
		};
	}]);
	module.filter('numeral', function() {
		return function(input) {
			switch (input) {
			case 1:
				return '1st';
			case 2:
				return '2nd';
			case 3:
				return '3rd';
			case 21:
				return '21st';
			case 22:
				return '22nd';
			case 23:
				return '23rd';
			case 31:
				return '31st';
			case null:
				return null;
			default:
				return input + 'th';
			}
		};
	});
	module.filter('monthName', function() {
		return function(input) {
			var months = {
				1 : 'January',
				2 : 'February',
				3 : 'March',
				4 : 'April',
				5 : 'May',
				6 : 'June',
				7 : 'July',
				8 : 'August',
				9 : 'September',
				10 : 'October',
				11 : 'November',
				12 : 'December'
			};

			if (input !== null && angular.isDefined(months[input])) {
				return months[input];
			} else {
				return null;
			}
		};
	});
	module.filter('dayName', function() {
		return function(input) {
			var days = {
				0 : 'Sun',
				1 : 'Mon',
				2 : 'Tue',
				3 : 'Wed',
				4 : 'Thu',
				5 : 'Fri',
				6 : 'Sat',
			};

			if (input !== null && angular.isDefined(days[input])) {
				return days[input];
			} else {
				return null;
			}
		};
	});

	module.factory('cronService', function() {
		var service = {};

		service.setCron = function(n) {
			var cron = ['*', '*', '*', '*', '*', '?'];

			if (n && n.base && n.base >= 2) {
				cron[0] = typeof n.minuteValue !== undefined ? n.minuteValue : '*';
			}

			if (n && n.base && n.base >= 3) {
				cron[1] = typeof n.hourValue !== undefined ? n.hourValue : '*';
			}

			if (n && n.base && n.base === 4) {
				cron[4] = n.dayValue;
			}

			if (n && n.base && n.base >= 5) {
				cron[2] = typeof n.dayOfMonthValue !== undefined ? n.dayOfMonthValue : '*';
			}

			if (n && n.base && n.base === 6) {
				cron[3] = typeof n.monthValue !== undefined ? n.monthValue : '*';
			}
			return cron.join(' ');
		};

		service.fromCron = function(value) {
			var cron = value.replace(/\s+/g, ' ').split(' ');
			var frequency = {
				base : '1'
			};
			if (cron[0] === '*' && cron[1] === '*' && cron[2] === '*' && cron[3] === '*' && cron[4] === '*') {
				frequency.base = 1;
				// every minute
			} else if (cron[1] === '*' && cron[2] === '*' && cron[3] === '*' && cron[4] === '*') {
				frequency.base = 2;
				// every hour
			} else if (cron[2] === '*' && cron[3] === '*' && cron[4] === '*') {
				frequency.base = 3;
				// every day
			} else if (cron[2] === '*' && cron[3] === '*') {
				frequency.base = 4;
				// every week
			} else if (cron[3] === '*' && cron[4] === '*') {
				frequency.base = 5;
				// every month
			} else if (cron[4] === '*') {
				frequency.base = 6;
				// every year
			}

			if (cron[0] !== '*') {
				frequency.minuteValue = parseInt(cron[0]);
			}
			if (cron[1] !== '*') {
				frequency.hourValue = parseInt(cron[1]);
			}
			if (cron[2] !== '*') {
				frequency.dayOfMonthValue = parseInt(cron[2]);
			}
			if (cron[3] !== '*') {
				frequency.monthValue = parseInt(cron[3]);
			}
			if (cron[4] !== '*') {
				frequency.dayValue = parseInt(cron[4]);
			}
			return frequency;
		};

		return service;
	});
});
