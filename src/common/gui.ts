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

  choicesEntries?: any;
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
  tabsSelected?: string;

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
  widgets: GUIWidget[];
  displaySubmitButton: boolean;
  language: 'r' | 'python';
}

export function isContainerWidget(type: string) {
  return ['box', 'columns', 'tabs'].includes(type);
}