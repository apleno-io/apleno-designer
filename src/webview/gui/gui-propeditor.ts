import { GUIWidget } from "../../common/gui";
import { WidgetProperties, WidgetSubTypes } from "../../extension/gui/gui-utils";
import { WidgetTabEditor } from "./gui-propeditor-tabs";

const subTypesLocalisation: { [key: string]: string } = {
  text: 'Text',
  textarea: 'Textarea',
  password: 'Password',
  float: 'Float',
  integer: 'Integer',
  slider: 'Slider',
  file: 'File',
  folder: 'Folder',
  select: 'Select',
  multiselect: 'Select (multiple)',
  radio: 'Radio',
  multicheckboxes: 'Checkboxes',
  checkbox: 'Checkbox',
  switch: 'Switch',
  progressbar: 'Bar',
  progresscircle: 'Circle'
};

export const WidgetPropertyEditor = new class extends EventTarget {
  private currentWidget: GUIWidget | null = null;

  private editorTabs: WidgetTabEditor | null = null;

  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
  }

  public inject() {
    this.editorTabs = new WidgetTabEditor(document.getElementById('prop-tabs') as HTMLElement);
    this.editorTabs.addEventListener('onDidChange', this.onChange);
    // Don't hook on sub-widget editors
    document.querySelectorAll('#gui-propeditor > .prop > input').forEach(el => (el as HTMLInputElement).addEventListener('input', this.onChange));
    document.querySelectorAll('#gui-propeditor > .prop > select').forEach(el => (el as HTMLInputElement).addEventListener('change', this.onChange));
  }

  /**
   * Show empty form state when no widget are selected.
   */
  public setNoWidget() {
    (document.getElementById('gui-propeditor-empty') as HTMLElement).style.display = 'block';
    document.querySelectorAll('[data-property]').forEach((setting: Element) => {
      (setting as HTMLElement).style.display = 'none';
    });
    document.querySelectorAll('#gui-propeditor [data-widgets]').forEach((editor: Element) => {
      (editor as HTMLElement).style.display = 'none';
    });
  }

  /**
   * Display the widget settings.
   */
  public setWidget(widget: GUIWidget) {
    this.currentWidget = JSON.parse(JSON.stringify(widget));

    if (!(widget.type in WidgetProperties)) {
      this.setNoWidget();
      return;
    }
    (document.getElementById('gui-propeditor-empty') as HTMLElement).style.display = 'none';

    // Visibility
    document.querySelectorAll('#gui-propeditor [data-property]').forEach((setting: Element) => {
      const y = (WidgetProperties[widget.type].includes((setting as HTMLElement).dataset.property as string)) || (setting as HTMLElement).dataset.property === 'customId';
      (setting as HTMLElement).style.display = y ? 'block' : 'none';
    });
    document.querySelectorAll('#gui-propeditor [data-widgets]').forEach((editor: Element) => {
      (editor as HTMLElement).style.display = widget.type === (editor as HTMLElement).dataset.widgets ? 'block' : 'none';
    });

    // SubTypes
    const subTypes = widget.type in WidgetSubTypes ? WidgetSubTypes[widget.type] : [];
    (document.querySelector('[data-property="subType"] select') as HTMLElement).innerHTML = subTypes.map(s => `<option value="${s}">${subTypesLocalisation[s]}</option>`).join('');

    // Values
    setTimeout(() => {
      this.setProperty('customId', widget.customId);

      WidgetProperties[widget.type].forEach(propName => {
        this.setProperty(propName, (widget.data as any)[propName]);
      });

      if (widget.type === 'tabs' && this.editorTabs) {
        this.editorTabs.setValues(widget.data.tabsNames, widget.data.tabsSelected as any);
      }
    }, 0);
  }

  /**
   * Get the value of a property.
   */
  private getProperty(name: string): any {
    const simpleInputs = ['customId', 'css', 'labelText', 'labelPosition', 'marginTop', 'helpText', 'helpPosition', 'subType', 'value', 'codeOnChange', 'conditionOnSubmit', 'boxHeader', 'boxDesign', 'choicesLanguagesValues', 'choicesLanguagesTexts', 'progressBarColor', 'progressBarDescription', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterCode', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize', 'textColor', 'textFamily', 'buttonCode', 'buttonDesign', 'buttonSize'];
    const simpleNumbers = ['marginTop', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize'];
    if (simpleNumbers.includes(name)) {
      return parseInt((document.querySelector(`#prop-${name}`) as HTMLInputElement).value);
    }
    if (simpleInputs.includes(name)) {
      return (document.querySelector(`#prop-${name}`) as HTMLInputElement).value;
    }

    if (['language', 'isRequired'].includes(name)) {
      return (document.querySelector(`#prop-${name}`) as HTMLInputElement).checked;
    }

    if (name === 'tabsNames') {
      return this.editorTabs?.getValues().values;
    }
    else if (name === 'tabsSelected') {
      return this.editorTabs?.getValues().selected;
    }

    console.error('[PGUI] getProperty: Could not find ' + name + ' value!');
    return null;
  }

  /**
   * Set the value of a property.
   */
  private setProperty(name: string, value: any) {
    const simpleInputs = ['customId', 'css', 'labelText', 'labelPosition', 'marginTop', 'helpText', 'helpPosition', 'subType', 'value', 'codeOnChange', 'conditionOnSubmit', 'boxHeader', 'boxDesign', 'choicesLanguagesValues', 'choicesLanguagesTexts', 'progressBarColor', 'progressBarDescription', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterCode', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize', 'textColor', 'textFamily', 'buttonCode', 'buttonDesign', 'buttonSize'];
    if (simpleInputs.includes(name)) {
      (document.querySelector(`#prop-${name}`) as HTMLInputElement).value = value;
      return;
    }

    if (['language', 'isRequired'].includes(name)) {
      (document.querySelector(`#prop-${name}`) as HTMLInputElement).checked = value;
      return;
    }

    const ignoreCustom = ['tabsNames', 'tabsSelected'];
    if (ignoreCustom.includes(name)) {
      return;
    }

    console.error('[PGUI] setProperty: Could not find ' + name + ' value!');
  }

  private onChange() {
    if (this.currentWidget === null) {
      return;
    }

    // Values
    (this.currentWidget as GUIWidget).customId = this.getProperty('customId');
    WidgetProperties[this.currentWidget.type].forEach(propName => {
      (this.currentWidget as any).data[propName] = this.getProperty(propName);
    });
    if (this.currentWidget.type === 'tabs' && this.editorTabs) {
      this.currentWidget.data.tabsNames = this.editorTabs.getValues().values;
      this.currentWidget.data.tabsSelected = this.editorTabs.getValues().selected;
    }

    this.dispatchEvent(new CustomEvent('onDidChange', { detail: { widget: this.currentWidget } }));
  }
};