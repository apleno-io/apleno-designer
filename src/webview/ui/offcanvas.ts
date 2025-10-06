import { Waiter } from '../../common/utils/waiter';

class OffCanvas extends EventTarget {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    super();
    this.container = container;
  }

  public async open() {
    const backdrop = await this.getBackdrop();

  }

  private async getBackdrop(): Promise<HTMLElement> {
    const bd = document.getElementById('offcanvas-backdrop');
    if (bd) {
      return bd;
    }
    document.body.insertAdjacentHTML('afterbegin', '<div id="offcanvas-backdrop"></div>');
    await Waiter(1);
    return document.getElementById('offcanvas-backdrop') as HTMLElement;
  }

  public async close() {

  }
}