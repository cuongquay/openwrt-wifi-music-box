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

define(['angular', 'lodash', 'config', 'jquery', 'classie', 'jquery-dropotron', 'jquery-skel', 'jquery-scrollex'], function(angular, _, config, $, classie) {
	"use strict";

	var module = angular.module('go4smac.controllers');
	module.controller('devices', ['$scope', '$rootScope', '$timeout', '$window', 'wifioner',
	function($scope, $rootScope, $timeout, $window, wifioner) {
		/**
		 * Generate an indented list of links from a nav. Meant for use with panel().
		 * @return {jQuery} jQuery object.
		 */
		$.fn.navList = function() {
			var $this = $(this);
			var $a = $this.find('a'),
			    b = [];
			$a.each(function() {
				var $this = $(this),
				    indent = Math.max(0, $this.parents('li').length - 1),
				    href = $this.attr('href'),
				    target = $this.attr('target');
				b.push('<a ' + 'class="cbutton cbutton--effect-stoja cbutton--effect-stoja-right link depth-' + indent + '"' + (( typeof target !== 'undefined' && target != '') ? ' target="' + target + '"' : '') + (( typeof href !== 'undefined' && href != '') ? ' href="' + href + '"' : '') + '>' + '<span class="indent-' + indent + '"></span>' + $this.text() + '</a>');
			});
			return b.join('');
		};
		/**
		 * Panel-ify an element.
		 * @param {object} userConfig User config.
		 * @return {jQuery} jQuery object.
		 */
		$.fn.panel = function(userConfig) {
			// No elements?
			if (this.length == 0)
				return $this;
			// Multiple elements?
			if (this.length > 1) {
				for (var i = 0; i < this.length; i++)
					$(this[i]).panel(userConfig);
				return $this;
			}
			// Vars.
			var $this = $(this),
			    $body = $('body'),
			    $window = $(window),
			    id = $this.attr('id'),
			    config;
			// Config.
			config = $.extend({
				// Delay.
				delay : 0,
				// Hide panel on link click.
				hideOnClick : true,
				// Hide panel on escape keypress.
				hideOnEscape : true,
				// Hide panel on swipe.
				hideOnSwipe : true,
				// Reset scroll position on hide.
				resetScroll : false,
				// Reset forms on hide.
				resetForms : false,
				// Side of viewport the panel will appear.
				side : null,
				// Target element for "class".
				target : $this,
				// Class to toggle.
				visibleClass : 'visible'
			}, userConfig);
			// Expand "target" if it's not a jQuery object already.
			if ( typeof config.target != 'jQuery')
				config.target = $(config.target);
			// Panel.
			// Methods.
			$this._hide = function(event) {
				// Already hidden? Bail.
				if (!config.target.hasClass(config.visibleClass))
					return;
				// If an event was provided, cancel it.
				if (event) {
					event.preventDefault();
					event.stopPropagation();
				}
				// Hide.
				config.target.removeClass(config.visibleClass);
				// Post-hide stuff.
				window.setTimeout(function() {
					// Reset scroll position.
					if (config.resetScroll)
						$this.scrollTop(0);
					// Reset forms.
					if (config.resetForms)
						$this.find('form').each(function() {
							this.reset();
						});
					$("#id-search-box-toggle").removeClass("ng-hide");
				}, config.delay);
			};
			// Vendor fixes.
			$this.css('-ms-overflow-style', '-ms-autohiding-scrollbar').css('-webkit-overflow-scrolling', 'touch');
			// Hide on click.
			if (config.hideOnClick) {
				$this.find('a').css('-webkit-tap-highlight-color', 'rgba(0,0,0,0)');
				$this.off('click', 'a').on('click', 'a', function(event) {
					var $a = $(this),
					    href = $a.attr('href'),
					    target = $a.attr('target');
					if (!href || href == '#' || href == '' || href == '#' + id)
						return;
					// Cancel original event.
					event.preventDefault();
					event.stopPropagation();
					// Hide panel.
					$this._hide();
					// Redirect to href.
					window.setTimeout(function() {
						if (target == '_blank')
							window.open(href);
						else
							window.location.href = href;
					}, config.delay + 10);
				});
			}
			// Event: Touch stuff.
			$this.off('touchstart').on('touchstart', function(event) {
				$this.touchPosX = event.originalEvent.touches[0].pageX;
				$this.touchPosY = event.originalEvent.touches[0].pageY;
			});
			$this.off('touchmove').on('touchmove', function(event) {
				if ($this.touchPosX === null || $this.touchPosY === null)
					return;
				var diffX = $this.touchPosX - event.originalEvent.touches[0].pageX,
				    diffY = $this.touchPosY - event.originalEvent.touches[0].pageY,
				    th = $this.outerHeight(),
				    ts = ($this.get(0).scrollHeight - $this.scrollTop());
				// Hide on swipe?
				if (config.hideOnSwipe) {
					var result = false,
					    boundary = 20,
					    delta = 50;
					switch (config.side) {
					case 'left':
						result = (diffY < boundary && diffY > (-1 * boundary)) && (diffX > delta);
						break;
					case 'right':
						result = (diffY < boundary && diffY > (-1 * boundary)) && (diffX < (-1 * delta));
						break;
					case 'top':
						result = (diffX < boundary && diffX > (-1 * boundary)) && (diffY > delta);
						break;
					case 'bottom':
						result = (diffX < boundary && diffX > (-1 * boundary)) && (diffY < (-1 * delta));
						break;
					default:
						break;
					}
					if (result) {
						$this.touchPosX = null;
						$this.touchPosY = null;
						$this._hide();
						return false;
					}
				}
				// Prevent vertical scrolling past the top or bottom.
				if (($this.scrollTop() < 0 && diffY < 0) || (ts > (th - 2) && ts < (th + 2) && diffY > 0)) {
					event.preventDefault();
					event.stopPropagation();
				}
			});

			// Event: Prevent certain events inside the panel from bubbling.
			$this.on('click touchend touchstart touchmove', function(event) {
				event.stopPropagation();
			});
			// Event: Hide panel if a child anchor tag pointing to its ID is clicked.
			$this.off('click', 'a[href="#' + id + '"]').on('click', 'a[href="#' + id + '"]', function(event) {
				event.preventDefault();
				event.stopPropagation();
				config.target.removeClass(config.visibleClass);
			});
			// Body.
			// Event: Hide panel on body click/tap.
			$body.off('click touchend').on('click touchend', function(event) {
				$this._hide(event);
			});
			// Event: Toggle.
			$body.off('click', 'a[href="#' + id + '"]').on('click', 'a[href="#' + id + '"]', function(event) {
				event.preventDefault();
				event.stopPropagation();
				config.target.toggleClass(config.visibleClass);
				if (config.target.hasClass(config.visibleClass)) {
					$("#id-search-box-toggle").addClass("ng-hide");
				} else {
					$("#id-search-box-toggle").removeClass("ng-hide");
				}
			});
			// Window.
			// Event: Hide on ESC.
			if (config.hideOnEscape)
				$window.on('keydown', function(event) {
					if (event.keyCode == 27)
						$this._hide(event);
				});
			return $this;
		};

		/**
		 * Apply "placeholder" attribute polyfill to one or more forms.
		 * @return {jQuery} jQuery object.
		 */
		$.fn.placeholder = function() {
			// Browser natively supports placeholders? Bail.
			if ( typeof (document.createElement('input')).placeholder != 'undefined')
				return $(this);
			// No elements?
			if (this.length == 0)
				return $this;
			// Multiple elements?
			if (this.length > 1) {
				for (var i = 0; i < this.length; i++)
					$(this[i]).placeholder();
				return $this;
			}
			// Vars.
			var $this = $(this);
			// Text, TextArea.
			$this.find('input[type=text],textarea').each(function() {
				var i = $(this);
				if (i.val() == '' || i.val() == i.attr('placeholder'))
					i.addClass('polyfill-placeholder').val(i.attr('placeholder'));
			}).on('blur', function() {
				var i = $(this);
				if (i.attr('name').match(/-polyfill-field$/))
					return;
				if (i.val() == '')
					i.addClass('polyfill-placeholder').val(i.attr('placeholder'));
			}).on('focus', function() {
				var i = $(this);
				if (i.attr('name').match(/-polyfill-field$/))
					return;
				if (i.val() == i.attr('placeholder'))
					i.removeClass('polyfill-placeholder').val('');
			});
			// Password.
			$this.find('input[type=password]').each(function() {
				var i = $(this);
				var x = $($('<div>').append(i.clone()).remove().html().replace(/type="password"/i, 'type="text"').replace(/type=password/i, 'type=text'));

				if (i.attr('id') != '')
					x.attr('id', i.attr('id') + '-polyfill-field');

				if (i.attr('name') != '')
					x.attr('name', i.attr('name') + '-polyfill-field');

				x.addClass('polyfill-placeholder').val(x.attr('placeholder')).insertAfter(i);

				if (i.val() == '')
					i.hide();
				else
					x.hide();

				i.on('blur', function(event) {
					event.preventDefault();
					var x = i.parent().find('input[name=' + i.attr('name') + '-polyfill-field]');
					if (i.val() == '') {
						i.hide();
						x.show();
					}
				});
				x.on('focus', function(event) {
					event.preventDefault();
					var i = x.parent().find('input[name=' + x.attr('name').replace('-polyfill-field', '') + ']');
					x.hide();
					i.show().focus();
				}).on('keypress', function(event) {
					event.preventDefault();
					x.val('');
				});
			});

			// Events.
			$this.on('submit', function() {
				$this.find('input[type=text],input[type=password],textarea').each(function(event) {
					var i = $(this);
					if (i.attr('name').match(/-polyfill-field$/))
						i.attr('name', '');
					if (i.val() == i.attr('placeholder')) {
						i.removeClass('polyfill-placeholder');
						i.val('');
					}
				});
			}).on('reset', function(event) {
				event.preventDefault();
				$this.find('select').val($('option:first').val());
				$this.find('input,textarea').each(function() {
					var i = $(this),
					    x;
					i.removeClass('polyfill-placeholder');
					switch (this.type) {
					case 'submit':
					case 'reset':
						break;
					case 'password':
						i.val(i.attr('defaultValue'));
						x = i.parent().find('input[name=' + i.attr('name') + '-polyfill-field]');
						if (i.val() == '') {
							i.hide();
							x.show();
						} else {
							i.show();
							x.hide();
						}
						break;
					case 'checkbox':
					case 'radio':
						i.attr('checked', i.attr('defaultValue'));
						break;
					case 'text':
					case 'textarea':
						i.val(i.attr('defaultValue'));
						if (i.val() == '') {
							i.addClass('polyfill-placeholder');
							i.val(i.attr('placeholder'));
						}
						break;
					default:
						i.val(i.attr('defaultValue'));
						break;
					}
				});
			});
			return $this;
		};

		/**
		 * Moves elements to/from the first positions of their respective parents.
		 * @param {jQuery} $elements Elements (or selector) to move.
		 * @param {bool} condition If true, moves elements to the top. Otherwise, moves elements back to their original locations.
		 */
		$.prioritize = function($elements, condition) {
			var key = '__prioritize';
			// Expand $elements if it's not already a jQuery object.
			if ( typeof $elements != 'jQuery')
				$elements = $($elements);
			// Step through elements.
			$elements.each(function() {
				var $e = $(this),
				    $p,
				    $parent = $e.parent();
				// No parent? Bail.
				if ($parent.length == 0)
					return;
				// Not moved? Move it.
				if (!$e.data(key)) {
					// Condition is false? Bail.
					if (!condition)
						return;
					// Get placeholder (which will serve as our point of reference for when this element needs to move back).
					$p = $e.prev();
					// Couldn't find anything? Means this element's already at the top, so bail.
					if ($p.length == 0)
						return;
					// Move element to top of parent.
					$e.prependTo($parent);
					// Mark element as moved.
					$e.data(key, $p);
				}
				// Moved already?
				else {
					// Condition is true? Bail.
					if (condition)
						return;
					$p = $e.data(key);
					// Move element back to its original location (using our placeholder).
					$e.insertAfter($p);
					// Unmark element as moved.
					$e.removeData(key);
				}
			});
		};
		$scope.initSkel = function() {
			skel.breakpoints({
				xlarge : '(max-width: 1680px)',
				large : '(max-width: 1280px)',
				medium : '(max-width: 980px)',
				small : '(max-width: 736px)',
				xsmall : '(max-width: 480px)'
			});
			var $body = $('body');
			// Touch mode.
			if (skel.vars.mobile)
				$body.addClass('is-touch');
			// Fix: Placeholder polyfill.
			$('form').placeholder();
			// Prioritize "important" elements on medium.
			skel.on('+medium -medium', function() {
				$.prioritize('.important\\28 medium\\29', skel.breakpoint('medium').active);
			});
			// Wrappers.
			var $wrappers = $('.wrapper');
			$wrappers.each(function() {
				var $this = $(this),
				    on,
				    off;
				on = function() {
					if (skel.canUse('transition')) {
						$this.scrollex({
							top : 250,
							bottom : 0,
							initialize : function(t) {
								$this.addClass('inactive');
							},
							terminate : function(t) {
								$this.removeClass('inactive');
							},
							enter : function(t) {
								$this.removeClass('inactive');
							},
							// Uncomment the line below to "rewind" when this wrapper scrolls out of view.
							//leave:	function(t) { $this.addClass('inactive'); },
						});
					}
				};

				off = function() {
					if (skel.canUse('transition'))
						$this.unscrollex();
				};
				skel.on('change', function() {
					if (skel.breakpoint('medium').active)
						(off)();
					else
						(on)();
				});
			});
		};

		$scope.initMenu = function() {
			var $body = $('body');
			$('#nav > ul').dropotron({
				alignment : 'right',
				hideDelay : 350
			});
			$("#titleBar").remove();
			$("#navPanel").remove();
			// Title Bar.
			$('<div id="titleBar">' + '<a href="#navPanel" class="toggle"></a>' + '<span class="title"><a href="#v1/audio/home" class="cbutton cbutton--effect-stoja cbutton--effect-stoja-bottom">' + $scope.title + '</a></span>' + '</div>').appendTo($body);
			// Navigation Panel.
			$('<div id="navPanel">' + '<nav>' + $('#nav').navList() + '</nav>' + '</div>').appendTo($body).panel({
				delay : 500,
				hideOnClick : true,
				hideOnSwipe : true,
				resetScroll : true,
				resetForms : true,
				side : 'left',
				target : $body,
				visibleClass : 'navPanel-visible'
			});
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
			$scope.title = "";
			$scope.initSkel();
			$scope.initMenu();
		};
		$scope.$on("onDeviceDiscovered", function(event, devices) {
			$scope.devices = devices;
			function updateSelectedDevice(selectedDevice) {
				$rootScope.device = selectedDevice;
				wifioner.info().success(function(data) {
					$rootScope.device.name = data.WiFiOneR.name;
					$rootScope.device.volume = parseInt(data.WiFiOneR.volume.split("%")[0]);
					if ($rootScope.device) {
						$scope.title = $rootScope.device.name || "Unknown";
					}
					if ($rootScope.userInfo) {
						$scope.userInfo = $rootScope.userInfo;
					}					
					$scope.initMenu();
				}).error(function(error) {
					$scope.title = "Disconnected";
				});
			}
			$timeout(function() {				
				if ($scope.devices.length) {
					var selectedUid = localStorage.getItem('selected-uid');
					if (!selectedUid && selectedUid !== "undefined") {
						localStorage.setItem('selected-uid', $scope.devices[0].uid);
						updateSelectedDevice($scope.devices[0]);
					} else {
						var idx = _.chain($scope.devices).pluck("uid").indexOf(selectedUid).value();
						if (!_.isUndefined(selectedUid) && (idx >= 0)) {
							updateSelectedDevice($scope.devices[idx]);
						}
					}
				}				
				$scope.initMenu();
				$rootScope.unlock();
			});
		});
	}]);

	module.directive('focusIf', ['$timeout',
	function($timeout) {
		return {
			restrict : 'A',
			link : function($scope, $element) {
				var dom = $element[0];
				if ($attrs.focusIf) {
					$scope.$watch($attrs.focusIf, focus);
				} else {
					focus(true);
				}
				function focus(condition) {
					if (condition) {
						$timeout(function() {
							dom.focus();
						}, $scope.$eval($attrs.focusDelay) || 0);
					}
				}

			}
		};
	}]);
});
