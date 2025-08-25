#!/bin/bash

js-beautify ----brace-style=collapse,preserve-inline --file content/index.html --outfile content/index.html
js-beautify ----brace-style=collapse,preserve-inline --file content/index.js --outfile content/index.js
js-beautify ----brace-style=collapse,preserve-inline --file content/index.css --outfile content/index.css
js-beautify ----brace-style=collapse,preserve-inline --file background.js --outfile background.js
js-beautify ----brace-style=collapse,preserve-inline --file bg-database.js --outfile bg-database.js
js-beautify ----brace-style=collapse,preserve-inline --file bg-history.js --outfile bg-history.js
js-beautify ----brace-style=collapse,preserve-inline --file bg-search.js --outfile bg-search.js
js-beautify ----brace-style=collapse,preserve-inline --file bg-sync-manager.js --outfile bg-sync-manager.js
js-beautify ----brace-style=collapse,preserve-inline --file bg-youtube.js --outfile bg-youtube.js
js-beautify ----brace-style=collapse,preserve-inline --file constants.js --outfile constants.js
js-beautify ----brace-style=collapse,preserve-inline --file credential-storage.js --outfile credential-storage.js
js-beautify ----brace-style=collapse,preserve-inline --file database-provider-factory.js --outfile database-provider-factory.js
js-beautify ----brace-style=collapse,preserve-inline --file error-handler.js --outfile error-handler.js
js-beautify ----brace-style=collapse,preserve-inline --file manifest.json --outfile manifest.json
js-beautify ----brace-style=collapse,preserve-inline --file popup.html --outfile popup.html
js-beautify ----brace-style=collapse,preserve-inline --file popup.js --outfile popup.js
js-beautify ----brace-style=collapse,preserve-inline --file supabase-database-provider.js --outfile supabase-database-provider.js
js-beautify ----brace-style=collapse,preserve-inline --file utils.js --outfile utils.js
js-beautify ----brace-style=collapse,preserve-inline --file youtube.js --outfile youtube.js
