import { LanguageChooser } from "./execution/language-chooser";
import { ProjectCreator } from "./bootstrap/project-creator";

export const Services = {
  LanguageChooser: new LanguageChooser(),
  ProjectCreator: new ProjectCreator()
};