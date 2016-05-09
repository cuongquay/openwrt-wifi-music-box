/** @scratch /index/0
 * = Kibana
 *
 * // Why can't I have a preamble here?
 *
 * == Introduction
 *
 * Kibana is an open source (Apache Licensed), browser based analytics and search dashboard for
 * ElasticSearch. Kibana is a snap to setup and start using. Written entirely in HTML and Javascript
 * it requires only a plain webserver, Kibana requires no fancy server side components.
 * Kibana strives to be easy to get started with, while also being flexible and powerful, just like
 * Elasticsearch.
 *
 * include::configuration/config.js.asciidoc[]
 *
 * include::panels.asciidoc[]
 *
 */

define(['angular', 'config', 'lodash', 'services/all'], function(angular, config, _) {
	"use strict";

	var module = angular.module('go4smac.controllers');

	module.controller('DashCtrl', ['$scope', '$route', 'contentSrv', 'alertSrv', 'ejsResource',
	function($scope, $route, contentSrv, alertSrv, ejsResource) {

		$scope.editor = {
			index : 0
		};

		$scope.init = function() {
			$scope.config = config;
			// Make stuff, including lodash available to views
			$scope._ = _;
			$scope.contentSrv = contentSrv;
			$scope.dashAlerts = alertSrv;
			// Clear existing alerts
			alertSrv.clearAll();
			$scope.reset_row();

			$scope.ejs = ejsResource(config.elasticsearch);
		};

		$scope.isPanel = function(obj) {
			if (!_.isNull(obj) && !_.isUndefined(obj) && !_.isUndefined(obj.type)) {
				return true;
			} else {
				return false;
			}
		};

		$scope.add_row = function(dash, row) {
			dash.rows.push(row);
		};

		$scope.reset_row = function() {
			$scope.row = {
				title : '',
				height : '150px',
				editable : true
			};
		};

		$scope.row_style = function(row) {
			return {
				'min-height' : row.collapse ? '5px' : row.height
			};
		};

		$scope.panel_path = function(type) {
			if (type) {
				return 'app/panels/' + type.replace(".", "/");
			} else {
				return false;
			}
		};

		$scope.pulldownTabStyle = function(i) {
			var classes = ['bgPrimary', 'bgSuccess', 'bgWarning', 'bgDanger', 'bgInverse', 'bgInfo'];
			i = i % classes.length;
			return classes[i];
		};

		$scope.setEditorTabs = function(panelMeta) {
			$scope.editorTabs = ['General', 'Panel'];
			if (!_.isUndefined(panelMeta.editorTabs)) {
				$scope.editorTabs = _.union($scope.editorTabs, _.pluck(panelMeta.editorTabs, 'title'));
			}
			return $scope.editorTabs;
		};

		// This is whoafully incomplete, but will do for now
		$scope.parse_error = function(data) {
			var _error = data.match("nested: (.*?);");
			return _.isNull(_error) ? data : _error[1];
		};

		$scope.init();
	}]);
});
