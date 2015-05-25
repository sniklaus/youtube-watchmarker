call AssetGen.bat

xcopy "%~dp0\..\addon-sdk-yourect\data\*" "%~dp0\resources\yourect\data\" /E /I /F /R /Y
xcopy "%~dp0\..\addon-sdk-yourect\lib\*" "%~dp0\resources\yourect\lib\" /E /I /F /R /Y

del YouRect.xpi

"C:\Program Files\WinRAR\WinRAR.exe" a -afzip -r -x@"YouRect.txt" "YouRect.xpi" "*.*"

rmdir /s /q "%~dp0\resources"