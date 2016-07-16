'use strict';

var Panel = {
	init: function() {
		{
			self.port.on('panelShow', Panel.showCallback);
			
			self.port.on('panelHide', Panel.hideCallback);
		}
	},
	
	dispel: function() {
		
	},
	
	showCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			PreferenceDatabaseObserver.update();
			
			PreferenceYoutubeObserver.update();
		}
	},
	
	hideCallback: function(objectArguments) {
		
	}
};
Panel.init();

var Database = {
	init: function() {
		{
			self.port.on('databaseSave', Database.saveCallback);
			self.port.on('databaseSave-progress', Database.saveProgress);
			
			self.port.on('databaseLoad', Database.loadCallback);
			self.port.on('databaseLoad-progress', Database.loadProgress);
			
			self.port.on('databaseReset', Database.resetCallback);
		}
	},
	
	dispel: function() {
		
	},
	
	save: function() {
		{
			jQuery('#idGeneral_ModalLoading')
				.modalShow({
					'boolDim': true,
					'boolModal': true
				})
			;
		}
		
		{
			self.port.emit('databaseSave', {});
		}
	},
	
	saveCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idGeneral_ModalLoading')
				.modalHide()
			;
		}
		
		{
			window.saveAs(new Blob([ btoa(unescape(encodeURIComponent(JSON.stringify(objectArguments.resultHandle)))) ], {
				'type': 'text/plain'
			}), moment(new Date().getTime()).format('YYYY.MM.DD') + '.database');
		}
	},
	
	saveProgress: function(objectArguments) {
			
	},
	
	load: function() {
		{
			jQuery('#idGeneral_ModalLoading')
				.modalShow({
					'boolDim': true,
					'boolModal': true
				})
			;
		}
		
		{
			var filereaderHandle = new FileReader();
			
			filereaderHandle.onload = function(eventHandle) {
				self.port.emit('databaseLoad', {
					'resultHandle': JSON.parse(decodeURIComponent(escape(atob(eventHandle.target.result))))
				});
			};
			
			if (jQuery('#idDatabase_File').get(0).files !== undefined) {
				if (jQuery('#idDatabase_File').get(0).files.length === 1) {
					filereaderHandle.readAsText(jQuery('#idDatabase_File').get(0).files[0], 'UTF-8');
				}
			}
		}
	},
	
	loadCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idGeneral_ModalLoading')
				.modalHide()
			;
		}
		
		{
			PreferenceDatabaseObserver.update();
		}
	},
	
	loadProgress: function(objectArguments) {
			
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
			PreferenceDatabaseObserver.update();
		}
	}
};
Database.init();

var History = {
	init: function() {
		{
			self.port.on('historySynchronize', History.synchronizeCallback);
			self.port.on('historySynchronize-progress', History.synchronizeProgress);
		}
	},
	
	dispel: function() {
		
	},
	
	synchronize: function() {
		{
			jQuery('#idGeneral_ModalLoading')
				.modalShow({
					'boolDim': true,
					'boolModal': true
				})
			;
		}
		
		{
			self.port.emit('historySynchronize', {
				'intThreshold': 32768
			});
		}
	},
	
	synchronizeCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idGeneral_ModalLoading')
				.modalHide()
			;
		}
		
		{
			PreferenceDatabaseObserver.update();
		}
	},
	
	synchronizeProgress: function(objectArguments) {
			
	}
};
History.init();

var Youtube = {
	init: function() {
		{
			self.port.on('youtubeAuthorize', Youtube.authorizeCallback);
			
			self.port.on('youtubeLink', Youtube.linkCallback);
			
			self.port.on('youtubeUnlink', Youtube.unlinkCallback);
			
			self.port.on('youtubeSynchronize', Youtube.synchronizeCallback);
			self.port.on('youtubeSynchronize-progress', Youtube.synchronizeProgress);
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
			jQuery('#idYouin_ModalLogin')
				.modalShow({
					'boolDim': true,
					'boolModal': true
				})
			;
		}
		
		{
			jQuery('#idYouin_ModalLogin_Loading')
				.css({
					'display': 'block'
				})
			;
			
			jQuery('#idYouin_ModalLogin_Error')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouin_ModalLogin_Success')
				.css({
					'display': 'none'
				})
			;
		}
		
		{
			jQuery('#idYouin_ModalLogin_Close')
				.addClass('disabled')
			;
		}
		
		{
			self.port.emit('youtubeLink', {
				'strKey': jQuery('#idYouin_Key').val()
			});
		}
	},
	
	linkCallback: function(objectArguments) {
		if (objectArguments === null) {
			{
				jQuery('#idYouin_ModalLogin_Loading')
					.css({
						'display': 'none'
					})
				;
				
				jQuery('#idYouin_ModalLogin_Error')
					.css({
						'display': 'block'
					})
				;
				
				jQuery('#idYouin_ModalLogin_Success')
					.css({
						'display': 'none'
					})
				;
			}
			
			{
				jQuery('#idYouin_ModalLogin_Close')
					.removeClass('disabled')
				;
			}
			
			return;
		}
		
		{
			jQuery('#idYouin_ModalLogin_Loading')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouin_ModalLogin_Error')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouin_ModalLogin_Success')
				.css({
					'display': 'block'
				})
			;
		}
		
		{
			jQuery('#idYouin_ModalLogin_Close')
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
			jQuery('#idYouauth_ModalSynchronize')
				.modalShow({
					'boolDim': true,
					'boolModal': true
				})
			;
		}
		
		{
			jQuery('#idYouauth_ModalSynchronize_Loading')
				.css({
					'display': 'block'
				})
			;
			
			jQuery('#idYouauth_ModalSynchronize_Error')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouauth_ModalSynchronize_Success')
				.css({
					'display': 'none'
				})
			;
		}
		
		{
			jQuery('#idYouauth_ModalSynchronize_Close')
				.addClass('disabled')
			;
		}
		
		{
			self.port.emit('youtubeSynchronize', {
				'intThreshold': 250
			});
		}
	},
	
	synchronizeCallback: function(objectArguments) {
		if (objectArguments === null) {
			{
				jQuery('#idYouauth_ModalSynchronize_Loading')
					.css({
						'display': 'none'
					})
				;
				
				jQuery('#idYouauth_ModalSynchronize_Error')
					.css({
						'display': 'block'
					})
				;
				
				jQuery('#idYouauth_ModalSynchronize_Success')
					.css({
						'display': 'none'
					})
				;
			}
			
			{
				jQuery('#idYouauth_ModalSynchronize_Close')
					.removeClass('disabled')
				;
			}
			
			return;
		}
		
		{
			jQuery('#idYouauth_ModalSynchronize_Loading')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouauth_ModalSynchronize_Error')
				.css({
					'display': 'none'
				})
			;
			
			jQuery('#idYouauth_ModalSynchronize_Success')
				.css({
					'display': 'block'
				})
			;
		}
		
		{
			jQuery('#idYouauth_ModalSynchronize_Close')
				.removeClass('disabled')
			;
		}
		
		{
			PreferenceDatabaseObserver.update();
			
			PreferenceYoutubeObserver.update();
		}
	},
	
	synchronizeProgress: function(objectArguments) {
		
	}
};
Youtube.init();

PreferenceDatabaseObserver.addObserver(function() {
	jQuery('#idDatabase_Size').triggerHandler('update');
});

PreferenceYoutubeObserver.addObserver(function() {
	jQuery(window.document.body).triggerHandler('update');
	
	jQuery('#idYouauth_Timestamp').triggerHandler('update');
});

{
	jQuery(window.document.body)
		.off('update')
		.on('update', function() {
			var boolLinked = true;
			
			if (String(PreferenceYoutube.getStrAccess()) === '') {
				boolLinked = false;
				
			} else if (String(PreferenceYoutube.getStrRefresh()) === '') {
				boolLinked = false;
				
			}
			
			if (boolLinked === true) {
				jQuery('.panel').eq(4)
					.css({
						'display': 'none'
					})
				;
				
				jQuery('.panel').eq(6)
					.css({
						'display': 'block'
					})
				;
				
			} else if (boolLinked === false) {
				jQuery('.panel').eq(4)
					.css({
						'display': 'block'
					})
				;
				
				jQuery('.panel').eq(6)
					.css({
						'display': 'none'
					})
				;
				
			}
		})
	;
	
	jQuery(window.document.body).triggerHandler('update');
}

{
	jQuery('#idDatabase_File')
		.off('change')
		.on('change', function() {
			{
				Database.load();
			}
		})
	;
}

{
	jQuery('#idDatabase_Export')
		.off('click')
		.on('click', function() {
			{
				Database.save();
			}
		})
	;
}

{
	jQuery('#idDatabase_Import')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idDatabase_File')
					.trigger('click')
				;
			}
		})
	;
}

{
	jQuery('#idDatabase_Reset')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idDatabase_ModalReset')
					.modalShow()
				;
			}
		})
	;
}

{
	jQuery('#idDatabase_Size')
		.off('update')
		.on('update', function() {
			{
				jQuery(this)
					.text(PreferenceDatabase.getIntSize())
				;
			}
		})
	;
	
	jQuery('#idDatabase_Size').triggerHandler('update');
}

{
	jQuery('#idDatabase_ModalReset_Yes')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idDatabase_ModalReset')
					.modalHide()
				;
			}
			
			{
				Database.reset();
			}
		})
	;
}

{
	jQuery('#idDatabase_ModalReset_No')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idDatabase_ModalReset')
					.modalHide()
				;
			}
		})
	;
}

{
	jQuery('#idHistory_Synchronize')
		.off('click')
		.on('click', function() {
			{
				History.synchronize();
			}
		})
	;
}

{
	jQuery('#idYouin_Authorize')
		.off('click')
		.on('click', function() {
			{
				Youtube.authorize();
			}
		})
	;
}

{
	jQuery('#idYouin_Login')
		.off('click')
		.on('click', function() {
			{
				Youtube.link();
			}
		})
	;
}

{
	jQuery('#idYouin_ModalLogin_Close')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idYouin_ModalLogin')
					.modalHide()
				;
			}
		})
	;
}

{
	jQuery('#idYouauth_Logout')
		.off('click')
		.on('click', function() {
			{
				Youtube.unlink();
			}
		})
	;
}

{
	jQuery('#idYouauth_Synchronize')
		.off('click')
		.on('click', function() {
			{
				Youtube.synchronize();
			}
		})
	;
}

{
	jQuery('#idYouauth_ModalSynchronize_Close')
		.off('click')
		.on('click', function() {
			{
				jQuery('#idYouauth_ModalSynchronize')
					.modalHide()
				;
			}
		})
	;
}

{
	jQuery('#idYouauth_Timestamp')
		.off('update')
		.on('update', function() {
			{
				jQuery(this)
					.text(moment(PreferenceYoutube.getLongTimestamp()).format('HH:mm:ss'))
				;
			}
		})
	;
	
	jQuery('#idYouauth_Timestamp').triggerHandler('update');
}