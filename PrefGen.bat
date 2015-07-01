call "%~dp0\..\GenRect\GenRect.bat"

set INPUT="%~dp0\content"
set OUTPUT="%~dp0\content"

java -jar %PREFGEN% %INPUT% %OUTPUT%