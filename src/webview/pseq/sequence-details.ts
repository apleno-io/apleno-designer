import { CanvasStep } from "./sequence-renderer";

const SequenceDetails = new class extends EventTarget {
  private domContainer: HTMLElement = document.getElementById('step-editor') as HTMLElement;
  private currentStep: CanvasStep | null = null;

  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
    this.domContainer.querySelectorAll('input').forEach(i => i.addEventListener('input', this.onChange));
    this.domContainer.querySelectorAll('select').forEach(i => i.addEventListener('change', this.onChange));
    this.showEmpty();
  }

  public showStep(step: CanvasStep) {
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
  }

  public showEmpty() {
    (document.getElementById('step-editor-id') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-file') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-condition') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-nosetting') as HTMLElement).style.display = 'none';
    (document.getElementById('step-editor-empty') as HTMLElement).style.display = 'block';
  }

  private onChange() {
    if (this.currentStep === null) {
      return;
    }
    const customId = !['start', 'end'].includes(this.currentStep.type) ? (document.getElementById('step-customid') as HTMLInputElement).value : '';
    const customName = !['start', 'end'].includes(this.currentStep.type) ? (document.getElementById('step-name') as HTMLInputElement).value : '';
    const step = new CanvasStep(this.currentStep.id, this.currentStep.rectangle.center, this.currentStep.type, customId, customName, {
      code: (document.getElementById('step-code') as HTMLInputElement).value,
      file: (document.getElementById('step-file') as HTMLInputElement).value,
      language: (document.getElementById('step-language') as HTMLSelectElement).value === 'python' ? 'python' : 'r'
    });
    this.dispatchEvent(new CustomEvent('change', { detail: step }));
  }
};

export default SequenceDetails;