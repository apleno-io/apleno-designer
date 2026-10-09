# Apleno project

This folder is an **Apleno app**: a step-by-step application with user interfaces, driven by R and/or Python scripts. It is edited in VS Code with the Apleno Designer extension and runs in Apleno Client / Apleno Server.

Full documentation: https://docs.apleno.io

## Files

| File | Role |
|------|------|
| `*.ppro` | Project manifest (one per app, at the root): name, starting sequence, display settings. |
| `*.pseq` | Sequence: the flowchart of steps (scripts, interfaces, conditions, sub-sequences). |
| `*.pgui` | Interface: a form of widgets shown to the user during a `gui` step. |
| `*.R`, `*.py` | Scripts run by `script` steps, or code referenced from interfaces. |

The **`apleno` skill**, installed by the Apleno extension in `~/.claude/skills/apleno/` (the user's home folder), has the JSON Schemas of these files, detailed references (all API functions, widget behavior, Plotly graphs, custom JavaScript/CSS, Excel, Leaflet and Handsontable modules) and complete example apps. Use it for anything beyond simple edits.

`.ppro`, `.pseq` and `.pgui` files are JSON. Their JSON Schemas, with a description of every property, are in the skill:

- `~/.claude/skills/apleno/schemas/ppro.schema.json`
- `~/.claude/skills/apleno/schemas/pseq.schema.json`
- `~/.claude/skills/apleno/schemas/pgui.schema.json`

**Before creating or editing one of these files, read its schema.** Only use properties, widget types, subtypes and enum values that the schema defines: the visual editors silently drop anything else. Write files with tab indentation, like the editors do.

The extension checks these files and reports errors in the VS Code Problems panel (source "Apleno"): fix them after editing.

## Sequences (`.pseq`)

- Exactly one `start` step. Execution follows `target` from step to step until an `end` step.
- Each step has a numeric `uuid`, unique in the file (a new step gets the highest existing uuid + 1); `target` and `falsetarget` contain uuids.
- Step `type`s: `rscript` (runs `file`, a `.R` or `.py` script; `script` is accepted as an alias), `gui` (shows `file`, a `.pgui`), `condition` (evaluates the expression `r` in `language`, `"r"` or `"python"`, then goes to `target` if true or `falsetarget` if false; the key is `r` even for Python), `sequence` (runs another `.pseq` given in `file`, then continues), `end`.
- Every step except `end` needs a `target`.
- `id` is the step identifier used from code (`rpgm.step("main", "form")`), `name` is shown to the user in the steps list. Start and end steps don't need them.
- File paths are relative to the project root.
- `x`/`y` only position the step in the visual editor: put steps on a 50-unit grid, about 150 apart vertically.
- Write only the keys meaningful for each step type:

```json
{
	"steps": [
		{ "uuid": 1, "type": "start", "x": 0, "y": 0, "target": 2 },
		{ "uuid": 2, "id": "form", "name": "Form", "type": "gui", "x": 0, "y": 150, "file": "form.pgui", "target": 3 },
		{ "uuid": 3, "id": "check", "name": "Check", "type": "condition", "x": 0, "y": 300, "r": "age >= 18", "language": "r", "target": 4, "falsetarget": 2 },
		{ "uuid": 4, "type": "end", "x": 0, "y": 450 }
	]
}
```

## Interfaces (`.pgui`)

- Top level: `language`, `submitbutton` and `elements` (the widgets). `language` (`"r"` or `"python"`) is the language of **all** code in the interface: values with `"isr": true`, `onchange`, `condition`, `onpress`, `intervalcode`.
- Each widget has an `id` (used from code, `""` if not needed), a `type`, a `data` object and, for containers, its children in `elements`.
- `data` uses the Apleno 3.x property names, all lowercase: `labeltext`, `labelposition`, `helptext`, `margintop`, `isr`, `required`, `onchange`, `condition`, `onpress`... (see the schema).
- Containers: `box` holds a vertical list of widgets. `columns` and `tabs` must have exactly one child per entry of `columnswidths` / `tabsnames`, and each child must be a `box`, usually with data `{"labelposition": "hidden", "margintop": 0, "boxdesign": "none", "boxheader": ""}`. Column widths use a 12-unit grid.
- `"isr": true` makes `value` an R/Python expression evaluated when the interface is displayed, e.g. `"value": "nrow(data)", "isr": true`.
- Each widget's value is available in R/Python as a variable named after its `id`: in the interface code while it is displayed, and in the next steps after it is submitted. Give input widgets short, valid variable names as `id` (e.g. `age`, `input_file`), unique in the file, never an R/Python built-in name (`title`, `plot`, `summary`, `c`, `t`, `sum`, `type`...).
- `graph` widgets display Plotly figures: their `graph` property is an expression returning `list(data = ..., layout = ...)` (R) or `{'data': ..., 'layout': ...}` (Python).
- With `"submitbutton": false`, the interface is a dashboard driven by buttons (`onpress`); `gui.submit()` moves to the next step.

Minimal interface:

```json
{
	"language": "r",
	"submitbutton": true,
	"elements": [
		{
			"id": "username",
			"type": "text",
			"data": { "subtype": "text", "value": "", "labeltext": "Username", "required": true }
		}
	]
}
```

## R / Python API

The functions below are predefined in every R and Python session run by Apleno. Do **not** import or `library()` anything to use them. Names are identical in R and Python (in Python, `rpgm`, `gui` and `script` are modules already present in the global scope). Use `TRUE`/`FALSE` in R and `True`/`False` in Python.

**Referencing an interface.** GUI functions take a step reference and the widget's `id`:

- `'this'` is the interface currently displayed: use it in interface code (`onpress`, `onchange`...) and in the functions it calls.
- `rpgm.step(file, stepId)` is a specific `gui` step, e.g. from a script step preparing an interface: `file` is the sequence containing the step (`"main"` or `"main.pseq"`) and `stepId` is the step's `id`.

```r
gui.hide(rpgm.step("main", "form"), "results")   # in a script step, before the interface
gui.setValue("this", "total", sum(values))        # in the interface code
```

### `gui.*`: change an interface from code

| Function | Description |
|----------|-------------|
| `gui.setValue(step, id, value)` | Set the widget value. |
| `gui.setProperty(step, id, property, value)` | Set one widget property (e.g. `value`, `labeltext`, `visible`, `enabled`). |
| `gui.setProperties(step, id, properties)` | Set several properties: a named `list()` in R, a `dict` in Python. |
| `gui.show(step, id)` / `gui.hide(step, id)` | Show / hide a widget. |
| `gui.enable(step, id)` / `gui.disable(step, id)` | Enable / disable a widget input. |
| `gui.showMessage(step, id, type, message)` | Message below a widget; `type` is `"error"`, `"warning"` or `"success"`. |
| `gui.hideMessage(step, id)` | Hide that message. |
| `gui.addChoice(step, id, value, text)` | Add one option to a `select` widget. |
| `gui.addChoices(step, id, values, texts)` | Add several options (same-length vectors/lists). |
| `gui.clearChoices(step, id)` | Remove all options. |
| `gui.removeChoice(step, id, value)` | Remove the option with this value. |
| `gui.setChoiceText(step, id, value, text)` | Change an option's text. |
| `gui.add(step, id, type, position = -1, parent = "root")` | Add a widget at runtime. |
| `gui.remove(step, id)` | Remove a widget. |
| `gui.update(step, id)` | Re-evaluate the widget's initial value expression. |
| `gui.submit(force = FALSE)` | Submit the current interface (for interfaces without a Submit button). |
| `gui.showModal(title, content)` | Show a modal dialog; `content` may be HTML. |

### `rpgm.*`: app utilities

| Function | Description |
|----------|-------------|
| `rpgm.step(file, stepId)` | Reference to a step (see above). |
| `rpgm.setNextSequence(step)` | Jump to this step after the current one. |
| `rpgm.outputFile(filename)` | Absolute path of a file in the execution output folder. **Write generated files here.** |
| `rpgm.outputFileURL(filename)` | URL of a file in the output folder (e.g. for an image or iframe widget). |
| `rpgm.pgmFilePath(filename)` | Absolute path of a file in the project folder. |
| `rpgm.programFileURL(filename)` | URL of a file in the project folder. |
| `rpgm.addToEndScreen(path)` | List a file on the final screen so the user can open/download it. |
| `rpgm.open(file)` | Open a file (Client) or download it (Server). |
| `rpgm.notification(type, message, duration = 5000)` | Toast notification; `type` is `"error"`, `"info"` or `"success"`. |
| `rpgm.playSound(sound = "error")` | Play `"success"` or `"error"`. |
| `rpgm.sendToClipboard(value)` | Copy a value to the user's clipboard (R also accepts `headers = TRUE`). |
| `rpgm.sendEmail(to, subject, text = "", html = "", cc = "", bcc = "", attachments, replyto = "")` | Send an email (Apleno Server only). |
| `rpgm.sendToJavascript(message, value)` | Send data to the custom JavaScript files of the app. |
| `rpgm.on(event, callback)` / `rpgm.off(event, callback)` | Listen to `"didReceiveMessage"`, `"didUserConnect"`, `"didUserInitialized"`. |
| `rpgm.quit()` | Stop the app. |
| R only: `rpgm.sendToPython(name, value)`, `rpgm.executeInPython(code)` | Create a Python variable / run Python code. |
| Python only: `rpgm.sendToR(name, value)`, `rpgm.executeInR(code)` | Create an R variable / run R code. |

### `script.*`

| Function | Description |
|----------|-------------|
| `script.setProgress(show, progress, message)` | Show (`show = TRUE`) or hide a progress bar during a `script` step; `progress` is 0-100. |

### Excel (R only)

`xlsx.open(file)`, then `xlsx.selectWorksheet(name)`, `xlsx.setCell("B2", value)`, `xlsx.getCells("A1:C10")`, `xlsx.addWorksheet(name)`, ... and finally `xlsx.saveAs(outputFile)`. Instructions are only applied by `xlsx.saveAs`. See https://docs.apleno.io for the full list.

## Conventions

- Scripts run with the project folder as working directory (unless the `.ppro` sets `defaultWorkingDirectory` to `"output"`): read project files with relative paths, write results with `rpgm.outputFile()`.
- Keep R/Python code in interfaces short (one expression or function call); put real logic in script files and call functions defined there.
- After editing a `.pgui`/`.pseq`, check that ids are unique and every `target` points to an existing step.
