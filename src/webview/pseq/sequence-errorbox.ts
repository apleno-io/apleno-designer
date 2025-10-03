import { SequenceError } from "./sequence-check";

const SequenceErrorBox = new class extends EventTarget {
  private domContainer: HTMLElement = document.getElementById('errors') as HTMLElement;
  constructor() {
    super();
    this.domContainer.addEventListener('click', this.onClick.bind(this));
  }

  private formatError(error: SequenceError): string {
    if (error.error === 'SequenceNoStart') {
      return `There is no start step.`;
    }
    if (error.error === 'SequenceMultipleStarts') {
      return 'There is too much start steps.';
    }
    if (error.error === 'ConditionEmptyTest') {
      return 'A condition does not have condition code.';
    }
    if (error.error === 'StepNoExit') {
      return 'A step exit is not connected.';
    }
    if (error.error === 'StepDuplicateId') {
      return 'Several steps share the same id.';
    }
    return 'Unknow error.';
  }

  public showErrors(errors: SequenceError[]) {
    const output: string[] = [];
    for (let i = 0; i < errors.length; ++i) {
      output.push(`<div class="error" data-step="${errors[i].stepId ? errors[i].stepId : ''}">${this.formatError(errors[i])}</div>`);
    }
    this.domContainer.innerHTML = output.join('');
  }

  public clear() {
    this.domContainer.innerHTML = '';
  }

  private onClick(e: MouseEvent) {
    const error = (e.target as HTMLElement).closest('[data-step]') as HTMLElement;
    if (error && error.dataset.step && error.dataset.step.length > 0) {
      this.dispatchEvent(new CustomEvent('showStep', { detail: { stepId: error.dataset.step } }));
    }
  }
};

export default SequenceErrorBox;