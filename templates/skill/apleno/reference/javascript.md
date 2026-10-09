# Custom JavaScript and CSS

JavaScript and CSS files listed in `customFiles` of the `.ppro` (paths relative to the project root) are loaded when the app starts, in the listed order. Use them for custom styling, third-party libraries (MathJax, Leaflet, charts...) and widgets that Apleno doesn't provide. Libraries are files of the project (e.g. `modules/mathjax.js`), not CDN links.

## JavaScript API (`RPGM` object)

| Function | Description |
|---|---|
| `RPGM.on(event, callback)` / `RPGM.off(event, callback)` | Events: `didEnterStep(customStepId)` (entering a step, after custom files are loaded), `didReceiveMessage(message, data, language)` (from `rpgm.sendToJavascript`), `willLeaveStep(customStepId)` (clean the DOM), `willDispose()` (app closing). |
| `RPGM.sendMessage(language, message, data = {}, options = {})` | Send a message to `'r'` or `'python'`. `data`: boolean, string, number, array or object. `options.rArrayType`: `"vector"`, `"list"` or `"auto"` (how arrays are converted to R). |
| `RPGM.getCurrentStepId()` | `id` of the current step (as in the `.pseq` file). |
| `RPGM.getOutputURL(file)` | URL of a file of the output folder. |

## R/Python ↔ JavaScript messaging

```r
# R: send to JavaScript
rpgm.sendToJavascript('updateMarkers', list(markers = markers))

# R: receive from JavaScript
rpgm.on('didReceiveMessage', function(message, data){
    if(message == 'mapClick'){
        cat(data$lat, data$lng)
    }
})
```

```javascript
// JavaScript: receive from R/Python
RPGM.on('didReceiveMessage', (message, data) => {
    if(message === 'updateMarkers'){
        updateMarkers(data.markers);
    }
});

// JavaScript: send to R
RPGM.sendMessage('r', 'mapClick', {lat: 48.8, lng: 2.3});
```

Debounce frequent JavaScript events (map moves, typing) before sending them to R/Python.

## Custom component in an interface

Put an empty container in a `label` widget (`"value": "<div id=\"map\"></div>"`) and initialize the component when its step is entered:

```javascript
RPGM.on('didEnterStep', (stepId) => {
    if(stepId !== 'mapStep' || window.myMap){   // id of the gui step in the .pseq
        return;
    }
    setTimeout(() => { window.myMap = L.map('map'); /* ... */ }, 10);
});
```

## Formulas with MathJax

Load MathJax as a custom file, write formulas in labels and help texts with `\( ... \)`, and typeset when a step is entered or when R/Python changed some text:

```javascript
RPGM.on('didEnterStep', () => setTimeout(() => MathJax.typeset(), 120));
RPGM.on('didReceiveMessage', (message) => {
    if(message === 'refreshMathjax'){
        MathJax.typeset();
    }
});
```

```python
gui.setProperty('this', 'nt', 'helptext', 'Time steps, \\(dt\\) = ' + str(dt))
rpgm.sendToJavascript('refreshMathjax')
```

## CSS

See css.md for the selectors of the app and of each widget. Put CSS in a `.css` file listed in `customFiles`; the inline CSS properties of the `.ppro` are deprecated.
