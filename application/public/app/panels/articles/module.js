define(['angular', 'app', 'config'], function(angular, app, config) {
	var module = angular.module('go4smac.panels.articles', []);
	app.useModule(module);

	module.service('documentOnES', ['$http', '$q',
	function($http, $q) {
		this.list = function(url, page, rows, query) {
			var defer = $q.defer();
			$http({
				url : url + '?rows=' + parseInt(rows) + '&page=' + parseInt(page) + "&sidx=lastclick&sord=desc&_t=" + (new Date().getTime()),
				headers : {
					"Content-Type" : "application/json"
				},
				method : "GET",
				withCredentials : true
			}).success(function(data) {
				if (data.total) {
					angular.forEach(data.rows, function(item) {
						item.lastclick = item.lastclick || parseInt(item.access + "000");
						item.online = (new Date().getTime() - item.lastclick)/1000 < 60;						
					});
				}
				defer.resolve(data);
			}).error(function(error) {
				defer.reject(error);
			});
			return defer.promise;
		};
	}]);
	
	module.controller('articles', ['$scope', '$rootScope', '$timeout', '$sce', 'dashboard', 'querySrv', 'filterSrv',
	function($scope, $rootScope, $timeout, $sce, dashboard, querySrv, filterSrv) {
		// Set and populate defaults
		var _d = {
			queries : {
				mode : 'all',
				ids : []
			},
			field : "_type"
		};
		_.defaults($scope.panel, _d);
		
		$scope.get_data = function(segment, query_id) {
			// Make sure we have everything for the request to complete
			$scope.panelMeta.loading = true;
			var request,
			    boolQuery,
			    queries,
			    aggObject;

			$scope.panel.error = false;

			// Make sure we have everything for the request to complete
			if (dashboard.indices.length === 0) {
				return;
			}

			$scope.panelMeta.loading = true;

			request = $scope.ejs.Request().indices(dashboard.indices);

			$scope.panel.queries.ids = querySrv.idsByMode($scope.panel.queries);

			queries = querySrv.getQueryObjs($scope.panel.queries.ids);

			boolQuery = $scope.ejs.BoolQuery();
			_.each(queries, function(q) {
				boolQuery = boolQuery.must(querySrv.toEjsObj(q));
			});
			
			request.searchType('count');

			aggObject = $scope.ejs.TermsAggregation('top_tags_hits');
			request = request.query($scope.ejs.FilteredQuery(boolQuery, filterSrv.getBoolFilter(filterSrv.ids()))).aggs(aggObject.agg($scope.ejs.MaxAggregation('top_hit').lang('expression').script('_score')));
			request.doSearch().then(function(result) {
				$scope.terms = [];
				$scope.options = [];
				$scope.total = 0;
				$scope.panelMeta.loading = false;
				if (result && result.hits && result.hits.total) {
					$scope.total = result.hits.total;
				}
				if (result && result.aggregations && result.aggregations.term_stats && result.aggregations.term_stats.buckets.length) {
					$scope.terms = result.aggregations.term_stats.buckets;
				}
				for (var i = 0; i < $scope.terms.length; i++) {
					var data = {
						animate : {
							duration : 1500,
							enabled : true
						},
						barColor : querySrv.colors.length >= $scope.terms.length ? querySrv.colors[i] : querySrv.colors[0],
						trackColor : $scope.panel.trackColor || '#ccc',
						scaleColor : $scope.panel.scaleColor || false,
						lineWidth : $scope.panel.lineWidth || 5,
						rotate : $scope.panel.rotate || -90,
						lineCap : $scope.panel.lineCap || 'butt',
						size : $scope.panel.size || 40,
						name : $scope.terms[i].key,
						value : $scope.terms[i].doc_count
					};
					if ($scope.panel.includes && !_.isUndefined($scope.panel.includes)) {
						if ($scope.panel.includes.indexOf($scope.terms[i].key) > -1) {
							$scope.options.push(data);
						}
					} else {
						$scope.options.push(data);
					}
				}
				$scope.$emit("render");
			});
		};		

		$scope.init = function() {
			$scope.ready = false;
			$scope.$on('refresh', function() {
				$scope.get_data();
			});
			$scope.get_data();
		};
	}]);	

	module.directive('articleTitle', ['$http',
	function($http) {
		return {
			restrict : 'EA',
			scope : {
				code : '='
			},
			template : '<strong>{{topic.name}}</strong>',
			replace : 'true',
			link : function($scope, elemenet, attrs) {
				$http.get('/mongodb/mit/source.topics/?searchField=code&searchString=' + $scope.code + '&searchOper=eq&_search=true').success(function(data) {
					$scope.topic = data.rows[0];
				}).error(function(error) {
					console.log(error);
				});
			}
		};
	}]);
});
