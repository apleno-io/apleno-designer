import { type GUIWidget, WidgetProperties, WidgetSubTypes } from "../../common/gui";
import { WidgetChoiceEditor } from "./gui-propeditor-choices";
import { WidgetColumnEditor } from "./gui-propeditor-columns";
import { WidgetTabEditor } from "./gui-propeditor-tabs";

const subTypesLocalisation: { [key: string]: string } = {
  text: 'Text',
  textarea: 'Textarea',
  password: 'Password',
  float: 'Float',
  integer: 'Integer',
  slider: 'Slider',
  file: 'File',
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
  private editorColumns: WidgetColumnEditor | null = null;
  private editorChoices: WidgetChoiceEditor | null = null;

  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
  }

  public inject() {
    // Custom editors
    this.editorTabs = new WidgetTabEditor(document.getElementById('prop-tabs') as HTMLElement);
    this.editorTabs.addEventListener('onDidChange', this.onChange);
    this.editorColumns = new WidgetColumnEditor(document.getElementById('prop-columns') as HTMLElement);
    this.editorColumns.addEventListener('onDidChange', this.onChange);
    this.editorChoices = new WidgetChoiceEditor(document.getElementById('prop-choices') as HTMLElement);
    this.editorChoices.addEventListener('onDidChange', this.onChange);

    // Don't hook on sub-widget editors
    (document.getElementById('gui-propeditor-actions') as HTMLElement).addEventListener('click', this.onClick.bind(this));
    document.querySelectorAll('#gui-propeditor > .prop > input').forEach(el => (el as HTMLInputElement).addEventListener('input', this.onChange));
    document.querySelectorAll('#gui-propeditor > .prop > select').forEach(el => (el as HTMLInputElement).addEventListener('change', this.onChange));
  }

  /**
   * Show empty form state when no widget are selected.
   */
  public setNoWidget() {
    (document.getElementById('gui-propeditor-empty') as HTMLElement).style.display = 'block';
    (document.getElementById('gui-propeditor-actions') as HTMLElement).style.display = 'none';
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
    (document.getElementById('gui-propeditor-actions') as HTMLElement).style.display = 'block';

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
      if (widget.type === 'columns' && this.editorColumns) {
        this.editorColumns.setValues(widget.data.columnsWidths || []);
      }
      if (widget.type === 'select' && this.editorChoices) {
        this.editorChoices.setValues(widget.data.choicesEntries || []);
      }
    }, 0);
  }

  /**
   * Used to update children from a fixContainers call
   */
  public setChildren(widgets: GUIWidget[]) {
    if (this.currentWidget && Array.isArray(this.currentWidget.widgets)) {
      this.currentWidget.widgets = structuredClone(widgets);
    }
  }

  /**
   * Get the value of a property.
   */
  private getProperty(name: string): any {
    const simpleInputs = ['customId', 'css', 'labelText', 'labelPosition', 'marginTop', 'helpText', 'helpPosition', 'subType', 'value', 'codeOnChange', 'conditionOnSubmit', 'boxHeader', 'boxDesign', 'choicesLanguageValues', 'choicesLanguageTexts', 'progressBarColor', 'progressBarDescription', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterCode', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize', 'textColor', 'textFamily', 'buttonCode', 'buttonDesign', 'buttonSize'];
    const simpleNumbers = ['marginTop', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize', 'columnsPadding'];
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
    else if (name === 'columnsWidths') {
      return this.editorColumns?.getValues();
    }
    else if (name === 'choicesEntries') {
      return this.editorChoices?.getValues();
    }

    console.error('[PGUI] getProperty: Could not find ' + name + ' value!');
    return null;
  }

  /**
   * Set the value of a property.
   */
  private setProperty(name: string, value: any) {
    const simpleInputs = ['customId', 'css', 'labelText', 'labelPosition', 'marginTop', 'helpText', 'helpPosition', 'subType', 'value', 'codeOnChange', 'conditionOnSubmit', 'boxHeader', 'boxDesign', 'choicesLanguageValues', 'choicesLanguageTexts', 'progressBarColor', 'progressBarDescription', 'numberMinValue', 'numberMaxValue', 'numberStepChange', 'repeaterCode', 'repeaterTimeMS', 'graphWidth', 'graphHeight', 'textSize', 'textColor', 'textFamily', 'buttonCode', 'buttonDesign', 'buttonSize', 'columnsPadding'];
    if (simpleInputs.includes(name)) {
      (document.querySelector(`#prop-${name}`) as HTMLInputElement).value = value;
      return;
    }

    if (['language', 'isRequired'].includes(name)) {
      (document.querySelector(`#prop-${name}`) as HTMLInputElement).checked = value;
      return;
    }

    const ignoreCustom = ['tabsNames', 'tabsSelected', 'columnsWidths', 'choicesEntries'];
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
    if (this.currentWidget.type === 'columns' && this.editorColumns) {
      this.currentWidget.data.columnsWidths = this.editorColumns.getValues();
    }
    if (this.currentWidget.type === 'select' && this.editorChoices) {
      this.currentWidget.data.choicesEntries = this.editorChoices.getValues();
    }

    this.dispatchEvent(new CustomEvent('onDidChange', { detail: { widget: this.currentWidget } }));
  }

  private onClick(ev: MouseEvent) {
    const button = (ev.target as HTMLElement).closest('button[data-role]');
    if (button === null) {
      return;
    }

    const role = (button as HTMLElement).dataset.role;
    if (role === 'delete' && this.currentWidget) {
      this.dispatchEvent(new CustomEvent('onDidDelete', { detail: { widgetId: this.currentWidget.id } }));
    }
  }
};