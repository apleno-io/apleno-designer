import { Sanitizer } from "../../common/utils/sanitize";

export interface WidgetTabEditorData {
  values: string[];
  selected: number;
}

const SVG_UNSELECTED = '<svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" /></svg>';
const SVG_SELECTED = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18.333 2c1.96 0 3.56 1.537 3.662 3.472l.005 .195v12.666c0 1.96 -1.537 3.56 -3.472 3.662l-.195 .005h-12.666a3.667 3.667 0 0 1 -3.662 -3.472l-.005 -.195v-12.666c0 -1.96 1.537 -3.56 3.472 -3.662l.195 -.005h12.666zm-2.626 7.293a1 1 0 0 0 -1.414 0l-3.293 3.292l-1.293 -1.292l-.094 -.083a1 1 0 0 0 -1.32 1.497l2 2l.094 .083a1 1 0 0 0 1.32 -.083l4 -4l.083 -.094a1 1 0 0 0 -.083 -1.32z" /></svg>';

export class WidgetTabEditor extends EventTarget {
  private parent: HTMLElement;

  private values: string[] = [];
  private selected: number = 0;

  constructor(parent: HTMLElement) {
    super();
    this.parent = parent;
    this.parent.innerHTML = `
			<div id="tabs-editor"></div>
      <button data-role="add">New tab</button>
		`;
    this.parent.addEventListener('click', this.onClick.bind(this));
    this.parent.addEventListener('input', this.onChange.bind(this));
  }

  public setValues(names: string[], selectedIndex: number): void {
    this.values = names;
    this.selected = parseInt(`${selectedIndex}`) || 0;
    this.render();
  }

  public getValues(): WidgetTabEditorData {
    return { values: this.values, selected: this.selected };
  }

  private render(): void {
    (this.parent.querySelector('#tabs-editor') as HTMLElement).innerHTML = `
			${this.values.map((value: string, i: number) => `
				<div class="tabs-editor-entry" data-entry="${i}">
          <div class="tabs-editor-entry-text"><input type="text" value="${Sanitizer.xssAttribute(value)}"></div>
          <button class="btn-transparent${this.selected === i ? ' selected' : ''}" data-role="default">
            ${this.selected === i ? SVG_SELECTED : SVG_UNSELECTED}
          </button>
          <button class="btn-transparent" data-role="up">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 15L12 9L17 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="down">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 9L12 15L17 9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
          <button class="btn-transparent" data-role="remove">
            <svg width="15" height="15" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
          </button>
				</div>
			`).join('')}`;
  }

  private addEntry(): void {
    this.values.push('');
    this.dispatchEvent(new CustomEvent('onDidChange'));
    this.render();
  }

  private setEntryDefault(entryId: number) {
    this.selected = entryId;
    this.dispatchEvent(new CustomEvent('onDidChange'));
    this.render();
  }

  private moveEntry(entryId: number, direction: number): void {
    const newIndex = entryId + direction;
    if (newIndex < 0 || newIndex >= this.values.length) {
      return;
    }
    const temp = this.values[entryId];
    this.values[entryId] = this.values[newIndex];
    this.values[newIndex] = temp;
    this.dispatchEvent(new CustomEvent('onDidChange'));
    this.render();
  }

  private removeEntry(entryId: number): void {
    this.values.splice(entryId, 1);
    this.dispatchEvent(new CustomEvent('onDidChange'));
    this.render();
  }

  private onClick(e: MouseEvent): void {
    const button = (e.target as HTMLElement).closest('button');
    if (button) {
      const role = button.dataset.role;
      if (role === 'add') {
        this.addEntry();
        return;
      }

      const entryId = (e.target as HTMLElement).closest('[data-entry]') as HTMLElement;
      if (entryId === null) {
        return;
      }
      if (role === 'default') {
        this.setEntryDefault(parseInt(entryId.dataset.entry as string));
      }
      else if (role === 'up') {
        this.moveEntry(parseInt(entryId.dataset.entry as string), -1);
      }
      else if (role === 'down') {
        this.moveEntry(parseInt(entryId.dataset.entry as string), 1);
      }
      else if (role === 'remove') {
        this.removeEntry(parseInt(entryId.dataset.entry as string));
      }
    }
  }

  private onChange(): void {
    console.log('onchange');
    this.values = [];
    document.querySelectorAll('#tabs-editor input').forEach((el: Element) => {
      this.values.push((el as HTMLInputElement).value);
    });
    this.dispatchEvent(new CustomEvent('onDidChange'));
  }
}