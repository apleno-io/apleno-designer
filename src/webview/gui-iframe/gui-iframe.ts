import './gui-iframe.css';

interface WidgetPosition {
  type: 'widget' | 'placeholder' | 'body';
  widget: HTMLElement;
  widgetTopZone?: DOMRect;
  widgetBottomZone?: DOMRect;
  widgetZone?: DOMRect;
  widgetContainerIndex?: number;
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
  private dragLast: number = Date.now();
  private mouseMoveDebouncer: number | null = null;
  // Internal drop
  private internalDropStartX: number = 0;
  private internalDropStartY: number = 0;
  private internalDropWidgetId: string | null = null;
  private internalDropIndicator: HTMLElement | null = null;

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
        if (position && position.type === 'widget' && (position.mouse === 'top' || position.mouse === 'bottom')) {
          parent.postMessage({
            type: 'onDidDropWidget',
            widgetType: wtype,
            positionWidget: parseInt(position.widget.dataset.widgetId as string),
            position: position.mouse === 'top' ? 'before' : 'after'
          });
        }
        else if (position && position.type === 'placeholder') {
          parent.postMessage({
            type: 'onDidDropWidget',
            widgetType: wtype,
            positionContainer: parseInt(position.widget.dataset.widgetId as string),
            positionIndex: position.widgetContainerIndex
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
      document.body.classList.add('dragging');
      document.body.insertAdjacentHTML('beforeend', `<div id="drop"></div>`);
      if (this.mouseMode === MouseMode.InternalDrag) {
        this.internalDropIndicator = document.createElement('div');
        this.internalDropIndicator.id = 'drag-indicator';
        document.body.appendChild(this.internalDropIndicator);
      }
    }
    else {
      document.body.classList.remove('dragging');
      document.getElementById('drop')?.remove();
      if (this.internalDropIndicator) {
        this.internalDropIndicator.remove();
        this.internalDropIndicator = null;
      }
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

    // Detect if on a placeholder for containers
    const container = topElement.closest('.pgm-emptycontainer');
    if (container) {
      // Columns: detect column. Tab: detect tab. List: nothing
      return {
        type: 'placeholder',
        widget: w,
        widgetZone: container.getBoundingClientRect(),
        widgetContainerIndex: parseInt((container as HTMLElement).dataset.index as string),
        mouse: null
      };
    }

    // todo: Detect if body (empty or bottom)


    // Normal widget
    const wRect = w.getBoundingClientRect();
    const zonesHeight = wRect.height * 0.5; //wRect.height * 0.2 < 15 ? wRect.height * 0.5 : wRect.height * 0.2;
    const top = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY, wRect.width, zonesHeight);
    const bottom = new DOMRect(wRect.left + window.scrollX, wRect.y + window.scrollY + wRect.height - zonesHeight, wRect.width, zonesHeight);
    const isOnTop = this.isPositionInRect(x + window.scrollX, y + window.scrollY, top);
    const isOnBottom = this.isPositionInRect(x + window.scrollX, y + window.scrollY, bottom);
    return {
      type: 'widget',
      widget: w,
      widgetTopZone: top,
      widgetBottomZone: bottom,
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
    if (position === null || position.type !== 'widget') {
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
    const position = this.getWidgetFromPosition(ev.clientX, ev.clientY);
    if (position === null) {
      return;
    }

    if (this.mouseMode !== MouseMode.None) {
      // Check if mouse in edge
      const drop = document.getElementById('drop') as HTMLElement;
      if (position.type === 'widget' && position.mouse === 'top' && position.widgetTopZone) {
        drop.style.display = 'block';
        drop.style.top = `${position.widgetTopZone.y}px`;
        drop.style.left = `${position.widgetTopZone.x}px`;
        drop.style.width = `${position.widgetTopZone.width}px`;
        drop.style.height = `${position.widgetTopZone.height}px`;
      }
      else if (position.type === 'widget' && position.mouse === 'bottom' && position.widgetBottomZone) {
        drop.style.display = 'block';
        drop.style.top = `${position.widgetBottomZone.y}px`;
        drop.style.left = `${position.widgetBottomZone.x}px`;
        drop.style.width = `${position.widgetBottomZone.width}px`;
        drop.style.height = `${position.widgetBottomZone.height}px`;
      }
      else if (position.type === 'placeholder' && position.widgetZone) {
        drop.style.display = 'block';
        drop.style.top = `${position.widgetZone.y}px`;
        drop.style.left = `${position.widgetZone.x}px`;
        drop.style.width = `${position.widgetZone.width}px`;
        drop.style.height = `${position.widgetZone.height}px`;
      }
      else {
        drop.style.display = 'none';
      }

      // Drag indicator
      if (this.internalDropIndicator) {
        this.internalDropIndicator.style.left = `${ev.clientX}px`;
        this.internalDropIndicator.style.top = `${ev.clientY}px`;
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
    if (position.widget !== this.lastHoverWidget) {
      this.lastHoverWidget = position.widget;
      document.body.querySelectorAll('[data-widget-id]').forEach(w => w.classList.remove('gui-widget-hover'));
      if (position.widget) {
        position.widget.classList.add('gui-widget-hover');
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
      if (position && position.type === 'widget' && (position.mouse === 'top' || position.mouse === 'bottom')) {
        parent.postMessage({
          type: 'onDidDropWidget',
          widgetId: parseInt(this.internalDropWidgetId as string),
          positionWidget: parseInt(position.widget.dataset.widgetId as string),
          position: position.mouse === 'top' ? 'before' : 'after'
        });
      }
      else if (position && position.type === 'placeholder') {
        parent.postMessage({
          type: 'onDidDropWidget',
          widgetId: parseInt(this.internalDropWidgetId as string),
          positionContainer: parseInt(position.widget.dataset.widgetId as string),
          positionIndex: position.widgetContainerIndex
        });
      }
      ev.preventDefault();
    }
    this.internalDropWidgetId = null;
  }

  private onMouseClick(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    // tab: change
    const tab: HTMLElement | null = topElement.closest('.pgm-widget-tab');
    if (tab) {
      const id = tab.dataset.tabs;
      const selected = tab.dataset.tab;
      document.querySelectorAll<HTMLElement>(`.pgm-widget-tab[data-tabs="${id}"]`).forEach((t: HTMLElement) => {
        if (t.dataset.tab === selected) {
          t.classList.add('pgm-widget-tab-selected');
        }
        else {
          t.classList.remove('pgm-widget-tab-selected');
        }
      });
      document.querySelectorAll<HTMLElement>(`.pgm-widget-tab-content[data-tabs="${id}"]`).forEach((t: HTMLElement) => t.style.display = t.dataset.tab === selected ? 'block' : 'none');
      parent.postMessage({ type: 'onDidChangeSelectedTab', tabWidgetId: id, tabWidgetIndex: selected });
    }

    // Select widget
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