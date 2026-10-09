import { LanguageChooser } from "./execution/language-chooser";
import { ProjectCreator } from "./bootstrap/project-creator";
import { AIFiles } from "./bootstrap/ai-files";

export const Services = {
  LanguageChooser: new LanguageChooser(),
  ProjectCreator: new ProjectCreator(),
  AIFiles: new AIFiles()
};