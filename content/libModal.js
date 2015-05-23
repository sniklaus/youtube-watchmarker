'use strict';

var Modal = {
	init: function() {
		{
			jQuery.fn.modalShow = function() {
				if (jQuery(this).hasClass('modal-dialog') === false) {
					throw new Error();
					
					return;
					
				} else if (jQuery(this).prev().hasClass('modal-overlay') === false) {
					throw new Error();
					
					return;
					
				}
				
				{
					jQuery(this)
						.css({
							'display': 'block',
							'margin': (-0.5 * jQuery(this).outerHeight(false)) + 'px 0px 0px ' + (-0.5 * jQuery(this).outerWidth(false)) + 'px'
						})
					;
					
					jQuery(this).prev()
						.css({
							'display': 'block'
						})
					;
				}
				
				{
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
				
				return this;
			};
		}
		
		{
			jQuery.fn.modalHide = function() {
				if (jQuery(this).hasClass('modal-dialog') === false) {
					throw new Error();
					
					return;
					
				} else if (jQuery(this).prev().hasClass('modal-overlay') === false) {
					throw new Error();
					
					return;
					
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