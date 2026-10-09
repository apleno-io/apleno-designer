# Dataset explorer (R)

A classic step-by-step R app: a form, a computation, a results page, and a choice to start again. It uses R built-in datasets and base R only, so it runs without data files or packages.

## Flow (`main.pseq`)

```
start → init.R → form.pgui → analysis.R → results.pgui → condition "isTRUE(again)"
                     ↑                                              │ true
                     └──────────────────────────────────────────────┘
                                                     false → sequence step "report.pseq"
```

The last step jumps to `report.pseq` (`start → report.R → end`). Entering another sequence is definitive: a `sequence` step has no exit, the app never comes back to `main.pseq`, and the end step of `report.pseq` ends the app.

## What it shows

- **Preparing an interface before it is displayed**: `init.R` fills the `variable` select of the form with `gui.addChoices(rpgm.step("main", "form"), ...)`.
- **Two ways to fill a select**: `dataset` reads its options from R variables (`choicesvalues` / `choicestexts`); `variable` is filled by code and refilled when the dataset changes (`onchange: "update_variables(dataset)"` calling `gui.clearChoices` / `gui.addChoices` on `"this"`).
- **Form validation**: `required`, number limits (`min`, `max`), and `condition: "bins >= 2 && bins <= 50"`.
- **Submitted values as variables**: `analysis.R` uses `dataset`, `variable`, `bins`, `chart` and `chart_title`, the `id`s of the form widgets.
- **Script progress**: `script.setProgress()` in `analysis.R`.
- **Output files**: CSV and HTML written with `rpgm.outputFile()` and listed on the end screen with `rpgm.addToEndScreen()`.
- **Jumping to another sequence**: the final part of the app (an HTML report of the last analysis) is in its own sequence; `report.R` still shares the R session and uses the variables of the main sequence.
- **Results from code values**: a label and a table with `"isr": true` (`summary_html`, `stats_table`), and a Plotly graph from its `graph` expression `"make_plot(...)"` (histogram or box plot, arrays sent with `as.list()`).
- **A button**: `onpress` copies the table to the clipboard and shows a notification.
- **Looping back**: the `again` switch is read by the condition step (`isTRUE(again)`): true goes back to the form, false goes to the end.
- **Naming**: widget `id`s avoid R built-in names (`chart_title` and not `title`, `chart_graph` and not `plot`).
- **Styling**: CSS classes from `style.css` (listed in `customFiles`), box designs, columns, a Font Awesome icon in a button.
