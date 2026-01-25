import { SequenceError } from "./sequence-check";

/**
 * Part showing sequence errors.
 */
const SequenceErrorBox = new class extends EventTarget {
  private container: HTMLElement | null = null;

  constructor() {
    super();
  }

  /**
   * Inject the DOM of this widget.
   */
  public inject(parent: HTMLElement): void {
    this.container = parent;
    this.container.addEventListener('click', this.onClick.bind(this));
  }

  /**
   * Format an error from machine code to human sentence.
   */
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
      return `Several steps share the same id ("${error.errorExtras.id}").`;
    }
    if (error.error === 'StepFileNotFound') {
      return `A step has an unknown file ("${error.errorExtras.file}").`;
    }
    return 'Unknow error.';
  }

  /**
   * Show a list of errors.
   */
  public showErrors(errors: SequenceError[]): void {
    if (this.container === null) {
      return;
    }

    const output: string[] = [];
    for (let i = 0; i < errors.length; ++i) {
      output.push(`<div class="pseq-error" data-step="${errors[i].stepId ? errors[i].stepId : ''}">${this.formatError(errors[i])}</div>`);
    }
    this.container.innerHTML = output.join('');
  }

  /**
   * Clear all shown errors.
   */
  public clear(): void {
    if (this.container === null) {
      return;
    }

    this.container.innerHTML = '';
  }

  /**
   * User clicked somewhere in the widget.
   */
  private onClick(e: MouseEvent) {
    const error = (e.target as HTMLElement).closest('[data-step]') as HTMLElement;
    if (error && error.dataset.step && error.dataset.step.length > 0) {
      this.dispatchEvent(new CustomEvent('showStep', { detail: parseInt(error.dataset.step) }));
    }
  }
};

export default SequenceErrorBox;