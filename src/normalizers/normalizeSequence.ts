export interface SequenceFileStep {
  id: number;
  type: 'start' | 'gui' | 'script' | 'condition' | 'sequence' | 'end';
  x: number;
  y: number;
  customId?: string;
  customName?: string;
  parameters: {
    file?: string;
    language?: 'r' | 'python';
    code?: string;
    target?: number;
    targetOnFalse?: number;
  };
}

export interface SequenceFile {
  _version: number;
  cameraX: number;
  cameraY: number;
  cameraZoom: number;
  steps: SequenceFileStep[];
}

function findInfoByID(infos: any, customId: string): any {
  for(let i = 0; i < infos.steps.length; ++i){
      if(infos.steps[i].id === customId){
          return infos.steps[i];
      }
  }
  return null;
}

function sanitizeSteps(steps: any[]): SequenceFileStep[] {
  // Check all steps have an uuid


  // Special code here for translating v2 id (which is the customId) to uuid
  function findByID(id: any): any {
    for (let i = 0; i < steps.length; ++i) {
      if (steps[i].id === id) {
        return steps[i];
      }
    }
    return null;
  }

  steps.forEach((step) => {
    if (step.nextStep) {
      let target = findByID(step.nextStep);
      if (target !== null) {
        step.target = target.uuid;
      }
    }
    delete step.nextStep;
    if ('onFalse' in step) {
      let target = findByID(infos, step.onFalse);
      if (target !== null)
        step.falsetarget = target.uuid;
    }
    delete step.onFalse;
  });

  return steps.map((step, index) => sanitizeStep(step, index)).filter((step) => step !== null);
}

function sanitizeStep(step: any, assignedId: number): SequenceFileStep | null {
  // Is an object with parameters key
  if (typeof step !== 'object' || step === null) {
    return null;
  }
  if (!('parameters' in step) || typeof step.parameters !== 'object') {
    step.parameters = {};
  }

  // Script types
  // v3: remove if type is report
  // v4: "rscript" -> "script"
  if (!('type' in step) || step.type === 'report') {
    return null;
  }
  if (step.type === 'rscript') {
    step.type = 'script';
  }
  if (!['start', 'gui', 'script', 'condition', 'sequence', 'end'].includes(step.type)) {
    return null;
  }

  // Step data
  // v2 -> v4 step data
  if (step.data) {
    if (step.data.file) {
      step.parameters.file = step.data.file;
    }
    if (step.data.nextStepOnFalse) {
      step.parameters.targetOnFalse = step.data.nextStepOnFalse;
    }
    if (step.data.r) {
      step.parameters.code = step.data.r;
    }
    delete step.data;
  }
  // v3 -> v4 step data
  if ('file' in step) {
    step.parameters.file = step.file;
    delete step.file;
  }
  if ('r' in step) {
    step.parameters.code = step.r;
    delete step.r;
  }
  if ('onFalse' in step) {
    step.parameters.targetOnFalse = step.onFalse;
    delete step.onFalse;
  }

  // UP: v3 -> v4 uuid becomes id and id becomes customId
  if ('uuid' in step) {
    step.customId = step.id;
    step.id = step.uuid;
    delete step.uuid;
  }

  // UP: v3 -> v4 name becomes customName
  if ('name' in step) {
    step.customName = step.name;
    delete step.name;
  }

  // UP: v2 or v3 -> v4 steps
  if (step.nextStep) {
    step.parameters.target = step.nextStep;
    delete step.nextStep;
    // todo: nextstep is a string of the customId, not the number
  }
  if (step.onFalse) {
    step.parameters.targetOnFalse = step.onFalse;
    delete step.onFalse;
    // todo: nextstep is a string of the customId, not the number
  }
  if (step.target) {
    step.parameters.target = step.target;
    delete step.target;
  }
  if (step.falsetarget) {
    step.parameters.targetOnFalse = step.falsetarget;
    delete step.falsetarget;
  }

  // Sanitize like we are already on v4
  if (typeof step._version !== 'number' || step._version < 4) {
    step._version = 4;
  }
  if (typeof step.id !== 'number' || step.id < 0) {
    step.id = assignedId;
  }
  if (typeof step.type !== 'string' || !['start', 'gui', 'rscript', 'condition', 'sequence', 'end'].includes(step.type)) {
    step.type = '';
  }
  if (typeof step.x !== 'number') {
    step.x = 0;
  }
  if (typeof step.y !== 'number') {
    step.y = 0;
  }
  if ('customId' in step && typeof step.customId !== 'string') {
    step.customId = '';
  }
  if ('customName' in step && typeof step.customName !== 'string') {
    step.customName = '';
  }
  if ('parameters' in step) {
    const parameters = step.parameters;
    if ('file' in parameters && typeof parameters.file !== 'string') {
      parameters.file = '';
    }
    if ('language' in parameters && !['r', 'python'].includes(parameters.language)) {
      parameters.language = 'r';
    }
    if ('code' in parameters && typeof parameters.code !== 'string') {
      parameters.code = '';
    }
    if ('target' in parameters && typeof parameters.target !== 'number') {
      parameters.target = 0;
    }
    if ('targetOnFalse' in parameters && typeof parameters.targetOnFalse !== 'number') {
      parameters.targetOnFalse = 0;
    }
  }

  return step as SequenceFileStep;
}

export class SequenceFileUtils {
  public static sanitize(manifest: any): SequenceFile {
    const result: SequenceFile = {
      _version: 4,
      cameraX: 0,
      cameraY: 0,
      cameraZoom: 1,
      steps: []
    };

    // Is an object
    if (typeof manifest !== 'object' || manifest === null) {
      return result;
    }

    // Check keys
    result._version = typeof manifest._version === 'number' ? manifest._version : 4;
    result.cameraX = typeof manifest.cameraX === 'number' ? manifest.cameraX : 0;
    result.cameraY = typeof manifest.cameraY === 'number' ? manifest.cameraY : 0;
    result.cameraZoom = typeof manifest.cameraZoom === 'number' ? manifest.cameraZoom : 1;
    result.steps = Array.isArray(manifest.steps) ? manifest.steps : [];
    result.steps = result.steps.map((step, index) => sanitizeStep(step, index)).filter((step) => step !== null);

    return result as SequenceFile;
  }

  private toV3(infos: any): any {
    // Get highest UUID
    let nextuuid: number = 0;
    infos.steps.forEach((step: any) => {
      if (step.uuid && step.uuid > nextuuid) {
        nextuuid = step.uuid;
      }
    });
    ++nextuuid;

    // Add an UUID and empty ID if not present
    infos.steps.forEach((step: any) => {
      if (!('uuid' in step)) {
        step.uuid = nextuuid++;
      }
      if (!('id' in step)) {
        step.id = '';
      }
    });

    // RPGM2 compatibility
    // - Remove 'start' root key
    delete infos.start;
    // - For each steps
    infos.steps.forEach((step: any) => {
      // - Remove sub 'data' key
      if (step.data) {
        if (step.data.file) {
          step.file = step.data.file;
        }
        if (step.data.nextStepOnFalse) {
          step.onFalse = step.data.nextStepOnFalse;
        }
        if (step.data.r) {
          step.r = step.data.r;
        }
        delete step.data;
      }
      // - Connect steps by UUID and not by user ID
      if (step.nextStep) {
        const target: any = findInfoByID(infos, step.nextStep);
        if (target) {
          step.target = target.uuid;
        }
      }
      delete step.nextStep;

      if (step.onFalse) {
        const target: any = findInfoByID(infos, step.onFalse);
        if (target !== null) {
          step.falsetarget = target.uuid;
        }
      }
      delete step.onFalse;
    });

    return infos;
  }

  private toV4(infos: any): SequenceFile {
    infos.steps.forEach((step: any) => {
      if (step.id) {
        step.customUserId = step.id;
        delete step.id;
      }
      if (step.uuid) {
        step.id = step.uuid;
        delete step.uuid;
      }
      if (step.r) {
        step.conditionCode = step.r;
        delete step.r;
      }
      if (step.target) {
        step.targetId = step.target;
        delete step.target;
      }
      if (step.falsetarget) {
        step.conditionFalseTargetId = step.falsetarget;
        delete step.falsetarget;
      }
      if (step.type) {
        step.type = getStepType(step.type);
      }
      else {
        step.type = null;
      }

      // Check language
      if (step.type === SequenceStepType.CONDITION) {
        if ('language' in step && step.language === 'python') {
          step.language = AppLanguage.Python;
        }
        else {
          step.language = AppLanguage.R;
        }
      }
    });

    return infos as SequenceFile;
  };
}