import { CanvasStep } from "./sequence-renderer";

const SequenceDetails = new class extends EventTarget {
  private domContainer: HTMLElement = document.getElementById('step-editor') as HTMLElement;
  constructor() {
    super();
    this.domContainer.addEventListener('click', this.onClick.bind(this));
    this.showEmpty();
  }

  public showStep(step: CanvasStep) {
    (document.getElementById('step-customid') as HTMLInputElement).value = step.customId || '';
    (document.getElementById('step-name') as HTMLInputElement).value = step.customName || '';
    (document.getElementById('step-file') as HTMLInputElement).value = step.parameters.file || '';
    (document.getElementById('step-language') as HTMLInputElement).value = step.parameters.language || 'r';
    (document.getElementById('step-code') as HTMLInputElement).value = step.parameters.code || '';
    (document.getElementById('step-editor-id') as HTMLElement).style.display = ['start', 'end'].includes(step.type) ? 'none' : 'block';
    (document.getElementById('step-editor-file') as HTMLElement).style.display = ['gui', 'script', 'sequence'].includes(step.type) ? 'block' : 'none';
    (document.getElementById('step-editor-condition') as HTMLElement).style.display = step.type === 'condition' ? 'block' : 'none';
    (document.getElementById('step-editor-empty') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-nosetting') as HTMLElement).style.display = ['start', 'end'].includes(step.type) ? 'block' : 'none';
  }

  public showEmpty() {
    (document.getElementById('step-editor-id') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-file') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-condition') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-nosetting') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-empty') as HTMLElement).style.display = 'block';
  }

  private onClick(e: MouseEvent) {
    const button = (e.target as HTMLElement).closest('[data-role]') as HTMLElement;
    if (button === null) {
      return;
    }
    const role = button.dataset.role;

    if (role === 'cancel') {
      // todo: close form
      return;
    }
    if (role === 'save') {
      this.dispatchEvent(new CustomEvent('save', {
        detail: {

        }
      }));
    }
    if (role === 'delete') {
      this.dispatchEvent(new CustomEvent('delete'));
    }
  }
};

export default SequenceDetails;