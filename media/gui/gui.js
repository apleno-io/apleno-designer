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
      return `<div id="${widget.id}" data-id="${widget.id}" class="rpgm-gui-element">${this.getContent(widget)}</div>`;
    }
    isTrue(value) {
      value = `${value}`.toLowerCase().trim();
      return value === "true" || value === "1";
    }
    labelContainer(widget, html) {
      if (!("labelPosition" in widget.data)) {
        return html;
      }
      const margintop = ` style="margin-top: ${widget.data.marginTop}px"`;
      const labelhelp = widget.data.helpPosition === "label" ? `<i class="fas fa-question-circle" title="${widget.data.helpText}"></i> ` : "";
      let label = labelhelp + widget.data.labelText;
      if ("required" in widget.data && widget.data.required) {
        label = label + "*";
      }
      let result = "";
      if (widget.data.labelPosition === "hidden") {
        result = `<div${margintop}>${html}</div>`;
      } else if (widget.data.labelPosition === "top") {
        result = `<div class="rpgm-gui-labeltop"${margintop}>${label}</div>${html}`;
      } else if (widget.data.labelPosition === "topaligned") {
        result = `<div class="row"${margintop}><div class="col-2 col-padding-right"></div><div class="col-10"><div class="rpgm-gui-labeltop">${label}</div>${html}</div></div>`;
      } else {
        result = `<div class="row"${margintop}><div class="col-2 col-padding-right rpgm-gui-labelleft">${label}</div><div class="col-10">${html}</div></div>`;
      }
      if (widget.data.helpPosition !== "label") {
        if (widget.data.labelPosition === "topaligned" || widget.data.labelPosition === "left") {
          result += `<div class="row rpgm-gui-help"><div class="col-2 col-padding-right"></div><div class="col-10">${widget.data.helpText}</div></div>`;
        } else {
          result += `<div class="rpgm-gui-help">${widget.data.helpText}</div>`;
        }
      }
      return result;
    }
    getContent(el) {
      let html = "";
      let val = Sanitizer.xssContent(el.data.value);
      const css = el.data.hasOwnProperty("css") ? ' style="' + el.data.css + '"' : "";
      let container = true;
      if (el.type === "label") {
        val = el.data.value;
        if (val.length === 0) {
          val = "<i>No value</i>";
        }
        let style = `color: ${el.data.textColor}; font-size: ${el.data.textSize}px`;
        if (el.data.textFamily !== "default") {
          style += `; font-family: ${el.data.textFamily}`;
        }
        html = `<div style="${style};${el.data.css}">${val}</div>`;
      } else if (el.type === "image") {
        html = '<div class="rpgm-gui-fakewidget"><i class="far fa-image"></i></div>';
      } else if (el.type === "iframe") {
        html = '<div class="rpgm-gui-fakewidget"><i class="far fa-window-maximize"></i></div>';
      } else if (el.type === "table") {
        html = '<div class="rpgm-gui-fakewidget"><i class="fas fa-table"></i></div>';
      } else if (el.type === "text" && el.data.subType === "text") {
        html = `<input type="text"${css} value="${val}"/>`;
      } else if (el.type === "text" && el.data.subType === "password") {
        html = `<input type="password"${css} value="${val}"/>`;
      } else if (el.type === "text") {
        html = `<textarea${css}>${val}</textarea>`;
      } else if (el.type === "number" && el.data.subType !== "slider") {
        html = `<input type="text"${css}  value="${val}"/>`;
      } else if (el.type === "number") {
        html = `<input type="range" class="gui-range"${css}  value="${val}"/>`;
      } else if (el.type === "path") {
        html = `<div class="row"><div class="col-10"><input type="text"${css}  value="${val}"/></div><div class="col-2 col-padding-left"><button class="success btn-form fullwidth">Browse...</button></div></div>`;
      } else if (el.type === "select") {
        const values = val.split(",").map((x) => x.trim());
        if (el.data.subType === "radio") {
          html = el.data.choicesEntries.map((x) => `<input type="radio"${css} name="rpgm-gui-radioname-${el.id}" ${values.indexOf(x.value) > -1 ? "checked" : ""}/> ${Sanitizer.xssContent(x.text)}<br />`).join("\r");
        } else if (el.data.subType === "multicheckboxes") {
          html = el.data.choicesEntries.map((x) => `<input type="checkbox"${css} name="rpgm-gui-checkboxname-${el.id}" ${values.indexOf(x.value) > -1 ? "checked" : ""}/> ${Sanitizer.xssContent(x.text)}<br />`).join("\r");
        } else if (el.data.subType === "select") {
          html = `<select${css}>${el.data.choicesEntries.map((x) => `<option ${values.indexOf(x.value) > -1 ? "selected" : ""}>${x.text}</option>`).join("\r")}</select>`;
        } else if (el.data.subType === "multiselect") {
          html = `<select${css} multiple>${el.data.choicesEntries.map((x) => `<option ${values.indexOf(x.value) > -1 ? "selected" : ""}>${x.text}</option>`).join("\r")}</select>`;
        }
      } else if (el.type === "onoff") {
        const checked = "value" in el.data && !el.data.language && WidgetFactory.isTrue(el.data.value) ? " checked" : "";
        if (el.data.subType === "checkbox") {
          html = `<input type="checkbox"${css}${checked}/><br />`;
        } else {
          html = `<label class="rpgm-gui-switch"><input type="checkbox"${checked}><span class="rpgm-gui-slider round"></span></label>`;
        }
      } else if (el.type === "button") {
        if (val.length === 0) {
          val = `<i>No value</i>`;
        }
        html = `<button class="rpgm-gui-button rpgm-gui-button-${el.data.buttonDesign} rpgm-gui-button-${el.data.buttonDesign}"${css} >${val}</button>`;
      } else if (el.type === "date") {
        html = `<input type="date"${css}  value="${val}"/>`;
      } else if (el.type === "grid") {
        html = '<div class="rpgm-gui-fakewidget"><i class="fas fa-table"></i></div>';
      } else if (el.type === "graph") {
        html = `<div class="rpgm-gui-fakewidget" style="margin: 0 auto; width: ${el.data.graphWidth}%; height: ${el.data.graphHeight}px"><i class="fas fa-chart-bar"></i></div>`;
      } else if (el.type === "box" && el.widgets) {
        let subhtml = "";
        el.widgets.forEach((e) => {
          subhtml += this.getWidgetHTML(e);
        });
        const header = el.data.boxHeader.length > 0 ? `<div class="rpgm-gui-cardheader">${el.data.boxHeader}</div>` : "";
        html = `<div class="rpgm-gui-card rpgm-gui-card-${el.data.boxDesign}">${header}${subhtml.length === 0 ? "&nbsp;" : subhtml}</div>`;
      } else if (el.type === "columns" && el.widgets) {
        html += `<div class="row"${css}>`;
        el.widgets.forEach((e, i) => {
          if (i >= el.data.columnsWidths.length) {
            return;
          }
          const padding = i > 0 ? ` style="padding-left: ${el.data.columnsPadding}px"` : "";
          html += `<div class="col-${el.data.columnsWidths[i]}"${padding}>${this.getWidgetHTML(e)}</div>`;
        });
        html += "</div>";
      } else if (el.type === "tabs" && el.widgets) {
        html += '<div class="gui-tabs-container"' + css + '><div class="gui-tabs">';
        el.widgets.forEach((e, i) => {
          const label = i < el.data.tabsNames.length ? el.data.tabsNames[i] : "#" + i;
          const current = i === parseInt(el.data.tabsSelected) - 1 ? " gui-tab-selected" : "";
          html += `<div class="gui-tab${current}" data-tabs="${el.id}" data-tab="${i}">${label}</div>`;
        });
        html += "</div>";
        html += '<div class="gui-tabs-contents">';
        el.widgets.forEach((e, i) => {
          const current = i === parseInt(el.data.tabsSelected) - 1 ? "block" : "none";
          html += `<div class="gui-tab-content" style="display: ${current}" data-tabs="${el.id}" data-tab="${i}">${this.getWidgetHTML(e)}</div>`;
        });
        html += "</div></div>";
      } else if (el.type === "progress") {
        let perp = el.data.language ? 50 : parseInt(el.data.value);
        if (isNaN(perp)) {
          perp = 50;
        }
        if (perp > 100) {
          perp = 100;
        } else if (perp < 0) {
          perp = 0;
        }
        let desc = el.data.progressBarDescription === "%" ? `${perp}%` : el.data.progressBarDescription;
        if (desc && desc.length < 1) {
          desc = "&nbsp;";
        }
        if (el.data.subType === "progressbar") {
          html += `<div class="gui-progressbar"${css}><div class="gui-progressbar-inner" style="background-color: ${el.data.progressBarColor}; width: ${perp}%; color: ${this.contrastColor(el.data.progressBarColor)}">${desc}</div></div>`;
        } else if (el.data.subType === "progresscircle") {
          let circ = 52 * 2 * Math.PI;
          html += `<svg width="120" height="120"${css}>`;
          html += `<text x="50%" y="51%" font-family="Verdana" font-size="20" fill="#777777" dominant-baseline="middle" text-anchor="middle">${desc}</text>`;
          html += `<circle class="gui-progresscircle" stroke="${el.data.progressBarColor}" stroke-width="6" stroke-dasharray="${circ} ${circ}" stroke-dashoffset="${circ - perp / 100 * circ}" fill="transparent" r="52" cx="60" cy="60"/>`;
          html += "</svg>";
        }
      } else if (el.type === "interval") {
        html += '<div class="gui-interval"></div>';
      }
      if (container) {
        return this.labelContainer(el, html);
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
    iframeContent = null;
    inject() {
      document.body.insertAdjacentHTML("afterbegin", gui_default);
      const iframe = document.createElement("iframe");
      iframe.srcdoc = `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${window.CSP_SOURCE} blob:; style-src ${window.CSP_SOURCE}; script-src * 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
      </head>
      <body></body>
    </html>`.trim();
      setTimeout(() => {
        document.getElementById("gui-preview").appendChild(iframe);
        setTimeout(() => {
          this.iframeContent = document.querySelector("#gui-preview iframe").contentDocument;
          this.renderAll();
        }, 0);
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
      if (this.state === null || this.iframeContent === null) {
        return;
      }
      const html = [];
      for (let i = 0; i < this.state?.widgets.length; ++i) {
        html.push(WidgetFactory.getWidgetHTML(this.state.widgets[i]));
      }
      document.querySelector("#gui-preview iframe").contentWindow.document.body.innerHTML = html.join("");
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
