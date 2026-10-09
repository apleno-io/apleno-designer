# Portfolio optimal control with Heston (Python)

A styled Python dashboard: parameter cards, a method choice and a compute button, then results in tabs with interactive Plotly graphs. No Submit button.

## Flow (`main.pseq`)

`start` → `heston-edp.py` → `heston-mc.py` → `graph.py` (scripts defining functions) → `dashboard.pgui` → `end`

## What it shows

- **Plotly graphs from expressions**: `graph` widgets with a `graph` expression such as `graph_oc(alpha)`; the functions in `graph.py` return `{'data': ..., 'layout': ...}` (or `[]` while there is nothing to draw), and `gui.update('this', 'plotly_oc')` redraws them.
- **Compute button**: `onpress` runs `oc_edp(...)` or `oc_mc(...)` depending on the `methode` select, with widget values as arguments. `heston-edp.py` shows the full pattern: disable the button, update the `oc_progress` progress widget in the loop, hide the "waiting" box, show a notification, enable the button again.
- **Reacting to inputs**: `onchange` on the axis select and value redraw the graph.
- **Validation**: `condition` (`eta > 0`) on a number input.
- **Show/hide**: results are hidden at start (`gui.hide(rpgm.step('main', 'dashboard'), 'tab')` in `graph.py`) and shown after computing.
- **Runtime styling**: `gui.setProperty(..., 'progresscolor', '#f1c40f')`.
- **Custom design**: CSS classes in `style.css` (cards `cbox`, titles `ch1`...`ch4`, a Google font) applied with the widgets' `css` property; formulas typeset by MathJax.

## Not included

`mathjax.js` (the MathJax 3 library, listed in `customFiles`) is not included in this copy.
