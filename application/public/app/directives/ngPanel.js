define(['angular', 'config', 'jquery'], function(angular, config, $) {
	'use strict';

	angular.module('go4smac.directives').directive('ngPanel', ['$compile', '$rootScope',
	function($compile, $rootScope) {
		var container = '<div ng-style="{\'min-height\':row.height}"></div>';
		var content = '<div class="panel-content"></div>';

		var panelHeader = '<div class="panel-toolbar"></div>';

		return {
			restrict : 'AE',
			link : function($scope, elem, attr) {
				// once we have the template, scan it for controllers and
				// load the module.js if we have any
				var newScope = $scope.$new();
				$scope.kbnJqUiDraggableOptions = {
					revert : 'invalid',
					helper : function() {
						return $('<div style="width:200px;height:100px;background: rgba(100,100,100,0.50);"/>');
					},
					placeholder : 'keep'
				};

				// compile the module and uncloack. We're done
				function loadModule($module) {
					$module.appendTo(elem);
					elem.wrap(container);
					/* jshint indent:false */
					$compile(elem.contents())(newScope);
					elem.removeClass("ng-cloak");
				}


				newScope.$on('$destroy', function() {
					elem.unbind();
					elem.remove();
				});

				$scope.$watch(attr.type, function(name) {
					elem.addClass("ng-cloak");
					// load the panels module file, then render it in the dom.
					if (name) {
						var nameAsPath = name.replace(".", "/");
						$scope.require(['jquery', 'text!panels/' + nameAsPath + '/module.html'], function($, moduleTemplate) {
							var $module = $(moduleTemplate);
							// top level controllers
							var $controllers = $module.filter('ngcontroller, [ng-controller], .ng-controller');
							// add child controllers
							$controllers = $controllers.add($module.find('ngcontroller, [ng-controller], .ng-controller'));

							if ($controllers.length) {
								if (newScope.panel.class) {
									$controllers.first().addClass(newScope.panel.class);
								}
								$controllers.first().prepend(panelHeader);
								$controllers.first().find('.panel-header').nextAll().wrapAll(content);

								$scope.require(['panels/' + nameAsPath + '/module.min'], function() {
									loadModule($module);
								});
							} else {
								loadModule($module);
							}
						});
					}
				});

				$scope.$watch(attr["meta-data"], function(data) {
					newScope["meta-data"] = data;
				});
			}
		};
	}]);

}); 