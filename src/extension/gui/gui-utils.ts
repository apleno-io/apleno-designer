import { GUIInterface, GUIWidget, isContainerWidget } from '../../common/gui';

// RPGM2-3 compatibility and conversion
interface ObjectStringArray {
  [key: string]: string[]
}
const WidgetLegacyConversionTable: ObjectStringArray = {
  subType: ['subtype'],

  value: [],
  language: ['isR', 'isr'],
  isRequired: ['required'],
  isVisible: ['visible'],
  isEnabled: ['enabled'],
  isDynamic: ['isdynamic', 'dynamic'],
  messageType: ['messagetype'],
  messageText: ['messagetext'],
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
  tabsSelected: 1,

  progressBarColor: '#27ae60',
  progressBarDescription: '%',

  graphVariable: '',
  graphWidth: 100,
  graphHeight: 500,

  // Interval
  repeaterCode: '',
  repeaterTimeMS: 1000
};

const WidgetProperties: ObjectStringArray = {
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

const WidgetSubTypes: ObjectStringArray = {
  text: ['text', 'textarea', 'password'],
  number: ['float', 'integer', 'slider'],
  path: ['file', 'folder'],
  select: ['select', 'multiselect', 'radio', 'multicheckboxes'],
  onoff: ['checkbox', 'switch'],
  progress: ['progressbar', 'progresscircle']
};

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

export function normalizeWidget(infos: any): GUIWidget {
  const isOld: boolean = 'position' in infos;

  infos = {
    id: infos.uid ? infos.uid : null,
    customId: infos.id ? infos.id : '',
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
      if (infos.data.hasOwnProperty(keyNameToConvert)) {
        infos.data[key] = infos.data[keyNameToConvert];
        delete infos.data[keyNameToConvert];
      }
    }
  }

  // LEGACY: Grid type int => integer
  if (infos.data.gridtype && infos.data.gridtype === 'int') {
    infos.data.gridtype = 'integer';
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
    infos.data.subType = infos.type;
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
  if (infos.data.subType && !WidgetSubTypes[infos.type].includes(infos.data.subType)) {
    infos.data.subtype = WidgetSubTypes[infos.type][0];
  }

  // Go through each child if container
  // Update: NO, see end of normalizeGUI

  // TODO: Check values of string properties like labelPosition, gridType etc.

  return infos as GUIWidget;
}

export function normalizeGUI(infos: any): GUIInterface {
  const result: GUIInterface = {
    widgets: infos.widgets ? infos.widgets : [],
    displaySubmitButton: true,
    language: 'r'
  };

  // Is an object
  if (typeof infos !== 'object' || infos === null) {
    return result;
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
  return result;
};