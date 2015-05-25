'use strict';

PreferenceHistoryObserver.addObserver(function() {
	jQuery('#idIndex_History_Size')
		.trigger('update')
	;
});

PreferenceYoutubeObserver.addObserver(function() {
	if (Youtube.linked() === true) {
		
		
	} else if (Youtube.linked() === false) {
		
		
	}
	
	jQuery('#idIndex_Youlogin_Authorize')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youlogin_Login')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youlogin_Key')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youauth_Logout')
		.trigger('update')
	;
	
	jQuery('#idIndex_Youauth_Synchronize')
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
					Youtube.authorize();
				}
			})
		;
		
		jQuery('#idIndex_Youlogin_Authorize')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_Youlogin_Login')
			.off('click')
			.on('click', function() {
				{
					PreferenceYoutube.setStrKey(jQuery('#idLogin_Key').val());
				}
				
				{
					Youtube.link();
				}
			})
		;
		
		jQuery('#idIndex_Youlogin_Login')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_Youlogin_Key')
			.off('update')
			.on('update', function() {
				
			})
		;
		
		jQuery('#idIndex_Youlogin_Key')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_Youauth_Logout')
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
			.off('click')
			.on('click', function() {
				{
					Youtube.update();
				}
			})
		;
		
		jQuery('#idIndex_Youauth_Synchronize')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idIndex_Youauth_Timestamp')
			.off('update')
			.on('update', function() {
				jQuery(this)
					.text(moment(PreferenceYoutube.getLongTimestamp()).format('hh:mm:ss'))
				;
			})
		;
		
		jQuery('#idIndex_Youauth_Timestamp')
			.trigger('update')
		;
	}
});