define(['angular', 'config'], function(angular, config) {
	'use strict';

	var module = angular.module('go4smac.services');
	module.service('documentOnES', ['$http', '$q',
	function($http, $q) {
		this.list = function($scope, dashboard, querySrv, filterSrv) {
			var url = $scope.panel.url;
			var fromOffset = ($scope.currentPage - 1) * $scope.nbrOfRows;
			var sizeOfDocs = $scope.nbrOfRows;
			var defer = $q.defer();
			var request,
			    boolQuery,
			    queries,
			    aggObject;

			// Make sure we have everything for the request to complete
			if (dashboard.indices.length === 0) {
				defer.resolve({
					total : 0,
					records : 0,
					rows : []
				});
				return defer.promise;
			}

			request = $scope.ejs.Request().indices(dashboard.indices);

			$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

			queries = querySrv.getQueryObjs($scope.panel.queries.ids);

			boolQuery = $scope.ejs.BoolQuery();
			_.each(queries, function(q) {
				boolQuery = boolQuery.should(querySrv.toEjsObj(q));
			});

			aggObject = $scope.ejs.TopHitsAggregation('TopHits').size(sizeOfDocs).from(fromOffset).sort([{
				"@timestamp" : {
					"order" : "desc"
				}
			}]);
			request = request.query($scope.ejs.FilteredQuery(boolQuery, filterSrv.getBoolFilter(filterSrv.ids()))).aggs(aggObject);
			request.doSearch().then(function(result) {
				if (result.aggregations && result.aggregations.TopHits.hits && result.aggregations.TopHits.hits.hits.length) {
					var topHitRecords = result.aggregations.TopHits.hits;
					var data = {
						total : topHitRecords.hits.length,
						records : topHitRecords.total,
						rows : topHitRecords.hits
					};
					defer.resolve(data);
				} else {
					defer.resolve({
						total : 0,
						records : 0,
						rows : []
					});
				}
			}, function(error) {
				defer.resolve({
					total : 0,
					records : 0,
					rows : []
				});
			});
			return defer.promise;
		};

		this.count = function($scope, dashboard, querySrv, filterSrv) {
			var defer = $q.defer();
			var request,
			    boolQuery,
			    queries,
			    aggObject;

			// Make sure we have everything for the request to complete
			if (dashboard.indices.length === 0) {
				return defer.promise;
			}

			request = $scope.ejs.Request().indices(dashboard.indices);

			$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

			queries = querySrv.getQueryObjs($scope.panel.queries.ids);

			boolQuery = $scope.ejs.BoolQuery();
			_.each(queries, function(q) {
				boolQuery = boolQuery.should(querySrv.toEjsObj(q));
			});

			aggObject = $scope.ejs.TopHitsAggregation('TopHits').size(0).searchType('count');
			request = request.query($scope.ejs.FilteredQuery(boolQuery, filterSrv.getBoolFilter(filterSrv.ids()))).aggs(aggObject);
			request.doSearch().then(function(result) {
				console.log(result);
				defer.resolve({});
			});
			return defer.promise;
		};
	}]);
});
