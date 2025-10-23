import { GUIInterface } from '../../common/gui';
import { WidgetFactory } from './gui-widget-factory';
import './gui.css';

import templateUI from './gui.html';

const UIEditor = new class {
  private state: GUIInterface | null = null;
  private iframeContent: Document | null = null;

  public inject(): void {
    document.body.insertAdjacentHTML('afterbegin', templateUI);
    const iframe = document.createElement('iframe');
    iframe.srcdoc = `
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${(window as any).CSP_SOURCE} blob:; style-src ${(window as any).CSP_SOURCE}; script-src * 'unsafe-inline';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title></title>
      </head>
      <body></body>
    </html>`.trim();
    setTimeout(() => {
      (document.getElementById('gui-preview') as HTMLElement).appendChild(iframe);
      setTimeout(() => {
        this.iframeContent = ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentDocument as Document);
        this.renderAll();
      }, 0);
    }, 0);
  }

  public setState(state: any): void {
    this.state = state;
    this.renderAll();
  }

  public getState(): any {
    return {};
  }

  public renderAll() {
    if (this.state === null || this.iframeContent === null) {
      return;
    }

    const html = [];
    for (let i = 0; i < this.state?.widgets.length; ++i) {
      html.push(WidgetFactory.getWidgetHTML(this.state.widgets[i]));
    }
    ((document.querySelector('#gui-preview iframe') as HTMLIFrameElement).contentWindow as Window).document.body.innerHTML = html.join('');
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
      UIEditor.setState(initialState);
    }
    else if (type === 'update') {
      if (body.edits.length > 0) {
        UIEditor.setState(body.edits[body.edits.length - 1].state);
      }
      else {
        UIEditor.setState(initialState);
      }
    }
    else if (type === 'getFileData') {
      vscode.postMessage({ type: 'response', requestId, body: UIEditor.getState() });
    }
  });

  vscode.postMessage({ type: 'ready' });
}());