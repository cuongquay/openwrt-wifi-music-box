/**
 * @preserve AngularJS PDF viewer directive using pdf.js.
 *
 * https://github.com/akrennmair/ng-pdfviewer 
 *
 * MIT license
 */
define([
  'angular',    
  'app'
],
function (angular, app) {
  'use strict';
  
  var module = angular.module('go4smac.services');

  module.service('PDFViewerService', [ '$rootScope', function($rootScope) {
		var svc = { };
		svc.nextPage = function() {
			$rootScope.$broadcast('pdfviewer.nextPage');
		};
	
		svc.prevPage = function() {
			$rootScope.$broadcast('pdfviewer.prevPage');
		};
	
		svc.Instance = function(id) {
			var instance_id = id;
	
			return {
				prevPage: function() {
					$rootScope.$broadcast('pdfviewer.prevPage', instance_id);
				},
				nextPage: function() {
					$rootScope.$broadcast('pdfviewer.nextPage', instance_id);
				},
				gotoPage: function(page) {
					$rootScope.$broadcast('pdfviewer.gotoPage', instance_id, page);
				}
			};
		};
	
		return svc;
	}]);
});