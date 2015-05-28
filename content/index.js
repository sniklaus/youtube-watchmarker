'use strict';

PreferenceHistoryObserver.addObserver(function() {
	jQuery('#idIndex_History_Size')
		.trigger('update')
	;
});

PreferenceYoutubeObserver.addObserver(function() {
	jQuery('#idIndex_Youlogin_Login')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youauth_Logout')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youauth_Timestamp')
		.trigger('update')
	;
});

jQuery(document).ready(function() {
	{
		// @formatter:off
		PreferenceHistory.sqlserviceHandle.executeSimpleSQL(
			'CREATE INDEX IF NOT EXISTS Index_longTimestamp ON PreferenceHistory (longTimestamp) '
		);
		// @formatter:on
		
		// @formatter:off
		PreferenceHistory.sqlserviceHandle.executeSimpleSQL(
			'CREATE INDEX IF NOT EXISTS Index_strIdent ON PreferenceHistory (strIdent) '
		);
		// @formatter:on
	}
	
	{
		jQuery('#idIndex_History_File')
			.off('change')
			.on('change', function() {
				if (jQuery(this).get(0).files === undefined) {
					return;
					
				} else if (jQuery(this).get(0).files.length !== 1) {
					return;
					
				}
				
				{
					var filereaderHandle = new FileReader();
					
					filereaderHandle.onload = function(eventHandle) {
						var objectHistory = JSON.parse(eventHandle.target.result);
						
						{
							PreferenceHistory.acquire();
							
							PreferenceHistory.transactionOpen();
							
							for (var intFor1 = 0; intFor1 < objectHistory.length; intFor1 += 1) {
								{
									PreferenceHistory.selectOpen(
										'SELECT   * ' +
										'FROM     PreferenceHistory ' +
										'WHERE    strIdent = :PARAM0 ',
										[ objectHistory[intFor1].strIdent ]
									);
									
									PreferenceHistory.selectNext();
									
									if (PreferenceHistory.intIdent === 0) {
										PreferenceHistory.intIdent = 0;
										PreferenceHistory.longTimestamp = objectHistory[intFor1].longTimestamp;
										PreferenceHistory.strIdent = objectHistory[intFor1].strIdent;
										PreferenceHistory.strTitle = objectHistory[intFor1].strTitle;
										PreferenceHistory.intCount = objectHistory[intFor1].intCount;
										
										PreferenceHistory.create();
										
									} else if (PreferenceHistory.intIdent !== 0) {
										PreferenceHistory.intIdent = PreferenceHistory.intIdent;
										PreferenceHistory.longTimestamp = Math.max(PreferenceHistory.longTimestamp, objectHistory[intFor1].longTimestamp);
										PreferenceHistory.strIdent = PreferenceHistory.strIdent;
										PreferenceHistory.strTitle = PreferenceHistory.strTitle;
										PreferenceHistory.intCount = Math.max(PreferenceHistory.intCount, objectHistory[intFor1].intCount);
										
										PreferenceHistory.save();
										
									}
									
									PreferenceHistory.selectClose();
								}
							}
							
							PreferenceHistory.transactionClose();
							
							PreferenceHistory.release();
						}
					};
					
					filereaderHandle.readAsText(jQuery(this).get(0).files[0], 'UTF-8');
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_History_Export')
			.off('click')
			.on('click', function() {
				var objectHistory = [];
				
				{
					PreferenceHistory.acquire();
					
					PreferenceHistory.selectOpen(
						'SELECT   * ' +
						'FROM     PreferenceHistory ' +
						'ORDER BY longTimestamp DESC ',
						[]
					);
					
					do {
						PreferenceHistory.selectNext();
						
						if (PreferenceHistory.intIdent === 0) {
							break;
						}
						
						objectHistory.push({
							'longTimestamp': PreferenceHistory.longTimestamp,
							'strIdent': PreferenceHistory.strIdent,
							'strTitle': PreferenceHistory.strTitle,
							'intCount': PreferenceHistory.intCount
						});
					} while (true);
					
					PreferenceHistory.selectClose();
					
					PreferenceHistory.release();
				}
				
				{
					jQuery('#idIndex_History_Export')
						.attr({
							'href': 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(objectHistory)),
                        	'target': '_blank',
							'download': moment(new Date().getTime()).format('YYYY.MM.DD') + '.history'
						})
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_History_Import')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_History_File')
						.click()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_History_Reset')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalReset')
						.modalShow()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_History_Size')
			.off('update')
			.on('update', function() {
				var intCount = 0;
				
				{
					PreferenceHistory.acquire();
					
					intCount = PreferenceHistory.count();
					
					PreferenceHistory.release();
				}
				
				jQuery(this)
					.text(intCount)
				;
			})
		;
		
		jQuery('#idIndex_History_Size')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_ModalReset_Yes')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalReset')
						.modalHide()
					;
				}
				
				{
					PreferenceHistory.acquire();
					
					PreferenceHistory.clear();
					
					PreferenceHistory.release();
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_ModalReset_No')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalReset')
						.modalHide()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_Youlogin_Authorize')
			.off('click')
			.on('click', function() {
				{
					
					window.open('https://accounts.google.com/o/oauth2/auth?response_type=' + encodeURIComponent('code') + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect) + '&scope=' + encodeURIComponent(Youtube.strScope), '_blank');
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_Youlogin_Login')
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'none'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'block'
						})
					;
					
				}
			})
			.off('click')
			.on('click', function() {
				{
					PreferenceYoutube.setStrKey(jQuery('#idIndex_Youlogin_Key').val());
				}
				
				{
					jQuery('#idIndex_ModalLogin')
						.modalShow({
							'boolDim': true,
							'boolModal': true
						})
					;
				}
				
				{
					jQuery('#idIndex_ModalLogin_Loading')
						.css({
							'display': 'block'
						})
					;
					
					jQuery('#idIndex_ModalLogin_Error')
						.css({
							'display': 'none'
						})
					;
					
					jQuery('#idIndex_ModalLogin_Success')
						.css({
							'display': 'none'
						})
					;
				}
				
				{
					jQuery('#idIndex_ModalLogin_Close')
						.addClass('disabled')
					;
				}
				
				{
					Youtube.link(function() {
						{
							jQuery('#idIndex_ModalLogin_Loading')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalLogin_Error')
								.css({
									'display': 'block'
								})
							;
							
							jQuery('#idIndex_ModalLogin_Success')
								.css({
									'display': 'none'
								})
							;
						}
						
						{
							jQuery('#idIndex_ModalLogin_Close')
								.removeClass('disabled')
							;
						}
					}, function() {
						{
							jQuery('#idIndex_ModalLogin_Loading')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalLogin_Error')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalLogin_Success')
								.css({
									'display': 'block'
								})
							;
						}
						
						{
							jQuery('#idIndex_ModalLogin_Close')
								.removeClass('disabled')
							;
						}
					});
				}
			})
		;
		
		jQuery('#idIndex_Youlogin_Login')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_ModalLogin_Close')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalLogin')
						.modalHide()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_Youauth_Logout')
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'block'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'none'
						})
					;
					
				}
			})
			.off('click')
			.on('click', function() {
				{
					Youtube.unlink();
				}
			})
		;
		
		jQuery('#idIndex_Youauth_Logout')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_Youauth_Synchronize')
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'block'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this).closest('.panel')
						.css({
							'display': 'none'
						})
					;
					
				}
			})
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalSynchronize')
						.modalShow({
							'boolDim': true,
							'boolModal': true
						})
					;
				}
				
				{
					jQuery('#idIndex_ModalSynchronize_Loading')
						.css({
							'display': 'block'
						})
					;
					
					jQuery('#idIndex_ModalSynchronize_Error')
						.css({
							'display': 'none'
						})
					;
					
					jQuery('#idIndex_ModalSynchronize_Success')
						.css({
							'display': 'none'
						})
					;
				}
				
				{
					jQuery('#idIndex_ModalSynchronize_Close')
						.addClass('disabled')
					;
				}
				
				{
					Youtube.update(function() {
						{
							jQuery('#idIndex_ModalSynchronize_Loading')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalSynchronize_Error')
								.css({
									'display': 'block'
								})
							;
							
							jQuery('#idIndex_ModalSynchronize_Success')
								.css({
									'display': 'none'
								})
							;
						}
						
						{
							jQuery('#idIndex_ModalSynchronize_Close')
								.removeClass('disabled')
							;
						}
					}, function() {
						{
							jQuery('#idIndex_ModalSynchronize_Loading')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalSynchronize_Error')
								.css({
									'display': 'none'
								})
							;
							
							jQuery('#idIndex_ModalSynchronize_Success')
								.css({
									'display': 'block'
								})
							;
						}
						
						{
							jQuery('#idIndex_ModalSynchronize_Close')
								.removeClass('disabled')
							;
						}
					});
				}
			})
		;
		
		jQuery('#idIndex_Youauth_Synchronize')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_ModalSynchronize_Close')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idIndex_ModalSynchronize')
						.modalHide()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idIndex_Youauth_Timestamp')
			.off('update')
			.on('update', function() {
				jQuery(this)
					.text(moment(PreferenceYoutube.getLongTimestamp()).format('HH:mm:ss'))
				;
			})
		;
		
		jQuery('#idIndex_Youauth_Timestamp')
			.trigger('update')
		;
	}
});