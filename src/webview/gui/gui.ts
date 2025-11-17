import { fixIds, GUIInterface, GUIWidget, isContainerWidget } from '../../common/gui';
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
      WidgetPropertyEditor.inject();
      WidgetPropertyEditor.setNoWidget();
      WidgetPropertyEditor.addEventListener('onDidChange', (event: Event) => {
        // replace widget in state & redraw
        const widget = JSON.parse(JSON.stringify((event as CustomEvent).detail.widget));
        this.forEachWidget(w => {
          if (w.widgets) { }
        });
      });
      (document.getElementById('gui-preview') as HTMLElement).appendChild(iframe);
      iframe.addEventListener('load', () => {
        window.addEventListener('message', this.handleChildMessage.bind(this));
        this.iframeReady = true;
        this.drawAll();
      });
    }, 0);
  }

  public setState(state: GUIInterface): void {
    this.state = state;
    fixIds(this.state.widgets);
    this.drawAll();
  }

  public getState(): any {
    return {};
  }

  public drawAll() {
    if (this.state === null || !this.iframeReady) {
      return;
    }

    const html = [];
    for (let i = 0; i < this.state?.widgets.length; ++i) {
      html.push(`<div data-widget-id="${this.state.widgets[i].id}">${WidgetFactory.getWidgetHTML(this.state.widgets[i])}</div>`);
    }
    ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.querySelector('.pgm-gui')?.insertAdjacentHTML('beforeend', html.join(''));
  }

  public redrawWidget(id: number) {
    if (this.state === null || !this.iframeReady) {
      return;
    }

    const widget = this.findWidget(w => w.id === id);
    const parent = ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.querySelector(`[data-widget-id="${id}"]`);
    if (widget === null || parent === null) {
      return;
    }

    parent.outerHTML = WidgetFactory.getWidgetHTML(widget);
  }

  private handleChildMessage(msg: MessageEvent) {
    if (msg.data.type === 'onDidClickWidet') {
      if (msg.data.widgetId === null) {
        WidgetPropertyEditor.setNoWidget();
        return;
      }

      const widget = this.findWidget((widget: GUIWidget) => { return widget.id === msg.data.widgetId; });
      if (widget) {
        WidgetPropertyEditor.setWidget(widget);
      }
      else {
        WidgetPropertyEditor.setNoWidget();
      }
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