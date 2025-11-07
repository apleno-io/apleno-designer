import { GUIWidget } from "../../common/gui";
import { WidgetProperties, WidgetSubTypes } from "../../extension/gui/gui-utils";

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

export const WidgetPropertyEditor = new class {
  /**
   * Show empty form state when no widget are selected.
   */
  public setNoWidget() {
    document.querySelectorAll('[data-property]').forEach((setting: Element) => {
      (setting as HTMLElement).style.display = 'none';
    });
  }

  /**
   * Display the widget settings.
   */
  public setWidget(widget: GUIWidget) {
    if (!(widget.type in WidgetProperties)) {
      this.setNoWidget();
      return;
    }

    // Visibility
    document.querySelectorAll('[data-property]').forEach((setting: Element) => {
      const y = (WidgetProperties[widget.type].includes((setting as HTMLElement).dataset.property as string)) || (setting as HTMLElement).dataset.property === 'customId';
      (setting as HTMLElement).style.display = y ? 'block' : 'none';
    });

    // SubTypes
    const subTypes = widget.type in WidgetSubTypes ? WidgetSubTypes[widget.type] : [];
    (document.querySelector('[data-property="subType"] select') as HTMLElement).innerHTML = subTypes.map(s => `<option value="${s}">${subTypesLocalisation[s]}</option>`).join('');

    // Values
    setTimeout(() => {
      WidgetProperties[widget.type].forEach(propName => {
        this.setProperty(propName, propName === 'customId' ? widget.customId : (widget.data as any)[propName]);
      });
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
  }
};