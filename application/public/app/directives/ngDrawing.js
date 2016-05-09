define([
	'angular'
],
function(angular) {
	'use strict';
	angular.module('go4smac.directives').directive("ngDrawing", function() {
		return {
			restrict : "A",
			link : function(scope, element) {
				var ctx = element[0].getContext('2d');
				// variable that decides if something should be drawn on mousemove
				var drawing = false;
				// the last coordinates before the current move
				var lastX;
				var lastY;
				element.bind('mousedown', function(event) {
					lastX = event.offsetX;
					lastY = event.offsetY;
					ctx.canvas.width = $(element).width();
					ctx.canvas.height = $(element).height();
					// begins new line
					ctx.beginPath();
					drawing = true;
				});
				element.bind('mousemove', function(event) {
					if (drawing) {
						// get current mouse position
						var currentX = event.offsetX;
						var currentY = event.offsetY;
						console.log($(element).width());
					

						draw(lastX, lastY, currentX, currentY);

						// set current coordinates to last one
						lastX = currentX;
						lastY = currentY;
					}
				});
				element.bind('mouseup', function(event) {
					// stop drawing
					drawing = false;
				});
				// canvas reset
				function reset() {
					element[0].width = element[0].width;
				}
				
				function save() {
					scope.captureSignatureUrl = element.toDataURL();
				}

				function draw(lX, lY, cX, cY) {
					// line from
					ctx.moveTo(lX, lY);
					// to
					ctx.lineTo(cX, cY);
					// color
					ctx.strokeStyle = "#4bf";
					// draw it
					ctx.stroke();
				}

			}
		};
	});
}); 