'use strict';

var Modal = {
	init: function() {
		{
			jQuery.fn.modalShow = function(objectArguments) {
				if (jQuery(this).hasClass('modal-dialog') === false) {
					throw new Error();
					
					return;
					
				} else if (jQuery(this).prev().hasClass('modal-overlay') === false) {
					throw new Error();
					
					return;
					
				}
				
				{
					objectArguments = jQuery.extend({
						'boolDim': false,
						'boolModal': false
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.css({
							'display': 'block',
							'margin': (-0.5 * jQuery(this).outerHeight(false)) + 'px 0px 0px ' + (-0.5 * jQuery(this).outerWidth(false)) + 'px'
						})
					;
				}
				
				{
					if (objectArguments.boolDim === true) {
						jQuery(this).prev()
							.css({
								'display': 'block',
								'background-color': 'rgba(0, 0, 0, 0.5)'
							})
						;
						
					} else if (objectArguments.boolDim === false) {
						jQuery(this).prev()
							.css({
								'display': 'block',
								'background-color': 'transparent'
							})
						;
						
					}
				}
				
				{
					if (objectArguments.boolModal === true) {
						jQuery(this).prev()
							.off('click')
						;
						
					} else if (objectArguments.boolModal === false) {
						jQuery(this).prev()
							.off('click')
							.on('click', function() {
								{
									jQuery(this).next()
										.modalHide()
									;
								}
							})
						;
						
					}
				}
				
				return this;
			};
		}
		
		{
			jQuery.fn.modalHide = function(objectArguments) {
				if (jQuery(this).hasClass('modal-dialog') === false) {
					throw new Error();
					
					return;
					
				} else if (jQuery(this).prev().hasClass('modal-overlay') === false) {
					throw new Error();
					
					return;
					
				}
				
				{
					objectArguments = jQuery.extend({}, objectArguments);
				}
				
				{
					jQuery(this)
						.css({
							'display': 'none'
						})
					;
					
					jQuery(this).prev()
						.css({
							'display': 'none'
						})
					;
				}
				
				return this;
			};
		}
	},
	
	dispel: function() {
		{
			jQuery.fn.modalShow = null;
		}
		
		{
			jQuery.fn.modalHide = null;
		}
	}
};
Modal.init();