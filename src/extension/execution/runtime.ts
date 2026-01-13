

export const RuntimeManager = new class {
  public getRuntimeFolder(): string {
    return '';
  }

  public async getRuntimeVersion(): Promise<string> {
    return '';
  }

  public async checkUpdateAvailable(): Promise<string | null> {
    return null;
  }

  public async isRuntimeInstalled(): Promise<boolean> {
    return false;
  }

  public async downloadRuntime(): Promise<void> {

  }
};