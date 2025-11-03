"use strict";
(() => {
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

  // src/webview/gui/gui-widget-factory.ts
  var WidgetFactory = new class {
    getWidgetHTML(widget) {
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
      return `<div id="${widget.id}" data-id="${widget.id}">${result}</div>`;
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
          html = el.data.choicesEntries.map((x) => {
            const selected = Array.isArray(el.data.value) ? el.data.value.includes(`${x.value}`) : `${x.value}` === el.data.value;
            return `
                <div class="${css.classContent}" style="${css.styleContent}">
                    <label><input type="${type}" name="pgm-widget-${type}-${el.id}" value="${Sanitizer.xssContent(x.value)}"${selected ? " checked" : ""}/> ${x.text}</label>
                </div>`;
          }).join("\r");
        } else if (el.data.subType === "select" || el.data.subType === "multiselect") {
          html = `<select class="pgm-widget-input ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""} ${el.data.subType === "multiselect" ? "multiple" : ""}>${el.data.choicesEntries.map((x) => {
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
        for (let i = 0; i < el.widgets.length; ++i) {
          const label = i < el.data.tabsNames.length ? el.data.tabsNames[i] : `#${i}`;
          const isCurrent = i === (el.data.tabsSelected || 0);
          tabs.push(`<div class="pgm-widget-tab${isCurrent ? " pgm-widget-tab-selected" : ""}" data-tabs="${el.id}" data-tab="${i}">${label}</div>`);
          content.push(`<div class="pgm-widget-tab-content" style="display: ${isCurrent ? "block" : "none"}" data-tabs="${el.id}" data-tab="${i}">${el.widgets[i]}</div>`);
        }
        html = `
      <div class="pgm-widget-tabs-container ${css.hasStyle && css.type === 1 /* CLASS */ ? css.classContent : ""}" ${css.hasStyle && css.type === 0 /* STYLE */ ? css.fullHTMLTag : ""}>
        <div class="pgm-widget-tabs">${tabs.join("")}</div>
        <div class="pgm-widget-tabs-contents">${content.join("")}</div>
      </div>`;
      } else if (el.type === "progress") {
        const cssClassTag = css.hasStyle && css.type === 0 /* STYLE */ ? ` ${css.fullHTMLTag}` : "";
        let perp = el.data.value;
        if (typeof perp === "string" || perp === null || isNaN(perp)) {
          perp = 0;
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
  var gui_default = '<html>\r\n\r\n<head>\r\n\r\n</head>\r\n\r\n<body>\r\n  <div id="gui">\r\n    <div id="gui-add"></div>\r\n    <div id="gui-preview"></div>\r\n    <div id="gui-propeditor">\r\n      <div class="prop">\r\n        <label for="prop-id">ID</label>\r\n        <input type="text" id="prop-id" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-css">Custom CSS</label>\r\n        <input type="text" id="prop-css" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-label">Label</label>\r\n        <input type="text" id="prop-label" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-labelpos">Label position</label>\r\n        <select id="prop-labelpos">\r\n          <option value="left">Left</option>\r\n          <option value="top">Top</option>\r\n          <option value="topaligned">Top (aligned)</option>\r\n          <option value="hidden">Hidden</option>\r\n        </select>\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-margintop">Margin top</label>\r\n        <input type="number" id="prop-margintop" min="0" max="1000" value="10" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-helptext">Help text</label>\r\n        <input type="text" id="prop-helptext" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-helppos">Help text position</label>\r\n        <select id="prop-helppos">\r\n          <option value="bottom">Bottom</option>\r\n          <option value="label">After label in icon</option>\r\n        </select>\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-subtype">Widget subtype</label>\r\n        <select id="prop-subtype"></select>\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-value">Value</label>\r\n        <input type="text" id="prop-value" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <input type="checkbox" id="prop-iscode"> <label for="prop-iscode">Value is expression code</label>\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-onchange">Code on change</label>\r\n        <input type="text" id="prop-onchange" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <label for="prop-condition">Validation expression code</label>\r\n        <input type="text" id="prop-condition" value="" />\r\n      </div>\r\n      <div class="prop">\r\n        <input type="checkbox" id="prop-required"> <label for="prop-required">A value is required to submit</label>\r\n      </div>\r\n      <div class="prop" data-widgets="tabs">\r\n        <label>Tabs</label>\r\n        <button id="prop-tabs-add">Add tab</button>\r\n        <div id="prop-tabs"></div>\r\n      </div>\r\n      <div class="prop" data-widgets="columns">\r\n        <label>Columns</label>\r\n        <button id="prop-columns-add">Add column</button>\r\n        <div id="prop-columns"></div>\r\n      </div>\r\n      <div class="prop" data-widgets="box">\r\n        <label for="prop-box-header">Box header text</label>\r\n        <input type="text" id="prop-box-header" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="box">\r\n        <label for="prop-box-style">Box style</label>\r\n        <select id="prop-box-style">\r\n          <option value="primary">Primary (blue)</option>\r\n          <option value="secondary">Secondary (gray)</option>\r\n          <option value="success">Success (green)</option>\r\n          <option value="warning">Warning (yellow)</option>\r\n          <option value="danger">Danger (red)</option>\r\n          <option value="info">Info (teal)</option>\r\n          <option value="light">Light</option>\r\n          <option value="dark">Dark</option>\r\n          <option value="none">None (invisible)</option>\r\n        </select>\r\n      </div>\r\n      <div class="prop" data-widgets="choices">\r\n        <label>Choices</label>\r\n        <button id="prop-choices-add">Add choice</button>\r\n        <div id="prop-choices"></div>\r\n      </div>\r\n      <div class="prop" data-widgets="choices">\r\n        <label for="prop-choices-values">Choices values variable</label>\r\n        <input type="text" id="prop-choices-values" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="choices">\r\n        <label for="prop-choices-labels">Choices labels variable</label>\r\n        <input type="text" id="prop-choices-labels" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="progress">\r\n        <label for="prop-progress-color">Progress color</label>\r\n        <input type="color" id="prop-progress-color" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="progress">\r\n        <label for="prop-progress-label">Progress label</label>\r\n        <input type="input" id="prop-progress-label" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="number">\r\n        <label for="prop-number-min">Min number</label>\r\n        <input type="number" id="prop-number-min" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="number">\r\n        <label for="prop-number-max">Max number</label>\r\n        <input type="number" id="prop-number-max" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="number">\r\n        <label for="prop-number-step">Step</label>\r\n        <input type="number" id="prop-number-step" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="interval">\r\n        <label for="prop-interval-code">Interval code</label>\r\n        <input type="text" id="prop-interval-code" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="interval">\r\n        <label for="prop-interval-time">Interval time in seconds</label>\r\n        <input type="number" min="10" step="1" id="prop-interval-time" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="graph">\r\n        <label for="prop-graph-width">Width (%)</label>\r\n        <input type="number" min="1" max="100" step="1" id="prop-graph-width" value="100" />\r\n      </div>\r\n      <div class="prop" data-widgets="graph">\r\n        <label for="prop-graph-height">Height (px)</label>\r\n        <input type="number" min="50" step="1" id="prop-graph-height" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="label">\r\n        <label for="prop-label-size">Font size (px)</label>\r\n        <input type="number" min="5" step="1" id="prop-label-size" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="label">\r\n        <label for="prop-label-color">Color</label>\r\n        <input type="color" id="prop-label-color" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="label">\r\n        <label for="prop-label-family">Font family</label>\r\n        <select id="prop-label-family">\r\n          <option value="default">Default</option>\r\n          <option value="arial">Arial</option>\r\n          <option value="courier">Courier New</option>\r\n          <option value="georgia">Georgia</option>\r\n          <option value="impact">Impact</option>\r\n          <option value="times">Times New Roman</option>\r\n          <option value="trebuchet">Trebuchet MS</option>\r\n          <option value="verdana">Verdana</option>\r\n        </select>\r\n      </div>\r\n      <div class="prop" data-widgets="button">\r\n        <label for="prop-button-onpress">Code on click</label>\r\n        <input type="text" id="prop-button-color" value="" />\r\n      </div>\r\n      <div class="prop" data-widgets="button">\r\n        <label for="prop-button-style">Code on click</label>\r\n        <select id="prop-button-style">\r\n          <option value="primary">Primary (blue)</option>\r\n          <option value="secondary">Secondary (gray)</option>\r\n          <option value="success">Success (green)</option>\r\n          <option value="warning">Warning (yellow)</option>\r\n          <option value="danger">Danger (red)</option>\r\n          <option value="info">Info (teal)</option>\r\n          <option value="light">Light</option>\r\n          <option value="dark">Dark</option>\r\n          <option value="link">Link</option>\r\n          <option value="outline-primary">Outline - Primary (blue)</option>\r\n          <option value="outline-secondary">Outline - Secondary (gray)</option>\r\n          <option value="outline-success">Outline - Success (green)</option>\r\n          <option value="outline-warning">Outline - Warning (yellow)</option>\r\n          <option value="outline-danger">Outline - Danger (red)</option>\r\n          <option value="outline-info">Outline - Info (teal)</option>\r\n          <option value="outline-light">Outline - Light</option>\r\n          <option value="outline-dark">Outline - Dark</option>\r\n        </select>\r\n      </div>\r\n      <div class="prop" data-widgets="button">\r\n        <label for="prop-button-size">Code on click</label>\r\n        <select id="prop-button-size">\r\n          <option value="sm">Small</option>\r\n          <option value="md">Medium</option>\r\n          <option value="lg">Large</option>\r\n          <option value="fw">Full width</option>\r\n        </select>\r\n      </div>\r\n    </div>\r\n  </div>\r\n</body>\r\n\r\n</html>';

  // src/webview/gui/gui.ts
  var UIEditor = new class {
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
        document.getElementById("gui-preview").appendChild(iframe);
        setTimeout(() => {
          this.renderAll();
        }, 5);
      }, 0);
    }
    setState(state) {
      this.state = state;
      this.renderAll();
    }
    getState() {
      return {};
    }
    renderAll() {
      if (this.state === null) {
        return;
      }
      console.log(this.state?.widgets);
      const html = [];
      for (let i = 0; i < this.state?.widgets.length; ++i) {
        html.push(WidgetFactory.getWidgetHTML(this.state.widgets[i]));
      }
      document.querySelector("#gui-preview iframe").contentWindow.document.querySelector(".pgm-gui")?.insertAdjacentHTML("beforeend", html.join(""));
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
