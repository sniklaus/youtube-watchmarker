'use strict'

var Youtube = {
	strApi: '',
	strClient: '',
	strSecret: '',
	strRedirect: '',
	strScope: '',
	
	sqlserviceHistory: null,
	
	init: function() {
		{
			Youtube.strApi = 'AIzaSyAqgO1S-h65tnJvWGpJnGu5xt5qSokFcNo';
			
			Youtube.strClient = '701883762296-67ev6up58cp45mkp184ishf84ru0746r.apps.googleusercontent.com';
			
			Youtube.strSecret = 'tt90dhQUf9HJyx3ju-_9dmOD';
			
			Youtube.strRedirect = 'urn:ietf:wg:oauth:2.0:oob';
			
			Youtube.strScope = 'https://www.googleapis.com/auth/youtube.readonly';
		}
		
		{
			Youtube.sqlserviceHistory = Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ]));
		}
	},
	
	dispel: function() {
		{
			Youtube.strApi = '';
			
			Youtube.strClient = '';
			
			Youtube.strSecret = '';
			
			Youtube.strRedirect = '';
			
			Youtube.strScope = '';
		}
		
		{
			Youtube.sqlserviceHistory = null;
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
	
};
Youtube.init();