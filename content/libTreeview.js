var Treeview = {
	init: function() {
		{
			jQuery.fn.treeview = function(objectArguments) {
				{
					objectArguments = jQuery.extend({
						'intIdent': 0
					}, objectArguments);
				}
				
				{
					jQuery(this)
						.empty()
					;
				}
				
				{
					jQuery(this).closest('.cssTreeview').data('functionClose').call(this, objectArguments.intIdent);
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
							objectArguments.functionData(objectNode);
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
									'strTitle': objectArguments.objectNode.strTitle
								})
								.off('click')
								.on('click', function() {
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
												jQuery(this).closest('.cssTreeview').data('functionOpen').call(this, jQuery(this).data('intIdent'));
											}
											
										} else if (jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder').children().size() !== 0) {
											{
												jQuery(this).closest('.cssTreeviewNodeContainer').find('.cssTreeviewNodePlaceholder')
													.empty()
												;
											}
											
											{
												jQuery(this).closest('.cssTreeview').data('functionClose').call(this, jQuery(this).data('intIdent'));
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