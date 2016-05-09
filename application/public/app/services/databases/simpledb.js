define(['angular', 'config'], function(angular, config) {
	'use strict';

	var module = angular.module('go4smac.services');
	module.service('simpleDBSrv', ['$http', '$q',
	function($http, $q) {
		this.list = function($scope) {
			var url = $scope.panel.url;
			var page = $scope.currentPage;
			var rows = $scope.nbrOfRows;
			var query = $scope.panel.query;
			var defer = $q.defer();
			$http({
				url : url + '?rows=' + parseInt(rows) + '&page=' + parseInt(page) + "&_t=" + (new Date().getTime()),
				headers : {
					"Content-Type" : "application/json"
				},
				method : "GET",
				withCredentials : true
			}).success(function(data) {
				defer.resolve(data);
			}).error(function(error) {
				defer.reject(error);
			});
			return defer.promise;
		};
	}]);
});
