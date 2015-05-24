'use strict';

PreferenceHistoryObserver.addObserver(function() {
	jQuery('#idHistory_Description')
		.trigger('update')
	;
});

PreferenceYoutubeObserver.addObserver(function() {
	jQuery('#idYoutube_Key')
		.trigger('update')
	;
	
	jQuery('#idYoutube_Login')
		.trigger('update')
	;
	
	jQuery('#idYoutube_Logout')
		.trigger('update')
	;
	
	jQuery('#idYoutube_Synchronize')
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
		jQuery('#idHistory_File')
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
						var jsonObject = JSON.parse(eventHandle.target.result);
						
						{
							PreferenceHistory.acquire();
							
							PreferenceHistory.transactionOpen();
							
							for (var intFor1 = 0; intFor1 < jsonObject.objectHistory.length; intFor1 += 1) {
								var objectHistory = jsonObject.objectHistory[intFor1];
								
								{
									PreferenceHistory.selectOpen(
										'SELECT   * ' +
										'FROM     PreferenceHistory ' +
										'WHERE    strIdent = :PARAM0 ',
										[ objectHistory.strIdent ]
									);
									
									PreferenceHistory.selectNext();
									
									if (PreferenceHistory.intIdent === 0) {
										PreferenceHistory.intIdent = 0;
										PreferenceHistory.longTimestamp = objectHistory.longTimestamp;
										PreferenceHistory.strIdent = objectHistory.strIdent;
										PreferenceHistory.strTitle = objectHistory.strTitle;
										PreferenceHistory.intCount = objectHistory.intCount;
										
										PreferenceHistory.create();
										
									} else if (PreferenceHistory.intIdent !== 0) {
										PreferenceHistory.intIdent = PreferenceHistory.intIdent;
										PreferenceHistory.longTimestamp = Math.max(PreferenceHistory.longTimestamp, objectHistory.longTimestamp);
										PreferenceHistory.strIdent = PreferenceHistory.strIdent;
										PreferenceHistory.strTitle = PreferenceHistory.strTitle;
										PreferenceHistory.intCount = Math.max(PreferenceHistory.intCount, objectHistory.intCount);
										
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
		jQuery('#idHistory_Description')
			.data({
				'strText': jQuery('#idHistory_Description').text()
			})
			.off('update')
			.on('update', function() {
				var strText = jQuery(this).data('strText');
				
				{
					var intCount = 0;
					
					{
						PreferenceHistory.acquire();
						
						intCount = PreferenceHistory.count();
						
						PreferenceHistory.release();
					}
					
					{
						strText = strText.replace(new RegExp('{{PreferenceHistory.intCount}}', 'g'), intCount);
					}
				}
				
				{
					jQuery(this)
						.text(strText)
					;
				}
			})
		;
		
		jQuery('#idHistory_Description')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idHistory_Export')
			.off('click')
			.on('click', function() {
				var jsonObject = {
					'objectHistory': []
				};
				
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
						
						jsonObject.objectHistory.push({
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
					jQuery('#idHistory_Export')
						.attr({
							'href': 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsonObject)),
                        	'target': '_blank',
							'download': 'Backup.yourect'
						})
					;
				}
			})
		;
	}
	
	{
		jQuery('#idHistory_Import')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idHistory_File')
						.click()
					;
				}
			})
		;
	}
	
	{
		jQuery('#idHistory_Reset')
			.off('click')
			.on('click', function() {
				{
					// TODO: prompt and reset
				}
			})
		;
	}
	
	
	/*
	{
		jQuery('#idYoutube_Key')
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this)
						.css({
							'display': 'none'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this)
						.css({
							'display': 'block'
						})
					;
					
				}
			})
		;
		
		jQuery('#idYoutube_Key')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idYoutube_Login')
			.off('click')
			.on('click', function() {
				{
					PreferenceYoutube.setStrKey(jQuery('#idLogin_Key').val());
				}
				
				{
					Youtube.link();
				}
			})
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this)
						.css({
							'display': 'none'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this)
						.css({
							'display': 'block'
						})
					;
					
				}
			})
		;
		
		jQuery('#idYoutube_Login')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idYoutube_Logout')
			.off('click')
			.on('click', function() {
				{
					Youtube.unlink();
				}
			})
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this)
						.css({
							'display': 'block'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this)
						.css({
							'display': 'none'
						})
					;
					
				}
			})
		;
		
		jQuery('#idYoutube_Logout')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idYoutube_Synchronize')
			.off('click')
			.on('click', function() {
				{
					Youtube.update();
				}
			})
			.off('update')
			.on('update', function() {
				if (Youtube.linked() === true) {
					jQuery(this)
						.css({
							'display': 'block'
						})
					;
					
				} else if (Youtube.linked() === false) {
					jQuery(this)
						.css({
							'display': 'none'
						})
					;
					
				}
			})
		;
		
		jQuery('#idYoutube_Synchronize')
			.trigger('update')
		;
	}
	*/
});