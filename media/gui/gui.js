"use strict";
(() => {
  // src/common/gui.ts
  function isContainerWidget(type) {
    return ["box", "columns", "tabs"].includes(type);
  }
  function getMaxId(widgets) {
    let maxId = 0;
    for (let i = 0; i < widgets.length; ++i) {
      if ("widgets" in widgets[i] && Array.isArray(widgets[i].widgets) && widgets[i].widgets.length > 0) {
        maxId = Math.max(maxId, getMaxId(widgets[i].widgets));
      }
      const parsedId = parseInt(`${widgets[i].id}`);
      maxId = Math.max(maxId, widgets[i].id !== null && !isNaN(parsedId) ? parsedId : 0);
    }
    return maxId;
  }
  function fixIds(widgets, nextId = null) {
    nextId = nextId === null ? getMaxId(widgets) + 1 : nextId;
    for (let i = 0; i < widgets.length; ++i) {
      if (widgets[i].id === null || isNaN(parseInt(`${widgets[i].id}`))) {
        widgets[i].id = nextId++;
      }
      if (Array.isArray(widgets[i].widgets) && widgets[i].widgets.length > 0) {
        nextId = fixIds(widgets[i].widgets, nextId);
      }
    }
    return nextId;
  }

  // src/extension/gui/gui-utils.ts
  var WidgetProperties = {
    label: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "textSize", "textFamily", "textColor"],
    image: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition"],
    iframe: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition"],
    table: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition"],
    text: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit"],
    number: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit", "numberMinValue", "numberMaxValue", "numberStepChange"],
    path: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit"],
    select: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit", "choicesEntries", "choicesLanguageValues", "choicesLanguageTexts"],
    onoff: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit"],
    date: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit"],
    grid: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "isRequired", "codeOnChange", "conditionOnSubmit", "gridType", "gridHeight", "gridColumns", "gridRows", "gridColumnsCount", "gridRowsCount", "gridColumnsRender", "gridRowsRender", "gridStylingRules"],
    button: ["value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "buttonCode", "buttonSize", "buttonDesign"],
    box: ["css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "boxDesign", "boxHeader"],
    columns: ["css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "columnsWidths", "columnsPadding"],
    tabs: ["css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "tabsNames", "tabsSelected"],
    graph: ["css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "graphVariable", "graphWidth", "graphHeight"],
    progress: ["subType", "value", "language", "css", "marginTop", "labelText", "labelPosition", "helpText", "helpPosition", "progressBarColor", "progressBarDescription"],
    interval: ["repeaterCode", "repeaterTimeMS"]
  };
  var WidgetSubTypes = {
    text: ["text", "textarea", "password"],
    number: ["float", "integer", "slider"],
    path: ["file", "folder"],
    select: ["select", "multiselect", "radio", "multicheckboxes"],
    onoff: ["checkbox", "switch"],
    progress: ["progressbar", "progresscircle"]
  };

  // src/common/utils/sanitize.ts
  var Sanitizer = new class {
    xssContent(input) {
      input = `${input}`.replace(/&/g, "&amp;");
      input = input.replace(/</g, "&lt;");
      input = input.replace(/>/g, "&gt;");
      input = input.replace(/"/g, "&quot;");
      input = input.replace(/'/g, "&#x27;");
      input = input.replace(/\//g, "&#x2F;");
      return input;
    }
    xssAttribute(input, quote = '"') {
      input = `${input}`;
      if (quote == '"') {
        return input.replace(/"/g, "&quot;");
      }
      return input.replace(/'/g, "&#x27;");
    }
  }();

  // src/webview/gui/gui-propeditor-choices.ts
  var WidgetChoiceEditor = class extends EventTarget {
    parent;
    values = [];
    constructor(parent) {
      super();
      this.parent = parent;
      this.parent.innerHTML = `
      <div id="choices-editor"></div>
      <button data-role="add">New option</button>
    `;
      this.parent.addEventListener("click", this.onClick.bind(this));
      this.parent.addEventListener("input", this.onChange.bind(this));
    }
    setValues(choices) {
      this.values = choices;
      this.render();
    }
    getValues() {
      return this.values;
    }
    render() {
      this.parent.querySelector("#choices-editor").innerHTML = `
      ${this.values.map((value, i) => `
        <div class="choices-editor-entry" data-entry="${i}">
          <div class="choices-editor-entry-text">
            <input type="text" data-choices="value" value="${Sanitizer.xssAttribute(value.value)}">
          </div>
          <div class="choices-editor-entry-text">
            <input type="text" data-choices="text" value="${Sanitizer.xssAttribute(value.text)}">
          </div>
          <button class="btn-transparent" data-role="up">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 15L12 9L17 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="down">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 9L12 15L17 9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="remove">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
        </div>
      `).join("")}`;
    }
    addEntry() {
      this.values.push({ value: "value", text: "Label" });
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    moveEntry(entryId, direction) {
      const newIndex = entryId + direction;
      if (newIndex < 0 || newIndex >= this.values.length) {
        return;
      }
      const temp = this.values[entryId];
      this.values[entryId] = this.values[newIndex];
      this.values[newIndex] = temp;
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    removeEntry(entryId) {
      this.values.splice(entryId, 1);
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    onClick(e) {
      const button = e.target.closest("button");
      if (button) {
        const role = button.dataset.role;
        if (role === "add") {
          this.addEntry();
          return;
        }
        const entryId = e.target.closest("[data-entry]");
        if (entryId === null) {
          return;
        }
        if (role === "up") {
          this.moveEntry(parseInt(entryId.dataset.entry), -1);
        } else if (role === "down") {
          this.moveEntry(parseInt(entryId.dataset.entry), 1);
        } else if (role === "remove") {
          this.removeEntry(parseInt(entryId.dataset.entry));
        }
      }
    }
    onChange() {
      this.values = [];
      document.querySelectorAll("#choices-editor .choices-editor-entry").forEach((el) => {
        this.values.push({
          value: el.querySelector('[data-choices="value"]').value,
          text: el.querySelector('[data-choices="text"]').value
        });
      });
      this.dispatchEvent(new CustomEvent("onDidChange"));
    }
  };

  // src/webview/gui/gui-propeditor-columns.ts
  var WidgetColumnEditor = class extends EventTarget {
    parent;
    widths = [];
    constructor(parent) {
      super();
      this.parent = parent;
      this.parent.innerHTML = `
      <div id="columns-editor"></div>
      <button data-role="add">New column</button>
    `;
      this.parent.addEventListener("click", this.onClick.bind(this));
      this.parent.addEventListener("input", this.onChange.bind(this));
    }
    setValues(widths) {
      this.widths = widths;
      this.render();
    }
    getValues() {
      return this.widths;
    }
    render() {
      this.parent.querySelector("#columns-editor").innerHTML = `
      ${this.widths.map((value, i) => `
        <div class="columns-editor-entry" data-entry="${i}">
          <div class="columns-editor-entry-text"><input type="number" min="0" max="12" value="${Sanitizer.xssAttribute(`${value}`)}"></div>
          <button class="btn-transparent" data-role="remove">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
        </div>
      `).join("")}`;
    }
    addEntry() {
      this.widths.push(1);
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    removeEntry(entryId) {
      this.widths.splice(entryId, 1);
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    onClick(e) {
      const button = e.target.closest("button");
      if (button) {
        const role = button.dataset.role;
        if (role === "add") {
          this.addEntry();
          return;
        }
        const entryId = e.target.closest("[data-entry]");
        if (entryId === null) {
          return;
        }
        if (role === "remove") {
          this.removeEntry(parseInt(entryId.dataset.entry));
        }
      }
    }
    onChange() {
      this.widths = [];
      document.querySelectorAll("#columns-editor input").forEach((el) => {
        this.widths.push(parseInt(el.value) || 0);
      });
      this.dispatchEvent(new CustomEvent("onDidChange"));
    }
  };

  // src/webview/gui/gui-propeditor-tabs.ts
  var SVG_UNSELECTED = '<svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /></svg>';
  var SVG_SELECTED = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005 .195v12.666c0 1.96 -1.537 3.56 -3.472 3.662l-.195 .005h-12.666a3.667 3.667 0 0 1 -3.662 -3.472l-.005 -.195v-12.666c0 -1.96 1.537 -3.56 3.472 -3.662l.195 -.005h12.666zm-2.626 7.293a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>';
  var WidgetTabEditor = class extends EventTarget {
    parent;
    values = [];
    selected = 0;
    constructor(parent) {
      super();
      this.parent = parent;
      this.parent.innerHTML = `
			<div id="tabs-editor"></div>
      <button data-role="add">New tab</button>
		`;
      this.parent.addEventListener("click", this.onClick.bind(this));
      this.parent.addEventListener("input", this.onChange.bind(this));
    }
    setValues(names, selectedIndex) {
      this.values = names;
      this.selected = parseInt(`${selectedIndex}`) || 0;
      this.render();
    }
    getValues() {
      return { values: this.values, selected: this.selected };
    }
    render() {
      this.parent.querySelector("#tabs-editor").innerHTML = `
			${this.values.map((value, i) => `
				<div class="tabs-editor-entry" data-entry="${i}">
          <div class="tabs-editor-entry-text"><input type="text" value="${Sanitizer.xssAttribute(value)}"></div>
          <button class="btn-transparent${this.selected === i ? " selected" : ""}" data-role="default">
            ${this.selected === i ? SVG_SELECTED : SVG_UNSELECTED}
          </button>
          <button class="btn-transparent" data-role="up">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 15L12 9L17 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="down">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 9L12 15L17 9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="remove">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
				</div>
			`).join("")}`;
    }
    addEntry() {
      this.values.push("");
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    setEntryDefault(entryId) {
      this.selected = entryId;
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    moveEntry(entryId, direction) {
      const newIndex = entryId + direction;
      if (newIndex < 0 || newIndex >= this.values.length) {
        return;
      }
      const temp = this.values[entryId];
      this.values[entryId] = this.values[newIndex];
      this.values[newIndex] = temp;
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    removeEntry(entryId) {
      this.values.splice(entryId, 1);
      this.dispatchEvent(new CustomEvent("onDidChange"));
      this.render();
    }
    onClick(e) {
      const button = e.target.closest("button");
      if (button) {
        const role = button.dataset.role;
        if (role === "add") {
          this.addEntry();
          return;
        }
        const entryId = e.target.closest("[data-entry]");
        if (entryId === null) {
          return;
        }
        if (role === "default") {
          this.setEntryDefault(parseInt(entryId.dataset.entry));
        } else if (role === "up") {
          this.moveEntry(parseInt(entryId.dataset.entry), -1);
        } else if (role === "down") {
          this.moveEntry(parseInt(entryId.dataset.entry), 1);
        } else if (role === "remove") {
          this.removeEntry(parseInt(entryId.dataset.entry));
        }
      }
    }
    onChange() {
      this.values = [];
      document.querySelectorAll("#tabs-editor input").forEach((el) => {
        this.values.push(el.value);
      });
      this.dispatchEvent(new CustomEvent("onDidChange"));
    }
  };

  // src/webview/gui/gui-propeditor.ts
  var subTypesLocalisation = {
    text: "Text",
    textarea: "Textarea",
    password: "Password",
    float: "Float",
    integer: "Integer",
    slider: "Slider",
    file: "File",
    folder: "Folder",
    select: "Select",
    multiselect: "Select (multiple)",
    radio: "Radio",
    multicheckboxes: "Checkboxes",
    checkbox: "Checkbox",
    switch: "Switch",
    progressbar: "Bar",
    progresscircle: "Circle"
  };
  var WidgetPropertyEditor = new class extends EventTarget {
    currentWidget = null;
    editorTabs = null;
    editorColumns = null;
    editorChoices = null;
    constructor() {
      super();
      this.onChange = this.onChange.bind(this);
    }
    inject() {
      this.editorTabs = new WidgetTabEditor(document.getElementById("prop-tabs"));
      this.editorTabs.addEventListener("onDidChange", this.onChange);
      this.editorColumns = new WidgetColumnEditor(document.getElementById("prop-columns"));
      this.editorColumns.addEventListener("onDidChange", this.onChange);
      this.editorChoices = new WidgetChoiceEditor(document.getElementById("prop-choices"));
      this.editorChoices.addEventListener("onDidChange", this.onChange);
      document.querySelectorAll("#gui-propeditor > .prop > input").forEach((el) => el.addEventListener("input", this.onChange));
      document.querySelectorAll("#gui-propeditor > .prop > select").forEach((el) => el.addEventListener("change", this.onChange));
    }
    /**
     * Show empty form state when no widget are selected.
     */
    setNoWidget() {
      document.getElementById("gui-propeditor-empty").style.display = "block";
      document.querySelectorAll("[data-property]").forEach((setting) => {
        setting.style.display = "none";
      });
      document.querySelectorAll("#gui-propeditor [data-widgets]").forEach((editor) => {
        editor.style.display = "none";
      });
    }
    /**
     * Display the widget settings.
     */
    setWidget(widget) {
      this.currentWidget = JSON.parse(JSON.stringify(widget));
      if (!(widget.type in WidgetProperties)) {
        this.setNoWidget();
        return;
      }
      document.getElementById("gui-propeditor-empty").style.display = "none";
      document.querySelectorAll("#gui-propeditor [data-property]").forEach((setting) => {
        const y = WidgetProperties[widget.type].includes(setting.dataset.property) || setting.dataset.property === "customId";
        setting.style.display = y ? "block" : "none";
      });
      document.querySelectorAll("#gui-propeditor [data-widgets]").forEach((editor) => {
        editor.style.display = widget.type === editor.dataset.widgets ? "block" : "none";
      });
      const subTypes = widget.type in WidgetSubTypes ? WidgetSubTypes[widget.type] : [];
      document.querySelector('[data-property="subType"] select').innerHTML = subTypes.map((s) => `<option value="${s}">${subTypesLocalisation[s]}</option>`).join("");
      setTimeout(() => {
        this.setProperty("customId", widget.customId);
        WidgetProperties[widget.type].forEach((propName) => {
          this.setProperty(propName, widget.data[propName]);
        });
        if (widget.type === "tabs" && this.editorTabs) {
          this.editorTabs.setValues(widget.data.tabsNames, widget.data.tabsSelected);
        }
        if (widget.type === "columns" && this.editorColumns) {
          this.editorColumns.setValues(widget.data.columnsWidths || []);
        }
        if (widget.type === "select" && this.editorChoices) {
          this.editorChoices.setValues(widget.data.choicesEntries || []);
        }
      }, 0);
    }
    /**
     * Get the value of a property.
     */
    getProperty(name) {
      const simpleInputs = ["customId", "css", "labelText", "labelPosition", "marginTop", "helpText", "helpPosition", "subType", "value", "codeOnChange", "conditionOnSubmit", "boxHeader", "boxDesign", "choicesLanguageValues", "choicesLanguageTexts", "progressBarColor", "progressBarDescription", "numberMinValue", "numberMaxValue", "numberStepChange", "repeaterCode", "repeaterTimeMS", "graphWidth", "graphHeight", "textSize", "textColor", "textFamily", "buttonCode", "buttonDesign", "buttonSize"];
      const simpleNumbers = ["marginTop", "numberMinValue", "numberMaxValue", "numberStepChange", "repeaterTimeMS", "graphWidth", "graphHeight", "textSize", "columnsPadding"];
      if (simpleNumbers.includes(name)) {
        return parseInt(document.querySelector(`#prop-${name}`).value);
      }
      if (simpleInputs.includes(name)) {
        return document.querySelector(`#prop-${name}`).value;
      }
      if (["language", "isRequired"].includes(name)) {
        return document.querySelector(`#prop-${name}`).checked;
      }
      if (name === "tabsNames") {
        return this.editorTabs?.getValues().values;
      } else if (name === "tabsSelected") {
        return this.editorTabs?.getValues().selected;
      } else if (name === "columnsWidths") {
        return this.editorColumns?.getValues();
      } else if (name === "choicesEntries") {
        return this.editorChoices?.getValues();
      }
      console.error("[PGUI] getProperty: Could not find " + name + " value!");
      return null;
    }
    /**
     * Set the value of a property.
     */
    setProperty(name, value) {
      const simpleInputs = ["customId", "css", "labelText", "labelPosition", "marginTop", "helpText", "helpPosition", "subType", "value", "codeOnChange", "conditionOnSubmit", "boxHeader", "boxDesign", "choicesLanguageValues", "choicesLanguageTexts", "progressBarColor", "progressBarDescription", "numberMinValue", "numberMaxValue", "numberStepChange", "repeaterCode", "repeaterTimeMS", "graphWidth", "graphHeight", "textSize", "textColor", "textFamily", "buttonCode", "buttonDesign", "buttonSize", "columnsPadding"];
      if (simpleInputs.includes(name)) {
        document.querySelector(`#prop-${name}`).value = value;
        return;
      }
      if (["language", "isRequired"].includes(name)) {
        document.querySelector(`#prop-${name}`).checked = value;
        return;
      }
      const ignoreCustom = ["tabsNames", "tabsSelected", "columnsWidths", "choicesEntries"];
      if (ignoreCustom.includes(name)) {
        return;
      }
      console.error("[PGUI] setProperty: Could not find " + name + " value!");
    }
    onChange() {
      if (this.currentWidget === null) {
        return;
      }
      this.currentWidget.customId = this.getProperty("customId");
      WidgetProperties[this.currentWidget.type].forEach((propName) => {
        this.currentWidget.data[propName] = this.getProperty(propName);
      });
      if (this.currentWidget.type === "tabs" && this.editorTabs) {
        this.currentWidget.data.tabsNames = this.editorTabs.getValues().values;
        this.currentWidget.data.tabsSelected = this.editorTabs.getValues().selected;
      }
      if (this.currentWidget.type === "columns" && this.editorColumns) {
        this.currentWidget.data.columnsWidths = this.editorColumns.getValues();
      }
      if (this.currentWidget.type === "select" && this.editorChoices) {
        this.currentWidget.data.choicesEntries = this.editorChoices.getValues();
      }
      this.dispatchEvent(new CustomEvent("onDidChange", { detail: { widget: this.currentWidget } }));
    }
  }();

  // src/webview/gui/gui-widget-factory.ts
  var WidgetFactory = new class {
    getWidgetHTML(widget, includeParentHTML = true) {
      const widgetContent = this.getContent(widget);
      const marginTopStyleTag = ` style="margin-top: ${widget.data.marginTop}px"`;
      const labelHelp = widget.data.helpText && widget.data.helpText.length > 0 && widget.data.helpPosition === "label" ? `<i class="fa-solid fa-circle-info" title="${Sanitizer.xssContent(widget.data.helpText)}"></i> ` : "";
      const label = `${labelHelp}${widget.data.labelText}${widget.data.isRequired ? "*" : ""}`;
      let result = "";
      if (widget.data.labelPosition === "hidden") {
        result = `
        <div${marginTopStyleTag}>
            ${widgetContent}
        </div>`;
      } else if (widget.data.labelPosition === "top") {
        result = `
        <div class="pgm-widget-label-top"${marginTopStyleTag}>
            ${label}
        </div>
        ${widgetContent}`;
      } else if (widget.data.labelPosition === "topaligned") {
        result = `
        <div class="pgm-row"${marginTopStyleTag}>
            <div class="pgm-col-2 pgm-col-padding-right"></div>
            <div class="pgm-col-10">
                <div class="pgm-widget-label-top">${label}</div>
                ${widgetContent}
            </div>
        </div>`;
      } else {
        result = `
        <div class="pgm-row"${marginTopStyleTag}>
            <div class="pgm-col-2 pgm-col-padding-right pgm-widget-label-right">${label}</div>
            <div class="pgm-col-10">${widgetContent}</div>
        </div>`;
      }
      if (widget.data.helpText && widget.data.helpText.length > 0 && widget.data.helpPosition !== "label") {
        if (widget.data.labelPosition === "topaligned" || widget.data.labelPosition === "left") {
          result += `
            <div class="pgm-row pgm-widget-help">
                <div class="pgm-col-2 pgm-col-padding-right"></div>
                <div class="pgm-col-10">${widget.data.helpText}</div>
            </div>`;
        } else {
          result += `<div class="pgm-widget-help">${widget.data.helpText}</div>`;
        }
      }
      return includeParentHTML ? `<div data-widget-id="${widget.id}">${result}</div>` : result;
    }
    getWidgetCSS(widgetCSS) {
      const result = {
        hasStyle: false,
        fullHTMLTag: "",
        styleContent: "",
        classContent: "",
        type: 0 /* STYLE */
      };
      if (typeof widgetCSS === "string" && widgetCSS.length > 0) {
        result.hasStyle = true;
        if (widgetCSS.indexOf(":") > -1) {
          result.styleContent = widgetCSS;
          result.fullHTMLTag = `style="${result.styleContent}"`;
        } else {
          result.classContent = widgetCSS;
          result.fullHTMLTag = `class="${result.classContent}"`;
          result.type = 1 /* CLASS */;
        }
      }
      return result;
    }
    getContent(el) {
      let html = "";
      let val = Sanitizer.xssContent(el.data.value);
      const css = this.getWidgetCSS(el.data?.css || "");
      if (el.type === "label") {
        val = `${el.data.value}`.replace(/(?:\r)?\n/g, "<br />");
        if (val.length === 0) {
          val = "<i>No value</i>";
        }
        let style = `color: ${el.data.textColor}; font-size: ${el.data.textSize}px`;
        if (el.data.textFamily !== "default") {
          style += `; font-family: ${el.data.textFamily}`;
        }
        if (css.hasStyle && css.type === 0 /* STYLE */) {
          html = `<div style="${style};${css.styleContent}" class="pgm-widget-label">${val}</div>`;
        } else if (css.hasStyle) {
          html = `<div style="${style}" class="pgm-widget-label ${css.classContent}">${val}</div>`;
        } else {
          html = `<div style="${style}" class="pgm-widget-label">${val}</div>`;
        }
      } else if (el.type === "image") {
        html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} src=""/>`;
      } else if (el.type === "iframe") {
        html = `<img class="pgm-widget-iframe ${css.classContent}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} src=""></iframe>`;
      } else if (el.type === "table") {
        html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} src=""/>`;
      } else if (el.type === "text") {
        if (el.data.subType && ["text", "password"].includes(el.data.subType)) {
          html = `<input type="${el.data.subType === "text" ? "text" : "password"}" class="pgm-widget-input ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" value="${val}"${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}/>`;
        } else {
          html = `<textarea class="pgm-widget-input ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}  rows="5">${val}</textarea>`;
        }
      } else if (el.type === "number") {
        const cssStyle = css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : "";
        const cssClass = css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : "";
        const min = `${el.data.numberMinValue}`.length > 0 ? ` min="${el.data.numberMinValue}"` : "";
        const max = `${el.data.numberMaxValue}`.length > 0 ? ` max="${el.data.numberMaxValue}"` : "";
        const step = `${el.data.numberStepChange}`.length > 0 ? ` step="${el.data.numberStepChange}"` : ' step="any"';
        let val2 = parseFloat(el.data.value);
        if (isNaN(val2)) {
          val2 = "";
        }
        if (el.data.subType === "slider") {
          html = `<input class="pgm-widget-input ${cssClass}" type="range"${min}${max}${step}${cssStyle} value="${val2}"/>`;
        } else {
          html = `<input class="pgm-widget-input ${cssClass}" type="number"${min}${max}${step}${cssStyle} value="${val2}"/>`;
        }
      } else if (el.type === "path") {
        html = `
        <div class="pgm-row pgm-widget-path ${css.classContent}" style="${css.styleContent}">
            <div class="pgm-col-10">
                <input type="text" class="pgm-widget-input pgm-widget-path-input" value="${val}"/>
            </div>
            <div class="pgm-col-2 pgm-col-padding-left">
                <button class="pgm-button pgm-button-form pgm-button-primary pgm-widget-path-button">Browse...</button>
            </div>
        </div>`;
      } else if (el.type === "select") {
        if (el.data.value === null) {
          el.data.value = "";
        }
        if ((el.data.subType === "multiselect" || el.data.subType === "multicheckboxes") && !Array.isArray(el.data.value)) {
          el.data.value = `${el.data.value}`.split(",").map((x) => x.trim());
        }
        if (el.data.subType === "select" || el.data.subType === "radio") {
          el.data.value = `${el.data.value}`;
        }
        if (el.data.subType === "radio" || el.data.subType === "multicheckboxes") {
          const type = el.data.subType === "radio" ? "radio" : "checkbox";
          html = el.data.choicesEntries ? el.data.choicesEntries.map((x) => {
            const selected = Array.isArray(el.data.value) ? el.data.value.includes(`${x.value}`) : `${x.value}` === el.data.value;
            return `
                <div class="${css.classContent}" style="${css.styleContent}">
                    <label><input type="${type}" name="pgm-widget-${type}-${el.id}" value="${Sanitizer.xssContent(x.value)}"${selected ? " checked" : ""}/> ${x.text}</label>
                </div>`;
          }).join("\r") : "";
        } else if (el.data.subType === "select" || el.data.subType === "multiselect") {
          html = `<select class="pgm-widget-input ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} ${el.data.subType === "multiselect" ? "multiple" : ""}>${el.data.choicesEntries?.map((x) => {
            const selected = Array.isArray(el.data.value) ? el.data.value.includes(`${x.value}`) : `${x.value}` === el.data.value;
            return `<option value="${Sanitizer.xssAttribute(x.value)}" title="${Sanitizer.xssAttribute(x.text)}"${selected ? " selected" : ""}>${Sanitizer.xssContent(x.text)}</option>`;
          }).join("\r")}</select>`;
        }
      } else if (el.type === "onoff") {
        const checked = el.data.value ? "checked" : "";
        if (el.data.subType === "checkbox") {
          html = `<input type="checkbox" class="pgm-widget-checkbox ${css.classContent}" style="${css.styleContent}" ${checked}/>`;
        } else {
          html = `<label class="pgm-widget-switch ${css.classContent}" style="${css.styleContent}"><input type="checkbox" ${checked}/><span class="pgm-widget-switch-slider"></span></label>`;
        }
      } else if (el.type === "button") {
        if (val.length === 0) {
          val = `<i>No value</i>`;
        }
        html = `<button class="pgm-button pgm-button-${el.data.buttonDesign} pgm-button-${el.data.buttonSize} ${css.type === 1 /* CLASS */ ? css.classContent : ""}"${css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}>${val}</button>`;
      } else if (el.type === "date") {
        html = `<input type="date" class="pgm-widget-input ${css.classContent}" value="${Sanitizer.xssContent(el.data.value)}"${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}/>`;
      } else if (el.type === "grid") {
        html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} src=""/>`;
      } else if (el.type === "graph") {
        html = `<div class="pgm-widget-graph ${css.classContent}" style="margin: 0 auto; width: ${el.data.graphWidth}%; height: ${el.data.graphHeight}px ${css.styleContent}"></div>`;
      } else if (el.type === "box" && el.widgets) {
        let subhtml = "";
        el.widgets.forEach((e) => {
          subhtml += this.getWidgetHTML(e);
        });
        const header = `<div class="pgm-widget-box-header${el.data.boxHeader && el.data.boxHeader.length === 0 ? " pgm-widget-box-header-none" : ""}" data-pgm-box-header="${el.id}">${el.data.boxHeader}</div>`;
        const widgetHTML = [`<div data-pgm-box="${el.id}" class="pgm-widget-box pgm-widget-box-${el.data.boxDesign} `];
        if (css.hasStyle && css.type === 1 /* CLASS */) {
          widgetHTML.push(`${css.classContent}"`);
        } else if (css.hasStyle) {
          widgetHTML.push(`" ${css.fullHTMLTag}`);
        } else {
          widgetHTML.push(`"`);
        }
        widgetHTML.push(`>${header}${subhtml}</div>`);
        html = widgetHTML.join("");
      } else if (el.type === "columns" && el.widgets) {
        const padding = ` style="padding-left: ${el.data.columnsPadding}px"`;
        const content = [];
        for (let i = 0; i < el.widgets.length; ++i) {
          const width = el.data.columnsWidths && el.data.columnsWidths.length > i ? el.data.columnsWidths[i] : "1";
          content.push(`<div class="pgm-widget-column pgm-widget-column-${width}"${i > 0 ? padding : ""} data-columns="${el.id}" data-column="${i}">${this.getWidgetHTML(el.widgets[i])}</div>`);
        }
        html = `
        <div class="pgm-widget-columns ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}>
            ${content.join("")}
        </div>`;
      } else if (el.type === "tabs" && el.widgets) {
        const tabs = [];
        const content = [];
        let currentTabIndex = parseInt(`${el.data.tabsSelected}`) || 0;
        currentTabIndex = isNaN(currentTabIndex) || currentTabIndex >= el.widgets.length ? 0 : currentTabIndex;
        const max = Math.max(el.widgets.length, el.data.tabsNames.length);
        for (let i = 0; i < max; ++i) {
          const label = i < el.data.tabsNames.length ? el.data.tabsNames[i] : `#${i}`;
          const isCurrent = i === currentTabIndex;
          tabs.push(`<div class="pgm-widget-tab${isCurrent ? " pgm-widget-tab-selected" : ""}" data-tabs="${el.id}" data-tab="${i}">${label}</div>`);
          content.push(`<div class="pgm-widget-tab-content" style="display: ${isCurrent ? "block" : "none"}" data-tabs="${el.id}" data-tab="${i}">${i < el.widgets.length ? this.getWidgetHTML(el.widgets[i]) : ""}</div>`);
        }
        html = `
      <div class="pgm-widget-tabs-container ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}>
        <div class="pgm-widget-tabs">${tabs.join("")}</div>
        <div class="pgm-widget-tabs-contents">${content.join("")}</div>
      </div>`;
      } else if (el.type === "progress") {
        const cssClassTag = css.hasStyle && css.type === 0 /* STYLE */ ? ` ${css.fullHTMLTag}` : "";
        let perp = parseInt(`${el.data.value}`);
        if (el.data.language === true || isNaN(perp)) {
          perp = 50;
        }
        perp = Math.max(Math.min(100, perp), 0);
        let desc = el.data.progressBarDescription === "%" ? `${perp}%` : el.data.progressBarDescription || "";
        if (desc.length < 1) {
          desc = "&nbsp;";
        }
        if (el.data.subType === "progressbar") {
          html = `
            <div class="pgm-widget-progressbar ${css.classContent}"${cssClassTag}>
                <div class="pgm-widget-progressbar-inner" style="background-color: ${el.data.progressBarColor}; width: ${perp}%; color: ${this.contrastColor(el.data.progressBarColor || "#2980b9")}">${desc}</div>
            </div>`;
        } else {
          const circ = 52 * 2 * Math.PI;
          html = `
            <svg width="120" height="120"${css.fullHTMLTag}>
                <text x="50%" y="51%" font-family="Verdana" font-size="20" fill="#777777" dominant-baseline="middle" text-anchor="middle">${desc}</text>
                <circle class="pgm-widget-progresscircle" stroke="${el.data.progressBarColor}" stroke-width="6" stroke-dasharray="${circ} ${circ}" stroke-dashoffset="${circ - perp / 100 * circ}" fill="transparent" r="52" cx="60" cy="60"/>
            </svg>`;
        }
      } else if (el.type === "interval") {
        html = `<div class="pgm-widget-interval>Interval widget</div>`;
      }
      return html;
    }
    // https://stackoverflow.com/a/3943023/7182025
    // https://stackoverflow.com/a/11508164/7182025
    contrastColor(color) {
      if (color.startsWith("#")) {
        color = color.substring(1);
      }
      const asint = parseInt(color, 16);
      const comp = [asint >> 16 & 255, asint >> 8 & 255, asint & 255];
      for (let i = 0; i < comp.length; ++i) {
        comp[i] = comp[i] / 255;
        comp[i] = comp[i] <= 0.03928 ? comp[i] / 12.92 : Math.pow((comp[i] + 0.055) / 1.055, 2.4);
      }
      const lumi = 0.2126 * comp[0] + 0.7152 * comp[1] + 0.0722 * comp[2];
      return lumi > 0.179 ? "#000000" : "#FFFFFF";
    }
  }();

  // src/webview/gui/gui.html
  var gui_default = '<html>\r\n\r\n<head>\r\n\r\n</head>\r\n\r\n<body>\r\n  <div id="gui">\r\n    <div id="gui-preview"></div>\r\n    <div id="gui-sidebar">\r\n      <div id="gui-sidebar-tabs">\r\n        <button data-tab="add">Add</button>\r\n        <button data-tab="tree">Tree</button>\r\n        <button data-tab="props">Properties</button>\r\n        <button data-tab="ui">UI</button>\r\n      </div>\r\n      <div data-tab-content="add">\r\n        <h2>Display</h2>\r\n        <button draggable="true" data-add-widget="graph">Graph</button>\r\n        <button draggable="true" data-add-widget="iframe">Iframe</button>\r\n        <button draggable="true" data-add-widget="image">Image</button>\r\n        <button draggable="true" data-add-widget="progress">Progress bar</button>\r\n        <button draggable="true" data-add-widget="table">Table</button>\r\n        <button draggable="true" data-add-widget="label">Text Display</button>\r\n        <h2>Data</h2>\r\n        <button draggable="true" data-add-widget="checkbox">Checkbox</button>\r\n        <button draggable="true" data-add-widget="date">Date</button>\r\n        <button draggable="true" data-add-widget="grid">Excel-like grid</button>\r\n        <button draggable="true" data-add-widget="number">Number</button>\r\n        <button draggable="true" data-add-widget="path">Path</button>\r\n        <button draggable="true" data-add-widget="select">Select</button>\r\n        <button draggable="true" data-add-widget="text">Text</button>\r\n        <h2>Actions</h2>\r\n        <button draggable="true" data-add-widget="button">Button</button>\r\n        <button draggable="true" data-add-widget="repeater">Code Repeater</button>\r\n        <h2>Layout</h2>\r\n        <button draggable="true" data-add-widget="columns">Columns</button>\r\n        <button draggable="true" data-add-widget="list">List</button>\r\n        <button draggable="true" data-add-widget="tabs">Tabs</button>\r\n      </div>\r\n      <div data-tab-content="tree">\r\n        Tree menu\r\n      </div>\r\n      <div data-tab-content="ui">\r\n        <div class="prop">\r\n          <label for="settings-language">Language used in UI</label>\r\n          <select id="settings-language">\r\n            <option value="r">R</option>\r\n            <option value="python">Python</option>\r\n          </select>\r\n        </div>\r\n        <div class="prop">\r\n          <label for="settings-submit">Submit button</label>\r\n          <select id="settings-submit">\r\n            <option value="visibile">Visible</option>\r\n            <option value="hidden">Hidden</option>\r\n          </select>\r\n        </div>\r\n      </div>\r\n      <div data-tab-content="props" id="gui-propeditor">\r\n        <div id="gui-propeditor-empty">Please select a widget to edit</div>\r\n        <div data-property="customId" class="prop">\r\n          <label for="prop-customId">ID</label>\r\n          <input type="text" id="prop-customId" value="" />\r\n        </div>\r\n        <div data-property="css" class="prop">\r\n          <label for="prop-css">Custom CSS</label>\r\n          <input type="text" id="prop-css" value="" />\r\n        </div>\r\n        <div data-property="labelText" class="prop">\r\n          <label for="prop-labelText">Label</label>\r\n          <input type="text" id="prop-labelText" value="" />\r\n        </div>\r\n        <div data-property="labelPosition" class="prop">\r\n          <label for="prop-labelPosition">Label position</label>\r\n          <select id="prop-labelPosition">\r\n            <option value="left">Left</option>\r\n            <option value="top">Top</option>\r\n            <option value="topaligned">Top (aligned)</option>\r\n            <option value="hidden">Hidden</option>\r\n          </select>\r\n        </div>\r\n        <div data-property="marginTop" class="prop">\r\n          <label for="prop-marginTop">Margin top</label>\r\n          <input type="number" id="prop-marginTop" min="0" max="1000" value="10" />\r\n        </div>\r\n        <div data-property="helpText" class="prop">\r\n          <label for="prop-helpText">Help text</label>\r\n          <input type="text" id="prop-helpText" value="" />\r\n        </div>\r\n        <div data-property="helpPosition" class="prop">\r\n          <label for="prop-helpPosition">Help text position</label>\r\n          <select id="prop-helpPosition">\r\n            <option value="bottom">Bottom</option>\r\n            <option value="label">After label in icon</option>\r\n          </select>\r\n        </div>\r\n        <div data-property="subType" class="prop">\r\n          <label for="prop-subType">Widget subtype</label>\r\n          <select id="prop-subType"></select>\r\n        </div>\r\n        <div data-property="value" class="prop">\r\n          <label for="prop-value">Value</label>\r\n          <input type="text" id="prop-value" value="" />\r\n        </div>\r\n        <div data-property="language" class="prop">\r\n          <label for="prop-language"><input type="checkbox" id="prop-language"> Value is expression code</label>\r\n        </div>\r\n        <div data-property="codeOnChange" class="prop">\r\n          <label for="prop-codeOnChange">Code on change</label>\r\n          <input type="text" id="prop-codeOnChange" value="" />\r\n        </div>\r\n        <div data-property="conditionOnSubmit" class="prop">\r\n          <label for="prop-conditionOnSubmit">Validation expression code</label>\r\n          <input type="text" id="prop-conditionOnSubmit" value="" />\r\n        </div>\r\n        <div data-property="isRequired" class="prop">\r\n          <label for="prop-isRequired"><input type="checkbox" id="prop-isRequired"> A value is required to\r\n            submit</label>\r\n        </div>\r\n        <div data-widgets="tabs" class="prop">\r\n          <label>Tabs</label>\r\n          <div id="prop-tabs"></div>\r\n        </div>\r\n        <div data-widgets="columns" class="prop">\r\n          <label>Columns</label>\r\n          <div id="prop-columns"></div>\r\n        </div>\r\n        <div data-property="columnsPadding" class="prop">\r\n          <label for="prop-columnsPadding">Columns padding</label>\r\n          <input type="number" id="prop-columnsPadding" min="0" max="100" value="5" />\r\n        </div>\r\n        <div data-property="boxHeader" class="prop">\r\n          <label for="prop-box-boxHeader">Box header text</label>\r\n          <input type="text" id="prop-boxHeader" value="" />\r\n        </div>\r\n        <div data-property="boxDesign" class="prop">\r\n          <label for="prop-boxDesign">Box style</label>\r\n          <select id="prop-boxDesign">\r\n            <option value="primary">Primary (blue)</option>\r\n            <option value="secondary">Secondary (gray)</option>\r\n            <option value="success">Success (green)</option>\r\n            <option value="warning">Warning (yellow)</option>\r\n            <option value="danger">Danger (red)</option>\r\n            <option value="info">Info (teal)</option>\r\n            <option value="light">Light</option>\r\n            <option value="dark">Dark</option>\r\n            <option value="none">None (invisible)</option>\r\n          </select>\r\n        </div>\r\n        <div data-widgets="select" class="prop">\r\n          <label>Options</label>\r\n          <div id="prop-choices"></div>\r\n        </div>\r\n        <div data-property="choicesLanguageValues" class="prop">\r\n          <label for="prop-choicesLanguageValues">Options values variable</label>\r\n          <input type="text" id="prop-choicesLanguageValues" value="" />\r\n        </div>\r\n        <div data-property="choicesLanguageTexts" class="prop">\r\n          <label for="prop-choicesLanguageTexts">Options labels variable</label>\r\n          <input type="text" id="prop-choicesLanguageTexts" value="" />\r\n        </div>\r\n        <div data-property="progressBarColor" class="prop">\r\n          <label for="prop-progressBarColor">Progress color</label>\r\n          <input type="color" id="prop-progressBarColor" value="" />\r\n        </div>\r\n        <div data-property="progressBarDescription" class="prop">\r\n          <label for="prop-progressBarDescription">Progress label</label>\r\n          <input type="input" id="prop-progressBarDescription" value="" />\r\n        </div>\r\n        <div data-property="numberMinValue" class="prop">\r\n          <label for="prop-numberMinValue">Min number</label>\r\n          <input type="number" id="prop-numberMinValue" value="" />\r\n        </div>\r\n        <div data-property="numberMaxValue" class="prop">\r\n          <label for="prop-numberMaxValue">Max number</label>\r\n          <input type="number" id="prop-numberMaxValue" value="" />\r\n        </div>\r\n        <div data-property="numberStepChange" class="prop">\r\n          <label for="prop-numberStepChange">Step</label>\r\n          <input type="number" id="prop-numberStepChange" value="" />\r\n        </div>\r\n        <div data-property="repeaterCode" class="prop">\r\n          <label for="prop-repeaterCode">Interval code</label>\r\n          <input type="text" id="prop-repeaterCode" value="" />\r\n        </div>\r\n        <div data-property="repeaterTimeMS" class="prop">\r\n          <label for="prop-repeaterTimeMS">Interval time in seconds</label>\r\n          <input type="number" min="10" step="1" id="prop-repeaterTimeMS" value="" />\r\n        </div>\r\n        <div data-property="graphWidth" class="prop">\r\n          <label for="prop-graphWidth">Width (%)</label>\r\n          <input type="number" min="1" max="100" step="1" id="prop-graphWidth" value="100" />\r\n        </div>\r\n        <div data-property="graphHeight" class="prop">\r\n          <label for="prop-graphHeight">Height (px)</label>\r\n          <input type="number" min="50" step="1" id="prop-graphHeight" value="" />\r\n        </div>\r\n        <div data-property="textSize" class="prop">\r\n          <label for="prop-textSize">Font size (px)</label>\r\n          <input type="number" min="5" step="1" id="prop-textSize" value="" />\r\n        </div>\r\n        <div data-property="textColor" class="prop">\r\n          <label for="prop-textColor">Color</label>\r\n          <input type="color" id="prop-textColor" value="" />\r\n        </div>\r\n        <div data-property="textFamily" class="prop">\r\n          <label for="prop-textFamily">Font family</label>\r\n          <select id="prop-textFamily">\r\n            <option value="default">Default</option>\r\n            <option value="arial">Arial</option>\r\n            <option value="courier">Courier New</option>\r\n            <option value="georgia">Georgia</option>\r\n            <option value="impact">Impact</option>\r\n            <option value="times">Times New Roman</option>\r\n            <option value="trebuchet">Trebuchet MS</option>\r\n            <option value="verdana">Verdana</option>\r\n          </select>\r\n        </div>\r\n        <div data-property="buttonCode" class="prop">\r\n          <label for="prop-buttonCode">Code on click</label>\r\n          <input type="text" id="prop-buttonCode" value="" />\r\n        </div>\r\n        <div data-property="buttonDesign" class="prop">\r\n          <label for="prop-buttonDesign">Code on click</label>\r\n          <select id="prop-buttonDesign">\r\n            <option value="primary">Primary (blue)</option>\r\n            <option value="secondary">Secondary (gray)</option>\r\n            <option value="success">Success (green)</option>\r\n            <option value="warning">Warning (yellow)</option>\r\n            <option value="danger">Danger (red)</option>\r\n            <option value="info">Info (teal)</option>\r\n            <option value="light">Light</option>\r\n            <option value="dark">Dark</option>\r\n            <option value="link">Link</option>\r\n            <option value="outline-primary">Outline - Primary (blue)</option>\r\n            <option value="outline-secondary">Outline - Secondary (gray)</option>\r\n            <option value="outline-success">Outline - Success (green)</option>\r\n            <option value="outline-warning">Outline - Warning (yellow)</option>\r\n            <option value="outline-danger">Outline - Danger (red)</option>\r\n            <option value="outline-info">Outline - Info (teal)</option>\r\n            <option value="outline-light">Outline - Light</option>\r\n            <option value="outline-dark">Outline - Dark</option>\r\n          </select>\r\n        </div>\r\n        <div data-property="buttonSize" class="prop">\r\n          <label for="prop-buttonSize">Code on click</label>\r\n          <select id="prop-buttonSize">\r\n            <option value="sm">Small</option>\r\n            <option value="md">Medium</option>\r\n            <option value="lg">Large</option>\r\n            <option value="fw">Full width</option>\r\n          </select>\r\n        </div>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</body>\r\n\r\n</html>';

  // src/webview/gui/gui.ts
  var UIEditor = new class {
    iframeReady = false;
    state = null;
    inject() {
      document.body.insertAdjacentHTML("afterbegin", gui_default);
      const iframe = document.createElement("iframe");
      iframe.srcdoc = `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${window.CSP_SOURCE} blob:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
        <style>${window.IFRAME_CSS}</style>
      </head>
      <body>
        <div class="pgm-gui"></div>
        <script>${window.IFRAME_JS}<\/script>
      </body>
    </html>`.trim();
      setTimeout(() => {
        this.setTab("props");
        document.getElementById("gui-sidebar-tabs")?.addEventListener("click", (event) => {
          const button = event.target.closest("[data-tab]");
          if (button === null) {
            return;
          }
          this.setTab(button.dataset.tab);
        });
        WidgetPropertyEditor.inject();
        WidgetPropertyEditor.setNoWidget();
        WidgetPropertyEditor.addEventListener("onDidChange", (event) => {
          const widget = JSON.parse(JSON.stringify(event.detail.widget));
          this.forEachContainers((widgets) => {
            for (let i = 0; i < widgets.length; ++i) {
              if (widgets[i].id === widget.id) {
                widgets[i] = widget;
                break;
              }
            }
          });
          this.redrawWidget(widget.id);
        });
        document.querySelectorAll('[data-tab-content="add"] button').forEach((button) => {
          button.addEventListener("dragstart", (e) => {
            e.dataTransfer?.setData("text/plain", e.target.dataset.addWidget);
          });
        });
        document.getElementById("gui-preview").appendChild(iframe);
        iframe.addEventListener("load", () => {
          window.addEventListener("message", this.handleChildMessage.bind(this));
          this.iframeReady = true;
          this.drawAll();
        });
      }, 0);
    }
    setState(state) {
      this.state = state;
      fixIds(this.state.widgets);
      this.drawAll();
    }
    getState() {
      return {};
    }
    setTab(tab) {
      document.querySelectorAll("#gui-sidebar-tabs [data-tab]").forEach((el) => {
        if (!(el instanceof HTMLElement)) {
          return;
        }
        if (el.dataset.tab === tab) {
          el.classList.add("selected");
          document.querySelector(`[data-tab-content="${el.dataset.tab}"]`).style.display = "block";
        } else {
          el.classList.remove("selected");
          document.querySelector(`[data-tab-content="${el.dataset.tab}"]`).style.display = "none";
        }
      });
    }
    drawAll() {
      if (this.state === null || !this.iframeReady) {
        return;
      }
      const html = [];
      for (let i = 0; i < this.state?.widgets.length; ++i) {
        html.push(`<div data-widget-id="${this.state.widgets[i].id}">${WidgetFactory.getWidgetHTML(this.state.widgets[i])}</div>`);
      }
      document.querySelector("#gui-preview iframe").contentWindow.document.querySelector(".pgm-gui")?.insertAdjacentHTML("beforeend", html.join(""));
    }
    redrawWidget(id) {
      if (this.state === null || !this.iframeReady) {
        return;
      }
      const widget = this.findWidget((w) => w.id === id);
      const parent = document.querySelector("#gui-preview iframe").contentWindow.document.querySelector(`[data-widget-id="${id}"]`);
      if (widget === null || parent === null) {
        return;
      }
      parent.innerHTML = WidgetFactory.getWidgetHTML(widget, false);
    }
    handleChildMessage(msg) {
      if (msg.data.type === "onDidClickWidget") {
        if (msg.data.widgetId === null) {
          WidgetPropertyEditor.setNoWidget();
          return;
        }
        const widget = this.findWidget((widget2) => {
          return widget2.id === msg.data.widgetId;
        });
        if (widget) {
          WidgetPropertyEditor.setWidget(widget);
          this.setTab("props");
        } else {
          WidgetPropertyEditor.setNoWidget();
        }
        return;
      }
      if (msg.data.type === "onDidDropWidget") {
        console.log(msg);
        console.log(JSON.stringify(msg.data.widgetType));
      }
    }
    findWidget(predicate, widgets = null) {
      if (widgets === null) {
        if (this.state === null) {
          return null;
        }
        widgets = this.state?.widgets;
      }
      for (let i = 0; i < widgets.length; ++i) {
        if (predicate(widgets[i])) {
          return widgets[i];
        }
        if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
          const subWidget = this.findWidget(predicate, widgets[i].widgets);
          if (subWidget) {
            return subWidget;
          }
        }
      }
      return null;
    }
    forEachWidget(cb, widgets = null) {
      if (widgets === null) {
        if (this.state === null) {
          return null;
        }
        widgets = this.state?.widgets;
      }
      for (let i = 0; i < widgets.length; ++i) {
        cb(widgets[i]);
        if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
          this.forEachWidget(cb, widgets[i].widgets);
        }
      }
    }
    forEachContainers(cb, widgets = null) {
      if (widgets === null) {
        if (this.state === null) {
          return null;
        }
        widgets = this.state?.widgets;
      }
      cb(widgets);
      for (let i = 0; i < widgets.length; ++i) {
        if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
          this.forEachContainers(cb, widgets[i].widgets);
        }
      }
    }
  }();
  (function() {
    UIEditor.inject();
    let initialState = {};
    let lastState = {};
    const vscode = acquireVsCodeApi();
    window.addEventListener("message", async (e) => {
      const { type, body, requestId } = e.data;
      if (type === "init") {
        initialState = structuredClone(body.untitled ? {} : body.value);
        lastState = structuredClone(initialState);
        UIEditor.setState(initialState);
      } else if (type === "update") {
        if (body.edits.length > 0) {
          UIEditor.setState(body.edits[body.edits.length - 1].state);
        } else {
          UIEditor.setState(initialState);
        }
      } else if (type === "getFileData") {
        vscode.postMessage({ type: "response", requestId, body: UIEditor.getState() });
      }
    });
    vscode.postMessage({ type: "ready" });
  })();
})();
//# sourceMappingURL=gui.js.map
