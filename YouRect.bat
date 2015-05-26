call AssetGen.bat

del YouRect.xpi

"C:\Program Files\WinRAR\WinRAR.exe" a -afzip -r -x@"YouRect.txt" "YouRect.xpi" "*.*"