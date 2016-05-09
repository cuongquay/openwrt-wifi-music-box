/** @scratch /panels/5
 * include::panels/column.asciidoc[]
 */

/** @scratch /panels/column/0
 * == Column
 * Status: *Stable*
 *
 * A pseudo panel that lets you add other panels to be arranged in a column with defined heights.
 * While the column panel is stable, it does have many limitations, including the inability to drag
 * and drop panels within its borders. It may be removed in a future release.
 *
 */
define(['angular', 'app', 'lodash', 'config', 'classie'], function(angular, app, _, config, classie) {
	'use strict';

	var module = angular.module('go4smac.panels.navigator', []);

	app.useModule(module);

	module.controller('navigator', ['$scope', '$rootScope', '$timeout',
	function($scope, $rootScope, $timeout) {
		$scope.panelMeta = {
			status : "Stable",
			description : "A pseudo panel that lets you add other panels to be arranged in a column with" + "defined heights."
		};

		// Set and populate defaults
		var _d = {
			/** @scratch /panels/column/3
			 * === Parameters
			 *
			 * panel:: An array of panel objects
			 */
			panels : []
		};
		_.defaults($scope.panel, _d);

		Number.prototype.toHHMMSS = function() {
			var d = Number(this.valueOf() / 1000);
			var h = Math.floor(d / 3600);
			var m = Math.floor(d % 3600 / 60);
			var s = Math.floor(d % 3600 % 60);
			return ((h > 0 ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (s < 10 ? "0" : "") + s);
		};

		Number.prototype.toReadableString = function() {
			var base = Math.floor(Math.log(Math.abs(this.valueOf())) / Math.log(1000));
			var suffix = 'kmb'[base - 1];
			return suffix ? String(this.valueOf() / Math.pow(1000, base)).substring(0, 3) + suffix : '' + this.valueOf();
		};

		Number.prototype.numberWithCommas = function() {
			return this.valueOf().toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		};

		$scope.initButtonEffect = function() {
			// http://stackoverflow.com/a/11381730/989439
			function mobilecheck() {
				var check = false;
				(function(a) {
					if (/(android|ipad|playbook|silk|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
						check = true;
				})(navigator.userAgent || navigator.vendor || window.opera);
				return check;
			}

			var support = {
				animations : Modernizr.cssanimations
			},
			    animEndEventNames = {
				'WebkitAnimation' : 'webkitAnimationEnd',
				'OAnimation' : 'oAnimationEnd',
				'msAnimation' : 'MSAnimationEnd',
				'animation' : 'animationend'
			},
			    animEndEventName = animEndEventNames[ Modernizr.prefixed('animation')],
			    onEndAnimation = function(el, callback) {
				var onEndCallbackFn = function(ev) {
					if (support.animations) {
						if (ev.target != this)
							return;
						this.removeEventListener(animEndEventName, onEndCallbackFn);
					}
					if (callback && typeof callback === 'function') {
						callback.call();
					}
				};
				if (support.animations) {
					el.addEventListener(animEndEventName, onEndCallbackFn);
				} else {
					onEndCallbackFn();
				}
			},
			    eventtype = mobilecheck() ? 'touchstart' : 'click';

			[].slice.call(document.querySelectorAll('.cbutton')).forEach(function(el) {
				el.addEventListener(eventtype, function(ev) {
					classie.add(el, 'cbutton--click');
					onEndAnimation(classie.has(el, 'cbutton--complex') ? el.querySelector('.cbutton__helper') : el, function() {
						classie.remove(el, 'cbutton--click');
					});
				});
			});
		};
		
		$scope.init = function() {
			$scope.position = 0;
			$scope.reset_panel();
			$scope.user = $rootScope.userInfo;
			$scope.title = $scope.panel.title.replace("{@USER}", $scope.user.full_name || $scope.user.username);
			$scope.initButtonEffect();
		};

		$scope.toggle_row = function(panel) {
			panel.collapse = panel.collapse ? false : true;
			if (!panel.collapse) {
				$timeout(function() {
					$scope.send_render();
				});
			}
		};

		$scope.next = function() {
			if ($scope.position < $scope.panel.panels.length) {
				$scope.position++;
			}
		};

		$scope.back = function() {
			if ($scope.position > 0) {
				$scope.position--;
			}
		};

		$scope.goto = function(index) {
			$scope.position = index;
		};

		$scope.send_render = function() {
			$scope.$broadcast('render');
		};

		$scope.reset_panel = function(type) {
			$scope.new_panel = {
				loading : false,
				error : false,
				sizeable : false,
				draggable : false,
				removable : false,
				span : 12,
				height : "150px",
				editable : true,
				type : type
			};
		};
		
		$scope.onRepeatClick = function() {
			$scope.mode = "repeat";
		};
		$scope.onShufferClick = function() {
			$scope.mode = "shuffer";
		};

	}]);

	module.filter('withoutContainer', [
	function() {
		return function() {
			return _.without(config.panel_names, 'container');
		};
	}]);
}); 