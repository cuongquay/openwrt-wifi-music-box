/**
 * A directive for adding google places autocomplete to a text box
 * google places autocomplete info: https://developers.google.com/maps/documentation/javascript/places
 *
 * Usage:
 *
 * <input type="text"  ng-autocomplete ng-model="autocomplete" options="options" details="details/>
 *
 * + ng-model - autocomplete textbox value
 *
 * + details - more detailed autocomplete result, includes address parts, latlng, etc. (Optional)
 *
 * + options - configuration for the autocomplete (Optional)
 *
 *       + types: type,        String, values can be 'geocode', 'establishment', '(regions)', or '(cities)'
 *       + bounds: bounds,     Google maps LatLngBounds Object, biases results to bounds, but may return results outside these bounds
 *       + country: country    String, ISO 3166-1 Alpha-2 compatible country code. examples; 'ca', 'us', 'gb'
 *       + watchEnter:         Boolean, true; on Enter select top autocomplete result. false(default); enter ends autocomplete
 *
 * example:
 *
 *    options = {
 *        types: '(cities)',
 *        country: 'ca'
 *    }
 **/
define(['angular'], function(angular) {
	'use strict';

	angular.module('go4smac.directives').controller('SearchController', ['$scope', '$rootScope', '$timeout',
	function($scope, $rootScope, $timeout) {
		$scope.toggleSearchBox = function() {
			$rootScope.showSearchBox = !$rootScope.showSearchBox;
			if ($rootScope.showSearchBox) {
				$("#page-wrapper").css({
					opacity : 0
				});
			} else {
				$("#page-wrapper").css({
					opacity : 1.0
				});
			}
			$("#titleBar").toggleClass("ng-hide");
			$timeout(function() {
				$("#id-input-search-box")[0].focus();
			}, 500);
		};
	}]);

	angular.module('go4smac.directives').directive('ngAutocomplete', ['$rootScope', '$window', 'soundcloud',
	function($rootScope, $window, soundcloud) {
		return {
			restrict : 'AE',
			scope : {
				selectedTags : '=model'
			},
			templateUrl : 'app/partials/autocomplete.html',
			link : function(scope, elem, attrs) {
				scope.suggestions = [];
				scope.selectedTags = [];
				scope.selectedIndex = -1;				
				scope.onSearchBoxSuggestion = function() {
					soundcloud.suggestFor(scope.searchText, 50).success(function(result) {
						scope.suggestions = result.results;
					});					
				};
				scope.checkKeyDown = function(event) {
					if (event.keyCode === 40) {//down key, increment selectedIndex
						event.preventDefault();
						if (scope.selectedIndex + 1 !== scope.suggestions.length) {
							scope.selectedIndex++;
						}
					} else if (event.keyCode === 38) {//up key, decrement selectedIndex
						event.preventDefault();
						if (scope.selectedIndex - 1 !== -1) {
							scope.selectedIndex--;
						}
					} else if (event.keyCode === 13) {//enter pressed
						scope.onSearchBoxSearch(scope.selectedIndex);
					}
				};
				scope.onSearchBoxSearch = function(index) {
					var searchKeyword = scope.suggestions[index];
					scope.searchText = '';
					scope.suggestions = [];
					$rootScope.showSearchBox = false;
					$("#page-wrapper").css({
						opacity : 1.0
					});
					$("#titleBar").removeClass("ng-hide");
					var searchKeyword = $(event.target).val();
					if (!_.isUndefined(searchKeyword) && searchKeyword != "") {
						$window.location.href = "#/v1/audio/search/" + encodeURIComponent(searchKeyword);
					}
				};
				scope.onSearchBoxClose = function(event) {
					$rootScope.showSearchBox = false;
					$("#page-wrapper").css({
						opacity : 1.0
					});
					$("#titleBar").removeClass("ng-hide");
				};
				scope.$watch('selectedIndex', function(val) {
					if (val !== -1) {
						scope.searchText = scope.suggestions[scope.selectedIndex].output;
					}
				});
			}
		};
	}]);

});
