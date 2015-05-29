set PREFGEN="%~dp0\..\GenRect\PrefGen.jar"
set INPUT="%~dp0\resources\yourect\data"
set OUTPUT="%~dp0\resources\yourect\data"

java -jar %PREFGEN% %INPUT% %OUTPUT%