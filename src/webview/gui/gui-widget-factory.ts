import { GUIWidget } from "../../common/gui";
import { Sanitizer } from "../../common/utils/sanitize";

export const WidgetFactory = new class {
  public getWidgetHTML(widget: GUIWidget): string {
    return `<div id="${widget.id}" data-id="${widget.id}" class="rpgm-gui-element">${this.getContent(widget)}</div>`;
  }

  private isTrue(value: any): boolean {
    value = (`${value}`).toLowerCase().trim();
    return value === 'true' || value === '1';
  }

  private labelContainer(widget: GUIWidget, html: string): string {
    if (!('labelPosition' in widget.data)) {
      return html;
    }

    const margintop = ` style="margin-top: ${widget.data.marginTop}px"`;
    const labelhelp = widget.data.helpPosition === 'label' ? `<i class="fas fa-question-circle" title="${widget.data.helpText}"></i> ` : '';
    let label = labelhelp + widget.data.labelText;

    // required
    if ('required' in widget.data && widget.data.required) {
      label = label + '*';
    }

    // Layout
    let result = '';
    if (widget.data.labelPosition === 'hidden') {
      result = `<div${margintop}>${html}</div>`;
    }
    else if (widget.data.labelPosition === 'top') {
      result = `<div class="rpgm-gui-labeltop"${margintop}>${label}</div>${html}`;
    }
    else if (widget.data.labelPosition === 'topaligned') {
      result = `<div class="row"${margintop}><div class="col-2 col-padding-right"></div><div class="col-10"><div class="rpgm-gui-labeltop">${label}</div>${html}</div></div>`;
    }
    else {
      result = `<div class="row"${margintop}><div class="col-2 col-padding-right rpgm-gui-labelleft">${label}</div><div class="col-10">${html}</div></div>`;
    }

    if (widget.data.helpPosition !== 'label') {
      if (widget.data.labelPosition === 'topaligned' || widget.data.labelPosition === 'left') {
        result += `<div class="row rpgm-gui-help"><div class="col-2 col-padding-right"></div><div class="col-10">${widget.data.helpText}</div></div>`;
      }
      else {
        result += `<div class="rpgm-gui-help">${widget.data.helpText}</div>`;
      }
    }

    return result;
  }

  private getContent(el: GUIWidget) {
    let html = '';
    let val = Sanitizer.xssContent(el.data.value);
    const css = el.data.hasOwnProperty('css') ? ' style="' + el.data.css + '"' : '';
    let container = true;

    if (el.type === 'label') {
      val = el.data.value;
      if (val.length === 0) {
        val = '<i>No value</i>';
      }
      let style = `color: ${el.data.textColor}; font-size: ${el.data.textSize}px`;
      if (el.data.textFamily !== 'default') {
        style += `; font-family: ${el.data.textFamily}`;
      }
      html = `<div style="${style};${el.data.css}">${val}</div>`;
    }
    else if (el.type === 'image') {
      html = '<div class="rpgm-gui-fakewidget"><i class="far fa-image"></i></div>';
    }
    else if (el.type === 'iframe') {
      html = '<div class="rpgm-gui-fakewidget"><i class="far fa-window-maximize"></i></div>';
    }
    else if (el.type === 'table') {
      html = '<div class="rpgm-gui-fakewidget"><i class="fas fa-table"></i></div>';
    }
    else if (el.type === 'text' && el.data.subType === 'text') {
      html = `<input type="text"${css} value="${val}"/>`;
    }
    else if (el.type === 'text' && el.data.subType === 'password') {
      html = `<input type="password"${css} value="${val}"/>`;
    }
    else if (el.type === 'text') {
      html = `<textarea${css}>${val}</textarea>`;
    }
    else if (el.type === 'number' && el.data.subType !== 'slider') {
      html = `<input type="text"${css}  value="${val}"/>`;
    }
    else if (el.type === 'number') {
      html = `<input type="range" class="gui-range"${css}  value="${val}"/>`;
    }
    else if (el.type === 'path') {
      html = `<div class="row"><div class="col-10"><input type="text"${css}  value="${val}"/></div><div class="col-2 col-padding-left"><button class="success btn-form fullwidth">Browse...</button></div></div>`;
    }
    else if (el.type === 'select') {
      const values = val.split(',').map(x => x.trim());
      if (el.data.subType === 'radio') {
        html = el.data.choicesEntries.map((x: any) => `<input type="radio"${css} name="rpgm-gui-radioname-${el.id}" ${values.indexOf(x.value) > -1 ? 'checked' : ''}/> ${Sanitizer.xssContent(x.text)}<br />`).join('\r');
      }
      else if (el.data.subType === 'multicheckboxes') {
        html = el.data.choicesEntries.map((x: any) => `<input type="checkbox"${css} name="rpgm-gui-checkboxname-${el.id}" ${values.indexOf(x.value) > -1 ? 'checked' : ''}/> ${Sanitizer.xssContent(x.text)}<br />`).join('\r');
      }
      else if (el.data.subType === 'select') {
        html = `<select${css}>${el.data.choicesEntries.map((x: any) => `<option ${values.indexOf(x.value) > -1 ? 'selected' : ''}>${x.text}</option>`).join('\r')}</select>`;
      }
      else if (el.data.subType === 'multiselect') {
        html = `<select${css} multiple>${el.data.choicesEntries.map((x: any) => `<option ${values.indexOf(x.value) > -1 ? 'selected' : ''}>${x.text}</option>`).join('\r')}</select>`;
      }
    }
    else if (el.type === 'onoff') {
      const checked = 'value' in el.data && !el.data.language && WidgetFactory.isTrue(el.data.value) ? ' checked' : '';
      if (el.data.subType === 'checkbox') {
        html = `<input type="checkbox"${css}${checked}/><br />`;
      }
      else {
        html = `<label class="rpgm-gui-switch"><input type="checkbox"${checked}><span class="rpgm-gui-slider round"></span></label>`;
      }
    }
    else if (el.type === 'button') {
      if (val.length === 0) {
        val = `<i>No value</i>`;
      }
      html = `<button class="rpgm-gui-button rpgm-gui-button-${el.data.buttonDesign} rpgm-gui-button-${el.data.buttonDesign}"${css} >${val}</button>`;
    }
    else if (el.type === 'date') {
      html = `<input type="date"${css}  value="${val}"/>`;
    }
    else if (el.type === 'grid') {
      html = '<div class="rpgm-gui-fakewidget"><i class="fas fa-table"></i></div>';
    }
    else if (el.type === 'graph') {
      html = `<div class="rpgm-gui-fakewidget" style="margin: 0 auto; width: ${el.data.graphWidth}%; height: ${el.data.graphHeight}px"><i class="fas fa-chart-bar"></i></div>`;
    }
    else if (el.type === 'box' && el.widgets) {
      let subhtml = '';
      el.widgets.forEach((e: GUIWidget) => {
        subhtml += this.getWidgetHTML(e);
      });
      const header = (el.data.boxHeader as any).length > 0 ? `<div class="rpgm-gui-cardheader">${el.data.boxHeader}</div>` : '';
      html = `<div class="rpgm-gui-card rpgm-gui-card-${el.data.boxDesign}">${header}${subhtml.length === 0 ? '&nbsp;' : subhtml}</div>`;
    }
    else if (el.type === 'columns' && el.widgets) {
      html += `<div class="row"${css}>`;
      el.widgets.forEach((e, i) => {
        if (i >= (el.data.columnsWidths as any).length) {
          return;
        }
        const padding = i > 0 ? ` style="padding-left: ${el.data.columnsPadding}px"` : '';
        html += `<div class="col-${(el.data.columnsWidths as any)[i]}"${padding}>${this.getWidgetHTML(e)}</div>`;
      });
      html += '</div>';
    }
    else if (el.type === 'tabs' && el.widgets) {
      html += '<div class="gui-tabs-container"' + css + '><div class="gui-tabs">';
      el.widgets.forEach((e, i) => {
        const label = i < el.data.tabsNames.length ? el.data.tabsNames[i] : '#' + i;
        const current = i === parseInt(el.data.tabsSelected as any) - 1 ? ' gui-tab-selected' : '';
        html += `<div class="gui-tab${current}" data-tabs="${el.id}" data-tab="${i}">${label}</div>`;
      });
      html += '</div>';
      html += '<div class="gui-tabs-contents">';
      el.widgets.forEach((e, i) => {
        const current = i === parseInt(el.data.tabsSelected as any) - 1 ? 'block' : 'none';
        html += `<div class="gui-tab-content" style="display: ${current}" data-tabs="${el.id}" data-tab="${i}">${this.getWidgetHTML(e)}</div>`;
      });
      html += '</div></div>';
    }
    else if (el.type === 'progress') {
      let perp = el.data.language ? 50 : parseInt(el.data.value);
      if (isNaN(perp)) {
        perp = 50;
      }
      if (perp > 100) {
        perp = 100;
      }
      else if (perp < 0) {
        perp = 0;
      }

      let desc = el.data.progressBarDescription === '%' ? `${perp}%` : el.data.progressBarDescription;
      if (desc && desc.length < 1) {
        desc = '&nbsp;';
      }

      if (el.data.subType === 'progressbar') {
        html += `<div class="gui-progressbar"${css}><div class="gui-progressbar-inner" style="background-color: ${el.data.progressBarColor}; width: ${perp}%; color: ${this.contrastColor(el.data.progressBarColor as string)}">${desc}</div></div>`;
      }
      else if (el.data.subType === 'progresscircle') {
        let circ = 52 * 2 * Math.PI;
        html += `<svg width="120" height="120"${css}>`;
        html += `<text x="50%" y="51%" font-family="Verdana" font-size="20" fill="#777777" dominant-baseline="middle" text-anchor="middle">${desc}</text>`;
        html += `<circle class="gui-progresscircle" stroke="${el.data.progressBarColor}" stroke-width="6" stroke-dasharray="${circ} ${circ}" stroke-dashoffset="${circ - perp / 100 * circ}" fill="transparent" r="52" cx="60" cy="60"/>`;
        html += '</svg>';
      }
    }
    else if (el.type === 'interval') {
      // must exists in dom for placing widget editor
      html += '<div class="gui-interval"></div>';
    }

    if (container) {
      return this.labelContainer(el, html);
    }
    return html;
  }

  // https://stackoverflow.com/a/3943023/7182025
  // https://stackoverflow.com/a/11508164/7182025
  private contrastColor(color: string): string {
    if (color.startsWith('#')) {
      color = color.substring(1);
    }
    const asint = parseInt(color, 16);
    const comp = [(asint >> 16) & 255, (asint >> 8) & 255, asint & 255];
    for (let i = 0; i < comp.length; ++i) {
      comp[i] = comp[i] / 255.0;
      comp[i] = comp[i] <= 0.03928 ? comp[i] / 12.92 : Math.pow(((comp[i] + 0.055) / 1.055), 2.4);
    }
    const lumi = 0.2126 * comp[0] + 0.7152 * comp[1] + 0.0722 * comp[2];
    return lumi > 0.179 ? '#000000' : '#FFFFFF';
  }
};