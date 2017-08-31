'use strict';

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

var Search = {
	objectPort: null,

	init: function() {
		{
			Search.objectPort = chrome.runtime.connect({
				'name': 'search'
			});

			Search.objectPort.onMessage.addListener(function(objectData) {
				if (objectData.strMessage === 'searchLookup') {
					Search.lookupCallback(objectData.objectArguments);

				} else if (objectData.strMessage === 'searchDelete') {
					Search.deleteCallback(objectData.objectArguments);

				}
			});
		}
	},
	
	dispel: function() {
		{
			Search.objectPort = null;
		}
	},
	
	lookup: function(strQuery) {
		{
			jQuery('#idSearch_Lookup')
				.css({
					'display': 'none'
				})
			;

			jQuery('#idSearch_Loading')
				.css({
					'display': 'block'
				})
			;
		}

		{
			Search.objectPort.postMessage({
				'strMessage': 'searchLookup',
				'objectArguments' : {
					'strQuery': strQuery.toLowerCase()
				}
			});
		}
	},
	
	lookupCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}

		{
			jQuery('#idSearch_Lookup')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idSearch_Loading')
				.css({
					'display': 'none'
				})
			;
		}

		{
			jQuery('#idSearch_Results')
				.empty()
				.append(jQuery('<table></table>')
					.addClass('table')
					.css({
						'margin': '10px 0px 0px 0px'
					})
					.append(jQuery('<thead></thead>')
						.append(jQuery('<tr></tr>')
							.append(jQuery('<th></th>')
								.attr({
									'width': '1%'
								})
								.css({
									'text-align': 'right'
								})
								.text('Time')
							)
							.append(jQuery('<th></th>')
								.text('Title')
							)
							.append(jQuery('<th></th>')
								.attr({
									'width': '1%'
								})
								.css({
									'text-align': 'right'
								})
								.text('Visits')
							)
							.append(jQuery('<th></th>')
								.attr({
									'width': '1%'
								})
							)
						)
					)
					.append(jQuery('<tbody></tbody>')
						.each(function() {
							for (var intFor1 = 0; intFor1 < objectArguments.objectResults.length; intFor1 += 1) {
								jQuery(this)
									.append(jQuery('<tr></tr>')
										.append(jQuery('<td></td>')
											.append(jQuery('<div></div>')
												.css({
													'white-space': 'nowrap',
													'text-align': 'right'
												})
												.text(moment(objectArguments.objectResults[intFor1].longTimestamp).format('Do MMMM YYYY - HH:mm'))
											)
										)
										.append(jQuery('<td></td>')
											.css({
												'position': 'relative'
											})
											.append(jQuery('<div></div>')
												.css({
													'position': 'absolute',
													'left': '8px',
													'right': '-8px',
													'white-space': 'nowrap',
													'overflow': 'hidden',
													'text-overflow': 'ellipsis'
												})
												.append(jQuery('<a></a>')
													.attr({
														'href': 'https://www.youtube.com/watch?v=' + objectArguments.objectResults[intFor1].strIdent
													})
													.text(objectArguments.objectResults[intFor1].strTitle)
												)
											)
										)
										.append(jQuery('<td></td>')
											.append(jQuery('<div></div>')
												.css({
													'white-space': 'nowrap',
													'text-align': 'right'
												})
												.text(objectArguments.objectResults[intFor1].intCount)
											)
										)
										.append(jQuery('<td></td>')
											.append(jQuery('<div></div>')
												.css({
													'white-space': 'nowrap'
												})
												.append(jQuery('<a></a>')
													.addClass('fa')
													.addClass('fa-trash-o')
													.css({
														'cursor': 'pointer'
													})
													.data({
														'strIdent': objectArguments.objectResults[intFor1].strIdent
													})
													.on('click', function() {
														Search.delete(jQuery(this).data('strIdent'));
													})
												)
											)
										)
									)
								;
							}
						})
					)
				)
			;
		}
	},
	
	delete: function(strIdent) {
		{
			jQuery('#idSearch_Lookup')
				.css({
					'display': 'none'
				})
			;

			jQuery('#idSearch_Loading')
				.css({
					'display': 'block'
				})
			;
		}

		{
			Search.objectPort.postMessage({
				'strMessage': 'searchDelete',
				'objectArguments' : {
					'strIdent': strIdent
				}
			});
		}
	},
	
	deleteCallback: function(objectArguments) {
		if (objectArguments === null) {
			return;
		}

		{
			jQuery('#idSearch_Lookup')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idSearch_Loading')
				.css({
					'display': 'none'
				})
			;
		}

		{
			jQuery('#idDatabase_Size').triggerHandler('update');

			jQuery('#idSearch_Lookup').triggerHandler('update');
		}
	}
};
Search.init();

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

	{
		jQuery('#idSearch_Lookup')
			.off('click')
			.on('click', function() {
				{
					Search.lookup(jQuery('#idSearch_Query').val());
				}
			})
			.off('update')
			.on('update', function() {
				{
					Search.lookup(jQuery('#idSearch_Query').val());
				}
			})
		;

		jQuery('#idSearch_Lookup').triggerHandler('update');
	}
});