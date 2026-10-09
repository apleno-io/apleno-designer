# R / Python API

Every R and Python session run by Apleno has the functions below predefined. Never `import` or `library()` them. Names are identical in both languages: in Python, `rpgm`, `gui` and `script` are modules already in the global scope (`gui.setValue(...)`). Use `TRUE`/`FALSE`/`list()` in R and `True`/`False`/`dict` in Python.

## How code runs

- **Script steps** run a whole `.R`/`.py` file. All script steps share one session per language: variables and functions defined in a script are available to the next steps and to interface code.
- **Interface code** runs inside a `gui` step, in the interface `language`: `value` with `"language": true` (evaluated when the interface is displayed), `codeOnChange`, `buttonCode`, `repeaterCode`, `conditionOnSubmit`, and the graph `graphVariable` expression.
- **Widget values are variables.** Each widget with a non-empty `customId` is a variable named after it: interface code sees the current values while the interface is displayed, and the values stay available to the next steps after it is submitted. A widget without `customId` creates no variable. A `customId` must be a valid variable name in the interface language and must not reuse a built-in name: in R, a widget named `title`, `plot` or `summary` hides the function of the same name (and assigning `title` can even fail with "cannot change value of locked binding").
- An empty number input is `None` in Python (check before using it: `if eta is None: eta = 0.1`).
- Usual pattern: a script step defines functions and initial values; the interface calls them from `buttonCode` / `codeOnChange` with widget variables as arguments.

```python
# buttonCode of a button, Python interface with number widgets "eta" and "mu"
alpha = compute(eta, mu); gui.update('this', 'result_graph')
```

- Python script files can include other files with `exec(open("sources/model.py").read())`; R uses `source("sources/model.R")` (paths relative to the working directory, the project folder by default).
- Long computations should report progress: `script.setProgress()` in script steps, or `gui.setValue('this', progressId, percent)` in interface code (with a `progress` widget).

## Step references

GUI functions take a `step` (which interface) and an `id` (the widget's `customId`).

- `'this'`: the interface currently displayed. Use it in interface code (`buttonCode`, `codeOnChange`...) and in functions called from it.
- `rpgm.step(file, stepId)`: a specific `gui` step. `file` is the sequence containing the step, with or without `.pseq` (`'main'` or `'main.pseq'`), and `stepId` is the step's `customId`. Use it in script steps to prepare an interface before it is displayed:

```r
gui.hide(rpgm.step('main', 'dashboard'), 'results')
```

## `gui.*`: change interfaces

| Function | Description |
|----------|-------------|
| `gui.setValue(step, id, value)` | Set the value (text, number, selection, progress %, Plotly figure for a graph...). |
| `gui.setProperty(step, id, property, value)` | Set one property (see below). |
| `gui.setProperties(step, id, properties)` | Set several properties: named `list()` in R, `dict` in Python. |
| `gui.show(step, id)` / `gui.hide(step, id)` | Show / hide a widget (also containers). |
| `gui.enable(step, id)` / `gui.disable(step, id)` | Enable / disable an input or button. |
| `gui.showMessage(step, id, type, message)` | Message below a widget, `type` = `"error"`, `"warning"` or `"success"`. |
| `gui.hideMessage(step, id)` | Hide that message. |
| `gui.update(step, id)` | Re-evaluate the widget's code value (`value` with `language: true`, graph `graphVariable`, image path...) to refresh it. |
| `gui.addChoice(step, id, value, text)` | Add an option to a `select` widget. |
| `gui.addChoices(step, id, values, texts)` | Add options (vectors/lists of the same length). |
| `gui.clearChoices(step, id)` | Remove all options. |
| `gui.removeChoice(step, id, value)` | Remove the option with this value. |
| `gui.setChoiceText(step, id, value, text)` | Change an option's text. |
| `gui.add(step, id, type, position = -1, parent = "root")` | Add a widget at runtime (`type`: see widgets.md). |
| `gui.remove(step, id)` | Remove a widget. |
| `gui.submit(force = FALSE)` | Submit the current interface (for interfaces with `displaySubmitButton: false`). |
| `gui.showModal(title, content)` | Modal dialog, `content` can be HTML. |
| `gui.embedURL(url, height = 400)` | R only: returns the HTML of an iframe, e.g. for a label value. |

Deprecated, don't use: `gui.showError`, `gui.showWarning`, `gui.showSuccess`, `gui.hideError` (use `gui.showMessage` / `gui.hideMessage`).

### Property names

`gui.setProperty` / `gui.setProperties` accept the property names of the `.pgui` files (`helpText`, `labelText`, `progressBarColor`, see `schemas/pgui.schema.json` in this skill) plus runtime-only properties:

| Property | Description |
|----------|-------------|
| `visible` | `TRUE`/`FALSE`, like `gui.show` / `gui.hide`. |
| `enabled` | `TRUE`/`FALSE`, like `gui.enable` / `gui.disable`. |
| `messageType`, `messageText` | Message below the widget (`messageText = ""` hides it). |

Older code and the online documentation use the Apleno 3.x lowercase names, which still work. Prefer the current names in new code:

| Current name | Old names |
|---|---|
| `language` | `isR`, `isr` |
| `isRequired` | `required` |
| `codeOnChange` | `onChange`, `onchange` |
| `conditionOnSubmit` | `condition` |
| `marginTop`, `labelText`, `labelPosition`, `helpText`, `helpPosition` | `margintop`, `label`/`labeltext`, `labelposition`, `helptext`, `helpposition` |
| `textSize`, `textFamily`, `textColor` | `fontSize`/`fontsize`, `fontFamily`/`fontfamily`, `fontColor`/`fontcolor` |
| `choicesEntries`, `choicesLanguageValues`, `choicesLanguageTexts` | `choices`, `choicesvalues`, `choicestexts` |
| `buttonCode`, `buttonSize`, `buttonDesign` | `onPress`/`onpress`, `buttonsize`, `buttondesign` |
| `numberMinValue`, `numberMaxValue`, `numberStepChange` | `min`, `max`, `step` |
| `boxDesign`, `boxHeader` | `boxdesign`, `boxheader` |
| `columnsWidths`, `columnsPadding` | `columnswidths`, `columnspadding` |
| `tabsNames`, `tabsSelected` | `tabsnames`, `tabscurrent` |
| `progressBarColor`, `progressBarDescription` | `progresscolor`, `progressdescription` |
| `graphVariable`, `graphWidth`, `graphHeight` | `graph`, `graphwidth`, `graphheight` |
| `repeaterCode`, `repeaterTimeMS` | `intervalcode`, `intervaltime` |
| `gridType`, `gridHeight`, `gridColumns`, `gridRows`, `gridColumnsCount`, `gridRowsCount`, `gridStylingRules` | `gridtype`, `gridheight`, `gridcolumns`, `gridrows`, `gridnbcolumns`, `gridnbrows`, `gridstylingrules` |

## `rpgm.*`: app utilities

| Function | Description |
|----------|-------------|
| `rpgm.step(file, stepId)` | Reference to a step (see above). |
| `rpgm.setNextSequence(step)` | Jump to this step after the current one (loops, multi-path navigation). |
| `rpgm.outputFile(filename)` | Absolute path in the execution output folder. **Write generated files here.** |
| `rpgm.outputFileURL(filename)` | URL of an output file (to display it in an image/iframe widget or from JavaScript). |
| `rpgm.pgmFilePath(filename)` | Absolute path of a file of the project folder. |
| `rpgm.programFileURL(filename)` | URL of a file of the project folder. |
| `rpgm.addToEndScreen(path)` | List a file on the final screen so the user can open/download it. |
| `rpgm.open(file)` | Open a file (Apleno Client) or open/download it (Apleno Server). The file must be in the output or project folder. |
| `rpgm.notification(type, message, duration = 5000)` | Toast, `type` = `"error"`, `"info"` or `"success"`; `message` can be HTML. |
| `rpgm.playSound(sound = "error")` | `"success"` or `"error"`. |
| `rpgm.sendToClipboard(value)` | Copy to the user's clipboard. R: `headers = TRUE` includes a data frame's headers. Needs HTTPS on Apleno Server. |
| `rpgm.sendEmail(to, subject, text = "", html = "", cc = "", bcc = "", attachments, replyto = "")` | Apleno Server only. `attachments` is a list of `list(filename = "report.pdf", path = rpgm.outputFile("report.pdf"))`. |
| `rpgm.sendToJavascript(message, value)` | Send a message to the app's custom JavaScript (see javascript.md). |
| `rpgm.on(event, callback)` / `rpgm.off(event, callback)` | Events: `"didReceiveMessage"` (message from JavaScript or the other language, callback `function(message, data)`), `"didUserConnect"`, `"didUserInitialized"`. |
| `rpgm.quit()` | Stop the app. |
| `rpgm.isServer()`, `rpgm.version()`, `rpgm.appVersion()`, `rpgm.userName()`, `rpgm.userEmail()` | Environment information (documented, not defined in every runtime version: check before relying on them). |
| R only: `rpgm.sendToPython(name, value)`, `rpgm.executeInPython(code)` | Create a Python variable / run Python code. |
| Python only: `rpgm.sendToR(name, value)`, `rpgm.executeInR(code)` | Create an R variable / run R code. |

## `script.*`

`script.setProgress(show, progress, message)`: show (`show = TRUE`) or hide a progress bar while a script step runs; `progress` is 0-100.

```r
script.setProgress(TRUE, 60, "Exporting to csv format...")
```

## Excel

R only, on Windows: see xlsx.md.
