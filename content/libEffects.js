'use strict';

var Effects = {
	init: function() {
		{
			jQuery.fn.effectsScroll = function(objectArguments) {
				jQuery(this)
					.animate({
						'scrollTop': objectArguments.intPosition
					}, {
						'duration': objectArguments.intDuration,
						'easing': 'swing'
					})
				;
				
				return this;
			};
		}
		
		{
			jQuery.fn.effectsWave = function(objectArguments) {
				jQuery(this)
					.css({
						'border-spacing': 0,
						'display': 'block'
					})
					.animate({
						'border-spacing': 100
					}, {
						'duration': objectArguments.intDuration,
						'easing': 'linear',
						'step': function(dblStep, fxHandle) {
							if (objectArguments.strDirection === 'directionDown') {
								jQuery(fxHandle.elem)
									.css({
										'padding-bottom': (8.0 + (16.0 * Math.sin(0.1 * dblStep))) + 'px'
									})
								;
								
							} else if (objectArguments.strDirection === 'directionUp') {
								jQuery(fxHandle.elem)
									.css({
										'padding-top': (8.0 + (16.0 * Math.sin(0.1 * dblStep))) + 'px'
									})
								;
								
							}
							
							if (dblStep < 80.0) {
								jQuery(fxHandle.elem)
									.css({
										'opacity': 1.0
									})
								;
								
							} else if (dblStep > 80.0) {
								jQuery(fxHandle.elem)
									.css({
										'opacity': 1.0 - ((dblStep - 80.0) / 20.0)
									})
								;
								
							}
							
							if (dblStep === 100.0) {
								jQuery(fxHandle.elem)
									.css({
										'display': 'none'
									})
								;
							}
						}
					})
				;
				
				return this;
			};
		}
		
		{
			jQuery.fn.effectsSwipe = function(objectArguments) {
				var intWidth = jQuery(this).outerWidth(false);
				var intHeight = jQuery(this).outerHeight(false);
				
				jQuery(this)
					.css({
						'border-spacing': 0,
						'box-shadow': 'inset ' + intWidth + 'px 0px 0px 0px #CCCCCC'
					})
					.animate({
						'border-spacing': 100
					}, {
						'duration': objectArguments.intDuration,
						'easing': 'swing',
						'step': function(dblStep, fxHandle) {
							if (dblStep < 40.0) {
								jQuery(fxHandle.elem)
									.css({
										'box-shadow': 'inset ' + ((dblStep / 40.0) * intWidth) + 'px 0px 0px 0px #CCCCCC'
									})
								;
								
							} else if (dblStep > 60.0) {
								jQuery(fxHandle.elem)
									.css({
										'box-shadow': 'inset -' + ((1.0 - ((dblStep - 60.0) / 40.0)) * intWidth) + 'px 0px 0px 0px #CCCCCC'
									})
								;
								
							}
							
							if (dblStep === 100.0) {
								jQuery(fxHandle.elem)
									.css({
										'box-shadow': 'none'
									})
								;
							}
						}
					})
				;
				
				return this;
			};
		}
	},
	
	dispel: function() {
		{
			jQuery.fn.effectsScroll = null;
		}
		
		{
			jQuery.fn.effectsWave = null;
		}
		
		{
			jQuery.fn.effectsSwipe = null;
		}
	}
};
Effects.init();