import { CanvasStep } from "./sequence";

/**
 * Widget where user can edit a sequence step settings.
 */
const SequenceDetails = new class extends EventTarget {
  private container: HTMLElement | null = null;
  private currentStep: CanvasStep | null = null;

  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
    this.onClick = this.onClick.bind(this);
  }

  /**
   * Inject the widget in the DOM.
   */
  public inject(parent: HTMLElement): void {
    this.container = parent;
    setTimeout(() => {
      if (this.container === null) {
        return;
      }
      this.container.querySelectorAll('input').forEach(i => i.addEventListener('input', this.onChange));
      this.container.querySelectorAll('select').forEach(i => i.addEventListener('change', this.onChange));
      this.container.addEventListener('click', this.onClick);
      this.showEmpty();
    }, 1);
  }

  /**
   * Show a step's settings in the widget.
   */
  public showStep(step: CanvasStep) {
    if (this.container === null) {
      return;
    }

    this.currentStep = step;
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
    (document.getElementById('step-actions') as HTMLElement).style.display = step.type !== 'start' ? 'block' : 'none';
  }

  /**
   * Clear the widget like no step selected.
   */
  public showEmpty() {
    if (this.container === null) {
      return;
    }

    (document.getElementById('step-editor-id') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-file') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-condition') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-nosetting') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-empty') as HTMLElement).style.display = 'block';
    (document.getElementById('step-actions') as HTMLElement).style.display = 'none';
  }

  /**
   * Called when user changed something in the form.
   */
  private onChange() {
    if (this.container === null || this.currentStep === null) {
      return;
    }
    const customId = !['start', 'end'].includes(this.currentStep.type) ? (document.getElementById('step-customid') as HTMLInputElement).value : '';
    const customName = !['start', 'end'].includes(this.currentStep.type) ? (document.getElementById('step-name') as HTMLInputElement).value : '';
    const step = new CanvasStep(this.currentStep.id, this.currentStep.rectangle.center, this.currentStep.type, customId, customName, {
      code: (document.getElementById('step-code') as HTMLInputElement).value,
      file: (document.getElementById('step-file') as HTMLInputElement).value,
      language: (document.getElementById('step-language') as HTMLSelectElement).value === 'python' ? 'python' : 'r',
      target: this.currentStep.parameters.target,
      targetOnFalse: this.currentStep.parameters.targetOnFalse
    });
    this.dispatchEvent(new CustomEvent('change', { detail: step }));
  }

  private onClick(event: MouseEvent) {
    const target = (event.target as HTMLElement).closest('button');
    if (target === null) {
      return;
    }

    if (target.dataset.role === 'delete') {
      this.dispatchEvent(new CustomEvent('delete', { detail: this.currentStep?.id }));
    }
  }
};

export default SequenceDetails;