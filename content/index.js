'use strict';

var objDatabase = chrome.runtime.connect({
	'name': 'database'
});

var objHistory = chrome.runtime.connect({
	'name': 'history'
});

var objYoutube = chrome.runtime.connect({
	'name': 'youtube'
});

var objSearch = chrome.runtime.connect({
	'name': 'search'
});

jQuery(window.document).ready(function() {
	jQuery('#idDatabase_Export')
		.on('click', function() {
			jQuery('#idLoading_Container')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idLoading_Message')
				.text('exporting database')
			;

			jQuery('#idLoading_Progress')
				.text('...')
			;

			jQuery('#idLoading_Close')
				.addClass('disabled')
			;

			objDatabase.postMessage({
				'strMessage': 'databaseExport',
				'objRequest': {}
			});
		})
	;

	objDatabase.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'databaseExport') {
			if (objData.objResponse === null) {
				jQuery('#idLoading_Message')
					.text('error exporting database')
				;

			} else if (objData.objResponse !== null) {
				jQuery('#idLoading_Message')
					.text('finished exporting database')
				;

			}
			
			jQuery('#idLoading_Close')
				.removeClass('disabled')
			;
		}

		if (objData.strMessage === 'databaseExport-progress') {
			jQuery('#idLoading_Progress')
				.text(objData.objResponse.strProgress)
			;
		}
	});

	jQuery('#idDatabase_Import').find('input')
		.on('change', function() {
			jQuery('#idLoading_Container')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idLoading_Message')
				.text('importing database')
			;

			jQuery('#idLoading_Progress')
				.text('...')
			;

			jQuery('#idLoading_Close')
				.addClass('disabled')
			;

			var objFilereader = new FileReader();

			objFilereader.onload = function(objEvent) {
				objDatabase.postMessage({
					'strMessage': 'databaseImport',
					'objRequest': {
						'objVideos': JSON.parse(decodeURIComponent(escape(atob(objEvent.target.result))))
					}
				});
			};

			if (jQuery('#idDatabase_Import').find('input').get(0).files !== undefined) {
				if (jQuery('#idDatabase_Import').find('input').get(0).files.length === 1) {
					objFilereader.readAsText(jQuery('#idDatabase_Import').find('input').get(0).files[0], 'utf-8');
				}
			}
		})
	;

	objDatabase.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'databaseImport') {
			if (objData.objResponse === null) {
				jQuery('#idLoading_Message')
					.text('error importing database')
				;

			} else if (objData.objResponse !== null) {
				jQuery('#idLoading_Message')
					.text('finished importing database')
				;

			}
			
			jQuery('#idLoading_Close')
				.removeClass('disabled')
			;
		}

		if (objData.strMessage === 'databaseImport-progress') {
			jQuery('#idLoading_Progress')
				.text(objData.objResponse.strProgress)
			;
		}
	});

	jQuery('#idDatabase_Reset')
		.on('click', function() {
			jQuery(this)
				.css({
					'display': 'none'
				})
			;

			jQuery('#idDatabase_Resyes').closest('.input-group')
				.css({
					'display': 'inline'
				})
			;
		})
	;

	jQuery('#idDatabase_Resyes')
		.on('click', function() {
			objDatabase.postMessage({
				'strMessage': 'databaseReset',
				'objRequest': {}
			});
		})
	;

	objDatabase.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'databaseReset') {
			window.location.reload();
		}
	});

	jQuery('#idDatabase_Size')
		.text(parseInt(window.localStorage.getItem('extensions.Youwatch.Database.intSize'), 10))
	;

	jQuery('#idHistory_Synchronize')
		.on('click', function() {
			jQuery('#idLoading_Container')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idLoading_Message')
				.text('synchronizing history')
			;

			jQuery('#idLoading_Progress')
				.text('...')
			;

			jQuery('#idLoading_Close')
				.addClass('disabled')
			;

			objHistory.postMessage({
				'strMessage': 'historySynchronize',
				'objRequest': {
					'intTimestamp': 0
				}
			});
		})
	;

	objHistory.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'historySynchronize') {
			if (objData.objResponse === null) {
				jQuery('#idLoading_Message')
					.text('error synchronizing history')
				;

			} else if (objData.objResponse !== null) {
				jQuery('#idLoading_Message')
					.text('finished synchronizing history')
				;

			}

			jQuery('#idLoading_Close')
				.removeClass('disabled')
			;
		}

		if (objData.strMessage === 'historySynchronize-progress') {
			jQuery('#idLoading_Progress')
				.text(objData.objResponse.strProgress)
			;
		}
	});

	jQuery('#idHistory_Timestamp')
		.text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.History.intTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
	;

	jQuery('#idYoutube_Synchronize')
		.on('click', function() {
			jQuery('#idLoading_Container')
				.css({
					'display': 'block'
				})
			;

			jQuery('#idLoading_Message')
				.text('synchronizing youtube')
			;

			jQuery('#idLoading_Progress')
				.text('...')
			;

			jQuery('#idLoading_Close')
				.addClass('disabled')
			;

			objYoutube.postMessage({
				'strMessage': 'youtubeSynchronize',
				'objRequest': {
					'intThreshold': 1000000000
				}
			});
		})
	;

	objYoutube.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'youtubeSynchronize') {
			if (objData.objResponse === null) {
				jQuery('#idLoading_Message')
					.text('error synchronizing youtube')
				;

			} else if (objData.objResponse !== null) {
				jQuery('#idLoading_Message')
					.text('finished synchronizing youtube')
				;

			}

			jQuery('#idLoading_Close')
				.removeClass('disabled')
			;
		}

		if (objData.strMessage === 'youtubeSynchronize-progress') {
			jQuery('#idLoading_Progress')
				.text(objData.objResponse.strProgress)
			;
		}
	});

	jQuery('#idYoutube_Timestamp')
		.text(moment(parseInt(window.localStorage.getItem('extensions.Youwatch.Youtube.intTimestamp'), 10)).format('YYYY.MM.DD - HH:mm:ss'))
	;	

	jQuery('#idVisualization_Showbadge')
		.on('click', function() {
			window.localStorage.setItem('extensions.Youwatch.Visualization.boolShowbadge', window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(false));

			jQuery(this)
				.find('i')
					.eq(0)
						.css({
							'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
						})
					.end()
					.eq(1)
						.css({
							'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
						})
					.end()
				.end()
			;
		})
		.find('i')
			.eq(0)
				.css({
					'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'none' : 'block'
				})
			.end()
			.eq(1)
				.css({
					'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolShowbadge') === String(true) ? 'block' : 'none'
				})
			.end()
		.end()
	;

	jQuery('#idVisualization_Hideprogress')
		.on('click', function() {
			window.localStorage.setItem('extensions.Youwatch.Visualization.boolHideprogress', window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(false));

			jQuery(this)
				.find('i')
					.eq(0)
						.css({
							'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
						})
					.end()
					.eq(1)
						.css({
							'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
						})
					.end()
				.end()
			;
		})
		.find('i')
			.eq(0)
				.css({
					'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'none' : 'block'
				})
			.end()
			.eq(1)
				.css({
					'display': window.localStorage.getItem('extensions.Youwatch.Visualization.boolHideprogress') === String(true) ? 'block' : 'none'
				})
			.end()
		.end()
	;

	jQuery('#idSearch_Lookup')
		.on('click', function() {
			jQuery('#idSearch_Lookup')
				.addClass('disabled')
				.find('i')
					.eq(0)
						.css({
							'display': 'none'
						})
					.end()
					.eq(1)
						.css({
							'display': 'inline'
						})
					.end()
				.end()
			;

			objSearch.postMessage({
				'strMessage': 'searchLookup',
				'objRequest': {
					'strQuery': jQuery('#idSearch_Query').val()
				}
			});	
		})
		.each(function() {
			jQuery(this).triggerHandler('click');
		})
	;

	objSearch.onMessage.addListener(function(objData) {
		if (objData.strMessage === 'searchLookup') {
			if (objData.objResponse === null) {
				return;
			}

			jQuery('#idSearch_Lookup')
				.removeClass('disabled')
				.find('i')
					.eq(0)
						.css({
							'display': 'inline'
						})
					.end()
					.eq(1)
						.css({
							'display': 'none'
						})
					.end()
				.end()
			;

			jQuery('#idSearch_Results')
				.empty()
				.append(jQuery('<table></table>')
					.addClass('table')
					.addClass('table-sm')
					.css({
						'margin': '0px'
					})
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
							for (var objVideo of objData.objResponse.objVideos) {
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
														// TODO

														/* objSearch.postMessage({
															'strMessage': 'searchDelete',
															'objRequest': {
																'strIdent': jQuery(this).data('strIdent')
															}
														}); */
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

		if (objData.strMessage === 'searchDelete') {
			if (objData.objResponse === null) {
				return;
			}

			// TODO
		}
	});

	jQuery('#idLoading_Close')
		.on('click', function() {
			window.location.reload();
		})
	;
});
