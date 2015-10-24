var Treeview = {
	init: function() {
		{
			jQuery.fn.treeview = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'intIdent': 0,
						'functionOpen': function(objectNode) {
							
						},
						'functionData': function(objectNode) {
							
						},
						'functionClose': function(objectNode) {
							
						},
						'functionClick': function(objectNode, eventHandle) {
							
						}
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.empty()
					;
				}
				
				{
					jQuery(this)
						.data(objectArguments)
					;
				}
				
				{
					jQuery(this).closest('.cssTreeview').data('functionOpen').call(jQuery(this), {
						'intIdent': objectArguments.intIdent
					});
				}
				
				return this;
			};
		}
		
		{
			jQuery.fn.treeviewData = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'objectNode': []
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.empty()
					;
				}
				
				{
					for (var intFor1 = 0; intFor1 < objectArguments.objectNode.length; intFor1 += 1) {
						var objectNode = objectArguments.objectNode[intFor1];
						
						{
							if (objectNode.strType === 'typeFolder') {
								jQuery(this)
									.treeviewFolder({
										'objectNode': objectNode
									})
								;
								
							} else if (objectNode.strType === 'typeBookmark') {
								jQuery(this)
									.treeviewBookmark({
										'objectNode': objectNode
									})
								;
								
							} else if (objectNode.strType === 'typeSeparator') {
								jQuery(this)
									.treeviewSeparator({
										'objectNode': objectNode
									})
								;
								
							}
						}
						
						{
							jQuery(this).find('.cssTreeviewNode').last()
								.each(function() {
									jQuery(this).closest('.cssTreeview').data('functionData').call(jQuery(this), objectNode);
								})
							;
						}
					}
				}
				
				return this;
			};
		}
		
		{
			jQuery.fn.treeviewFolder = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'objectNode': {}
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.append(jQuery('<div></div>')
							.addClass('cssTreeviewNodeContainer')
							.data({
								'intIdent': objectArguments.objectNode.intIdent,
								'strType': objectArguments.objectNode.strType,
								'strImage': objectArguments.objectNode.strImage,
								'strTitle': objectArguments.objectNode.strTitle,
								'strLink': objectArguments.objectNode.strLink
							})
							.append(jQuery('<div></div>')
								.addClass('cssTreeviewNode')
								.off('click')
								.on('click', function(eventHandle) {
									{
										if (jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder').children().size() === 0) {
											{
												jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder')
													.treeview({
														'intIdent': jQuery(this).closest('.cssTreeviewNodeContainer').data('intIdent')
													})
												;
											}
											
											{
												jQuery(this).closest('.cssTreeview').data('functionOpen').call(jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder'), {
													'intIdent': jQuery(this).closest('.cssTreeviewNodeContainer').data('intIdent'),
													'strType': jQuery(this).closest('.cssTreeviewNodeContainer').data('strType'),
													'strImage': jQuery(this).closest('.cssTreeviewNodeContainer').data('strImage'),
													'strTitle': jQuery(this).closest('.cssTreeviewNodeContainer').data('strTitle'),
													'strLink': jQuery(this).closest('.cssTreeviewNodeContainer').data('strLink')
												}, eventHandle);
											}
											
										} else if (jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder').children().size() !== 0) {
											{
												jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder')
													.empty()
												;
											}
											
											{
												jQuery(this).closest('.cssTreeview').data('functionClose').call(jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder'), {
													'intIdent': jQuery(this).closest('.cssTreeviewNodeContainer').data('intIdent'),
													'strType': jQuery(this).closest('.cssTreeviewNodeContainer').data('strType'),
													'strImage': jQuery(this).closest('.cssTreeviewNodeContainer').data('strImage'),
													'strTitle': jQuery(this).closest('.cssTreeviewNodeContainer').data('strTitle'),
													'strLink': jQuery(this).closest('.cssTreeviewNodeContainer').data('strLink')
												}, eventHandle);
											}
											
										}
									}
								})
								.append(jQuery('<div></div>')
									.addClass('cssTreeviewNodeImage')
									.append(jQuery('<img></img>')
										.attr({
											'src': objectArguments.objectNode.strImage
										})
									)
								)
								.append(jQuery('<div></div>')
									.addClass('cssTreeviewNodeTitle')
									.text(objectArguments.objectNode.strTitle)
								)
							)
							.append(jQuery('<div></div>')
								.addClass('cssTreeviewNodePlaceholder')
							)
						)
					;
				}
				
				return this;
			}
		}
		
		{
			jQuery.fn.treeviewBookmark = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'objectNode': {}
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.append(jQuery('<div></div>')
							.addClass('cssTreeviewNodeContainer')
							.data({
								'intIdent': objectArguments.objectNode.intIdent,
								'strType': objectArguments.objectNode.strType,
								'strImage': objectArguments.objectNode.strImage,
								'strTitle': objectArguments.objectNode.strTitle,
								'strLink': objectArguments.objectNode.strLink
							})
							.append(jQuery('<a></a>')
								.addClass('cssTreeviewNode')
								.attr({
									'href': objectArguments.objectNode.strLink,
									'title': objectArguments.objectNode.strTitle
								})
								.append(jQuery('<div></div>')
									.addClass('cssTreeviewNodeImage')
									.append(jQuery('<img></img>')
										.attr({
											'src': objectArguments.objectNode.strImage
										})
									)
								)
								.append(jQuery('<div></div>')
									.addClass('cssTreeviewNodeTitle')
									.text(objectArguments.objectNode.strTitle)
								)
							)
						)
					;
				}
				
				return this;
			}
		}
		
		{
			jQuery.fn.treeviewSeparator = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'objectNode': {}
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.append(jQuery('<div></div>')
							.addClass('cssTreeviewSeparator')
						)
					;
				}
				
				return this;
			}
		}
		
		{
			/*
			jQuery(window)
				.off('click')
				.on('click', function(eventHandle) {
					if (jQuery(eventHandle.target).closest('.cssTreeviewNode').size() === 0) {
						return;
						
					} else if (jQuery(eventHandle.target).closest('.cssTreeviewNode').get(0).tagName.toLowerCase() === 'a') {
						return;
						
					}
					
					{
						jQuery(eventHandle.target).closest('.cssTreeview').data('functionClick').call(jQuery(this), {
							'intIdent': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('intIdent'),
							'strType': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strType'),
							'strImage': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strImage'),
							'strTitle': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strTitle'),
							'strLink': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strLink')
						}, eventHandle);
					}
				})
			;
			*/
		}
	},
	
	dispel: function() {
		{
			jQuery.fn.treeview = null;
		}
		
		{
			jQuery.fn.treeviewData = null;
		}
		
		{
			jQuery.fn.treeviewFolder = null;
		}
		
		{
			jQuery.fn.treeviewBookmark = null;
		}
		
		{
			jQuery.fn.treeviewSeparator = null;
		}
	}
};
Treeview.init();