# Leaflet module (R)

> Source: Apleno documentation (modules/leaflet). An optional R module, installed in `modules/leaflet/` of the project.


## Leaflet module

The leaflet module is an R Apleno Designer module for controlling a Leaflet map
in a GUI.

- The source are available on the [Github repository](https://github.com/pgmsolutions/module-leaflet);
- All releases are also available on [Github releases page](https://github.com/pgmsolutions/module-leaflet/releases);
- The current Leaflet version shipped with the module is 1.9.4.

An Apleno Designer example project is also [available here](https://github.com/pgmsolutions/app-leaflet-example).

## Installing the Leaflet module

To install the module, download the latest release file from the github page:

- [Download latest release](https://github.com/pgmsolutions/module-leaflet/releases/latest/download/module-leaflet.zip)

Unzip the file so that all the files in the zip are in a folder named
`modules/leaflet` in the root folder of your Apleno Designer project. You should
have a `modules/leaflet/main.R` file.

Open your ppro file and add the following lines in the **Custom CSS/JS files**
field:

```
modules/leaflet/resources/leaflet.js
modules/leaflet/resources/leaflet.css
modules/leaflet/main.css
modules/leaflet/main.js
```

The module is installed!

## Leaflet module usage

### Creating the map

Create a new empty label widget in a GUI and give it a unique id, like `myMap`.
Create a new R file and add it to the sequencer before the GUI containing the
map. In the R file, source the module:

```r
source(rpgm.pgmFilePath('modules/leaflet/main.R'))
```

You can then initialize the map. This must be done before entering the GUI with
the map.

```r
Leaflet.createMap(
    'myMapId',
    rpgm.step('main', 'myGUI'),
    'myMap',
    layer = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    height = 512,
    options = list(
        center=Leaflet.latLng(48, 2),
        zoom=5
    ),
    layerOptions = list(
        maxZoom=19,
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    )
)
```

See the `Leaflet.createMap()` section for more information on the parameters.
You then have access to all the functions for controlling and drawing on the
map, always by using your `myMapId` id for the `mapId` functions. You can setup
event listener to change the behaviour of the map depending on the user's inputs
(see [Events](#events)).

### Icons and markers

You can create custom icons to show on the map. Custom icons images **must** be
in the output directory to work. The module comes with a default icon located in
`leaflet/resources/icon.png`. The first step is to copy the file to the output
directory, then create the icon with a custom id. This custom id is used as the
`iconId` parameter in `Leaflet.marker()`. Here is a complete example:

```r
file.copy(rpgm.pgmFilePath('modules/leaflet/resources/icon.png'), rpgm.outputFile("leaflet_icon.png"));
leafletIconPath <- if(rpgm.isServer()) rpgm.outputFileURL('leaflet_icon.png') else rpgm.outputFile('leaflet_icon.png')
Leaflet.createIcon('defaultIcon', list(
    iconUrl = leafletIconPath,
    iconSize = c(48, 48),
    iconAnchor = c(24, 48),
    popupAnchor = c(0, -48)
));
Leaflet.marker('defaultIcon', Leaflet.latLng(48,2), 'My popup text')
```

## Leaflet module methods

In the following functions, `mapId` always refers to the unique id of a single
map in the GUI, as defined in the `Leaflet.createMap` function with the `mapId`
parameter.

### Leaflet.addCircle

```r
Leaflet.addCircle(mapId, shapeId, point, tooltip="", options=list())
```

Queue a new circle in the shapes layer. When all shapes are added, call
`flushShapes()` to draw all the shapes at once.

- `shapeId` is a unique shape id;
- `point` is the center of the circle created with `Leaflet.latLng()`;
- `tooltip` is a text showing when clicking on the shape;
- `options` are the
  [Circle polygon options](https://leafletjs.com/reference.html#circle). You
  should at least set the `radius` of the circle.

### Leaflet.addGeoJSON

```r
Leaflet.addGeoJSON(mapId, data)
```

Queue a new GeoJSON shape for future rendering on the map. When all GeoJSON
shapes are added, call `flushGeoJSON()` to draw all the GeoJSON shapes at once.

- `mapId` is the id of the map;
- `data` is a list of:
  - `id`: a unique id for the shape/zone;
  - `points`: a list of points;
  - `tooltip`: the HTML content of the tooltip when the user put its mouse over
    the shape;
  - `color`: an HTML hex color, like `#ff0000`.

### Leaflet.addPolygon

```r
Leaflet.addPolygon(mapId, shapeId, points, tooltip="", options=list())
```

Queue a new polygon in the shapes layer. When all shapes are added, call
`flushShapes()` to draw all the shapes at once.

- `shapeId` is a unique shape id;
- `points` is a list of points for the polygon created with `Leaflet.latLng()`;
- `tooltip` is a text showing when clicking on the shape;
- `options` are the
  [Leaflet polygon options](https://leafletjs.com/reference.html#polygon).

### Leaflet.createIcon

```r
Leaflet.createIcon(iconId, options)
```

Create a new icon for future markers. Icon should be created before initializing
the map.

- `iconId` is a unique id;
- `options` is a list of
  [Leaflet icon options](https://leafletjs.com/reference.html#icon).

### Leaflet.createMap

```r
Leaflet.createMap(mapId, step, widgetId, layer = layerURL, height = 512, options = list(), layerOptions = list())
```

Create a new map widget. This function must be called before entering the GUI
containing the map.

- mapId is a unique name you give to the map
- step is the step where the map will be, created with `rpgm.step()`
- widgetId is the id of the label widget that will contain the map
- layerURL is the tile layer URL (see
  [TileLayer documentation](https://leafletjs.com/reference.html#tilelayer)),
  and layerOptions are the
  [TileLayer Options](https://leafletjs.com/reference.html#tilelayer-option).
- options is the map options as defined by the
  [Leaflet map options](https://leafletjs.com/reference.html#map-option)

### Leaflet.fitBounds

```r
Leaflet.fitBounds(mapId, bounds)
```

Show a specific view on the map.

- `bounds` is a LatLngBounds created with `Leaflet.latLngBounds()`

### Leaflet.flushGeoJSON

```r
Leaflet.flushGeoJSON(mapId)
```

Remove all previous rendered geojson shapes and draw all the queued shapes with
`addGeoJSON()`.

### Leaflet.flushShapes

```r
Leaflet.flushShapes(mapId)
```

Remove all previous rendered simple shapes and draw all the queued shapes with
`addCircle()` and `addPolygon()`.

### Leaflet.hideLoading

```r
Leaflet.hideLoading(mapId)
```

Hide the loading state of a map.

### Leaflet.latLng

```r
Leaflet.latLng(lat, lng)
```

Create a new LatLng object to use where
[Leaflet LatLng object](https://leafletjs.com/reference.html#latlng) are used.

### Leaflet.latLngBounds

```r
Leaflet.latLngBounds(corner1, corner2)
```

Create a new LatLng object to use where
[Leaflet LatLngBounds object](https://leafletjs.com/reference.html#latlngbounds)
are used.

### Leaflet.marker

```r
Leaflet.marker(iconId, latlng, popup, options = list())
```

Create a new marker to be used with `Leaflet.updateMarkers()`.

- `iconId` is the id of an icon created with `Leaflet.createIcon()`;
- `latlng` is the position of the marker created with `Leaflet.latLng()`;
- `popup` is the HTML content of the popup when the user click on the marker;
- `options` is a list of
  [Leaflet marker options](https://leafletjs.com/reference.html#marker-option).

### Leaflet.on

```r
Leaflet.on(mapId, eventName, callback)
```

Add a new event listener. See the [Events](#events) section for more
information.

### Leaflet.off

```r
Leaflet.off(mapId, eventName, callback)
```

Remove an existing event listener. See the [Events](#events) section for
more information.

### Leaflet.setView

```r
Leaflet.setView(mapId, center, zoom)
```

Set the view of the map to a specific point and zoom.

- `center` is a LatLng point created with `Leaflet.latLng()`;
- `zoom` is the wanted zoom level.

### Leaflet.setZoom

```r
Leaflet.setZoom(mapId, zoom)
```

Set the zoom level of the map.

### Leaflet.showLoading

```r
Leaflet.showLoading(mapId)
```

Show the loading state of a map with a spinning animation over the map.

### Leaflet.triggerViewEvent

```r
Leaflet.triggerViewEvent(mapId)
```

Force the map to send an `onDidChangeView` event. Useful to refresh the map view
after loading data for example.

### Leaflet.updateLegend

```r
Leaflet.updateLegend(mapId, content)
```

Update the content of the legend of the map with `content`.

### Leaflet.updateMarkers

```r
Leaflet.updateMarkers(mapId, markers)
```

Remove all existing markers on the map and draw all the markers in the `markers`
parameter.

- `mapId` is the id of the map;
- `markers` should be a list of markers created with `Leaflet.marker()`.

## Leaflet module events

The Leaflet module comes with an event system where you can add functions that
will be called when something happens on the map. To setup a new hook on an
event, you have to call `Leaflet.on()` with the unique id of your map, the event
and your callback function. Additional parameters are in a list passed as the
first argument to the function. Here is an example:

```r
Leaflet.on('myMapId', 'onDidClickMap', function(data){
    cat(paste0('User clicked on the map on lat:', data$lat, ' and lng:', data$lng, '.'));
});
```

You can also use a previously created function:

```r
myCallback <- function(data){
    cat(paste0('User clicked on the map on lat:', data$lat, ' and lng:', data$lng, '.'));
}
Leaflet.on('myMapId', 'onDidClickMap', myCallback);
```

### onDidChangeView

Called when the user has finished to move or zoom the map, and its view has
changed. The `data` parameter contains:

- `northLat`: the latitude of the most north position of the current view;
- `eastLng`: the longitude of the most east position of the current view;
- `southLat`: the latitude of the most south position of the current view;
- `westLng`: the longitude of the most west position of the current view;
- `zoomLevel`: the current zoom level of the map.

### onDidClickMap

Called when the user clicked somewhere on the map. The `data` parameter
contains:

- `lat`: the latitude of the click;
- `lng`: the longitude of the click.

### onDidClickShape

Called when the user clicked on a shape previously added with `addCircle()` or
`addPolygon()`. The `data` parameter contains:

- `shapeId`: the zone unique id of the shape;
- `northLat`, `eastLng`, `southLat`, `westLng` and `zoomLevel`: same as the
  `onDidChangeView` event.

### onDidClickZone

Called when the user clicked on a zone previously added with `addGeoJSON()`. The
`data` parameter contains:

- `zoneId`: the zone unique id as defined in `addGeoJSON()`;
- `northLat`, `eastLng`, `southLat`, `westLng` and `zoomLevel`: same as the
  `onDidChangeView` event.

### onDidLoad

`onDidLoad` is called when the map finished its initialization, and is ready to
draw shapes, set view and any other uses. There is no argument to `onDidLoad`.
