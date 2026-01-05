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
  defaultWorkingDirectory: 'app' | 'output';
  outputFolderName: string;
  sidebarLogo: string;
  customCSSLightCode: string;
  customCSSDarkCode: string;
  customCSSLightFile: string;
  customCSSDarkFile: string;
  customFiles: string[];
  stepListType: 'hidden' | 'shown';
  consoleAccess: 'enabled' | 'disabled';
  dateCreated: number;
}