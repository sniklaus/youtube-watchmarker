'use strict';

var Database = {
	init: function() {
		{
			self.port.on('databaseCount', Database.countCallback);
			
			self.port.on('databaseSave', Database.saveCallback);
			
			self.port.on('databaseLoad', Database.loadCallback);
			
			self.port.on('databaseReset', Database.resteCallback);
		}
	},
	
	dispel: function() {
		
	},
	
	count: function() {
		{
			self.port.emit('databaseCount', {});
		}
	},
	
	countCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idIndex_History_Size')
				.text(objectArguments.intCount)
			;
		}
	},
	
	save: function() {
		{
			self.port.emit('databaseSave', {});
		}
	},
	
	saveCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idIndex_History_Export')
				.attr({
					'href': 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(objectArguments.resultHandle)),
					'target': '_blank',
					'download': moment(new Date().getTime()).format('YYYY.MM.DD') + '.history'
				})
			;
		}
	},
	
	load: function() {
		if (jQuery('#idIndex_History_File').get(0).files === undefined) {
			return;
			
		} else if (jQuery('#idIndex_History_File').get(0).files.length !== 1) {
			return;
			
		}
		
		{
			var filereaderHandle = new FileReader();
			
			filereaderHandle.onload = function(eventHandle) {
				self.port.emit('databaseLoad', {
					'resultHandle': JSON.parse(eventHandle.target.result)
				});
			};
			
			filereaderHandle.readAsText(jQuery('#idIndex_History_File').get(0).files[0], 'UTF-8');
		}
		
		{/*
			PreferenceHistory.acquire();
			
			PreferenceHistory.transactionOpen();
			
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
			
			PreferenceHistory.transactionClose();
			
			PreferenceHistory.release();
		*/}
	},
	
	loadCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			DatabaseObserver.update();
		}
	},
	
	reset: function() {
		{
			self.port.emit('databaseReset', {});
		}
	},
	
	resetCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			DatabaseObserver.update();
		}
	}
};
Database.init();

var Youtube = {
	init: function() {
		{
			self.port.on('youtubeAuthorize', Youtube.authorizeCallback);
			
			self.port.on('youtubeLink', Youtube.linkCallback);
			
			self.port.on('youtubeUnlink', Youtube.unlinkCallback);
			
			self.port.on('youtubeSynchronize', Youtube.synchronizeCallback);
		}
	},
	
	dispel: function() {
		
	},
	
	authorize: function() {
		{
			self.port.emit('youtubeAuthorize', {});
		}
	},
	
	authorizeCallback: function(objectArguments) {
		
	},
	
	link: function() {
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
			self.port.emit('youtubeLink', {
				'strKey': jQuery('#idIndex_Youlogin_Key').val()
			});
		}
	},
	
	linkCallback: function(objectArguments) {
		if (objectArguments === null) {
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
			
			return;
		}
		
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
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	unlink: function() {
		{
			self.port.emit('youtubeUnlink', {});
		}
	},
	
	unlinkCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			PreferenceYoutubeObserver.update();
		}
	},
	
	synchronize: function() {
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
			self.port.emit('youtubeSynchronize', {
				'intThreshold': 256
			});
		}
	},
	
	synchronizeCallback: function(objectArguments) {
		if (objectArguments === null) {
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
			
			return;
		}
		
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
		
		{
			DatabaseObserver.update();
		}
	}
};
Youtube.init();

DatabaseObserver.addObserver(function() {
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
			{
				Database.load();
			}
		})
	;
}

{
	jQuery('#idIndex_History_Export')
		.off('click')
		.on('click', function() {
			{
				Database.save();
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
			{
				Database.count();
			}
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
				Database.clear();
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
}

{
	jQuery('#idIndex_Youlogin_Login')
		.off('click')
		.on('click', function() {
			{
				Youtube.link();
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
			{
				Youtube.synchronize();
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
			{
				jQuery(this)
					.text(moment(PreferenceYoutube.getLongTimestamp()).format('HH:mm:ss'))
				;
			}
		})
	;
	
	jQuery('#idIndex_Youauth_Timestamp')
		.trigger('update')
	;
}