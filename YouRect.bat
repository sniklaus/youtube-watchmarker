call AssetGen.bat

xcopy "%~dp0\content\jquery.js" "%~dp0\resources\yourect\data\" /F /R /Y
xcopy "%~dp0\content\libPreferenceHistory.js" "%~dp0\resources\yourect\lib\" /F /R /Y
xcopy "%~dp0\content\libPreferenceHistoryObserver.js" "%~dp0\resources\yourect\lib\" /F /R /Y
xcopy "%~dp0\content\libPreferenceYoutube.js" "%~dp0\resources\yourect\lib\" /F /R /Y
xcopy "%~dp0\content\libPreferenceYoutubeObserver.js" "%~dp0\resources\yourect\lib\" /F /R /Y

del YouRect.xpi

"C:\Program Files\WinRAR\WinRAR.exe" a -afzip -r -x@"YouRect.txt" "YouRect.xpi" "*.*"

del "%~dp0\resources\yourect\data\jquery.js"
del "%~dp0\resources\yourect\lib\libPreferenceHistory.js"
del "%~dp0\resources\yourect\lib\libPreferenceHistoryObserver.js"
del "%~dp0\resources\yourect\lib\libPreferenceYoutube.js"
del "%~dp0\resources\yourect\lib\libPreferenceYoutubeObserver.js"