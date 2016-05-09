define([
  'angular'
],
function (angular) {
  'use strict';

  angular
    .module('go4smac.directives')
    .directive('ngBlur', ['$parse', function($parse) {
      return function(scope, element, attr) {
        var fn = $parse(attr['ngBlur']);
        element.bind('blur', function(event) {
          scope.$apply(function() {
            fn(scope, {$event:event});
          });
        });
      };
    }]);

});