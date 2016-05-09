define(['angular', 'app', 'config', 'jquery'], function(angular, app, config, jQuery) {
	var module = angular.module('go4smac.panels.pageview', []);
	app.useModule(module);

	module.controller('pageview', ['$rootScope', '$scope', '$q', '$http', '$timeout', '$injector', 'dashboard', 'querySrv', 'filterSrv',
	function($rootScope, $scope, $q, $http, $timeout, $injector, dashboard, querySrv, filterSrv) {
		// Set and populate defaults
		var _d = {
			queries : {
				mode : 'all',
				ids : []
			},
			field : "_type"
		};
		_.defaults($scope.panel, _d);

		$scope.init = function() {
			$scope.panel.rows = [];
			$scope.startOfPage = 1;
			$scope.endOfPage = 1;
			$scope.ranges = [];
			$scope.nbrOfRows = $scope.panel.nbrOfRows || 10;
			$scope.currentPage = 1;

			$scope.loadPages();
			$scope.initPageRange();

			$scope.$watch('currentPage', function(oldVal, newVal) {
				if (oldVal != newVal)
					$scope.loadPages();
			});

			$scope.$watch('startOfPage', function(oldVal, newVal) {
				if (oldVal != newVal)
					$scope.initPageRange();
			});

			$scope.$watch('endOfPage', function(oldVal, newVal) {
				if (oldVal != newVal)
					$scope.initPageRange();
			});
			$scope.$on('refresh', function() {
				$scope.first();
				$scope.loadPages();
			});
		};

		$scope.loadPages = function() {
			if ($scope["meta-data"]) {
				$scope.panel.rows = $scope["meta-data"].rows;
				$scope.panel.nbrOfPages = $scope["meta-data"].total;
				$scope.panel.nbrOfRecords = $scope["meta-data"].records;
			} else {
				$rootScope.lock();
				$injector.get($scope.panel.service).list($scope, dashboard, querySrv, filterSrv).then(function(data) {
					$scope.panel.rows = data.rows;
					var additionalPage = (data.records % $scope.nbrOfRows) == 0 ? 0 : 1;
					$scope.panel.nbrOfPages = data.total ? (parseInt(data.records / $scope.nbrOfRows) + additionalPage) : 0;
					$scope.panel.nbrOfRecords = data.records;
					if ($scope.panel.nbrOfPages < 10) {
						$scope.endOfPage = $scope.panel.nbrOfPages;
					} else if ($scope.currentPage == 1){
						$scope.endOfPage = 10;
					}
					$rootScope.unlock();
				}, function(error) {
					$rootScope.unlock();
				});
			}
		};

		$scope.initPageRange = function() {
			var result = [];
			for (var i = $scope.startOfPage; i <= $scope.endOfPage; i++) {
				result.push(i);
			}
			$scope.ranges = result;
		};

		$scope.setCurrentPage = function(page) {
			$scope.currentPage = page;
		};

		$scope.getDateString = function(timestamp) {
			return new Date(timestamp).toDateString();
		};

		$scope.next = function() {
			if ($scope.currentPage == $scope.endOfPage && $scope.currentPage < $scope.panel.nbrOfPages) {
				$scope.endOfPage = $scope.startOfPage + 10 < $scope.panel.nbrOfPages ? $scope.startOfPage + 10 : $scope.panel.nbrOfPages;
				$scope.startOfPage = ++$scope.currentPage;
			} else {
				$scope.currentPage++;
			}
		};

		$scope.previous = function() {
			if ($scope.currentPage == $scope.startOfPage && $scope.currentPage > 1) {
				$scope.startOfPage = $scope.endOfPage - 10 > 1 ? $scope.endOfPage - 10 : 1;
				$scope.endOfPage = --$scope.currentPage;
			} else {
				$scope.currentPage--;
			}
		};

		$scope.first = function() {
			$scope.startOfPage = $scope.currentPage = 1;
			$scope.endOfPage = 10 < $scope.panel.nbrOfPages ? 10 : $scope.panel.nbrOfPages;
		};

		$scope.last = function() {
			$scope.endOfPage = $scope.currentPage = $scope.panel.nbrOfPages;
			$scope.startOfPage = Math.floor($scope.endOfPage / 10) * 10 + 1;
		};

		$scope.formatNumber = function(n) {
			var base = Math.floor(Math.log(Math.abs(n)) / Math.log(1000));
			var suffix = 'kmb'[base - 1];
			return suffix ? String(n / Math.pow(1000, base)).substring(0, 3) + suffix : '' + n;
		};
	}]);

	module.directive('blogViewItem', ['$compile', '$q',
	function($compile, $q) {
		return {
			restrict : 'AE',
			scope : {
				item : '=ngModel',
				$last : '=ngLastItem',
				$first : '=ngFirstItem',
				$even : '=ngEventItem',
				$odd : '=ngOddItem',
				$index : '=ngIndexItem'
			},
			transclude : false,
			link : function(scope, element) {
				scope.getRefData = function(data) {
					var ptrRef = data;
					if (scope.$parent.panel.fieldname) {
						var fields = scope.$parent.panel.fieldname.split('.');
						angular.forEach(fields, function(key) {
							if (ptrRef) {
								ptrRef = ptrRef[key];
							}
						});
					}
					return ptrRef;
				};
				scope.getUnixDateString = function(timestamp) {
					return new Date(parseInt(timestamp + '000')).toDateString();
				};
				scope.fromNowUnixTimestamp = function(timestamp) {
					return moment.utc(new Date(parseInt(timestamp + '000'))).local().fromNow();
				};
				scope.fromNowTimestamp = function(timestamp) {
					return moment.utc(new Date(timestamp)).local().fromNow();
				};
				scope.diffFromNowInSeconds = function(timestamp) {
					return (new Date().getTime() - timestamp) / 1000;
				};
				scope.getFormattedDate = function(timestamp) {
					var date = new Date(timestamp);
					var year = date.getFullYear();
					var month = (1 + date.getMonth()).toString();
					month = month.length > 1 ? month : '0' + month;
					var day = date.getDate().toString();
					day = day.length > 1 ? day : '0' + day;
					return year + '/' + month + '/' + day;
				};				
				scope.$parent.require(['jquery', 'text!' + scope.$parent.panel.template], function($, moduleTemplate) {
					var template = $(moduleTemplate);
					template.appendTo(element[0]);
					$compile(template)(scope);
				});
			}
		};
	}]);
});
