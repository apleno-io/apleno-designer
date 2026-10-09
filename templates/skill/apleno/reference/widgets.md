# Widgets

The exact properties and allowed values of each widget type are in `schemas/pgui.schema.json` of this skill. This page explains how the widgets behave and how code works with them. Property names are the ones of `.pgui` files (Apleno 3.x names, lowercase); `gui.setProperty` also accepts the current names (see r-python-api.md).

## Common behavior

- `value` is the initial value. With `"isr": true`, it is R/Python code (in the interface `language`) evaluated when the interface is displayed: `"value": "nrow(data)"`. `gui.update(step, id)` evaluates it again.
- `labeltext`, `helptext`, label `value` and button `value` accept HTML, including Font Awesome icons: `Computing <i class="fa-solid fa-cog fa-spin"></i>`.
- `css`: inline CSS if it contains `:` (`"text-align: center"`), otherwise class names defined in a CSS file of the project (`"cbox title"`).
- Input widgets (`text`, `number`, `path`, `select`, `onoff`, `date`, `grid`) support `required`, `onchange` (code run on every change) and `condition` (an expression that must be true to submit; show the reason with `gui.showMessage`).
- `"labelposition": "hidden"` makes the widget use the full width; `"top"` puts the label above.

## Display widgets

| Type | `value` | Notes |
|---|---|---|
| `label` | Text or HTML | Titles, explanations, formulas (with MathJax loaded as a custom file, see javascript.md), or an empty `<div id="...">` used as a container for custom JavaScript (maps...). |
| `image` | Image path or URL | Relative paths are resolved from the project folder. To show a generated image: save it (e.g. matplotlib `savefig('result.png')`), then `gui.update(step, id)` and `gui.show(step, id)`. |
| `iframe` | Page URL or path | Embedded web page. |
| `table` | Data frame (usually with `"isr": true`, or set with `gui.setValue`) | Read-only table. |
| `graph` | (none) | Plotly graph, see below. |
| `progress` | Percentage 0-100 | `subtype`: `progressbar` or `progresscircle`. `"progressdescription": "%"` shows the percentage. Update it from long computations with `gui.setValue('this', id, percent)`. |

### Graphs (Plotly)

A `graph` widget displays a [Plotly](https://plotly.com/javascript/) figure: a named list (R) or dict (Python) with `data` (one trace or a list of traces) and `layout`, using the Plotly JavaScript attribute names.

Two ways to provide it:

1. The `graph` property: an expression returning the figure, re-evaluated by `gui.update(step, id)`:

```json
{ "id": "sales_graph", "type": "graph", "data": { "graph": "graph_sales(df)", "graphheight": 400 } }
```

```python
def graph_sales(df):
    if df is None:
        return []          # nothing to draw yet
    return {
        'data': [{'x': df['month'], 'y': df['sales'], 'type': 'bar'}],
        'layout': {'title': 'Sales'}
    }
```

2. `gui.setValue(step, id, figure)` from code:

```r
gui.setValue('this', 'pie', list(
  data = list(values = as.list(c(10, 20)), labels = as.list(c('A', 'B')), type = 'pie'),
  layout = list(title = 'Split')
))
```

In R, send arrays with `as.list(...)`. Matplotlib/ggplot images are an alternative: save a PNG and show it in an `image` widget.

## Input widgets

| Type | Subtypes | Value in code |
|---|---|---|
| `text` | `text`, `textarea`, `password` | String. |
| `number` | `float`, `integer`, `slider` | Number; empty input is `None` in Python. Limits with `min`, `max`, `step` (a slider needs min and max). |
| `select` | `select`, `multiselect`, `radio`, `multicheckboxes` | The selected option value (string), or a vector/list of values for `multiselect` and `multicheckboxes`. |
| `onoff` | `checkbox`, `switch` | `TRUE`/`FALSE`. |
| `date` | (none) | Date string; set values as `"YYYY-MM-DD"`. |
| `path` | `file` | File path chosen with the Browse button. |
| `grid` | (none) | The edited matrix / data frame. |

### Select options

Static options are in `choices` (`[{"value": "edp", "text": "PDE"}]`). Dynamic options come from code: `gui.clearChoices(step, id)` then `gui.addChoices(step, id, values, texts)`, or `choicesvalues` / `choicestexts` naming R/Python variables.

### Grid (Excel-like)

`value` (usually with `"isr": true`) is a matrix or data frame. `gridtype` is `text`, `integer`, `float` or `checkbox` (ignored for data frames). `"gridheight": 0` sizes the grid automatically.

Runtime-only grid properties, set with `gui.setProperty`: `allowSort` and `gridAllowFiltering` (default true), `gridAllowRowEditing` (add rows when pasting), `gridColumnsWidths` (percentages, e.g. `c(20, 10, 70)`), `readOnly` (don't send the data back after submit, for big read-only grids).

Styling rules (`gridstylingrules` in files, `gridStylingRules` with `gui.setProperty`) are a list of rules, each with `code` and either `css`, or `format = "number"` and `numberFormat`. `code` is a small expression evaluated for each cell, returning true/false. It supports `== === != !== > >= < <= && ||`, parentheses, strings, numbers, `true`/`false` and the keywords `col` (0-based column index), `colname`, `row`, `rowname`, `value`. `numberFormat` has a prefix/suffix, thousands and decimal separators, and `#` (optional) or `0` (forced) digits: `#,##0.####` gives `1,234,567.89`.

```r
gui.setProperty('this', 'grid', 'gridStylingRules', list(
  list(code = "colname === 'disp'", format = "number", numberFormat = "# ###,00 €"),
  list(code = "colname === 'disp' && value > 300", css = "color: #0F0"),
  list(code = "colname === 'disp' && value < 100", css = "color: #F00")
))
```

Setting the styling rules replaces all previous rules.

## Actions

| Type | Notes |
|---|---|
| `button` | `value` is the text (HTML allowed). `onpress` is the code run on click. Disable the button and change its text while a long computation runs, then restore it. |
| `interval` | Invisible; runs `intervalcode` every `intervaltime` milliseconds while the interface is displayed (polling, incremental loading). |

## Layout

Containers have their children in `elements`.

- `box`: vertical list of children. `"boxdesign": "none"` makes it invisible; other designs draw a box with an optional `boxheader`. Hide/show whole groups by giving the box an `id`.
- `columns`: `columnswidths` on a 12-unit grid (e.g. `[4, 8]`); exactly one child `box` per column.
- `tabs`: `tabsnames`; exactly one child `box` per tab; `tabscurrent` is the 0-based index of the tab shown first. Tab names accept emojis and HTML.

Interfaces without a Submit button (`"submitbutton": false`) are dashboards: everything happens through `onpress`/`onchange`, and `gui.submit()` moves to the next step when needed.
