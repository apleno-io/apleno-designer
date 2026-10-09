# Cyber risk: optimal control (Python)

A Python dashboard: parameters on top, three tabs of computations below, each started by a button and showing progress and matplotlib results. No Submit button: everything happens in button code.

## Flow (`main.pseq`)

`start` → `sources/interface.py` (script) → `main.py` (script) → `main.pgui` (dashboard) → `end`

## What it shows

- **Scripts prepare the interface before it is displayed**: `sources/interface.py` hides the result widgets with `gui.hide(rpgm.step("main", "main"), ...)` and defines initial values used by the interface (`mu`, the `PY` data frame).
- **Python includes**: `main.py` loads `sources/*.py` with `exec(open(...).read())` and defines the functions called by the buttons.
- **Widget values as variables**: `buttonCode` calls functions with widget `customId`s as arguments (`OC_Value(eta)`, `SimTrajectoires(n, ...)`).
- **Long computations with feedback**: buttons disabled and relabelled with a spinner icon (`disable_calcul_bouton` in `main.py`), progress widgets updated from loops with `gui.setValue("this", "ocProgress", percent)`.
- **matplotlib results**: `sources/graphique.py` saves PNG files, then `gui.update` + `gui.show` the `image` widgets displaying them.
- **Code values and grids**: number widgets with `"language": true` (`"value": "mu + 20."`) and a `grid` editing the `PY` data frame.
- **Dynamic help texts with formulas**: `codeOnChange` updates a help text with `gui.setProperty(..., "helptext", ...)` and asks MathJax to typeset it (`rpgm.sendToJavascript("refreshMathjax")`, `modules/mathjax-init.js`).
- **Layout**: boxes with a custom CSS class (`bluebox` in `style.css`), columns, tabs with emoji names.

## Not included

`modules/mathjax.js` (the MathJax 3 library, listed in `customFiles`) is not included in this copy.
