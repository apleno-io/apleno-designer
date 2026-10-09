import { type ProjectFile, type ProjectFileChangelog } from '../../common/project';
import { deepEqual } from '../../common/utils/deep-equal';
import { escapeHTML } from '../../common/utils/sanitize';
import './project.css';

class ChangelogEditor extends EventTarget {
  private parent: HTMLElement;
  private changelog: ProjectFileChangelog[];

  constructor(parent: HTMLElement, changelog: ProjectFileChangelog[]) {
    super();
    this.parent = parent;
    this.parent.innerHTML = `
			<table class="changelog-list">
				<thead>
					<tr>
						<th width="15%">Date</th>
						<th width="15%">Author</th>
						<th width="10%">Version</th>
						<th>Message</th>
						<th width="20%"></th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		`;
    this.parent.addEventListener('click', this.onClick.bind(this));
    this.changelog = changelog;
    setTimeout(() => {
      this.render();
    }, 0);
  }

  public setState(state: ProjectFileChangelog[]): void {
    this.changelog = state;
    this.render();
  }

  public getState(): ProjectFileChangelog[] {
    return this.changelog;
  }

  private render(): void {
    const entries = `
			${this.changelog.map((entry, i) => `
				<tr data-entry="${i}">
					<td>${escapeHTML(entry.date)}</td>
					<td>${escapeHTML(entry.author)}</td>
					<td>${escapeHTML(entry.version)}</td>
					<td>${escapeHTML(entry.message)}</td>
					<td>
						<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="up">
							<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 15L12 9L17 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
						</button>
						<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="down">
							<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 9L12 15L17 9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
						</button>
						<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="remove">
							<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
						</button>
					</td>
				</tr>
			`).join('')}`;
    const tbody: Element | null = this.parent.querySelector('.changelog-list tbody');
    if (tbody === null) {
      return;
    }

    tbody.innerHTML = `
		<tr>
			<td><input type="date" class="input-large" data-add="date" value="${(new Date()).toISOString().split('T')[0]}"></td>
			<td><input type="text" class="input-large" data-add="author"></td>
			<td><input type="text" class="input-large" data-add="version"></td>
			<td><input type="text" class="input-large" data-add="message"></td>
			<td><button data-role="add">Add New Entry</button></td>
		</tr>
		${entries}`;
  }

  private getInputValue(type: string): string {
    const input = this.parent.querySelector<HTMLInputElement>(`input[data-add="${type}"]`);
    if (input) {
      return input.value;
    }
    return '';
  }

  private addEntry(): void {
    // Get form data
    const date = this.getInputValue('date');
    const author = this.getInputValue('author');
    const version = this.getInputValue('version');
    const message = this.getInputValue('message');

    // Add to changelog
    this.changelog.unshift({ date, author, version, message });
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private moveEntry(entryId: number, direction: number) {
    const newIndex = entryId + direction;
    if (newIndex < 0 || newIndex >= this.changelog.length) {
      return;
    }
    const temp = this.changelog[entryId];
    this.changelog[entryId] = this.changelog[newIndex];
    this.changelog[newIndex] = temp;
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private removeEntry(entryId: number) {
    this.changelog.splice(entryId, 1);
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private onClick(ev: MouseEvent) {
    if (!(ev.target instanceof Element)) {
      return;
    }

    const button = ev.target.closest('button');
    if (button) {
      const role = button.dataset.role;
      if (role === 'add') {
        this.addEntry();
        return;
      }

      const entryId = ev.target.closest('[data-entry]');
      if (!(entryId instanceof HTMLElement) || entryId.dataset.entry === undefined) {
        return;
      }
      if (role === 'up') {
        this.moveEntry(parseInt(entryId.dataset.entry), -1);
      }
      else if (role === 'down') {
        this.moveEntry(parseInt(entryId.dataset.entry), 1);
      }
      else if (role === 'remove') {
        this.removeEntry(parseInt(entryId.dataset.entry));
      }
    }
  }
}

class CustomFilesEditor extends EventTarget {
  private parent: HTMLElement;
  private files: string[];

  constructor(parent: HTMLElement, files: string[]) {
    super();
    this.parent = parent;
    this.parent.innerHTML = `
			<div class="customfiles-list"></div>
			<button data-role="add-file">Add File</button>
		`;
    this.onChange = this.onChange.bind(this);
    this.parent.addEventListener('click', this.onClick.bind(this));
    this.files = files;
    setTimeout(() => {
      this.render();
    }, 0);
  }

  public setState(state: string[]): void {
    this.files = state;
    this.render();
  }

  public getState(): string[] {
    return this.files;
  }

  private readFromInputs(): void {
    this.files = Array.from(this.parent.querySelectorAll('input')).map(input => input.value);
  }

  private render(): void {
    this.parent.querySelectorAll<HTMLInputElement>('input').forEach(el => el.removeEventListener('change', this.onChange));
    const list: HTMLElement | null = this.parent.querySelector<HTMLElement>('.customfiles-list');
    if (list === null) {
      return;
    }
    list.innerHTML = `
			${this.files.map((file, i) => `
				<div class="customfiles-entry flex-horizontal" data-file="${i}">
					<input class="flex-child-grow" type="text" value="${file}">
					<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="up">
						<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 15L12 9L17 15" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
					</button>
					<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="down">
						<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M7 9L12 15L17 9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
					</button>
					<button class="flex-child-shrink flex-margin-left btn-transparent" data-role="remove">
						<svg width="20" height="20" stroke="currentColor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="0"></g><g stroke-linecap="round" stroke-linejoin="round"></g><g><path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
					</button>
				</div>
				
			`).join('')}`;
    setTimeout(() => {
      this.parent.querySelectorAll<HTMLInputElement>('input').forEach(el => el.addEventListener('change', this.onChange));
    }, 0);
  }

  private addFile(): void {
    this.files.push('');
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private removeFile(fileId: number): void {
    this.files.splice(fileId, 1);
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private moveFile(fileId: number, direction: number): void {
    const newIndex = fileId + direction;
    if (newIndex < 0 || newIndex >= this.files.length) {
      return;
    }
    const temp = this.files[fileId];
    this.files[fileId] = this.files[newIndex];
    this.files[newIndex] = temp;
    this.dispatchEvent(new CustomEvent('change'));
    this.render();
  }

  private onClick(ev: MouseEvent): void {
    if (!(ev.target instanceof Element)) {
      return;
    }

    const button: HTMLButtonElement | null = ev.target.closest('button');
    if (button) {
      const role = button.dataset.role;
      if (role === 'add-file') {
        this.addFile();
        return;
      }

      const fileId = ev.target.closest('[data-file]');
      if (!(fileId instanceof HTMLElement) || fileId.dataset.file === undefined) {
        return;
      }
      if (role === 'up') {
        this.moveFile(parseInt(fileId.dataset.file), -1);
      }
      else if (role === 'down') {
        this.moveFile(parseInt(fileId.dataset.file), 1);
      }
      else if (role === 'remove') {
        this.removeFile(parseInt(fileId.dataset.file));
      }
    }
  }

  private onChange(): void {
    this.readFromInputs();
  }
}

class PProEditor extends EventTarget {
  private customFilesEditor: CustomFilesEditor;
  private changelogEditor: ChangelogEditor;

  constructor() {
    super();
    this.onChange = this.onChange.bind(this);
    this.customFilesEditor = new CustomFilesEditor(document.body.querySelector('#project-customFiles') as HTMLElement, []);
    this.customFilesEditor.addEventListener('change', this.onChange);
    this.changelogEditor = new ChangelogEditor(document.body.querySelector('#project-changelog') as HTMLElement, []);
    this.changelogEditor.addEventListener('change', this.onChange);
    (document.body.querySelector('#ppro-editor') as HTMLElement).addEventListener('click', this.onClick.bind(this));
    document.body.querySelectorAll('input, select, textarea').forEach(el => el.addEventListener('change', this.onChange));
  }

  public setState(state: ProjectFile | null): void {
    if (state === null) {
      return;
    }

    this.setFormValue('#project-name', state.name);
    this.setFormValue('#project-author', state.company);
    this.setFormValue('#project-description', state.description);
    this.setFormValue('#project-sequence', state.sequenceStart);
    this.setFormValue('#project-wd', state.defaultWorkingDirectory);
    this.setFormValue('#project-outputfolder', state.outputFolderName);
    this.customFilesEditor.setState(state.customFiles);
    this.setFormValue('#project-console', state.consoleAccess);
    this.setFormValue('#project-icon', state.icon);
    this.setFormValue('#project-logo', state.sidebarLogo);
    this.setFormValue('#project-steps', state.stepListType);
    this.setFormValue('#project-css', state.customCSSLightCode);
    this.changelogEditor.setState(state.changelog);
  }

  public getState(): ProjectFile {
    return {
      name: this.getFormValue('#project-name'),
      company: this.getFormValue('#project-author'),
      description: this.getFormValue('#project-description'),
      changelog: this.changelogEditor.getState(),
      icon: this.getFormValue('#project-icon'),
      sequenceStart: this.getFormValue('#project-sequence'),
      defaultWorkingDirectory: this.getFormValue('#project-wd') === 'output' ? 'output' : 'app',
      outputFolderName: this.getFormValue('#project-outputfolder'),
      sidebarLogo: this.getFormValue('#project-logo'),
      customCSSLightCode: this.getFormValue('#project-css'),
      customCSSDarkCode: this.getFormValue('#project-css'),
      customCSSLightFile: this.getFormValue('#project-css'),
      customCSSDarkFile: this.getFormValue('#project-css'),
      customFiles: this.customFilesEditor.getState(),
      stepListType: this.getFormValue('#project-steps') === 'shown' ? 'shown' : 'hidden',
      consoleAccess: this.getFormValue('#project-console') === 'enabled' ? 'enabled' : 'disabled',
      dateCreated: Math.floor(Date.now() * 0.001)
    };
  }

  private getFormValue(selector: string): string {
    const el = document.querySelector(selector);
    if (el) {
      return (el as HTMLInputElement).value;
    }
    return '';
  }

  private setFormValue(selector: string, value: string): void {
    const el = document.querySelector(selector);
    if (el) {
      (el as HTMLInputElement).value = value;
    }
  }

  public selectSequenceCallback(url: string): void {
    (document.querySelector('#project-sequence') as HTMLInputElement).value = url;
  }

  public selectIconCallback(url: string): void {
    (document.querySelector('#project-icon') as HTMLInputElement).value = url;
  }

  public selectLogoCallback(url: string): void {
    (document.querySelector('#project-logo') as HTMLInputElement).value = url;
  }

  private onChange(): void {
    this.dispatchEvent(new CustomEvent('change'));
  }

  private onClick(ev: MouseEvent): void {
    if (!(ev.target instanceof Element)) {
      return;
    }

    const button = ev.target.closest('button');
    if (button) {
      const role = button.dataset.role;
      if (role === 'select-icon') {
        this.dispatchEvent(new CustomEvent('select-icon'));
        return;
      }
      else if (role === 'select-logo') {
        this.dispatchEvent(new CustomEvent('select-logo'));
        return;
      }
      else if (role === 'select-sequence') {
        this.dispatchEvent(new CustomEvent('select-sequence'));
        return;
      }
    }
  }
}

(function () {
  let initialState: ProjectFile | null = null;
  let lastState: ProjectFile | null = null;

  // @ts-ignore
  const vscode = acquireVsCodeApi();
  const editor = new PProEditor();
  editor.addEventListener('change', () => {
    const newState = editor.getState();
    if (!deepEqual(lastState, newState)) {
      lastState = structuredClone(newState);
      vscode.postMessage({ type: 'edit', edit: { state: editor.getState() } });
    }
  });
  editor.addEventListener('select-icon', () => {
    vscode.postMessage({ type: 'select-icon' });
  });
  editor.addEventListener('select-logo', () => {
    vscode.postMessage({ type: 'select-logo' });
  });
  editor.addEventListener('select-sequence', () => {
    vscode.postMessage({ type: 'select-sequence' });
  });

  window.addEventListener('message', async e => {
    const { type, body, requestId } = e.data;
    if (type === 'init') {
      initialState = structuredClone(body.untitled ? null : body.value);
      lastState = structuredClone(initialState);
      editor.setState(initialState);
    }
    else if (type === 'update') {
      // content is sent when the file is reloaded from disk: it is the new initial state
      if (body.content) {
        initialState = structuredClone(body.content);
      }
      const state = body.edits.length > 0 ? body.edits[body.edits.length - 1].state : initialState;
      lastState = structuredClone(state);
      editor.setState(state);
    }
    else if (type === 'getFileData') {
      vscode.postMessage({ type: 'response', requestId, body: editor.getState() });
      return;
    }
    else if (type === 'select-sequence') {
      editor.selectSequenceCallback(body);
      return;
    }
    else if (type === 'select-logo') {
      editor.selectLogoCallback(body);
      return;
    }
    else if (type === 'select-icon') {
      editor.selectIconCallback(body);
      return;
    }
  });

  vscode.postMessage({ type: 'ready' });
}());