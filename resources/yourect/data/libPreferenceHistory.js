'use strict'

Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

var PreferenceHistory = {
	sqlserviceHandle: null,
	
	statementCreate: null,
	statementSave: null,
	statementRemove: null,
	statementClear: null,
	statementCount: null,
	
	statementSelect: null,
	
	intIdent: 0,
	longTimestamp: 0,
	strIdent: '',
	strTitle: '',
	intCount: 0,
	
	init: function() {
		{
			PreferenceHistory.sqlserviceHandle = Services.storage.openDatabase(FileUtils.getFile('ProfD', [ 'YouRect.PreferenceHistory.sqlite' ]));
		}
		
		{
			// @formatter:off
			PreferenceHistory.sqlserviceHandle.executeSimpleSQL(
				'CREATE TABLE IF NOT EXISTS PreferenceHistory ' +
				'	( ' +
				'		intIdent INTEGER PRIMARY KEY AUTOINCREMENT, ' +
				'		longTimestamp INTEGER, ' +
				'		strIdent TEXT, ' +
				'		strTitle TEXT, ' +
				'		intCount INTEGER ' +
				'	) '
			);
			// @formatter:on
		}
		
		{
			{
				var intIndex = -1;
				
				// @formatter:off
				PreferenceHistory.statementCreate = PreferenceHistory.sqlserviceHandle.createStatement(
					'INSERT INTO PreferenceHistory ' +
					'	( ' + 
					'		longTimestamp, ' +
					'		strIdent, ' +
					'		strTitle, ' +
					'		intCount ' +
					'	) ' +
					'VALUES ' +
					'	( ' +
					'		:PARAM' + (intIndex += 1) + ', ' +
					'		:PARAM' + (intIndex += 1) + ', ' +
					'		:PARAM' + (intIndex += 1) + ', ' +
					'		:PARAM' + (intIndex += 1) + ' ' +
					'	) '
				);
				// @formatter:on
			}
			
			{
				var intIndex = -1;
				
				// @formatter:off
				PreferenceHistory.statementSave = PreferenceHistory.sqlserviceHandle.createStatement(
					'UPDATE PreferenceHistory ' +
					'SET ' +
					'	longTimestamp = :PARAM' + (intIndex += 1) + ', ' +
					'	strIdent = :PARAM' + (intIndex += 1) + ', ' +
					'	strTitle = :PARAM' + (intIndex += 1) + ', ' +
					'	intCount = :PARAM' + (intIndex += 1) + ' ' +
					'WHERE intIdent = :PARAM' + (intIndex += 1) + ' '
				);
				// @formatter:on
			}
			
			{
				var intIndex = -1;
				
				// @formatter:off
				PreferenceHistory.statementRemove = PreferenceHistory.sqlserviceHandle.createStatement(
					'DELETE FROM PreferenceHistory ' +
					'WHERE intIdent = :PARAM' + (intIndex += 1) + ' '
				);
				// @formatter:on
			}
			
			{
				// @formatter:off
				PreferenceHistory.statementClear = PreferenceHistory.sqlserviceHandle.createStatement(
					'DELETE FROM PreferenceHistory '
				);
				// @formatter:on
			}
			
			{
				// @formatter:off
				PreferenceHistory.statementCount = PreferenceHistory.sqlserviceHandle.createStatement(
					'SELECT COUNT(*) AS intCount FROM PreferenceHistory '
				);
				// @formatter:on
			}
		}
		
		{
			PreferenceHistory.statementSelect = null;
		}
		
		{
			PreferenceHistory.intIdent = 0;
			
			PreferenceHistory.longTimestamp = 0;
			
			PreferenceHistory.strIdent = '';
			
			PreferenceHistory.strTitle = '';
			
			PreferenceHistory.intCount = 0;
		}
	},
	
	dispel: function() {
		{
			PreferenceHistory.statementCreate.finalize();
			PreferenceHistory.statementSave.finalize()
			PreferenceHistory.statementRemove.finalize()
			PreferenceHistory.statementClear.finalize()
			PreferenceHistory.statementCount.finalize()
			
			PreferenceHistory.sqlserviceHandle.close();
		}
		
		{
			PreferenceHistory.sqlserviceHandle = null;
		}
		
		{
			PreferenceHistory.statementCreate = null;
			
			PreferenceHistory.statementSave = null;
			
			PreferenceHistory.statementRemove = null;
			
			PreferenceHistory.statementClear = null;
			
			PreferenceHistory.statementCount = null;
		}
		
		{
			PreferenceHistory.statementSelect = null;
		}
		
		{
			PreferenceHistory.intIdent = 0;
			
			PreferenceHistory.longTimestamp = 0;
			
			PreferenceHistory.strIdent = '';
			
			PreferenceHistory.strTitle = '';
			
			PreferenceHistory.intCount = 0;
		}
	},
	
	acquire: function() {
		
	},
	
	release: function() {
		
	},
	
	transactionOpen: function() {
		PreferenceHistory.sqlserviceHandle.beginTransaction();
	},
	
	transactionClose: function() {
		PreferenceHistory.sqlserviceHandle.commitTransaction();
	},
	
	selectOpen: function(strSql, strParameter) {
		PreferenceHistory.statementSelect = PreferenceHistory.sqlserviceHandle.createStatement(strSql);
		
		for (var intFor1 = 0; intFor1 < strParameter.length; intFor1 += 1) {
			PreferenceHistory.statementSelect.params['PARAM' + intFor1] = strParameter[intFor1];
		}
	},
	
	selectNext: function() {
		var boolStep = PreferenceHistory.statementSelect.step();
		
		if (boolStep === true) {
			PreferenceHistory.intIdent = PreferenceHistory.statementSelect.row.intIdent;
			PreferenceHistory.longTimestamp = PreferenceHistory.statementSelect.row.longTimestamp;
			PreferenceHistory.strIdent = PreferenceHistory.statementSelect.row.strIdent;
			PreferenceHistory.strTitle = PreferenceHistory.statementSelect.row.strTitle;
			PreferenceHistory.intCount = PreferenceHistory.statementSelect.row.intCount;
			
		} else if (boolStep === false) {
			PreferenceHistory.intIdent = 0;
			PreferenceHistory.longTimestamp = 0;
			PreferenceHistory.strIdent = '';
			PreferenceHistory.strTitle = '';
			PreferenceHistory.intCount = 0;
			
		}
	},
	
	selectClose: function() {
		PreferenceHistory.statementSelect.finalize();
	},
	
	create: function() {
		{
			var intIndex = -1;
			
			PreferenceHistory.statementCreate.params['PARAM' + (intIndex += 1)] = PreferenceHistory.longTimestamp;
			PreferenceHistory.statementCreate.params['PARAM' + (intIndex += 1)] = PreferenceHistory.strIdent;
			PreferenceHistory.statementCreate.params['PARAM' + (intIndex += 1)] = PreferenceHistory.strTitle;
			PreferenceHistory.statementCreate.params['PARAM' + (intIndex += 1)] = PreferenceHistory.intCount;
			
			PreferenceHistory.statementCreate.execute();
			
			PreferenceHistory.statementCreate.reset();
		}
		
		{
			PreferenceHistoryObserver.update();
		}
	},
	
	save: function() {
		{
			var intIndex = -1;
			
			PreferenceHistory.statementSave.params['PARAM' + (intIndex += 1)] = PreferenceHistory.longTimestamp;
			PreferenceHistory.statementSave.params['PARAM' + (intIndex += 1)] = PreferenceHistory.strIdent;
			PreferenceHistory.statementSave.params['PARAM' + (intIndex += 1)] = PreferenceHistory.strTitle;
			PreferenceHistory.statementSave.params['PARAM' + (intIndex += 1)] = PreferenceHistory.intCount;
			PreferenceHistory.statementSave.params['PARAM' + (intIndex += 1)] = PreferenceHistory.intIdent;
			
			PreferenceHistory.statementSave.execute();
			
			PreferenceHistory.statementSave.reset();
		}
		
		{
			PreferenceHistoryObserver.update();
		}
	},
	
	remove: function() {
		{
			var intIndex = -1;
			
			PreferenceHistory.statementRemove.params['PARAM' + (intIndex += 1)] = PreferenceHistory.intIdent;
			
			PreferenceHistory.statementRemove.execute();
			
			PreferenceHistory.statementRemove.reset();
		}
		
		{
			PreferenceHistoryObserver.update();
		}
	},
	
	clear: function() {
		{
			PreferenceHistory.statementClear.execute();
			
			PreferenceHistory.statementClear.reset();
		}
		
		{
			PreferenceHistoryObserver.update();
		}
	},
	
	count: function() {
		var intCount = 0;
		
		{
			var boolStep = PreferenceHistory.statementCount.step();
			
			if (boolStep === true) {
				intCount = PreferenceHistory.statementCount.row.intCount;
				
			} else if (boolStep === false) {
				intCount = 0;
				
			}
		}
		
		{
			PreferenceHistory.statementCount.reset();
		}
		
		return intCount;
	}
};
PreferenceHistory.init();
