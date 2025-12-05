export const IframeContent = new class {
  // Selection
  private lastHoverWidget: HTMLElement | null = null;
  private selectedWidget: HTMLElement | null = null;

  // Dropping
  private isDropping: boolean = false;
  private dropTop: DOMRect | null = null;
  private dropBottom: DOMRect | null = null;
  private dragLast: number = Date.now();

  // Debug
  private debug: boolean = false;

  public inject() {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.body.addEventListener('click', this.onMouseClick.bind(this));
      document.body.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        this.dragLast = Date.now();
        if (this.isDropping === false) {
          this.setDrop(true);
        }
        this.onMouseMove(e);
      }, { capture: true });
      document.body.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        const wtype = `${e.dataTransfer?.getData('text/plain')}`;
        parent.postMessage({ type: 'onDidDropWidget', widgetType: wtype });
        this.setDrop(false);
      }, { capture: true });
      document.addEventListener('mouseleave', e => {
        console.log('mouseleave');
        this.setDrop(false);
      });

      setInterval(() => {
        if (Date.now() - this.dragLast > 200) {
          this.setDrop(false);
        }
      }, 50);
    });
  }

  public setDrop(isDropping: boolean) {
    if (this.isDropping === isDropping) {
      return;
    }

    this.isDropping = isDropping;
    if (this.isDropping) {
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

  private onMouseMove(ev: MouseEvent) {
    const topElement: Element | null = document.elementFromPoint(ev.clientX, ev.clientY);
    if (topElement === null) {
      return;
    }

    const w: HTMLElement | null = topElement.closest('[data-widget-id]');
    // Dropping
    if (this.isDropping) {
      // Recalculate edges
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
      else if (w === null) {

      }

      // Check if mouse in edge
      if (this.dropTop && this.isPositionInRect(ev.pageX, ev.pageY, this.dropTop)) {
        const drop = document.getElementById('drop') as HTMLElement;
        drop.style.display = 'block';
        drop.style.top = `${this.dropTop.y}px`;
        drop.style.left = `${this.dropTop.x}px`;
        drop.style.width = `${this.dropTop.width}px`;
        drop.style.height = `${this.dropTop.height}px`;
      }
      else if (this.dropBottom && this.isPositionInRect(ev.pageX, ev.pageY, this.dropBottom)) {
        const drop = document.getElementById('drop') as HTMLElement;
        drop.style.display = 'block';
        drop.style.top = `${this.dropBottom.y}px`;
        drop.style.left = `${this.dropBottom.x}px`;
        drop.style.width = `${this.dropBottom.width}px`;
        drop.style.height = `${this.dropBottom.height}px`;
      }
      else {
        //const drop = document.getElementById('drop') as HTMLElement;
        //drop.style.display = 'none';
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