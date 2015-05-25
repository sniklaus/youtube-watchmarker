set HTMLCOMPRESSOR="%~dp0\..\GenRect\htmlcompressor.jar"
set YUICOMPRESSOR="%~dp0\..\GenRect\yuicompressor.jar"

:: https://github.com/yui/yuicompressor/issues/78

xcopy "%~dp0\..\GenRect\AssetGen\*" "%~dp0\content\" /E /I /F /R /Y

IF /I "%1" == "RELEASE" (
	FOR %%f IN ("%~dp0\..\GenRect\AssetGen\*.html") DO (
		java -jar %HTMLCOMPRESSOR% --type html -o "content\%%~nf%%~xf" "%~dp0\..\GenRect\AssetGen\%%~nf%%~xf"
	)

	FOR %%f IN ("%~dp0\..\GenRect\AssetGen\*.css") DO (
		java -jar %YUICOMPRESSOR% --type css -o "content\%%~nf%%~xf" "%~dp0\..\GenRect\AssetGen\%%~nf%%~xf"
	)

	FOR %%f IN ("%~dp0\..\GenRect\AssetGen\*.js") DO (
		java -jar %YUICOMPRESSOR% --type js -o "content\%%~nf%%~xf" "%~dp0\..\GenRect\AssetGen\%%~nf%%~xf"
	)

	xcopy "%~dp0\..\GenRect\AssetGen\jquery.js" "%~dp0\content\jquery.js" /F /R /Y
	xcopy "%~dp0\..\GenRect\AssetGen\moment.js" "%~dp0\content\moment.js" /F /R /Y
	xcopy "%~dp0\..\GenRect\AssetGen\bootstrap.css" "%~dp0\content\bootstrap.css" /F /R /Y
	xcopy "%~dp0\..\GenRect\AssetGen\sortable.css" "%~dp0\content\sortable.css" /F /R /Y
	xcopy "%~dp0\..\GenRect\AssetGen\sortable.js" "%~dp0\content\sortable.js" /F /R /Y
)

del "%~dp0\content\sortable.css"
del "%~dp0\content\sortable.js"