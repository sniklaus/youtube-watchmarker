set PREFGEN="%~dp0\..\GenRect\PrefGen.jar"
set INPUT="%~dp0\content"
set OUTPUT="%~dp0\content"

java -jar %PREFGEN% %INPUT% %OUTPUT%