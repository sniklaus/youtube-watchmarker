'use strict';

console.log(window.document.location);

var Database = {
	objectPort: null,

	init: function() {
		{
			Database.objectPort = chrome.runtime.connect({
				'name': 'database'
			});

			Database.objectPort.onMessage.addListener(function(objectData) {
				if (objectData.strMessage === 'databaseSave') {
					Database.saveCallback(objectData.objectArguments);
				}

				if (objectData.strMessage === 'databaseSave-progress') {
					Database.saveProgress(objectData.objectArguments);
				}

				if (objectData.strMessage === 'databaseLoad') {
					Database.loadCallback(objectData.objectArguments);
				}

				if (objectData.strMessage === 'databaseLoad-progress') {
					Database.loadProgress(objectData.objectArguments);
				}

				if (objectData.strMessage === 'databaseReset') {
					Database.resetCallback(objectData.objectArguments);
				}
			});
		}
	},
	
	dispel: function() {
		{
			Database.objectPort = null;
		}
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
			jQuery('#idGeneral_ModalLoading_Message')
				.text('saving database')
			;

			jQuery('#idGeneral_ModalLoading_Progress')
				.text('0')
			;
		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.addClass('disabled')
			;
		}
		
		{
			Database.objectPort.postMessage({
				'strMessage': 'databaseSave',
				'objectArguments' : {}
			});
		}
	},
	
	saveCallback: function(objectArguments) {
		if (objectArguments === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while saving')
			;

		} else if (objectArguments !== null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('finished saving')
			;

		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.removeClass('disabled')
			;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
		}
	},
	
	saveProgress: function(objectArguments) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objectArguments.strProgress)
			;
		}
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
			jQuery('#idGeneral_ModalLoading_Message')
				.text('loading database')
			;

			jQuery('#idGeneral_ModalLoading_Progress')
				.text('0')
			;
		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.addClass('disabled')
			;
		}
		
		{
			var objectFilereader = new FileReader();
			
			objectFilereader.onload = function(objectEvent) {
				Database.objectPort.postMessage({
					'strMessage': 'databaseLoad',
					'objectArguments' : {
						'objectResults': JSON.parse(decodeURIComponent(escape(atob(objectEvent.target.result))))
					}
				});
			};
			
			if (jQuery('#idDatabase_File').get(0).files !== undefined) {
				if (jQuery('#idDatabase_File').get(0).files.length === 1) {
					objectFilereader.readAsText(jQuery('#idDatabase_File').get(0).files[0], 'UTF-8');
				}
			}
		}
	},
	
	loadCallback: function(objectArguments) {
		if (objectArguments === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while loading')
			;

		} else if (objectArguments !== null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('finished loading')
			;

		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.removeClass('disabled')
			;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
		}
	},
	
	loadProgress: function(objectArguments) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objectArguments.strProgress)
			;
		}
	},
	
	reset: function() {
		{
			Database.objectPort.postMessage({
				'strMessage': 'databaseReset',
				'objectArguments' : {}
			});
		}
	},
	
	resetCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
		}
	}
};
Database.init();

var History = {
	objectPort: null,

	init: function() {
		{
			History.objectPort = chrome.runtime.connect({
				'name': 'history'
			});

			History.objectPort.onMessage.addListener(function(objectData) {
				if (objectData.strMessage === 'historySynchronize') {
					History.synchronizeCallback(objectData.objectArguments);
				}

				if (objectData.strMessage === 'historySynchronize-progress') {
					History.synchronizeProgress(objectData.objectArguments);
				}
			});
		}
	},
	
	dispel: function() {
		{
			History.objectPort = null;
		}
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
			jQuery('#idGeneral_ModalLoading_Message')
				.text('synchronizing with history')
			;

			jQuery('#idGeneral_ModalLoading_Progress')
				.text('0')
			;
		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.addClass('disabled')
			;
		}
		
		{
			History.objectPort.postMessage({
				'strMessage': 'historySynchronize',
				'objectArguments' : {
					'longTimestamp': 0
				}
			});
		}
	},
	
	synchronizeCallback: function(objectArguments) {
		if (objectArguments === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while synchronizing')
			;

		} else if (objectArguments !== null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('finished synchronizing')
			;

		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.removeClass('disabled')
			;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
			
			jQuery('#idHistory_Timestamp').triggerHandler('update');
		}
	},
	
	synchronizeProgress: function(objectArguments) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objectArguments.strProgress)
			;
		}
	}
};
History.init();

var Youtube = {
	objectPort: null,

	init: function() {
		{
			Youtube.objectPort = chrome.runtime.connect({
				'name': 'youtube'
			});

			Youtube.objectPort.onMessage.addListener(function(objectData) {
				if (objectData.strMessage === 'youtubeSynchronize') {
					Youtube.synchronizeCallback(objectData.objectArguments);
				}

				if (objectData.strMessage === 'youtubeSynchronize-progress') {
					Youtube.synchronizeProgress(objectData.objectArguments);
				}
			});
		}
	},
	
	dispel: function() {
		{
			Youtube.objectPort = null;
		}
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
			jQuery('#idGeneral_ModalLoading_Message')
				.text('synchronizing with youtube')
			;

			jQuery('#idGeneral_ModalLoading_Progress')
				.text('0')
			;
		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.addClass('disabled')
			;
		}
		
		{
			Youtube.objectPort.postMessage({
				'strMessage': 'youtubeSynchronize',
				'objectArguments' : {
					'intThreshold': 1000000
				}
			});
		}
	},
	
	synchronizeCallback: function(objectArguments) {
		if (objectArguments === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while synchronizing')
			;

		} else if (objectArguments !== null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('finished synchronizing')
			;

		}
		
		{
			jQuery('#idGeneral_ModalLoading_Close')
				.removeClass('disabled')
			;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
			
			jQuery('#idYoutube_Timestamp').triggerHandler('update');
		}
	},
	
	synchronizeProgress: function(objectArguments) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objectArguments.strProgress)
			;
		}
	}
};
Youtube.init();

jQuery(window.document).ready(function() {
	{
		jQuery('#idGeneral_ModalLoading_Close')
			.off('click')
			.on('click', function() {
				{
					jQuery('#idGeneral_ModalLoading')
						.modalHide()
					;
				}
			})
		;
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
						.text(parseInt(window.localStorage.getItem('extensions.YouRect.Database.intSize'), 10))
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
		jQuery('#idHistory_Timestamp')
			.off('update')
			.on('update', function() {
				{
					jQuery(this)
						.text(moment(parseInt(window.localStorage.getItem('extensions.YouRect.History.longTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
					;
				}
			})
		;
		
		jQuery('#idHistory_Timestamp').triggerHandler('update');
	}

	{
		jQuery('#idYoutube_Synchronize')
			.off('click')
			.on('click', function() {
				{
					Youtube.synchronize();
				}
			})
		;
	}

	{
		jQuery('#idYoutube_Timestamp')
			.off('update')
			.on('update', function() {
				{
					jQuery(this)
						.text(moment(parseInt(window.localStorage.getItem('extensions.YouRect.Youtube.longTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
					;
				}
			})
		;
		
		jQuery('#idYoutube_Timestamp').triggerHandler('update');
	}

	{
		jQuery('#idVisualization_Hideprogress')
			.off('click')
			.on('click', function() {
				if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === String(true)) {
					window.localStorage.setItem('extensions.YouRect.Visualization.boolHideprogress', String(false));
					
				} else if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === String(false)) {
					window.localStorage.setItem('extensions.YouRect.Visualization.boolHideprogress', String(true));
					
				}

				jQuery(this).triggerHandler('update');
			})
			.off('update')
			.on('update', function() {
				if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === String(true)) {
					jQuery(this)
						.addClass('btn-primary')
						.removeClass('btn-default')
					;
					
					jQuery(this).find('span')
						.addClass('fa-check-square-o')
						.removeClass('fa-square-o')
					;
					
				} else if (window.localStorage.getItem('extensions.YouRect.Visualization.boolHideprogress') === String(false)) {
					jQuery(this)
						.addClass('btn-default')
						.removeClass('btn-primary')
					;
					
					jQuery(this).find('span')
						.addClass('fa-square-o')
						.removeClass('fa-check-square-o')
					;
				
				}
			})
		;
		
		jQuery('#idVisualization_Hideprogress').triggerHandler('update');
	}
});