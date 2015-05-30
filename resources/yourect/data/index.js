'use strict';

self.port.on('youtubeLink', function() {
	{
		if (objectArguments.strStatus === 'statusLoading') {
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
			
		} else if (objectArguments.strStatus === 'statusError') {
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
			
		} else if (objectArguments.strStatus === 'statusSuccess') {
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
			
		}
	}
	
	{
		PreferenceHistoryObserver.update();
		
		PreferenceYoutubeObserver.update();
	}
});

self.port.on('youtubeSynchronize', function(objectArguments) {
	{
		if (objectArguments.strStatus === 'statusLoading') {
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
			
		} else if (objectArguments.strStatus === 'statusError') {
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
			
		} else if (objectArguments.strStatus === 'statusSuccess') {
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
			
		}
	}

	{
		PreferenceHistoryObserver.update();
		
		PreferenceYoutubeObserver.update();
	}
});

PreferenceHistoryObserver.addObserver(function() {
	jQuery('#idIndex_History_Size')
		.trigger('update')
	;
});

PreferenceYoutubeObserver.addObserver(function() {
	jQuery(window.document.body)
		.trigger('update')
	;
	
	jQuery('#idIndex_Youauth_Timestamp')
		.trigger('update')
	;
});

{
	jQuery(window.document.body)
		.off('update')
		.on('update', function() {
			var boolLinked = true;
			
			if (PreferenceYoutube.getStrAccess() === '') {
				boolLinked = false;
				
			} else if (PreferenceYoutube.getStrRefresh() === '') {
				boolLinked = false;
				
			}
			
			if (boolLinked === true) {
				jQuery('.panel:eq(2)')
					.css({
						'display': 'none'
					})
				;
				
				jQuery('.panel:eq(4)')
					.css({
						'display': 'block'
					})
				;
				
			} else if (boolLinked === false) {
				jQuery('.panel:eq(2)')
					.css({
						'display': 'block'
					})
				;
				
				jQuery('.panel:eq(4)')
					.css({
						'display': 'none'
					})
				;
				
			}
		})
	;
	
	jQuery(window.document.body)
		.trigger('update')
	;
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
				self.port.emit('youtubeAuthorize', {});
			}
		})
	;
}

{
	jQuery('#idIndex_Youlogin_Login')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idIndex_ModalLogin')
					.modalShow({
						'boolDim': true,
						'boolModal': true
					})
				;
			}
			
			{
				self.port.emit('youtubeLink', {
					'strKey': jQuery('#idIndex_Youlogin_Key').val()
				});
			}
		})
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
		.off('click')
		.on('click', function() {
			{
				Youtube.unlink();
			}
		})
	;
}

{
	jQuery('#idIndex_Youauth_Synchronize')
		.off('click')
		.on('click', function() {
			jQuery(this).trigger('fake');
		})
		.off('fake')
		.on('fake', function() {
			{
				jQuery('#idIndex_ModalSynchronize')
					.modalShow({
						'boolDim': true,
						'boolModal': true
					})
				;
			}
			
			{
				self.port.emit('youtubeSynchronize', {
					'intThreshold': 256
				});
			}
		})
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