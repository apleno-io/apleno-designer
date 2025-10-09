import { CanvasStep } from "./sequence-renderer";

export interface SequenceError {
  error: 'SequenceNoStart' | 'SequenceMultipleStarts' | 'StepNoExit' | 'ConditionEmptyTest' | 'StepDuplicateId';
  stepId?: number;
  errorExtras?: any;
}

const SequenceChecker = new class {
  public check(steps: CanvasStep[]): SequenceError[] {
    const errors: SequenceError[] = [];
    let countstart = 0;
    let filesToCheck: string[] = [];
    steps.forEach((step) => {
      // Check for start
      if (step.type === 'start') {
        ++countstart;
      }

      // Check if unbind exit
      if (['start', 'gui', 'script', 'condition', 'sequence'].includes(step.type)) {
        if (!('target' in step.parameters) || step.parameters.target === undefined || steps.find(s => s.id === step.parameters.target) === undefined || step.parameters.target === step.id) {
          errors.push({ stepId: step.id, error: 'StepNoExit' });
        }
      }

      // Check if unbind condition
      if (step.type === 'condition') {
        if (!('targetOnFalse' in step.parameters) || step.parameters.targetOnFalse === undefined || steps.find(s => s.id === step.parameters.targetOnFalse) === undefined || step.parameters.targetOnFalse === step.id) {
          errors.push({ stepId: step.id, error: 'StepNoExit' });
        }
        if (typeof step.parameters.code !== 'string' || step.parameters.code.length < 1) {
          errors.push({ stepId: step.id, error: 'StepNoExit' });
        }
      }

      // Check for missing files
      if (['sequence', 'script', 'gui'].includes(step.type)) {
        filesToCheck.push(step.parameters.file || '');
      }

      // Check for duplicate ID
      if (!['start', 'end'].includes(step.type) && typeof step.customId === 'string' && step.customId.length > 0 && steps.filter(s => s.customId === step.customId).length > 1) {
        errors.push({ error: 'StepDuplicateId', stepId: step.id, errorExtras: { id: step.customId } });
      }
    });

    // Start messages
    if (countstart === 0) {
      errors.push({ error: 'SequenceNoStart' });
    }
    else if (countstart > 1) {
      errors.push({ error: 'SequenceMultipleStarts' });
    }

    return errors;
  }
};

export default SequenceChecker;