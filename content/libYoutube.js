'use strict'

var Youtube = {
	strApi: '',
	
	strClient: '',
	strSecret: '',
	strRedirect: '',
	
	strScope: '',
	
	init: function() {
		{
			Youtube.strApi = 'AIzaSyAqgO1S-h65tnJvWGpJnGu5xt5qSokFcNo';
		}
		
		{
			Youtube.strClient = '701883762296-67ev6up58cp45mkp184ishf84ru0746r.apps.googleusercontent.com';
			
			Youtube.strSecret = 'tt90dhQUf9HJyx3ju-_9dmOD';
			
			Youtube.strRedirect = 'urn:ietf:wg:oauth:2.0:oob';
		}
		
		{
			Youtube.strScope = 'https://www.googleapis.com/auth/youtube.readonly';
		}
	},
	
	dispel: function() {
		{
			Youtube.strApi = '';
		}
		
		{
			Youtube.strClient = '';
			
			Youtube.strSecret = '';
			
			Youtube.strRedirect = '';
		}
		
		{
			Youtube.strScope = '';
		}
	},
	
	authorize: function() {
		{
			window.open('https://accounts.google.com/o/oauth2/auth?response_type=' + encodeURIComponent('code') + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect) + '&scope=' + encodeURIComponent(Youtube.strScope), '_blank');
		}
	},
	
	link: function(functionError, functionSuccess) {
		{
			jQuery.ajax({
				'async': true,
				'type': 'POST',
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'data':  'grant_type=' + encodeURIComponent('authorization_code') + '&code=' + encodeURIComponent(PreferenceYoutube.getStrKey()) + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&client_secret=' + encodeURIComponent(Youtube.strSecret) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect),
				'dataType': 'json',
				'error': function() {
					functionError();
				},
				'success': function(jsonHandle) {
					{
						if (jsonHandle.access_token !== undefined) {
							PreferenceYoutube.setStrAccess(jsonHandle.access_token);
						}
						
						if (jsonHandle.refresh_token !== undefined) {
							PreferenceYoutube.setStrRefresh(jsonHandle.refresh_token);
						}
					}
					
					functionSuccess();
				}
			});
		}
	},
	
	unlink: function() {
		{
			PreferenceYoutube.setStrKey('');
			
			PreferenceYoutube.setStrAccess('');
			
			PreferenceYoutube.setStrRefresh('');
		}
	},
	
	linked: function() {
		var boolLinked = true;
		
		{
			if (PreferenceYoutube.getStrKey() === '') {
				boolLinked = false;
				
			} else if (PreferenceYoutube.getStrAccess() === '') {
				boolLinked = false;
				
			} else if (PreferenceYoutube.getStrRefresh() === '') {
				boolLinked = false;
				
			}
		}
		
		return boolLinked;
	},
	
	update: function(functionError, functionSuccess) {
		var functionAuth = function() {
			jQuery.ajax({
				'async': true,
				'type': 'POST',
				'url': 'https://www.googleapis.com/oauth2/v3/token',
				'data':  'grant_type=' + encodeURIComponent('refresh_token') + '&refresh_token=' + encodeURIComponent(PreferenceYoutube.getStrRefresh()) + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&client_secret=' + encodeURIComponent(Youtube.strSecret) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect),
				'dataType': 'json',
				'error': function() {
					functionError();
				},
				'success': function(jsonHandle) {
					{
						if (jsonHandle.access_token !== undefined) {
							PreferenceYoutube.setStrAccess(jsonHandle.access_token);
						}
						
						if (jsonHandle.refresh_token !== undefined) {
							PreferenceYoutube.setStrRefresh(jsonHandle.refresh_token);
						}
					}
					
					functionChannels();
				}
			});
		};
		
		var Channels_strHistory = '';
		
		var functionChannels = function() {
			jQuery.ajax({
				'async': true,
				'type': 'GET',
				'url': 'https://www.googleapis.com/youtube/v3/channels?key=' + encodeURIComponent(Youtube.strApi) + '&part=' + encodeURIComponent('contentDetails') + '&mine=' + encodeURIComponent('true'),
				'headers': {
					'Authorization': 'Bearer ' + PreferenceYoutube.getStrAccess()
				}, 
				'dataType': 'json',
				'error': function() {
					functionError();
				},
				'success': function(jsonHandle) {
					{
						Channels_strHistory = jsonHandle.items[0].contentDetails.relatedPlaylists.watchHistory;
					}
					
					functionPlaylistitems();
				}
			});
		};
		
		var Playlistitems_intThreshold = 128;
		var Playlistitems_strPage = '';
		
		var functionPlaylistitems = function() {
			jQuery.ajax({
				'async': true,
				'type': 'GET',
				'url': 'https://www.googleapis.com/youtube/v3/playlistItems?key=' + encodeURIComponent(Youtube.strApi) + '&part=' + encodeURIComponent('snippet') + '&maxResults=' + encodeURIComponent('50') + '&playlistId=' + encodeURIComponent(Channels_strHistory) + '&pageToken=' + encodeURIComponent(Playlistitems_strPage),
				'headers': {
					'Authorization': 'Bearer ' + PreferenceYoutube.getStrAccess()
				}, 
				'dataType': 'json',
				'error': function() {
					functionError();
				},
				'success': function(jsonHandle) {
					{
						if (jsonHandle.nextPageToken === undefined) {
							Playlistitems_strPage = '';
							
						} else if (jsonHandle.nextPageToken !== undefined) {
							Playlistitems_strPage = jsonHandle.nextPageToken;
							
						}
					}
					
					{
						PreferenceHistory.acquire();
						
						PreferenceHistory.transactionOpen();
						
						for (var intFor1 = 0; intFor1 < jsonHandle.items.length; intFor1 += 1) {
							var objectHistory = jsonHandle.items[intFor1];
							
							{
								PreferenceHistory.selectOpen(
									'SELECT   * ' +
									'FROM     PreferenceHistory ' +
									'WHERE    strIdent = :PARAM0 ',
									[ objectHistory.snippet.resourceId.videoId ]
								);
								
								PreferenceHistory.selectNext();
								
								if (PreferenceHistory.intIdent !== 0) {
									Playlistitems_intThreshold -= 1;
								}
								
								if (PreferenceHistory.intIdent === 0) {
									PreferenceHistory.intIdent = 0;
									PreferenceHistory.longTimestamp = Date.parse(objectHistory.snippet.publishedAt);
									PreferenceHistory.strIdent = objectHistory.snippet.resourceId.videoId;
									PreferenceHistory.strTitle = objectHistory.snippet.title;
									PreferenceHistory.intCount = 1;
									
									PreferenceHistory.create();
									
								} else if (PreferenceHistory.intIdent !== 0) {
									PreferenceHistory.intIdent = PreferenceHistory.intIdent;
									PreferenceHistory.longTimestamp = Date.parse(objectHistory.snippet.publishedAt);
									PreferenceHistory.strIdent = objectHistory.snippet.resourceId.videoId;
									PreferenceHistory.strTitle = objectHistory.snippet.title;
									PreferenceHistory.intCount = PreferenceHistory.intCount;
									
									PreferenceHistory.save();
									
								}
								
								PreferenceHistory.selectClose();
							}
						}
						
						PreferenceHistory.transactionClose();
						
						PreferenceHistory.release();
					}
					
					{
						if (Playlistitems_intThreshold > 0) {
							if (Playlistitems_strPage !== '') {
								functionPlaylistitems();
								
								return;
							}
						}
					}
					
					{
						PreferenceYoutube.setLongTimestamp(new Date().getTime());
					}
					
					functionSuccess();
				}
			});
		};
		
		functionAuth();
	}
};
Youtube.init();