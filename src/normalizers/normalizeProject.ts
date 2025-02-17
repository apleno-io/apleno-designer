/**
 * This module normalizes a project file content while
 * also converting from RPGM2 / RPGM3 format if necessary.
 * It always returns a correct project object.
 */
export enum ProjectSidebarType {
  Hidden,
  Shown
}

export enum ProjectConsoleAccess {
  Disabled,
  RDataOnly,
  Enabled
}

export enum ProjectWorkingDirectory {
  App,
  Output
}

export interface ProjectFileChangelog {
  date: string;
  author: string;
  version: string;
  message: string;
}

export interface ProjectFile {
  name: string;
  company: string;
  description: string;
  changelog: ProjectFileChangelog[];
  icon: string;
  sequenceStart: string;
  defaultWorkingDirectory: ProjectWorkingDirectory;
  outputFolderName: string;
  sidebarLogo: string;
  customCSSLightCode: string;
  customCSSDarkCode: string;
  customCSSLightFile: string;
  customCSSDarkFile: string;
  customFiles: string[];
  stepListType: ProjectSidebarType,
  consoleAccess: ProjectConsoleAccess;
  dateCreated: number;
}

export function normalizeProject(manifest: any): ProjectFile {
  const result: ProjectFile = {
      changelog: [],
      company: '',
      consoleAccess: ProjectConsoleAccess.Disabled,
      customCSSDarkCode: '',
      customCSSDarkFile: '',
      customCSSLightCode: '',
      customCSSLightFile: '',
      customFiles: [],
      dateCreated: Date.now(),
      defaultWorkingDirectory: ProjectWorkingDirectory.App,
      description: '',
      icon: '',
      name: '',
      outputFolderName: '{{name}}_{{datetime}}',
      sequenceStart: '',
      sidebarLogo: '',
      stepListType: ProjectSidebarType.Shown
  };

  // Is an object
  if(typeof manifest !== 'object' || manifest === null) {
      return result;
  }

  // RPGM2 compatibility
  if(manifest.settings){
      result.sidebarLogo = manifest.settings.topLogo || '';
      result.stepListType = !('listType' in manifest.settings) || manifest.settings.listType === 'sidebar' ? ProjectSidebarType.Shown : ProjectSidebarType.Hidden;
      result.defaultWorkingDirectory = ProjectWorkingDirectory.Output;
  }

  // RPGM3 compatibility
  if(manifest.start){
      result.consoleAccess = manifest.rconsole === 'r' ? ProjectConsoleAccess.Enabled : ProjectConsoleAccess.Disabled;
      result.customCSSDarkCode = manifest.css || '';
      result.customCSSLightCode = manifest.css || '';
      result.dateCreated = manifest.created || Date.now();
      result.defaultWorkingDirectory = manifest.wd === 'program' ? ProjectWorkingDirectory.App : ProjectWorkingDirectory.Output;
      result.outputFolderName = manifest.outputfolder || '';
      result.sequenceStart = manifest.start || '';
      result.sidebarLogo = manifest.logo || '';
      result.stepListType = !('list' in manifest) || manifest.list === 'sidebar' ? ProjectSidebarType.Shown : ProjectSidebarType.Hidden;
  }

  // history => changelog
  if(manifest.history){
      result.changelog = manifest.history;
  }

  // All keys
  for(let key in manifest){
      if(key in result){
          (result as any)[key] = manifest[key];
      }
  }

  return result as ProjectFile;
};