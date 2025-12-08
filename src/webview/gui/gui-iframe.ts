interface WidgetPosition {
  widget: HTMLElement;
  topZone: DOMRect;
  bottomZone: DOMRect;
  mouse: 'top' | 'bottom' | null;
}

enum MouseMode {
  None = 'none',
  ExternalDrag = 'ext',
  InternalDrag = 'int'
}

export const IframeContent = new class {
  // Selection
  private lastHoverWidget: HTMLElement | null = null;
  private selectedWidget: HTMLElement | null = null;

  // Dropping
  private mouseMode: MouseMode = MouseMode.None;
  private dropTop: DOMRect | null = null;
  private dropBottom: DOMRect | null = null;
  private dragLast: number = Date.now();
  // Internal drop
  private internalDropStartX: number = 0;
  private internalDropStartY: number = 0;
  private internalDropWidgetId: string | null = null;

  // Debug
  private debug: boolean = false;

  public inject() {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('mousedown', this.onMouseDown.bind(this));
      document.body.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.body.addEventListener('mouseup', this.onMouseUp.bind(this));
      document.body.addEventListener('click', this.onMouseClick.bind(this));
      document.body.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        this.dragLast = Date.now();
        if (this.mouseMode === MouseMode.None) {
          this.setMouseMode(MouseMode.ExternalDrag);
        }
        this.onMouseMove(e);
      }, { capture: true });
      document.body.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        const wtype = `${e.dataTransfer?.getData('text/plain')}`;
        const position = this.getWidgetFromPosition(e.clientX, e.clientY);
        this.setMouseMode(MouseMode.None);
        if (position && (position.mouse === 'top' || position.mouse === 'bottom')) {
          parent.postMessage({
            type: 'onDidDropWidget',
            widgetType: wtype,
            positionWidget: parseInt(position.widget.dataset.widgetId as string),
            position: position.mouse === 'top' ? 'before' : 'after'
          });
        }
      }, { capture: true });

      setInterval(() => {
        if (this.mouseMode === MouseMode.ExternalDrag && Date.now() - this.dragLast > 200) {
          this.setMouseMode(MouseMode.None);
        }
      }, 50);
    });
  }

  public setMouseMode(mouseMode: MouseMode) {
    if (this.mouseMode === mouseMode) {
      return;
    }

    this.mouseMode = mouseMode;
    if (this.mouseMode !== MouseMode.None) {
      document.body.insertAdjacentHTML('beforeend', `<div id="drop"></div>${this.debug ? '<div id="dropt"></div><div id="dropb"></div>' : ''}`);
    }
    else {
      document.getElementById('drop')?.remove();
      document.getElementById('dropt')?.remove();
      document.getElementById('dropb')?.remove();
    }
  }

  private isPositionInRect(x: number, y: number, rect: DOMRect): boolean {
    return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height;
  }

  /**
   * x/y are from clientX/Y (relative to viewport)
   */
  private getWidgetFromPosition(x: number, y: number): WidgetPosition | null {
    const topElement: Element | null = document.elementFromPoint(x, y);
    if (topElement === null) {
      return null;
    }
    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    if (w === null) {
      return null;
    }
    const wRect = w.getBoundingClientRect();
    const zonesHeight = wRect.height * 0.2 < 15 ? wRect.height * 0.5 : wRect.height * 0.2;
    const top = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, zonesHeight);
    const bottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - zonesHeight, wRect.width, zonesHeight);
    const isOnTop = this.isPositionInRect(x + window.scrollX, y + window.scrollY, top);
    const isOnBottom = this.isPositionInRect(x + window.scrollX, y + window.scrollY, bottom);
    return {
      widget: w,
      topZone: top,
      bottomZone: bottom,
      mouse: isOnTop ? 'top' : (isOnBottom ? 'bottom' : null)
    };
  }

  /**
   * User pressed mouse: start _possible_ internal drag
   */
  private onMouseDown(ev: MouseEvent) {
    if (this.mouseMode !== MouseMode.None) {
      return;
    }

    const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
    if (position === null) {
      return;
    }

    this.internalDropStartX = ev.clientX;
    this.internalDropStartY = ev.clientY;
    this.internalDropWidgetId = position.widget.dataset.widgetId as string;
  }

  /**
   * User moved the mouse:
   * - Hover widget below cursor
   * - DnD: Show drop indicators
   */
  private onMouseMove(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    if (this.mouseMode !== MouseMode.None) {
      // Dropping: recalculate edges
      if (w && w !== this.lastHoverWidget) {
        // hovered widget changed, calculate new top/bottom
        const wRect = w.getBoundingClientRect();
        const boxesHeight = wRect.height * 0.2 < 15 ? wRect.height * 0.5 : wRect.height * 0.2;
        this.dropTop = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, boxesHeight);
        this.dropBottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - boxesHeight, wRect.width, boxesHeight);
        if (this.debug) {
          const dropt = document.getElementById('dropt') as HTMLElement;
          const dropb = document.getElementById('dropb') as HTMLElement;
          dropt.style.top = `${this.dropTop.y}px`;
          dropt.style.left = `${this.dropTop.x}px`;
          dropt.style.width = `${this.dropTop.width}px`;
          dropt.style.height = `${this.dropTop.height}px`;
          dropb.style.top = `${this.dropBottom.y}px`;
          dropb.style.left = `${this.dropBottom.x}px`;
          dropb.style.width = `${this.dropBottom.width}px`;
          dropb.style.height = `${this.dropBottom.height}px`;
        }
      }

      // Check if mouse in edge
      const drop = document.getElementById('drop') as HTMLElement;
      if (this.dropTop && this.isPositionInRect(ev.pageX, ev.pageY, this.dropTop)) {
        drop.style.display = 'block';
        drop.style.top = `${this.dropTop.y}px`;
        drop.style.left = `${this.dropTop.x}px`;
        drop.style.width = `${this.dropTop.width}px`;
        drop.style.height = `${this.dropTop.height}px`;
      }
      else if (this.dropBottom && this.isPositionInRect(ev.pageX, ev.pageY, this.dropBottom)) {
        drop.style.display = 'block';
        drop.style.top = `${this.dropBottom.y}px`;
        drop.style.left = `${this.dropBottom.x}px`;
        drop.style.width = `${this.dropBottom.width}px`;
        drop.style.height = `${this.dropBottom.height}px`;
      }
      else {
        drop.style.display = 'none';
      }
    }
    else if (this.mouseMode === MouseMode.None && this.internalDropWidgetId !== null) {
      // internal dnd: start dragging if too far
      const dx = ev.clientX - this.internalDropStartX;
      const dy = ev.clientY - this.internalDropStartY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.setMouseMode(MouseMode.InternalDrag);
      }
    }

    // Normal widget selection
    if (w !== this.lastHoverWidget) {
      this.lastHoverWidget = w;
      document.body.querySelectorAll('[data-widget-id]').forEach(w => w.classList.remove('gui-widget-hover'));
      if (w) {
        w.classList.add('gui-widget-hover');
      }
    }
  }

  /**
   * User releases mouse: validate internal DnD
   */
  private onMouseUp(ev: MouseEvent) {
    if (this.mouseMode === MouseMode.InternalDrag) {
      const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
      this.setMouseMode(MouseMode.None);
      if (position && (position.mouse === 'top' || position.mouse === 'bottom')) {
        parent.postMessage({
          type: 'onDidDropWidget',
          widgetId: parseInt(this.internalDropWidgetId as string),
          positionWidget: parseInt(position.widget.dataset.widgetId as string),
          position: position.mouse === 'top' ? 'before' : 'after'
        });
      }
    }
    this.internalDropWidgetId = null;
  }

  private onMouseClick(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    if (w !== this.selectedWidget) {
      this.selectedWidget = w;
      parent.postMessage({ type: 'onDidClickWidget', widgetId: this.selectedWidget !== null ? parseInt(`${this.selectedWidget.dataset.widgetId}`) : null });
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