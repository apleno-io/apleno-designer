import { fixContainers, fixIds, getMaxId, type GUIInterface, type GUIWidget, isContainerWidget, normalizeGUI, normalizeWidget, WidgetProperties } from '../../common/gui';
import { deepEqual } from '../../common/utils/deep-equal';
import { WidgetPropertyEditor } from './gui-propeditor';
import { WidgetFactory } from './gui-widget-factory';
import './gui.css';

import templateUI from './gui.html';

export interface StateExtras {
  selectedWidget?: number | null;
  selectedTabs?: { [key: string]: string };
}

class UIEditor extends EventTarget {
  private iframeReady: boolean = false;
  private state: GUIInterface | null = null;

  /**
   * Record editor-only UI state, like which tab the user is seeing compared
   * to the actual first tab in the app.
   */
  private stateExtras: StateExtras = {};

  /**
   * Debounce timer for guiChanged events
   */
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  public inject(): void {
    document.body.insertAdjacentHTML('afterbegin', templateUI);
    const iframe = document.createElement('iframe');
    iframe.srcdoc = `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${(window as any).CSP_SOURCE} blob:; style-src * 'unsafe-inline'; script-src * 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
        <style>${(window as any).IFRAME_CSS}</style>
      </head>
      <body>
        <div class="pgm-gui"></div>
        <script>${(window as any).IFRAME_JS}</script>
      </body>
    </html>`.trim();
    setTimeout(() => {
      // Tabs
      this.setTab('add');
      document.getElementById('gui-sidebar-tabs')?.addEventListener('click', (event: MouseEvent) => {
        const button = (event.target as HTMLElement).closest('[data-tab]');
        if (button === null) {
          return;
        }
        this.setTab((button as HTMLElement).dataset.tab as any);
      });

      // Widget editor
      WidgetPropertyEditor.inject();
      WidgetPropertyEditor.setNoWidget();
      WidgetPropertyEditor.addEventListener('onDidChange', (event: Event) => {
        // replace widget in state
        const widget: GUIWidget = structuredClone((event as CustomEvent).detail.widget);

        // fix containers if modifier widget is tabs or columns
        if (this.state && widget.widgets && ['tabs', 'columns'].includes(widget.type)) {
          fixContainers([widget], { value: getMaxId(this.state.widgets) + 1 });
          WidgetPropertyEditor.setChildren(widget.widgets);
        }

        // replace & redraw
        this.forEachContainers((widgets: GUIWidget[]) => {
          for (let i = 0; i < widgets.length; ++i) {
            if (widgets[i].id === widget.id) {
              widgets[i] = widget;
              break;
            }
          }
        });
        this.redrawWidget(widget.id);

        // emit
        this.guiChanged();
      });
      WidgetPropertyEditor.addEventListener('onDidDelete', (event: Event) => {
        this.deleteWidget((event as CustomEvent).detail.widgetId);
      });

      // UI Settings hooks
      (document.querySelector('[data-tab-content="ui"]') as HTMLElement).addEventListener('change', this.onSettingsChanged.bind(this));

      // DnD "Add" buttons
      document.querySelectorAll<HTMLElement>('[data-tab-content="add"] button').forEach((button) => {
        button.addEventListener('dragstart', (e: DragEvent) => {
          e.dataTransfer?.setData('text/plain', (e.target as HTMLElement).dataset.addWidget as string);
        });
        button.addEventListener('click', (e: MouseEvent) => {
          this.createWidget((e.target as HTMLElement).dataset.addWidget as string, null, 'after');
        });
      });

      // Iframe
      (document.getElementById('gui-preview') as HTMLElement).appendChild(iframe);
      iframe.addEventListener('load', () => {
        window.addEventListener('message', this.handleChildMessage.bind(this));
        this.iframeReady = true;
        this.redrawAllWidgets();
      });
    }, 0);
  }

  public setState(state: GUIInterface): void {
    this.state = normalizeGUI(structuredClone(state));
    this.setUISettings();
    fixIds(this.state.widgets);
    fixContainers(this.state.widgets, { value: getMaxId(this.state.widgets) + 1 });
    this.redrawAllWidgets();
    if (this.stateExtras.selectedWidget) {
      const widget = this.findWidget(w => w.id === this.stateExtras.selectedWidget);
      if (widget) {
        WidgetPropertyEditor.setWidget(widget);
      }
      else {
        this.stateExtras.selectedWidget = null;
      }
    }
  }

  public getState(): any {
    return this.state;
  }

  private setTab(tab: 'add' | 'props' | 'ui'): void {
    document.querySelectorAll('#gui-sidebar-tabs [data-tab]').forEach((el: Element) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }

      if (el.dataset.tab === tab) {
        el.classList.add('selected');
        (document.querySelector(`[data-tab-content="${el.dataset.tab}"]`) as HTMLElement).style.display = 'block';
      }
      else {
        el.classList.remove('selected');
        (document.querySelector(`[data-tab-content="${el.dataset.tab}"]`) as HTMLElement).style.display = 'none';
      }
    });
  }

  private setUISettings(): void {
    (document.getElementById('settings-language') as HTMLSelectElement).value = this.state?.language === 'r' ? 'r' : 'python';
    (document.getElementById('settings-submit') as HTMLSelectElement).value = this.state?.displaySubmitButton ? 'visible' : 'hidden';
  }

  private redrawAllWidgets(): void {
    if (this.state === null || !this.iframeReady) {
      return;
    }

    const html = [];
    for (let i = 0; i < this.state?.widgets.length; ++i) {
      html.push(WidgetFactory.getWidgetHTML(this.state.widgets[i], { stateExtras: this.stateExtras }));
    }
    (((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.querySelector('.pgm-gui') as HTMLElement).innerHTML = html.join('');
  }

  private redrawWidget(id: number): void {
    if (this.state === null || !this.iframeReady) {
      return;
    }

    const widget = this.findWidget(w => w.id === id);
    const parent = ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.querySelector(`[data-widget-id="${id}"]`);
    if (widget === null || parent === null) {
      return;
    }
    parent.innerHTML = WidgetFactory.getWidgetHTML(widget, { includeParentHTML: false, stateExtras: this.stateExtras });
  }

  private scrollToBottom() {
    const b = ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).window;
    b.scrollTo(0, ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.body.scrollHeight);
  }

  private handleChildMessage(msg: MessageEvent): void {
    if (msg.data.type === 'onDidPressDelete' && this.stateExtras.selectedWidget) {
      this.deleteWidget(this.stateExtras.selectedWidget);
      return;
    }

    if (msg.data.type === 'onDidClickWidget') {
      if (msg.data.widgetId === null) {
        this.stateExtras.selectedWidget = null;
        WidgetPropertyEditor.setNoWidget();
        return;
      }

      const widget = this.findWidget((widget: GUIWidget) => { return widget.id === msg.data.widgetId; });
      if (widget) {
        this.stateExtras.selectedWidget = widget.id;
        WidgetPropertyEditor.setWidget(widget);
        this.setTab('props');
      }
      else {
        this.stateExtras.selectedWidget = null;
        WidgetPropertyEditor.setNoWidget();
      }
      return;
    }

    if (msg.data.type === 'onDidDropWidget') {
      if (msg.data.widgetType) {
        this.createWidget(msg.data.widgetType, msg.data.positionWidget ? msg.data.positionWidget : msg.data.positionContainer, msg.data.position ? msg.data.position : msg.data.positionIndex);
      }
      else if (msg.data.widgetId) {
        this.moveWidget(msg.data.widgetId, msg.data.positionWidget ? msg.data.positionWidget : msg.data.positionContainer, msg.data.position ? msg.data.position : msg.data.positionIndex);
      }
      return;
    }

    if (msg.data.type === 'onDidChangeSelectedTab') {
      if (!('selectedTabs' in this.stateExtras) || this.stateExtras.selectedTabs === undefined) {
        this.stateExtras.selectedTabs = {};
      }
      this.stateExtras.selectedTabs[String(parseInt(msg.data.tabWidgetId))] = String(parseInt(msg.data.tabWidgetIndex));
      return;
    }

    if (msg.data.type === 'onDidPressCommand') {
      this.dispatchEvent(new CustomEvent('onDidPressCommand', { detail: msg.data.payload }));
      return;
    }
  }

  /**
   * Create and insert a new widget. Pass null to positionWidgetId for main body.
   * - If position is before or after, positionWidgetId is the sibling
   * - If position is a number, positionWidgetId is the parent and position is ignored
   */
  private createWidget(type: string, positionWidgetId: number | null, position: 'before' | 'after' | number): void {
    if (!(type in WidgetProperties) || this.state === null) {
      return;
    }

    const widget = normalizeWidget({ uid: getMaxId(this.state.widgets) + 1, type });

    // Insert in body
    if (positionWidgetId === null) {
      if (position === 'after') {
        this.state?.widgets.push(widget);
      }
      else {
        this.state?.widgets.unshift(widget);
      }
      this.stateExtras.selectedWidget = widget.id;
      fixContainers(this.state.widgets, { value: getMaxId(this.state.widgets) + 1 });
      this.redrawAllWidgets();
      this.scrollToBottom();
      WidgetPropertyEditor.setWidget(widget);
      this.setTab('props');
      this.guiChanged();
      return;
    }

    // Find widget
    let found: boolean = false;
    if (position === 'after' || position === 'before') {
      // relative to sibling
      this.forEachContainers((widgets: GUIWidget[]) => {
        for (let i = 0; i < widgets.length; ++i) {
          if (widgets[i].id === positionWidgetId) {
            widgets.splice(position === 'before' ? i : i + 1, 0, widget);
            found = true;
            return;
          }
        }
      });
    }
    else if (typeof position === 'number') {
      // parent container
      this.forEachWidget((iWidget: GUIWidget) => {
        if (iWidget.id === positionWidgetId && isContainerWidget(iWidget.type) && iWidget.widgets) {
          iWidget.widgets.push(widget);
          found = true;
        }
      });
    }

    // Refresh
    if (found) {
      this.stateExtras.selectedWidget = widget.id;
      fixContainers(this.state.widgets, { value: getMaxId(this.state.widgets) + 1 });
      this.redrawAllWidgets();
      WidgetPropertyEditor.setWidget(widget);
      this.guiChanged();
    }
    else {
      console.error(`Could not found widget id ${positionWidgetId} to insert new widget.`);
    }
  }

  /**
   * 
   * @param id 
   * @param positionWidgetId the widget id to move relative to. null for body.
   * @param position 
   * @returns 
   */
  private moveWidget(id: number, positionWidgetId: number | null, position: 'before' | 'after' | number): void {
    if (this.state === null) {
      return;
    }

    // Check widget tries not to move in itself or on itself
    const widgetCheck = this.findWidget((w: GUIWidget) => w.id === id);
    if (widgetCheck === null) {
      console.error(`Could not found widget id ${id} to move.`);
      return;
    }
    if (id === positionWidgetId) {
      console.warn('Cannot move widget in itself!');
      return;
    }
    if (widgetCheck.widgets && this.findWidget((w: GUIWidget) => w.id === id, widgetCheck.widgets) !== null) {
      console.warn('Cannot insert widget in its own container!');
      return;
    }

    // Find widget to take out
    let widget: GUIWidget | null = null;
    this.forEachContainers((widgets: GUIWidget[]) => {
      for (let i = 0; i < widgets.length; ++i) {
        if (widgets[i].id === id) {
          widget = widgets.splice(i, 1)[0];
          return;
        }
      }
    });
    if (widget === null) {
      console.error(`Could not found widget id ${id} to move.`);
      return;
    }

    // Insert to new place
    let found: boolean = false;
    if (positionWidgetId === null) {
      if (position === 'after') {
        this.state?.widgets.push(widget);
      }
      else {
        this.state?.widgets.unshift(widget);
      }
      found = true;
    }
    else if (position === 'after' || position === 'before') {
      this.forEachContainers((widgets: GUIWidget[]) => {
        for (let i = 0; i < widgets.length; ++i) {
          if (widgets[i].id === positionWidgetId) {
            widgets.splice(position === 'before' ? i : i + 1, 0, widget as GUIWidget);
            found = true;
            return;
          }
        }
      });
    }
    else if (typeof position === 'number') {
      // parent container
      this.forEachWidget((iWidget: GUIWidget) => {
        if (iWidget.id === positionWidgetId && isContainerWidget(iWidget.type) && iWidget.widgets) {
          iWidget.widgets.push(widget as GUIWidget);
          found = true;
        }
      });
    }

    // Refresh
    if (found) {
      this.stateExtras.selectedWidget = widgetCheck.id;
      fixContainers(this.state.widgets, { value: getMaxId(this.state.widgets) + 1 });
      this.redrawAllWidgets();
      WidgetPropertyEditor.setWidget(widgetCheck);
      this.guiChanged();
    }
    else {
      console.error(`Could not found widget id ${positionWidgetId} to insert moved widget.`);
    }
  }

  private deleteWidget(widgetId: number) {
    if (this.state === null) {
      return;
    }

    let found: boolean = false;
    this.forEachContainers((widgets: GUIWidget[]) => {
      for (let i = 0; i < widgets.length; ++i) {
        if (widgets[i].id === widgetId) {
          widgets.splice(i, 1)[0];
          found = true;
          return;
        }
      }
    });

    if (found) {
      this.stateExtras.selectedWidget = null;
      fixContainers(this.state.widgets, { value: getMaxId(this.state.widgets) + 1 });
      this.redrawAllWidgets();
      WidgetPropertyEditor.setNoWidget();
      this.guiChanged();
    }
    else {
      console.error('Could not found widget id ' + widgetId + ' to remove.');
    }
  }

  private findWidget(predicate: (widget: GUIWidget) => boolean, widgets: GUIWidget[] | null = null): GUIWidget | null {
    if (widgets === null) {
      if (this.state === null) {
        return null;
      }
      widgets = this.state?.widgets;
    }

    for (let i = 0; i < widgets.length; ++i) {
      if (predicate(widgets[i])) {
        return widgets[i];
      }
      if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
        const subWidget = this.findWidget(predicate, widgets[i].widgets);
        if (subWidget) {
          return subWidget;
        }
      }
    }

    return null;
  }

  private forEachWidget(cb: (widget: GUIWidget) => void, widgets: GUIWidget[] | null = null) {
    if (widgets === null) {
      if (this.state === null) {
        return null;
      }
      widgets = this.state?.widgets;
    }

    for (let i = 0; i < widgets.length; ++i) {
      cb(widgets[i]);
      if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
        this.forEachWidget(cb, widgets[i].widgets);
      }
    }
  }

  private forEachContainers(cb: (widgets: GUIWidget[]) => void, widgets: GUIWidget[] | null = null) {
    if (widgets === null) {
      if (this.state === null) {
        return null;
      }
      widgets = this.state?.widgets;
    }

    cb(widgets);

    for (let i = 0; i < widgets.length; ++i) {
      if (isContainerWidget(widgets[i].type) && widgets[i].widgets) {
        this.forEachContainers(cb, widgets[i].widgets);
      }
    }
  }

  private onSettingsChanged() {
    if (this.state === null) {
      return;
    }

    this.state.language = (document.getElementById('settings-language') as HTMLSelectElement).value === 'r' ? 'r' : 'python';
    this.state.displaySubmitButton = (document.getElementById('settings-submit') as HTMLSelectElement).value === 'visible';
    this.guiChanged();
  }

  /**
   * Emit event when GUI was modified.
   */
  private guiChanged() {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.dispatchEvent(new CustomEvent('onDidChange'));
      this.debounceTimer = null;
    }, 500);
  }
}

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  let initialState = {};
  let lastState = {};
  const editor = new UIEditor();
  editor.addEventListener('onDidPressCommand', (e: CustomEventInit<any>) => {
    vscode.postMessage({ type: 'onDidPressCommand', payload: e.detail });
  });
  editor.addEventListener('onDidChange', (e: CustomEventInit<void>) => {
    const newState = editor.getState();
    if (!deepEqual(lastState, newState)) {
      lastState = structuredClone(newState);
      vscode.postMessage({ type: 'OnDidChange', edit: { state: editor.getState() } });
    }
  });
  editor.inject();
  window.addEventListener('message', async e => {
    const { type, body, requestId } = e.data;
    if (type === 'init') {
      initialState = structuredClone(body.untitled ? {} : body.value);
      lastState = structuredClone(initialState);
      editor.setState(initialState as GUIInterface);
    }
    else if (type === 'update') {
      // content is sent when the file is reloaded from disk: it is the new initial state
      if (body.content) {
        initialState = structuredClone(body.content);
      }
      const state = body.edits.length > 0 ? body.edits[body.edits.length - 1].state : initialState;
      lastState = structuredClone(state);
      editor.setState(state as GUIInterface);
    }
    else if (type === 'getFileData') {
      vscode.postMessage({ type: 'response', requestId, body: editor.getState() });
    }
  });

  vscode.postMessage({ type: 'ready' });
}());