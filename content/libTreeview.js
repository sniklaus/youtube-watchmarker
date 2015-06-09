var Treeview = {
	init: function() {
		{
			jQuery.fn.treeview = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'intIdent': 0,
						'functionData': function() {
							
						},
						'functionOpen': function() {
							
						},
						'functionClose': function() {
							
						},
						'functionClick': function() {
							
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
					jQuery(this).closest('.cssTreeview').data('functionOpen').call(this, {
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
					for (var intFor1 = 0; intFor1 < objectArguments.objectNode.length; intFor1 += 1) {
						var objectNode = objectArguments.objectNode[intFor1];
						
						{
							// jQuery(this).closest('.cssTreeview').data('functionData').call(this, objectNode);
						}
						
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
							.append(jQuery('<div></div>')
								.addClass('cssTreeviewNode')
								.data({
									'intIdent': objectArguments.objectNode.intIdent,
									'strType': objectArguments.objectNode.strType,
									'strImage': objectArguments.objectNode.strImage,
									'strTitle': objectArguments.objectNode.strTitle,
									'strLink': objectArguments.objectNode.strLink
								})
								.off('click')
								.on('click', function(eventHandle) {
									{
										if (jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder').children().size() === 0) {
											{
												jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder')
													.treeview({
														'intIdent': jQuery(this).data('intIdent')
													})
												;
											}
											
											{
												jQuery(this).closest('.cssTreeview').data('functionOpen').call(jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder'), {
													'intIdent': jQuery(this).data('intIdent'),
													'strType': jQuery(this).data('strType'),
													'strImage': jQuery(this).data('strImage'),
													'strTitle': jQuery(this).data('strTitle'),
													'strLink': jQuery(this).data('strLink')
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
													'intIdent': jQuery(this).data('intIdent'),
													'strType': jQuery(this).data('strType'),
													'strImage': jQuery(this).data('strImage'),
													'strTitle': jQuery(this).data('strTitle'),
													'strLink': jQuery(this).data('strLink')
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
								.each(function() {
									if (objectArguments.objectNode.objectExtension !== undefined) {
										jQuery(this)
											.append(jQuery('<div></div>')
												.addClass('cssTreeviewNodeExtension')
												.append(objectArguments.objectNode.objectExtension)
											)
										;
									}
								})
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
						.append(jQuery('<a></a>')
							.addClass('cssTreeviewNode')
							.attr({
								'href': objectArguments.objectNode.strLink,
								'title': objectArguments.objectNode.strTitle
							})
							.data({
								'intIdent': objectArguments.objectNode.intIdent,
								'strType': objectArguments.objectNode.strType,
								'strImage': objectArguments.objectNode.strImage,
								'strTitle': objectArguments.objectNode.strTitle,
								'strLink': objectArguments.objectNode.strLink
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
							.each(function() {
								if (objectArguments.objectNode.objectExtension !== undefined) {
									jQuery(this)
										.append(jQuery('<div></div>')
											.addClass('cssTreeviewNodeExtension')
											.append(objectArguments.objectNode.objectExtension)
										)
									;
								}
							})
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
			jQuery(window)
				.off('click')
				.on('click', function(eventHandle) {
					if (jQuery(eventHandle.target).closest('.cssTreeviewNode').size() === 0) {
						return;
						
					} else if (jQuery(eventHandle.target).closest('.cssTreeviewNode').get(0).tagName.toLowerCase() === 'a') {
						return;
						
					}
					
					{
						jQuery(eventHandle.target).closest('.cssTreeview').data('functionClick').call(this, {
							'intIdent': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('intIdent'),
							'strType': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strType'),
							'strImage': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strImage'),
							'strTitle': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strTitle'),
							'strLink': jQuery(eventHandle.target).closest('.cssTreeviewNode').data('strLink')
						}, eventHandle);
					}
				})
			;
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