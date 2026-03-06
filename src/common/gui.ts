const GUI_SCHEMA_VERSION: number = 50000;

export interface GUIWidgetDataChoice {
  value: string;
  text: string;
}

export interface GUIWidgetData {
  subType?: string;

  value?: any;
  language?: string | boolean;
  isRequired?: boolean;
  codeOnChange?: string;
  conditionOnSubmit?: string;

  css?: string;
  marginTop?: number;
  labelText?: string;
  labelPosition?: string;
  helpText?: string;
  helpPosition?: string;

  textSize?: number;
  textFamily?: string;
  textColor?: string;

  choicesEntries?: GUIWidgetDataChoice[];
  choicesLanguageValues?: string;
  choicesLanguageTexts?: string;

  buttonCode?: string;
  buttonSize?: string;
  buttonDesign?: string;

  gridType?: string;
  gridHeight?: number;
  gridColumns?: string;
  gridColumnsCount?: string;
  gridRows?: string;
  gridRowsCount?: string;
  gridColumnsRender?: boolean;
  gridRowsRender?: boolean;
  gridStylingRules?: any[];

  numberMinValue?: number;
  numberMaxValue?: number;
  numberStepChange?: number;

  boxDesign?: string;
  boxHeader?: string;

  columnsWidths?: number[];
  columnsPadding?: number;

  tabsNames?: any;
  tabsSelected?: number;

  progressBarColor?: string;
  progressBarDescription?: string;

  graphVariable?: string;
  graphWidth?: number;
  graphHeight?: number;

  repeaterCode?: string;
  repeaterTimeMS?: number;
}

export interface GUIWidget {
  id: number;
  customId: string;
  type: string;
  data: GUIWidgetData;
  widgets?: GUIWidget[];
}

export interface GUIInterface {
  version?: number;
  widgets: GUIWidget[];
  displaySubmitButton: boolean;
  language: 'r' | 'python';
}

// RPGM2-3 compatibility and conversion
const WidgetLegacyConversionTable: { [key: string]: string[] } = {
  subType: ['subtype'],

  value: [],
  language: ['isR', 'isr'],
  isRequired: ['required'],
  codeOnChange: ['onChange', 'onchange'],
  conditionOnSubmit: ['condition'],

  css: [],
  marginTop: ['margintop'],
  labelText: ['label', 'labeltext'],
  labelPosition: ['labelposition'],
  helpText: ['helptext'],
  helpPosition: ['helpposition'],

  textSize: ['fontSize', 'fontsize'],
  textFamily: ['fontFamily', 'fontfamily'],
  textColor: ['fontColor', 'fontcolor'],

  choicesEntries: ['choices'],
  choicesLanguageValues: ['choicesvalues'],
  choicesLanguageTexts: ['choicestexts'],

  buttonCode: ['onPress', 'onpress'],
  buttonSize: ['buttonsize'],
  buttonDesign: ['buttondesign'],

  gridType: ['gridType', 'gridtype'],
  gridHeight: ['gridHeight', 'gridheight'],
  gridColumns: ['gridColumns', 'gridcolumns'],
  gridColumnsCount: ['gridNbColumnsText', 'gridnbcolumns'],
  gridRows: ['gridRows', 'gridrows'],
  gridRowsCount: ['gridNbRowsText', 'gridnbrows'],
  gridColumnsRender: ['gridColumnsRender'],
  gridRowsRender: ['gridRowsRender'],
  gridStylingRules: ['gridStylingRules', 'gridstylingrules'],

  numberMinValue: ['min'],
  numberMaxValue: ['max'],
  numberStepChange: ['step'],

  boxDesign: ['boxdesign'],
  boxHeader: ['boxheader'],

  columnsWidths: ['columnswidths'],
  columnsPadding: ['columnspadding'],

  tabsNames: ['tabsnames'],
  tabsSelected: ['tabscurrent'],

  progressBarColor: ['progresscolor'],
  progressBarDescription: ['progressdescription'],

  graphVariable: ['graph'],
  graphWidth: ['graphwidth'],
  graphHeight: ['graphheight'],

  repeaterCode: ['intervalcode'],
  repeaterTimeMS: ['intervaltime']
};

const WidgetPropertiesDefaults: any = {
  subType: '',

  value: '',
  language: false,
  isRequired: false,
  codeOnChange: '',
  conditionOnSubmit: '',

  css: '',
  marginTop: 10,
  labelText: '',
  labelPosition: 'left',
  helpText: '',
  helpPosition: 'bottom',

  textSize: '14',
  textFamily: 'default',
  textColor: '#000000',

  choicesEntries: [],
  choicesLanguageValues: '',
  choicesLanguageTexts: '',

  buttonCode: '',
  buttonSize: 'md',
  buttonDesign: 'primary',

  gridType: 'text',
  gridHeight: 0,
  gridColumns: '',
  gridColumnsCount: 0,
  gridRows: '',
  gridRowsCount: 0,
  gridColumnsRender: true,
  gridRowsRender: true,
  gridStylingRules: [],

  numberMinValue: '',
  numberMaxValue: '',
  numberStepChange: '',

  boxDesign: 'light',
  boxHeader: '',

  columnsWidths: [4, 4, 4],
  columnsPadding: 10,

  tabsNames: [],
  tabsSelected: 0,

  progressBarColor: '#27ae60',
  progressBarDescription: '%',

  graphVariable: '',
  graphWidth: 100,
  graphHeight: 500,

  // Interval
  repeaterCode: '',
  repeaterTimeMS: 1000
};

export const WidgetProperties: { [key: string]: string[] } = {
  label: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'textSize', 'textFamily', 'textColor'],
  image: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition'],
  iframe: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition'],
  table: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition'],

  text: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit'],
  number: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit', 'numberMinValue', 'numberMaxValue', 'numberStepChange'],
  path: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit'],
  select: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit', 'choicesEntries', 'choicesLanguageValues', 'choicesLanguageTexts'],
  onoff: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit'],
  date: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit'],
  grid: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'isRequired', 'codeOnChange', 'conditionOnSubmit', 'gridType', 'gridHeight', 'gridColumns', 'gridRows', 'gridColumnsCount', 'gridRowsCount', 'gridColumnsRender', 'gridRowsRender', 'gridStylingRules'],
  button: ['value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'buttonCode', 'buttonSize', 'buttonDesign'],

  box: ['css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'boxDesign', 'boxHeader'],
  columns: ['css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'columnsWidths', 'columnsPadding'],
  tabs: ['css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'tabsNames', 'tabsSelected'],

  graph: ['css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'graphVariable', 'graphWidth', 'graphHeight'],
  progress: ['subType', 'value', 'language', 'css', 'marginTop', 'labelText', 'labelPosition', 'helpText', 'helpPosition', 'progressBarColor', 'progressBarDescription'],

  interval: ['repeaterCode', 'repeaterTimeMS']
};

export const WidgetSubTypes: { [key: string]: string[] } = {
  text: ['text', 'textarea', 'password'],
  number: ['float', 'integer', 'slider'],
  path: ['file'],
  select: ['select', 'multiselect', 'radio', 'multicheckboxes'],
  onoff: ['checkbox', 'switch'],
  progress: ['progressbar', 'progresscircle']
};

/**
 * Return true if the widget is a container.
 */
export function isContainerWidget(type: string) {
  return ['box', 'columns', 'tabs'].includes(type);
}

/**
 * Get the highest ID from all widgets.
 */
export function getMaxId(widgets: GUIWidget[]): number {
  let maxId = 0;
  for (let i = 0; i < widgets.length; ++i) {
    if ('widgets' in widgets[i] && Array.isArray(widgets[i].widgets) && (widgets[i].widgets as any).length > 0) {
      maxId = Math.max(maxId, getMaxId(widgets[i].widgets as any));
    }
    const parsedId = parseInt(`${widgets[i].id}`);
    maxId = Math.max(maxId, widgets[i].id !== null && !isNaN(parsedId) ? parsedId : 0);
  }
  return maxId;
}

/**
 * Go through all widgets and checks all widgets have an ID and it is valid.
 */
export function fixIds(widgets: GUIWidget[], nextId: number | null = null): number {
  nextId = nextId === null ? getMaxId(widgets) + 1 : nextId;
  for (let i = 0; i < widgets.length; ++i) {
    if (widgets[i].id === null || isNaN(parseInt(`${widgets[i].id}`))) {
      widgets[i].id = nextId++;
    }
    if (Array.isArray(widgets[i].widgets) && (widgets[i].widgets as any).length > 0) {
      nextId = fixIds(widgets[i].widgets as any, nextId);
    }
  }
  return nextId;
}

/**
 * Fixed containers. Tabs and columns will have a number of child lists depending
 * on the number of columns or tabs. Direct non-lists widget will be put in list.
 * If too much children, excessive children will be put as it in last valid children.
 * At least one column or tab will exist.
 * @param {number} nextCreateId an object for passing as a reference the nextId for creating a new widget
 */
export function fixContainers(widgets: GUIWidget[], nextCreateId: { value: number }) {
  for (let i = 0; i < widgets.length; ++i) {
    const w = widgets[i];
    if (w.type === 'tabs' || w.type === 'columns') {
      // 1. Check at least ONE tab or column is defined
      if (w.type === 'tabs' && w.data.tabsNames.length === 0) {
        w.data.tabsNames = ['Unnamed'];
        w.data.tabsSelected = 0;
      }
      else if (w.type === 'columns' && (!Array.isArray(w.data.columnsWidths) || w.data.columnsWidths?.length === 0)) {
        w.data.columnsWidths = [12];
      }

      // 2. Check children: create list if non-list
      if (!Array.isArray(w.widgets)) {
        w.widgets = [];
      }
      for (let j = 0; j < widgets[i].widgets!.length; ++j) {
        if ((widgets[i].widgets as GUIWidget[])[j].type !== 'box') {
          // move child in a new box
          const newList: GUIWidget = normalizeWidget({
            id: nextCreateId.value++,
            customId: '',
            type: 'box',
            data: {
              labelPosition: 'hidden',
              marginTop: 0,
              boxDesign: 'none',
              boxHeader: ''
            },
            widgets: [structuredClone((widgets[i].widgets as GUIWidget[])[j])]
          } as GUIWidget);
          (widgets[i].widgets as GUIWidget[])[j] = newList;
        }
      }

      // 3. Check children: create if not enough children
      const missing = w.data[w.type === 'tabs' ? 'tabsNames' : 'columnsWidths'].length - w.widgets.length;
      if (missing > 0) {
        for (let j = 0; j < missing; ++j) {
          w.widgets.push(normalizeWidget({
            id: nextCreateId.value++,
            customId: '',
            type: 'box',
            data: {
              labelPosition: 'hidden',
              boxDesign: 'none',
              boxHeader: '',
              marginTop: 0
            },
            widgets: []
          } as GUIWidget));
        }
      }

      // 4. Check if too much children: move extra lists to end of last valid list
      if (missing < 0) {
        const lastIndex = w.data[w.type === 'tabs' ? 'tabsNames' : 'columnsWidths'].length - 1;
        for (let j = missing; j < 0; ++j) {
          const list = w.widgets.pop();
          (w.widgets[lastIndex].widgets as GUIWidget[]).push(list as GUIWidget);
        }
      }
    }

    // Continue
    if (Array.isArray(widgets[i].widgets) && (widgets[i].widgets as any).length > 0) {
      fixContainers(widgets[i].widgets as any, nextCreateId);
    }
  }
}

export function normalizeWidget(infos: any): GUIWidget {
  const isOld: boolean = 'position' in infos;

  infos = {
    id: infos.uid ? infos.uid : (infos.id || null),
    customId: infos.uid ? (infos.id || '') : (infos.customId || ''),
    type: infos.type ? infos.type : 'text',
    data: infos.data ? infos.data : {},
    widgets: infos.widgets ? infos.widgets : infos.elements ? infos.elements : []
  };

  // Delete sub widgets if not a container
  if (!isContainerWidget(infos.type)) {
    delete infos.widgets;
  }

  // LEGACY: Remove position
  delete infos.position;

  // LEGACY: Remove fullwidth
  if (infos.data.fullWidth) {
    infos.data.labelPosition = 'hidden';
    delete infos.data.fullWidth;
  }

  // LEGACY: Removed maxchars (why was it removed in v3?)
  if ('maxCharacters' in infos.data) {
    delete infos.data.maxCharacters;
  }

  // LEGACY: Convert names from older versions
  for (let key in WidgetLegacyConversionTable) {
    for (let i = 0; i < WidgetLegacyConversionTable[key].length; ++i) {
      const keyNameToConvert: string = WidgetLegacyConversionTable[key][i];
      if (keyNameToConvert in infos.data) {
        infos.data[key] = infos.data[keyNameToConvert];
        delete infos.data[keyNameToConvert];
      }
    }
  }

  // LEGACY: Grid type int => integer
  if (infos.data.gridType && infos.data.gridType === 'int') {
    infos.data.gridType = 'integer';
  }

  // LEGACY: Grid stuff conversion
  if ('gridShowHeaders' in infos.data) {
    if (!infos.data.gridShowHeaders) {
      infos.data.gridColumns = '';
      infos.data.gridRows = '';
    }
    delete infos.data.gridShowHeaders;
  }
  if ('gridNbColumnsType' in infos.data) {
    if (infos.data.gridNbColumnsType === 'var') {
      infos.data.gridColumnsCount = '';
    }
    delete infos.data.gridNbColumnsType;
  }
  if ('gridNbRowsType' in infos.data) {
    if (infos.data.gridNbRowsType === 'var') {
      infos.data.gridRowsCount = '';
    }
    delete infos.data.gridNbRowsType;
  }

  // LEGACY: New subtype
  if (infos.type === 'textarea') {
    infos.data.subType = infos.type;
    infos.type = 'text';
  }
  else if (infos.type === 'text') {
    if (!('subType' in infos.data)) {
      infos.data.subType = 'text';
    }
  }
  else if (['float', 'slider', 'numeric'].includes(infos.type)) {
    infos.data.subType = infos.type === 'numeric' ? 'integer' : infos.type;
    infos.type = 'number';
  }
  else if (infos.type === 'file' || infos.type === 'folder') {
    infos.data.subType = 'file';
    infos.type = 'path';
  }
  else if (infos.type === 'doublenumeric' || infos.type === 'doublefloat') {
    infos.data.subType = 'legacy_double';
    infos.type = 'error';
  }
  else if (infos.type === 'combobox') {
    infos.type = 'select';
    infos.data.subType = 'select';
  }
  else if (infos.type === 'radio') {
    infos.type = 'select';
    infos.data.subType = 'radio';
  }
  else if (isOld && infos.type === 'select') {
    infos.type = 'select';
    infos.data.subType = 'multiselect';
  }
  else if (infos.type === 'checkbox') {
    infos.data.subType = 'checkbox';
    infos.type = 'onoff';
  }

  // Check widget type exists
  if (!(infos.type in WidgetProperties)) {
    infos.type = 'text';
  }

  // Removed unknown properties
  const typeProps: string[] = WidgetProperties[infos.type];
  for (let key in infos.data) {
    if (!typeProps.includes(key)) {
      delete infos.data[key];
    }
  }

  // Check every needed properties exists (w/ default values if not)
  typeProps.forEach((prop: string) => {
    infos.data[prop] = prop in infos.data ? infos.data[prop] : WidgetPropertiesDefaults[prop];
  });

  // Subtypes verification
  if (('subType' in infos.data) && !WidgetSubTypes[infos.type].includes(infos.data.subType)) {
    infos.data.subType = WidgetSubTypes[infos.type][0];
  }

  // Go through each child if container
  // Update: NO, see end of normalizeGUI

  // TODO: Check values of string properties like labelPosition, gridType etc.
  if (infos.widgets) {
    infos.widgets = infos.widgets.map((w: GUIWidget) => normalizeWidget(w));
  }

  return infos as GUIWidget;
}

export function convertOldWidgetProperty(propertyName: string): string {
  for (let key in WidgetLegacyConversionTable) {
    for (let i = 0; i < WidgetLegacyConversionTable[key].length; ++i) {
      const keyNameToConvert: string = WidgetLegacyConversionTable[key][i];
      if (keyNameToConvert === propertyName) {
        return key;
      }
    }
  }
  return propertyName;
}

export function normalizeGUI(infos: any): GUIInterface {
  const result: GUIInterface = {
    widgets: [],
    displaySubmitButton: true,
    language: 'r'
  };

  // Is an object
  if (typeof infos !== 'object' || infos === null) {
    return result;
  }

  // Widgets
  if (infos.widgets) {
    result.widgets = infos.widgets;
  }

  // Submit button
  if ('displaySubmitButton' in infos) {
    result.displaySubmitButton = infos.displaySubmitButton === true;
  }
  if ('submitbutton' in infos) { // V3
    result.displaySubmitButton = infos.submitbutton === true;
  }

  // Language (default is R)
  result.language = infos.language && infos.language === 'python' ? 'python' : 'r';

  // Elements
  if (infos.elements) {
    result.widgets = infos.elements;
  }

  // Don't normalize widgets because it will be per-widget during creation (because of end users functions like gui.add)
  result.widgets = result.widgets.map(w => normalizeWidget(w));

  result.version = GUI_SCHEMA_VERSION;
  return result;
}