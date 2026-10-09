---
name: apleno
description: Build and modify Apleno apps, R/Python applications made of .ppro, .pseq and .pgui files (Apleno Designer VS Code extension). Use when creating or editing interfaces (.pgui), sequences (.pseq) or project files (.ppro), when writing R/Python scripts using the Apleno API (gui.*, rpgm.*, script.*), Plotly graphs, custom JavaScript/CSS for an app, Excel files with xlsx.*, or the Leaflet/Handsontable modules. Use for any task in a folder containing a .ppro file.
---

# Apleno apps

`AGENTS.md` at the project root has the essentials. This skill has the details and complete example apps. Read only the files the task needs.

## Workflow

1. **Plan the flow**: which interfaces (`gui` steps), which scripts, which conditions. Prefer a few rich interfaces with buttons over many small steps.
2. **Write the files** following the JSON Schemas in [schemas/](schemas/) (`ppro.schema.json`, `pseq.schema.json`, `pgui.schema.json`: read the schema of a file type before writing one). Write JSON with tab indentation.
3. **Write the scripts**: initialization scripts before the interfaces, functions called from the interfaces.
4. **Check the Problems panel**: the Apleno extension validates `.ppro`/`.pseq`/`.pgui` files on save (source "Apleno"): unknown properties, wrong values, duplicate ids, broken step targets, missing files. Fix every error.
5. **Ask the user to run the app** (F5 in VS Code). You cannot run it yourself; R/Python errors appear in the app and in the "Apleno" output channel.

## Key facts

- Widgets with a `customId` are R/Python variables named after it; interface code (`buttonCode`, `codeOnChange`, code values) uses them directly. Never use an R/Python built-in name as `customId` (`title`, `plot`, `summary`, `c`, `t`, `sum`, `max`, `type`, `list`...).
- `'this'` is the current interface in GUI functions: `gui.setValue('this', 'result', 42)`. From script steps, use `rpgm.step('main', 'formStepId')`.
- Graphs are Plotly figures: `list(data = ..., layout = ...)` in R, `{'data': ..., 'layout': ...}` in Python.
- Write generated files with `rpgm.outputFile(name)`; show them with `rpgm.addToEndScreen()`, an `image` widget or `rpgm.open()`.
- Custom CSS and JavaScript go in files listed in `customFiles` of the `.ppro`.

## Reference

| File | Read it for |
|---|---|
| [reference/r-python-api.md](reference/r-python-api.md) | All `gui.*`, `rpgm.*`, `script.*` functions, how code runs, step references, property names for `gui.setProperty` (current and old names) |
| [reference/widgets.md](reference/widgets.md) | Behavior of each widget type: values in code, Plotly graphs, images, select options, grids and their styling rules, intervals, layouts |
| [reference/javascript.md](reference/javascript.md) | Custom JavaScript: `RPGM` API, R/Python ↔ JavaScript messages, custom components in a label, MathJax formulas |
| [reference/css.md](reference/css.md) | CSS selectors of the app and of each widget |
| [reference/xlsx.md](reference/xlsx.md) | Reading and writing Excel files from R (Windows) |
| [reference/module-leaflet.md](reference/module-leaflet.md) | The Leaflet map module (R) |
| [reference/module-handsontable.md](reference/module-handsontable.md) | The Handsontable grid module (R) |

## Example apps

Complete real apps, in the current file format. Start with their `README.md`. Large data files and third-party libraries are not included.

| Example | Language | Shows |
|---|---|---|
| [examples/explorer](examples/explorer/README.md) | R | **Start here for step-by-step apps**: form with validation → script → sub-sequence → results → "run again?" condition looping back; dynamic select options, output files on the end screen |
| [examples/portfolio](examples/portfolio/README.md) | Python | Styled dashboard, Plotly graphs from expressions, compute button with progress, show/hide results, validation |
| [examples/cyberrisk](examples/cyberrisk/README.md) | Python | Parameters + tabs of computations, matplotlib images, progress from loops, grid with a data frame, MathJax formulas |
| [examples/map](examples/map/README.md) | R | Custom Leaflet map in a label, R ↔ JavaScript messages, Plotly charts set from code, interval loading, script progress |
