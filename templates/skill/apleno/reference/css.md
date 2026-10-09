# CSS reference

> Source: Apleno documentation (api/css). Put custom CSS in a .css file listed in the `customFiles` of the .ppro (inline CSS in the .ppro is deprecated). The `css` property of a widget takes inline declarations (if it contains `:`) or class names.

## App structure

- `#pgm` is the whole container of an Apleno Designer app;
  - `#pgm-content` is the current content of the app;
  - `#pgm-content-past` is the content while viewing a past step;
  - `.pgm-sidebar-on` and `.pgm-sidebar-off` are applied to `#pgm-content` and
    its _past_ counterpart if the sidebar is shown or hidden.

## Sidebar

- `#pgm-menu` is the sidebar container;
  - `#pgm-menu-logo` is the logo in the sidebar;
  - `#pgm-menu-title` is the title of the app in the sidebar;
  - `#pgm-menu-content` is the content of the menu;
    - `.pgm-menu-item` is a single step in the sidebar menu;
    - `.pgm-menu-item-active` is the additional class for the currently active
      step in the app;
    - `.pgm-menu-item-selected` is the additional class for the step the user is
      looking at.

## Script step

- `.pgm-script` is the main container of the whole script sequence;
  - `.pgm-script-spinner` is the rotating spinner;
  - `.pgm-script-label` is the label with the elapsed time and/or finished
    message;
  - `.pgm-script-progress` is the main container of the custom progress display;
    _ `.pgm-script-progress-bar` is the progress bar container; _
    `.pgm-script-progress-bar-inner` is the inner bar of the progress bar; \*
    `.pgm-script-progress-label` is the custom text below the progress bar.

## GUI step

- `.pgm-gui` is the container of a GUI sequence;
- `button[data-click="gui:submit"]` is the submit button of a GUI.

See the Widgets section below for widget styling.

## End step

- `.pgm-end` is the container of the whole end sequence;
  - `.pgm-end-message` is the "finished" label;
  - `.pgm-end-files` is the output file cards;
    - `.pgm-end-files-title` is the "Output files:" title;
    - `.pgm-end-files-list` is the files container;
      - `.pgm-end-file` is a single output file;
  - `.pgm-end-buttons` is the container of the restart/quit button;
    - `.pgm-end-restart` and `.pgm-end-quit` are the restart and quit button.

## Toast notifications

- `#toast` is the notifications container;
  - `.toast` is a single toast container;
  - `.toast-{type}` is the type of the notification: success, info or error.

## Widgets

For all widgets, this documentation shows the generated code. Variables like
`{custom CSS}` or `{margin top property}` are replaced by the value set in the
widget properties.

### Generic CSS

- `#pgm-widget-{{number}}` is a div containing each widget. The _number_ is
  randomly generated at runtime,
- `.pgm-widget` the class on the `#pgm-widget-{{number}}` div, containing every
  widget;
- `.pgm-widget-label-top` is the class for the label on top of a widget;
- `.pgm-widget-message` is the div containing the message below the widget, used
  for errors and language messages;
- `.pgm-widget-message-{success, warning, error}` controls the color of the
  widget's message;
- `.pgm-widget-help` is the div below a widget for the help text.

#### Widget without label

```html
<div style="margin-top: {margin top property}px">{widget}</div>
```

#### Widget with top label

```html
<div class="pgm-widget-label-top" style="margin-top: {margin top property}px">
  {label}
</div>
{widget}
```

#### Widget with top aligned label

```html
<div class="pgm-row" style="margin-top: {margin top property}px">
  <div class="pgm-col-2 pgm-col-padding-right"></div>
  <div class="pgm-col-10">
    <div class="pgm-widget-label-top">{label}</div>
    {widget}
  </div>
</div>
```

#### Widget with left label

```html
<div class="pgm-row" style="margin-top: {margin top property}px">
  <div class="pgm-col-2 pgm-col-padding-right pgm-widget-label">{label}</div>
  <div class="pgm-col-10">{widget}</div>
</div>
```

### Widget HTML

#### Button

```html
<button class="pgm-button pgm-button-{design} pgm-button-{size}" {custom CSS}>
  {value}
</button>
```

- `.pgm-button` is the design of all the buttons in the Apleno app section;
- `.pgm-button-sm` (small), `.pgm-button-md` (medium), `.pgm-button-lg` (large)
  will change the button size;
- `.pgm-button-fw` will make a block, full width button;
- `.pgm-button-form` will make a block, full width button of the same height as
  the other inputs;
- `.pgm-button-primary`, `.pgm-button-outline-primary`, `.pgm-button-info`,
  `.pgm-button-success`, `.pgm-button-warning`, `.pgm-button-danger`,
  `.pgm-button-transparent` changes the color and look of the button.

#### Container box / list

```html
<div class="pgm-widget-box pgm-widget-box-{design}" {custom CSS}>
  <div class="pgm-widget-box-header">{header}</div>
  {widgets}
</div>
```

- `.pgm-widget-box` is the main div of the box;
- `.pgm-widget-box-header` is the header part of the box list, and is omitted if
  there is no header content;
- `.pgm-widget-box-{primary, secondary, success, info, warning, danger, light, dark, none}`
  controls the look and colors of the box.

#### Container columns

```html
<div class="pgm-widget-columns" {custom CSS}>
  <div
    class="pgm-widget-column pgm-widget-column-{width}"
    data-columns="{widget internal id}"
    data-column="{column id}"
  >
    {column widgets}
  </div>
  {other columns}
</div>
```

#### Container tabs

```html
<div class="pgm-widget-tabs-container" {custom CSS}>
  <div class="pgm-widget-tabs">
    <div
      class="pgm-widget-tab pgm-widget-tab-selected"
      data-tabs="{widget internal id}"
      data-tab="{tab id}"
    >
      {tab label}
    </div>
    {other tabs headers}
  </div>
  <div class="pgm-widget-tabs-contents">
    <div
      class="pgm-widget-tab-content"
      data-tabs="{widget internal id}"
      data-tab="{tab id}"
    >
      {tab content}
    </div>
    {other tabs contents}
  </div>
</div>
```

#### Date

```html
<input type="date" class="pgm-widget-input" value="{value}" {custom CSS} />
```

#### Graph

```html
<div
  id="pgm-widget-graph-{widget internal id}"
  class="pgm-widget-graph"
  style="margin: 0 auto; width: {graph width}%; height: {graph height}px"
  {custom
  CSS}
></div>
```

#### Iframe

```html
<iframe class="pgm-widget-iframe" src="{value}" {custom CSS}></iframe>
```

#### Image

```html
<img class="pgm-widget-image" src="{value}" {custom CSS} />
```

#### Label

```html
<div class="pgm-widget-label" {custom CSS}>{value}</div>
```

#### Number

```html
<input
  class="pgm-widget-input"
  type="{range, number}"
  min="{min}"
  max="{max}"
  step="{step}"
  value="{value}"
  {custom
  CSS}
/>
```

#### On/off

##### Checkbox

```html
<input type="checkbox" class="pgm-widget-checkbox" {checked} {custom CSS} />
```

##### Switch

```html
<label class="pgm-widget-switch" {custom CSS}>
  <input type="checkbox" ${checked} />
  <span class="pgm-widget-switch-slider"></span>
</label>
```

#### Path

```html
<div class="pgm-row pgm-widget-path" {custom CSS}>
  <div class="pgm-col-10">
    <input
      type="text"
      class="pgm-widget-input pgm-widget-path-input"
      value="{value}"
    />
  </div>
  <div class="pgm-col-2 pgm-col-padding-left">
    <button
      class="pgm-button pgm-button-form pgm-button-primary pgm-widget-path-button"
    >
      Browse...
    </button>
  </div>
</div>
```

#### Progress

##### Bar

```html
<div class="pgm-widget-progressbar" {custom CSS}>
  <div
    class="pgm-widget-progressbar-inner"
    style="background-color: {color}; width: {percentage}%; color: {calculated text color}"
  >
    {description}
  </div>
</div>
```

##### Circle

```html
<svg width="120" height="120" {custom CSS}>
  <text
    x="50%"
    y="51%"
    font-family="Verdana"
    font-size="20"
    fill="#777777"
    dominant-baseline="middle"
    text-anchor="middle"
  >
    {description}
  </text>
  <circle class="pgm-widget-progresscircle" stroke="{color}" [...] />
</svg>
```

#### Select

##### Radio / Checkbox

```html
<div class="pgm-widget-label" {custom CSS}>
  <input
    type="{radio, checkbox}"
    name="pgm-widget-{radio, checkbox}-{widget internal id}"
    value="{value}"
    {checked}
  />
  {text} {other options}
</div>
```

##### Select / Multiselect

Please note that the code below is hidden and replaced with a custom widget
using [Choices JS](https://github.com/Choices-js/Choices).

```html
<select class="pgm-widget-input" {custom CSS} {multiple}>
  <option value="{value}" title="{text}" {selected}>{text}</option>
  {other options}
</select>
```

#### Text

##### Text input

```html
<input type="text" class="pgm-widget-input" value="{value}" {custom CSS} />
```

##### Textarea

```html
<textarea class="pgm-widget-input" {custom CSS} rows="5">{value}</textarea>
```

#### Grid

- `.excel-colname`, `.excel-rowname`
- `.excel-colname.excel-headerselected`, `.excel-rowname.excel-headerselected`
- `.excel-firstcelldiv` for the top left cell
- `.excel-content tr` for the rows of the content
- `.excel-cellselector` the selected cell (by default:
  `border: 2px solid #4b89ff;`)
- `.excel-rangeselector` the selected range (by default:
  `border:  1px  solid  rgb(231, 76, 60); background-color:  rgba(231, 76, 60, 0.12);`)
