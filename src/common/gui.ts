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
  widgets: GUIWidget[];
  displaySubmitButton: boolean;
  language: 'r' | 'python';
}

export function isContainerWidget(type: string) {
  return ['box', 'columns', 'tabs'].includes(type);
}

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