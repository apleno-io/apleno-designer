import { fixIds, getMaxId, GUIInterface, GUIWidget, isContainerWidget, normalizeWidget, WidgetProperties } from '../../common/gui';
import { WidgetPropertyEditor } from './gui-propeditor';
import { WidgetFactory } from './gui-widget-factory';
import './gui.css';

import templateUI from './gui.html';

const UIEditor = new class {
  private iframeReady: boolean = false;
  private state: GUIInterface | null = null;

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
      this.setTab('props');
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
        // replace widget in state & redraw
        const widget: GUIWidget = JSON.parse(JSON.stringify((event as CustomEvent).detail.widget));
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
      document.querySelectorAll('[data-tab-content="add"] button').forEach((button) => {
        (button as HTMLElement).addEventListener('dragstart', (e: DragEvent) => {
          e.dataTransfer?.setData('text/plain', (e.target as HTMLElement).dataset.addWidget as string);
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
    this.state = state;
    this.setUISettings();
    fixIds(this.state.widgets);
    this.redrawAllWidgets();
  }

  public getState(): any {
    return {};
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
      html.push(`<div data-widget-id="${this.state.widgets[i].id}">${WidgetFactory.getWidgetHTML(this.state.widgets[i], false)}</div>`);
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
    parent.innerHTML = WidgetFactory.getWidgetHTML(widget, false);
  }

  private handleChildMessage(msg: MessageEvent): void {
    if (msg.data.type === 'onDidClickWidget') {
      if (msg.data.widgetId === null) {
        WidgetPropertyEditor.setNoWidget();
        return;
      }

      const widget = this.findWidget((widget: GUIWidget) => { return widget.id === msg.data.widgetId; });
      if (widget) {
        WidgetPropertyEditor.setWidget(widget);
        this.setTab('props');
      }
      else {
        WidgetPropertyEditor.setNoWidget();
      }
      return;
    }

    if (msg.data.type === 'onDidDropWidget') {
      console.log(msg.data);
      if (msg.data.widgetType) {
        this.createWidget(msg.data.widgetType, msg.data.positionWidget ? msg.data.positionWidget : msg.data.positionContainer, msg.data.position ? msg.data.position : msg.data.positionIndex);
      }
      else if (msg.data.widgetId) {
        this.moveWidget(msg.data.widgetId, msg.data.positionWidget ? msg.data.positionWidget : msg.data.positionContainer, msg.data.position ? msg.data.position : msg.data.positionIndex);
      }
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
      this.redrawAllWidgets();
      WidgetPropertyEditor.setNoWidget();
      this.guiChanged();
    }
    else {
      console.error('Could not found widget id ' + positionWidgetId + ' to insert new widget.');
    }
  }

  private moveWidget(id: number, positionWidgetId: number, position: 'before' | 'after' | number): void {
    // Check widget tries not to move in itself or on itself
    const widgetCheck = this.findWidget((w: GUIWidget) => w.id === id);
    if (widgetCheck === null) {
      console.error('Could not found widget id ' + positionWidgetId + ' to move.');
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
      console.error('Could not found widget id ' + positionWidgetId + ' to move.');
      return;
    }

    // Insert to new place
    let found: boolean = false;
    if (position === 'after' || position === 'before') {
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
      this.redrawAllWidgets();
      WidgetPropertyEditor.setNoWidget();
      this.guiChanged();
    }
    else {
      console.error('Could not found widget id ' + positionWidgetId + ' to insert moved widget.');
    }
  }

  private deleteWidget(widgetId: number) {
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
    this.state.displaySubmitButton = (document.getElementById('settings-language') as HTMLSelectElement).value === 'visible';
    this.guiChanged();
  }

  private guiChanged() {
    // todo: emit
  }
};

(function () {
  UIEditor.inject();

  let initialState = {};
  let lastState = {};

  // @ts-ignore
  const vscode = acquireVsCodeApi();
  window.addEventListener('message', async e => {
    const { type, body, requestId } = e.data;
    if (type === 'init') {
      initialState = structuredClone(body.untitled ? {} : body.value);
      lastState = structuredClone(initialState);
      UIEditor.setState(initialState as GUIInterface);
    }
    else if (type === 'update') {
      if (body.edits.length > 0) {
        UIEditor.setState(body.edits[body.edits.length - 1].state);
      }
      else {
        UIEditor.setState(initialState as GUIInterface);
      }
    }
    else if (type === 'getFileData') {
      vscode.postMessage({ type: 'response', requestId, body: UIEditor.getState() });
    }
  });

  vscode.postMessage({ type: 'ready' });
}());