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
	
	link: function() {
		{
			if ((PreferenceYoutube.getStrKey() === '') && (PreferenceYoutube.getStrAccess() === '') && (PreferenceYoutube.getStrRefresh() === '')) {
				window.open('https://accounts.google.com/o/oauth2/auth?response_type=' + encodeURIComponent('code') + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect) + '&scope=' + encodeURIComponent(Youtube.strScope), '_blank');
			}
		}
		
		{
			if ((PreferenceYoutube.getStrKey() !== '') && (PreferenceYoutube.getStrAccess() === '') && (PreferenceYoutube.getStrRefresh() === '')) {
				jQuery.ajax({
					'async': true,
					'type': 'POST',
					'url': 'https://www.googleapis.com/oauth2/v3/token',
					'data':  'grant_type=' + encodeURIComponent('authorization_code') + '&code=' + encodeURIComponent(PreferenceYoutube.getStrKey()) + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&client_secret=' + encodeURIComponent(Youtube.strSecret) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect),
					'dataType': 'json',
					'success': function(jsonHandle) {
						{
							PreferenceYoutube.setStrAccess(jsonHandle.access_token);
							
							PreferenceYoutube.setStrRefresh(jsonHandle.refresh_token);
						}
					},
					'complete': function() {
						{
							YoutubeObserver.update();
						}
					}
				});
			}
		}
		
		{
			if ((PreferenceYoutube.getStrKey() !== '') && (PreferenceYoutube.getStrAccess() !== '') && (PreferenceYoutube.getStrRefresh() !== '')) {
				jQuery.ajax({
					'async': true,
					'type': 'POST',
					'url': 'https://www.googleapis.com/oauth2/v3/token',
					'data':  'grant_type=' + encodeURIComponent('refresh_token') + '&refresh_token=' + encodeURIComponent(PreferenceYoutube.getStrRefresh()) + '&client_id=' + encodeURIComponent(Youtube.strClient) + '&client_secret=' + encodeURIComponent(Youtube.strSecret) + '&redirect_uri=' + encodeURIComponent(Youtube.strRedirect),
					'dataType': 'json',
					'success': function(jsonHandle) {
						{
							PreferenceYoutube.setStrAccess(jsonHandle.access_token);
							
							PreferenceYoutube.setStrRefresh(jsonHandle.refresh_token);
						}
					},
					'complete': function() {
						{
							YoutubeObserver.update();
						}
					}
				});
			}
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
	
	update: function() {
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
				'success': function(jsonHandle) {
					{
						Channels_strHistory = jsonHandle.items[0].contentDetails.relatedPlaylists.watchHistory;
					}
					
					functionPlaylistitems();
				},
				'complete': function() {
					{
						YoutubeObserver.update();
					}
				}
			});
		};
		
		var functionPlaylistitems = function() {
			jQuery.ajax({
				'async': true,
				'type': 'GET',
				'url': 'https://www.googleapis.com/youtube/v3/playlistItems?key=' + encodeURIComponent(Youtube.strApi) + '&part=' + encodeURIComponent('snippet') + '&maxResults=' + encodeURIComponent('50') + '&playlistId=' + encodeURIComponent(Channels_strHistory),
				'headers': {
					'Authorization': 'Bearer ' + PreferenceYoutube.getStrAccess()
				}, 
				'dataType': 'json',
				'success': function(jsonHandle) {
					{
						for (var intFor1 = 0; intFor1 < jsonHandle.items.length; intFor1 += 1) {
							jsonHandle.items[intFor1].snippet.resourceId.videoId;
							Date.parse(jsonHandle.items[intFor1].snippet.publishedAt);
							jsonHandle.items[intFor1].snippet.title;
						}
					}
				},
				'complete': function() {
					{
						YoutubeObserver.update();
					}
				}
			});
		};
		
		functionChannels();
	}
};
Youtube.init();