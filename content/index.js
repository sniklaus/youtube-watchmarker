'use strict';

PreferenceHistoryObserver.addObserver(function() {
	
});

PreferenceYoutubeObserver.addObserver(function() {
	jQuery('#idLogin')
		.trigger('update')
	;
	
	jQuery('#idLogout')
		.trigger('update')
	;
	
	jQuery('#idHistory')
		.trigger('update')
	;
});

YoutubeObserver.addObserver(function() {
	
});

jQuery(document).ready(function() {
	{
		// @formatter:off
		PreferenceHistory.sqlserviceHandle.executeSimpleSQL(
			'CREATE INDEX Index_longTimestamp ON PreferenceHistory (longTimestamp) '
		);
		// @formatter:on
		
		// @formatter:off
		PreferenceHistory.sqlserviceHandle.executeSimpleSQL(
			'CREATE INDEX Index_strIdent ON PreferenceHistory (strIdent) '
		);
		// @formatter:on
	}
	
	{
		jQuery('#idLogin')
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
		
		jQuery('#idLogin')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idLogin_Key')
		
		;
	}
	
	{
		jQuery('#idLogin_Login')
			.off('click')
			.on('click', function() {
				{
					PreferenceYoutube.setStrKey(jQuery('#idLogin_Key').val());
					
					Youtube.link();
				}
			})
		;
	}
	
	{
		jQuery('#idLogout')
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
		
		jQuery('#idLogout')
			.trigger('update')
		;
	}
	
	{
		jQuery('#idLogout_Logout')
			.off('click')
			.on('click', function() {
				{
					Youtube.unlink();
				}
			})
		;
	}
	
	{
		jQuery('#idHistory')
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
		
		jQuery('#idHistory')
			.trigger('update')
		;
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
							// TODO: OPTIONAL CLEAR
						}
						
						{
							PreferenceHistory.acquire();
							
							for (var intFor1 = jsonObject.objectHistory.length - 1; intFor1 > -1; intFor1 -= 1) {
								{
									PreferenceHistory.selectOpen(
										'SELECT   * ' +
										'FROM     PreferenceHistory ' +
										'WHERE    strIdent = :PARAM0 ',
										[ jsonObject.objectHistory[intFor1].strIdent ]
									);
									
									if (PreferenceHistory.intIdent === 0) {
										PreferenceHistory.intIdent = 0;
										PreferenceHistory.longTimestamp = jsonObject.objectHistory[intFor1].longTimestamp;
										PreferenceHistory.strIdent = jsonObject.objectHistory[intFor1].strIdent;
										PreferenceHistory.strTitle = jsonObject.objectHistory[intFor1].strTitle;
										PreferenceHistory.intCount = jsonObject.objectHistory[intFor1].intCount;
										
										PreferenceHistory.create();
										
									} else if (PreferenceHistory.intIdent !== 0) {
										if (PreferenceHistory.longTimestamp < jsonObject.objectHistory[intFor1].longTimestamp) {
											PreferenceHistory.intIdent = PreferenceHistory.intIdent;
											PreferenceHistory.longTimestamp = jsonObject.objectHistory[intFor1].longTimestamp;
											PreferenceHistory.strIdent = jsonObject.objectHistory[intFor1].strIdent;
											PreferenceHistory.strTitle = jsonObject.objectHistory[intFor1].strTitle;
											PreferenceHistory.intCount = jsonObject.objectHistory[intFor1].intCount;
											
											PreferenceHistory.save();
										}
										
									}
									
									PreferenceHistory.selectClose();
								}
								
								{
									if ((intFor1 % 100) === 0) {
										PreferenceHistory.release();
										
										PreferenceHistory.acquire();
									}
								}
							}
							
							PreferenceHistory.release();
						}
					};
					
					filereaderHandle.readAsText(jQuery(this).get(0).files[0], 'UTF-8');
				}
			})
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
						'ORDER BY longTimestamp ASC ',
						[ jsonObject.objectHistory[intFor1].strIdent ]
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
					var blobHandle = new Blob([ JSON.stringify(jsonObject) ], {
						'type': 'text/plain; charset=utf-8'
					});
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
		jQuery('#idHistory_Refresh')
			.off('click')
			.on('click', function() {
				{
					Youtube.update();
				}
			})
		;
	}
	
	{
		
	}
});