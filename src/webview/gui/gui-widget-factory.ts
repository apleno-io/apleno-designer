import { GUIWidget } from "../../common/gui";
import { Sanitizer } from "../../common/utils/sanitize";

enum WidgetCSSType {
  STYLE,
  CLASS
}

interface WidgetCSS {
  hasStyle: boolean;
  fullHTMLTag: string;
  styleContent: string;
  classContent: string;
  type: WidgetCSSType;
}

export const WidgetFactory = new class {
  public getWidgetHTML(widget: GUIWidget, includeParentHTML: boolean = true): string {
    // Content
    const widgetContent = this.getContent(widget);

    // Labels & help text
    const marginTopStyleTag: string = ` style="margin-top: ${widget.data.marginTop}px"`;
    const labelHelp: string = widget.data.helpText && widget.data.helpText.length > 0 && widget.data.helpPosition === 'label' ? `<i class="fa-solid fa-circle-info" title="${Sanitizer.xssContent(widget.data.helpText)}"></i> ` : '';
    const label: string = `${labelHelp}${widget.data.labelText}${widget.data.isRequired ? '*' : ''}`;
    let result: string = '';

    // Label
    if (widget.data.labelPosition === 'hidden') {
      result = `
        <div${marginTopStyleTag}>
            ${widgetContent}
        </div>`;
    }
    else if (widget.data.labelPosition === 'top') {
      result = `
        <div class="pgm-widget-label-top"${marginTopStyleTag}>
            ${label}
        </div>
        ${widgetContent}`;
    }
    else if (widget.data.labelPosition === 'topaligned') {
      result = `
        <div class="pgm-row"${marginTopStyleTag}>
            <div class="pgm-col-2 pgm-col-padding-right"></div>
            <div class="pgm-col-10">
                <div class="pgm-widget-label-top">${label}</div>
                ${widgetContent}
            </div>
        </div>`;
    }
    else {
      result = `
        <div class="pgm-row"${marginTopStyleTag}>
            <div class="pgm-col-2 pgm-col-padding-right pgm-widget-label-right">${label}</div>
            <div class="pgm-col-10">${widgetContent}</div>
        </div>`;
    }

    // Help text
    if (widget.data.helpText && widget.data.helpText.length > 0 && widget.data.helpPosition !== 'label') {
      if (widget.data.labelPosition === 'topaligned' || widget.data.labelPosition === 'left') {
        result += `
            <div class="pgm-row pgm-widget-help">
                <div class="pgm-col-2 pgm-col-padding-right"></div>
                <div class="pgm-col-10">${widget.data.helpText}</div>
            </div>`;
      }
      else {
        result += `<div class="pgm-widget-help">${widget.data.helpText}</div>`;
      }
    }

    return includeParentHTML ? `<div data-widget-id="${widget.id}">${result}</div>` : result;
  }

  private getWidgetCSS(widgetCSS: string): WidgetCSS {
    const result: WidgetCSS = {
      hasStyle: false,
      fullHTMLTag: '',
      styleContent: '',
      classContent: '',
      type: WidgetCSSType.STYLE
    };
    if (typeof widgetCSS === 'string' && widgetCSS.length > 0) {
      result.hasStyle = true;
      if (widgetCSS.indexOf(':') > -1) {
        result.styleContent = widgetCSS;
        result.fullHTMLTag = `style="${result.styleContent}"`;
      }
      else {
        result.classContent = widgetCSS;
        result.fullHTMLTag = `class="${result.classContent}"`;
        result.type = WidgetCSSType.CLASS;
      }
    }
    return result;
  }

  private getContent(el: GUIWidget) {
    let html = '';
    let val = Sanitizer.xssContent(el.data.value);

    // CSS
    const css = this.getWidgetCSS(el.data?.css || '');

    if (el.type === 'label') {
      val = `${el.data.value}`.replace(/(?:\r)?\n/g, '<br />');
      if (val.length === 0) {
        val = '<i>No value</i>';
      }
      let style: string = `color: ${el.data.textColor}; font-size: ${el.data.textSize}px`;
      if (el.data.textFamily !== 'default') {
        style += `; font-family: ${el.data.textFamily}`;
      }
      if (css.hasStyle && css.type === WidgetCSSType.STYLE) {
        html = `<div style="${style};${css.styleContent}" class="pgm-widget-label">${val}</div>`;
      }
      else if (css.hasStyle) {
        html = `<div style="${style}" class="pgm-widget-label ${css.classContent}">${val}</div>`;
      }
      else {
        html = `<div style="${style}" class="pgm-widget-label">${val}</div>`;
      }
    }
    else if (el.type === 'image') {
      html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''} src=""/>`;
    }
    else if (el.type === 'iframe') {
      html = `<img class="pgm-widget-iframe ${css.classContent}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''} src=""></iframe>`;
    }
    else if (el.type === 'table') {
      html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''} src=""/>`;
    }
    else if (el.type === 'text') {
      if (el.data.subType && ['text', 'password'].includes(el.data.subType)) {
        html = `<input type="${el.data.subType === 'text' ? 'text' : 'password'}" class="pgm-widget-input ${css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : ''}" value="${val}"${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}/>`;
      }
      else {
        html = `<textarea class="pgm-widget-input ${css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : ''}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}  rows="5">${val}</textarea>`;
      }
    }
    else if (el.type === 'number') {
      const cssStyle: string = css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : '';
      const cssClass: string = css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : '';
      const min: string = `${el.data.numberMinValue}`.length > 0 ? ` min="${el.data.numberMinValue}"` : '';
      const max: string = `${el.data.numberMaxValue}`.length > 0 ? ` max="${el.data.numberMaxValue}"` : '';
      const step: string = `${el.data.numberStepChange}`.length > 0 ? ` step="${el.data.numberStepChange}"` : ' step="any"';
      let val: number | string = parseFloat(el.data.value);
      if (isNaN(val)) {
        val = '';
      }
      if (el.data.subType === 'slider') {
        html = `<input class="pgm-widget-input ${cssClass}" type="range"${min}${max}${step}${cssStyle} value="${val}"/>`;
      }
      else {
        html = `<input class="pgm-widget-input ${cssClass}" type="number"${min}${max}${step}${cssStyle} value="${val}"/>`;
      }
    }
    else if (el.type === 'path') {
      html = `
        <div class="pgm-row pgm-widget-path ${css.classContent}" style="${css.styleContent}">
            <div class="pgm-col-10">
                <input type="text" class="pgm-widget-input pgm-widget-path-input" value="${val}"/>
            </div>
            <div class="pgm-col-2 pgm-col-padding-left">
                <button class="pgm-button pgm-button-form pgm-button-primary pgm-widget-path-button">Browse...</button>
            </div>
        </div>`;
    }
    else if (el.type === 'select') {
      // Sanitize value
      if (el.data.value === null) {
        el.data.value = '';
      }
      if ((el.data.subType === 'multiselect' || el.data.subType === 'multicheckboxes') && !Array.isArray(el.data.value)) {
        el.data.value = `${el.data.value}`.split(',').map((x: string) => x.trim());
      }
      if (el.data.subType === 'select' || el.data.subType === 'radio') {
        el.data.value = `${el.data.value}`;
      }

      // Create
      if (el.data.subType === 'radio' || el.data.subType === 'multicheckboxes') {
        const type: string = el.data.subType === 'radio' ? 'radio' : 'checkbox';
        html = el.data.choicesEntries ? el.data.choicesEntries.map((x: any) => {
          const selected: boolean = Array.isArray(el.data.value) ? el.data.value.includes(`${x.value}`) : `${x.value}` === el.data.value;
          return `
                <div class="${css.classContent}" style="${css.styleContent}">
                    <label><input type="${type}" name="pgm-widget-${type}-${el.id}" value="${Sanitizer.xssContent(x.value)}"${selected ? ' checked' : ''}/> ${x.text}</label>
                </div>`;
        }).join('\r') : '';
      }
      else if (el.data.subType === 'select' || el.data.subType === 'multiselect') {
        html = `<select class="pgm-widget-input ${css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : ''}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''} ${el.data.subType === 'multiselect' ? 'multiple' : ''}>${el.data.choicesEntries?.map((x: any) => {
          const selected: boolean = Array.isArray(el.data.value) ? el.data.value.includes(`${x.value}`) : `${x.value}` === el.data.value;
          return `<option value="${Sanitizer.xssAttribute(x.value)}" title="${Sanitizer.xssAttribute(x.text)}"${selected ? ' selected' : ''}>${Sanitizer.xssContent(x.text)}</option>`;
        }).join('\r')}</select>`;
      }
    }
    else if (el.type === 'onoff') {
      const checked: string = el.data.value ? 'checked' : '';
      if (el.data.subType === 'checkbox') {
        html = `<input type="checkbox" class="pgm-widget-checkbox ${css.classContent}" style="${css.styleContent}" ${checked}/>`;
      }
      else {
        html = `<label class="pgm-widget-switch ${css.classContent}" style="${css.styleContent}"><input type="checkbox" ${checked}/><span class="pgm-widget-switch-slider"></span></label>`;
      }
    }
    else if (el.type === 'button') {
      if (val.length === 0) {
        val = `<i>No value</i>`;
      }
      html = `<button class="pgm-button pgm-button-${el.data.buttonDesign} pgm-button-${el.data.buttonSize} ${css.type === WidgetCSSType.CLASS ? css.classContent : ''}"${css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}>${val}</button>`;
    }
    else if (el.type === 'date') {
      html = `<input type="date" class="pgm-widget-input ${css.classContent}" value="${Sanitizer.xssContent(el.data.value)}"${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}/>`;
    }
    else if (el.type === 'grid') {
      html = `<img class="pgm-widget-image ${css.classContent}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''} src=""/>`;
    }
    else if (el.type === 'graph') {
      html = `<div class="pgm-widget-graph ${css.classContent}" style="margin: 0 auto; width: ${el.data.graphWidth}%; height: ${el.data.graphHeight}px ${css.styleContent}"></div>`;
    }
    else if (el.type === 'box' && el.widgets) {
      let subhtml = '';
      el.widgets.forEach((e: GUIWidget) => {
        subhtml += this.getWidgetHTML(e);
      });
      if (el.widgets.length === 0) {
        subhtml = '<div class="pgm-emptycontainer" data-index="0"></div>';
      }

      const header: string = `<div class="pgm-widget-box-header${el.data.boxHeader && el.data.boxHeader.length === 0 ? ' pgm-widget-box-header-none' : ''}" data-pgm-box-header="${el.id}">${el.data.boxHeader}</div>`;
      const widgetHTML: string[] = [`<div data-pgm-box="${el.id}" class="pgm-widget-box pgm-widget-box-${el.data.boxDesign} `];
      if (css.hasStyle && css.type === WidgetCSSType.CLASS) {
        widgetHTML.push(`${css.classContent}"`);
      }
      else if (css.hasStyle) {
        widgetHTML.push(`" ${css.fullHTMLTag}`);
      }
      else {
        widgetHTML.push(`"`);
      }
      widgetHTML.push(`>${header}${subhtml}</div>`);
      html = widgetHTML.join('');
    }
    else if (el.type === 'columns' && el.widgets) {
      const padding: string = ` style="padding-left: ${el.data.columnsPadding}px"`;
      const content: string[] = [];
      for (let i = 0; i < (el.data.columnsWidths as number[]).length; ++i) {
        const width = el.data.columnsWidths && el.data.columnsWidths.length > i ? el.data.columnsWidths[i] : '1';
        content.push(`
          <div class="pgm-widget-column pgm-widget-column-${width}"${i > 0 ? padding : ''} data-columns="${el.id}" data-column="${i}">
            ${i < el.widgets.length ? this.getWidgetHTML(el.widgets[i]) : `<div class="pgm-emptycontainer" data-index="${i}"></div>`}
          </div>`);
      }
      html = `
        <div class="pgm-widget-columns ${css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : ''}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}>
            ${content.join('')}
        </div>`;
    }
    else if (el.type === 'tabs' && el.widgets) {
      const tabs: string[] = [];
      const content: string[] = [];
      let currentTabIndex = parseInt(`${el.data.tabsSelected}`) || 0;
      currentTabIndex = isNaN(currentTabIndex) || currentTabIndex >= el.widgets.length ? 0 : currentTabIndex;

      const max = Math.max(el.widgets.length, el.data.tabsNames.length);
      for (let i = 0; i < max; ++i) {
        const label: string = i < el.data.tabsNames.length ? el.data.tabsNames[i] : `#${i}`;
        const isCurrent = i === currentTabIndex;
        tabs.push(`<div class="pgm-widget-tab${isCurrent ? ' pgm-widget-tab-selected' : ''}" data-tabs="${el.id}" data-tab="${i}">${label}</div>`);
        content.push(`<div class="pgm-widget-tab-content" style="display: ${isCurrent ? 'block' : 'none'}" data-tabs="${el.id}" data-tab="${i}">${i < el.widgets.length ? this.getWidgetHTML(el.widgets[i]) : `<div class="pgm-emptycontainer" data-index="${i}"></div>`}</div>`);
      }

      html = `
      <div class="pgm-widget-tabs-container ${css.hasStyle && css.type === WidgetCSSType.CLASS ? css.classContent : ''}" ${css.hasStyle && css.type === WidgetCSSType.STYLE ? css.fullHTMLTag : ''}>
        <div class="pgm-widget-tabs">${tabs.join('')}</div>
        <div class="pgm-widget-tabs-contents">${content.join('')}</div>
      </div>`;
    }
    else if (el.type === 'progress') {
      const cssClassTag: string = css.hasStyle && css.type === WidgetCSSType.STYLE ? ` ${css.fullHTMLTag}` : '';

      let perp: any = parseInt(`${el.data.value}`);
      if (el.data.language === true || isNaN(perp)) {
        perp = 50;
      }
      perp = Math.max(Math.min(100, perp), 0);

      let desc: string = el.data.progressBarDescription === '%' ? `${perp}%` : (el.data.progressBarDescription || '');
      if (desc.length < 1) {
        desc = '&nbsp;';
      }

      if (el.data.subType === 'progressbar') {
        html = `
            <div class="pgm-widget-progressbar ${css.classContent}"${cssClassTag}>
                <div class="pgm-widget-progressbar-inner" style="background-color: ${el.data.progressBarColor}; width: ${perp}%; color: ${this.contrastColor(el.data.progressBarColor || '#2980b9')}">${desc}</div>
            </div>`;
      }
      else {
        const circ: number = 52 * 2 * Math.PI;
        html = `
            <svg width="120" height="120"${css.fullHTMLTag}>
                <text x="50%" y="51%" font-family="Verdana" font-size="20" fill="#777777" dominant-baseline="middle" text-anchor="middle">${desc}</text>
                <circle class="pgm-widget-progresscircle" stroke="${el.data.progressBarColor}" stroke-width="6" stroke-dasharray="${circ} ${circ}" stroke-dashoffset="${circ - perp / 100 * circ}" fill="transparent" r="52" cx="60" cy="60"/>
            </svg>`;
      }
    }
    else if (el.type === 'interval') {
      // must exists in dom for placing widget editor
      html = `<div class="pgm-widget-interval>Interval widget</div>`;
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