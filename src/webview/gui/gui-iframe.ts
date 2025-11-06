import { GUIWidget } from "../../common/gui";

export const IframeContent = new class {
  private lastHoverWidget: HTMLElement | null = null;
  private selectedWidget: HTMLElement | null = null;

  public inject() {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.body.addEventListener('click', this.onMouseClick.bind(this));
    });
  }

  public setUI(widgets: GUIWidget[]) {

  }

  public setWidget(widget: GUIWidget) {

  }

  private onMouseMove(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    if (w !== this.lastHoverWidget) {
      this.lastHoverWidget = w;
      document.body.querySelectorAll('[data-widget-id]').forEach(w => w.classList.remove('gui-widget-hover'));
      if (w) {
        w.classList.add('gui-widget-hover');
      }
    }
  }

  private onMouseClick(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    if (w !== this.selectedWidget) {
      this.selectedWidget = w;
      parent.postMessage({ type: 'onDidClickWidet', widgetId: this.selectedWidget !== null ? parseInt(`${this.selectedWidget.dataset.widgetId}`) : null });
      document.body.querySelectorAll('[data-widget-id]').forEach(w => w.classList.remove('gui-widget-selected'));
      if (w) {
        w.classList.add('gui-widget-selected');
      }
    }
  }
};

(() => {
  IframeContent.inject();
})();