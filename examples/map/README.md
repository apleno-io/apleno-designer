# Natural catastrophe exposure map (R)

An R app displaying insurance exposure on an interactive Leaflet map of France, with Plotly pie charts for the clicked zone. The map is a custom JavaScript integration (not the Leaflet module), driven by R through messages.

## Flow (`main.pseq`)

`start` → `interpCol.r` (color helpers) → `chargement.R` (loads shapefiles and data) → `main.R` (map logic) → `main.pgui` (the map) → `end`

## What it shows

- **Loading with progress**: `chargement.R` reads shapefiles with `script.setProgress(TRUE, percent, message)` between each file.
- **Custom JavaScript component**: `main.pgui` has a label whose value is `<div id="map"></div>`; `main.js` creates the Leaflet map in it on `RPGM.on('didEnterStep')` for the `leaflet` step.
- **R ↔ JavaScript messaging**: JavaScript sends the map view and clicks with `RPGM.sendMessage('r', ...)`; R answers in `rpgm.on('didReceiveMessage', ...)` (`main.R`) with `rpgm.sendToJavascript(...)` to draw polygons, markers and the legend.
- **Plotly graphs from code**: on a zone click, `plotly_graph()` in `main.R` sets three pie charts with `gui.setValue('this', var, list(data = ..., layout = ...))`.
- **Incremental loading**: an `interval` widget calls `loadDonnees(...)` periodically, and `gui.setProperties` updates a progress bar (`value`, `progressdescription`).
- **Select reacting to changes**: `codeOnChange` on the `empreinte` select reloads the data.
- **Output files for JavaScript**: the marker icon is copied to the output folder (`file.copy(rpgm.pgmFilePath(...), rpgm.outputFile("icon.png"))`) and loaded with `RPGM.getOutputURL('icon.png')`.
- **Dark theme**: `main.css` and `style.css` restyle the app, the tabs and the select widget.

## Not included

The data (`donnees/*.csv`), the shapefiles (`sf-simple/`) and the Leaflet library (`leaflet/`) are not included in this copy, so the app cannot run from here.
