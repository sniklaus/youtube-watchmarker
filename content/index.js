'use strict';

var Database = {
	objPort: null,

	init: function() {
		Database.objPort = chrome.runtime.connect({
			'name': 'database'
		});

		Database.objPort.onMessage.addListener(function(objData) {
			if (objData.strMessage === 'databaseSave') {
				Database.saveCallback(objData.objResponse);
			}

			if (objData.strMessage === 'databaseSave-progress') {
				Database.saveProgress(objData.objResponse);
			}

			if (objData.strMessage === 'databaseLoad') {
				Database.loadCallback(objData.objResponse);
			}

			if (objData.strMessage === 'databaseLoad-progress') {
				Database.loadProgress(objData.objResponse);
			}

			if (objData.strMessage === 'databaseReset') {
				Database.resetCallback(objData.objResponse);
			}
		});
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
			Database.objPort.postMessage({
				'strMessage': 'databaseSave',
				'objRequest': {}
			});
		}
	},
	
	saveCallback: function(objResponse) {
		if (objResponse === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while saving')
			;

		} else if (objResponse !== null) {
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
	
	saveProgress: function(objResponse) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objResponse.strProgress)
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
			var objFilereader = new FileReader();
			
			objFilereader.onload = function(objEvent) {
				Database.objPort.postMessage({
					'strMessage': 'databaseLoad',
					'objRequest': {
						'objVideos': JSON.parse(decodeURIComponent(escape(atob(objEvent.target.result))))
					}
				});
			};
			
			if (jQuery('#idDatabase_File').get(0).files !== undefined) {
				if (jQuery('#idDatabase_File').get(0).files.length === 1) {
					objFilereader.readAsText(jQuery('#idDatabase_File').get(0).files[0], 'UTF-8');
				}
			}
		}
	},
	
	loadCallback: function(objResponse) {
		if (objResponse === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while loading')
			;

		} else if (objResponse !== null) {
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
	
	loadProgress: function(objResponse) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objResponse.strProgress)
			;
		}
	},
	
	reset: function() {
		{
			Database.objPort.postMessage({
				'strMessage': 'databaseReset',
				'objRequest': {}
			});
		}
	},
	
	resetCallback: function(objResponse) {
		if (objResponse === null) {
			return;
		}
		
		{
			jQuery('#idDatabase_Size').triggerHandler('update');
		}
	}
};
Database.init();

var History = {
	objPort: null,

	init: function() {
		History.objPort = chrome.runtime.connect({
			'name': 'history'
		});

		History.objPort.onMessage.addListener(function(objData) {
			if (objData.strMessage === 'historySynchronize') {
				History.synchronizeCallback(objData.objResponse);
			}

			if (objData.strMessage === 'historySynchronize-progress') {
				History.synchronizeProgress(objData.objResponse);
			}
		});
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
			History.objPort.postMessage({
				'strMessage': 'historySynchronize',
				'objRequest': {
					'intTimestamp': 0
				}
			});
		}
	},
	
	synchronizeCallback: function(objResponse) {
		if (objResponse === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while synchronizing')
			;

		} else if (objResponse !== null) {
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
	
	synchronizeProgress: function(objResponse) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objResponse.strProgress)
			;
		}
	}
};
History.init();

var Youtube = {
	objPort: null,

	init: function() {
		Youtube.objPort = chrome.runtime.connect({
			'name': 'youtube'
		});

		Youtube.objPort.onMessage.addListener(function(objData) {
			if (objData.strMessage === 'youtubeSynchronize') {
				Youtube.synchronizeCallback(objData.objResponse);
			}

			if (objData.strMessage === 'youtubeSynchronize-progress') {
				Youtube.synchronizeProgress(objData.objResponse);
			}
		});
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
			Youtube.objPort.postMessage({
				'strMessage': 'youtubeSynchronize',
				'objRequest': {
					'intThreshold': 1000000000
				}
			});
		}
	},
	
	synchronizeCallback: function(objResponse) {
		if (objResponse === null) {
			jQuery('#idGeneral_ModalLoading_Message')
				.text('error while synchronizing')
			;

		} else if (objResponse !== null) {
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
	
	synchronizeProgress: function(objResponse) {
		{
			jQuery('#idGeneral_ModalLoading_Progress')
				.text(objResponse.strProgress)
			;
		}
	}
};
Youtube.init();

var Search = {
	objPort: null,

	init: function() {
		Search.objPort = chrome.runtime.connect({
			'name': 'search'
		});

		Search.objPort.onMessage.addListener(function(objData) {
			if (objData.strMessage === 'searchLookup') {
				Search.lookupCallback(objData.objResponse);

			} else if (objData.strMessage === 'searchDelete') {
				Search.deleteCallback(objData.objResponse);

			}
		});
	},

	lookup: function(strQuery) {
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

		Search.objPort.postMessage({
			'strMessage': 'searchLookup',
			'objRequest': {
				'strQuery': strQuery
			}
		});	
	},
	
	lookupCallback: function(objResponse) {
		if (objResponse === null) {
			return;
		}

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

		jQuery('#idSearch_Results')
			.empty()
			.append(jQuery('<table></table>')
				.addClass('table')
				.addClass('table-sm')
				.append(jQuery('<thead></thead>')
					.append(jQuery('<tr></tr>')
						.append(jQuery('<th></th>')
							.attr({
								'width': '1%'
							})
							.css({
								'border-top': 'none'
							})
							.text('Time')
						)
						.append(jQuery('<th></th>')
							.css({
								'border-top': 'none'
							})
							.text('Title')
						)
						.append(jQuery('<th></th>')
							.attr({
								'width': '1%'
							})
							.css({
								'border-top': 'none',
								'text-align': 'right'
							})
							.text('Visits')
						)
						.append(jQuery('<th></th>')
							.css({
								'border-top': 'none'
							})
							.attr({
								'width': '1%'
							})
						)
					)
				)
				.append(jQuery('<tbody></tbody>')
					.each(function() {
						for (var objVideo of objResponse.objVideos) {
							jQuery(this)
								.append(jQuery('<tr></tr>')
									.append(jQuery('<td></td>')
										.append(jQuery('<div></div>')
											.css({
												'white-space': 'nowrap'
											})
											.text(moment(objVideo.intTimestamp).format('YYYY.MM.DD - HH:mm'))
										)
									)
									.append(jQuery('<td></td>')
										.css({
											'position': 'relative'
										})
										.append(jQuery('<div></div>')
											.css({
												'left': '8px',
												'overflow': 'hidden',
												'position': 'absolute',
												'right': '-8px',
												'text-overflow': 'ellipsis',
												'white-space': 'nowrap'
											})
											.append(jQuery('<a></a>')
												.attr({
													'href': 'https://www.youtube.com/watch?v=' + objVideo.strIdent
												})
												.text(objVideo.strTitle)
											)
										)
									)
									.append(jQuery('<td></td>')
										.append(jQuery('<div></div>')
											.css({
												'white-space': 'nowrap',
												'text-align': 'right'
											})
											.text(objVideo.intCount)
										)
									)
									.append(jQuery('<td></td>')
										.append(jQuery('<div></div>')
											.css({
												'white-space': 'nowrap'
											})
											.append(jQuery('<a></a>')
												.addClass('far')
												.addClass('fa-trash-alt')
												.css({
													'cursor': 'pointer'
												})
												.data({
													'strIdent': objVideo.strIdent
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
	},
	
	delete: function(strIdent) {
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

		Search.objPort.postMessage({
			'strMessage': 'searchDelete',
			'objRequest': {
				'strIdent': strIdent
			}
		});
	},
	
	deleteCallback: function(objResponse) {
		if (objResponse === null) {
			return;
		}

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

		jQuery('#idDatabase_Size').triggerHandler('update');

		jQuery('#idSearch_Lookup').triggerHandler('update');
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
						.text(parseInt(window.localStorage.getItem('extensions.Youwatch.Database.intSize'), 10))
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
						.text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.History.intTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
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
						.text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.Youtube.intTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
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
				if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true)) {
					window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', String(false));
					
				} else if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(false)) {
					window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', String(true));
					
				}

				jQuery(this).triggerHandler('update');
			})
			.off('update')
			.on('update', function() {
				if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true)) {
					jQuery(this)
						.addClass('btn-primary')
						.removeClass('btn-default')
					;
					
					jQuery(this).find('span')
						.addClass('fa-check-square-o')
						.removeClass('fa-square-o')
					;
					
				} else if (window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(false)) {
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
