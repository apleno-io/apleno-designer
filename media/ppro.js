//////////////////////
/*
document.getElementById('drop-zone').addEventListener('drop', dropHandler);
document.getElementById('drop-zone').addEventListener('dragover', dragOverHandler);

function dropHandler(ev) {
	const allDropVariations = JSON.stringify({
		'dataTransfer.types': Array.from(ev.dataTransfer.types),
		'dataTransfer.getData(text/uri-list)': ev.dataTransfer.getData('text/uri-list'),
		'dataTransfer.getData(text/plain)': ev.dataTransfer.getData('text/plain'),
		'dataTransfer.files.0.name': ev.dataTransfer.files.item(0)?.name,
	}, null, 2);

	ev.preventDefault();
}

function dragOverHandler(ev) {
	console.log("File(s) over drop zone");
	ev.preventDefault();
}
*/
//////////////////////

class CustomFilesEditor extends EventTarget {
	constructor(parent, files) {
		super();
		this.parent = parent;
		this.parent.innerHTML = `
			<div class="customfiles-list"></div>
			<button data-role="add-file">Add File</button>
		`;
		this.onClick = this.onClick.bind(this);
		this.onChange = this.onChange.bind(this);
		this.parent.addEventListener('click', this.onClick);
		setTimeout(() => {
			this.setState(files);
		}, 0);
	}

	setState(state) {
		this.files = state;
		this.render();
	}

	getState() {
		return this.files;
	}

	readFromInputs() {
		this.files = Array.from(this.parent.querySelectorAll('input')).map(input => input.value);
	}

	render() {
		this.parent.querySelectorAll('input').forEach(el => el.removeEventListener('change', this.onChange));
		this.parent.querySelector('.customfiles-list').innerHTML = `
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
			this.parent.querySelectorAll('input').forEach(el => el.addEventListener('change', this.onChange));
		}, 0);
	}

	addFile() {
		this.files.push('');
		this.dispatchEvent(new CustomEvent('change'));
		this.render();
	}

	removeFile(fileId) {
		this.files.splice(fileId, 1);
		this.dispatchEvent(new CustomEvent('change'));
		this.render();
	}

	moveFile(fileId, direction) {
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

	onClick(e) {
		const button = e.target.closest('button');
		if (button) {
			const role = button.dataset.role;
			if (role === 'add-file') {
				this.addFile();
				return;
			}

			const fileId = e.target.closest('[data-file]');
			if (fileId === null) {
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

	onChange() {
		this.readFromInputs();
	}
}

class PProEditor extends EventTarget {
	constructor() {
		super();
		this.onClick = this.onClick.bind(this);
		this.onChange = this.onChange.bind(this);
		this.customFilesEditor = new CustomFilesEditor(document.body.querySelector('#project-customFiles'), []);
		this.customFilesEditor.addEventListener('change', this.onChange);
		document.body.querySelector('#ppro-editor').addEventListener('click', this.onClick);
		document.body.querySelectorAll('input, select').forEach(el => el.addEventListener('change', this.onChange));
	}

	setState(state) {
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
		// TODO: Changelog
		// TODO: CSS
	}

	getState() {
		return {
			name: this.getFormValue('#project-name'),
			company: this.getFormValue('#project-author'),
			description: this.getFormValue('#project-description'),
			changelog: [],//this.getFormValue('#project-author'),
			icon: this.getFormValue('#project-icon'),
			sequenceStart: this.getFormValue('#project-sequence'),
			defaultWorkingDirectory: this.getFormValue('#project-wd'),
			outputFolderName: this.getFormValue('#project-outputfolder'),
			sidebarLogo: this.getFormValue('#project-logo'),
			customCSSLightCode: '', //this.getFormValue('#project-css'),
			customCSSDarkCode: '', //this.getFormValue('#project-css'),
			customCSSLightFile: '', //this.getFormValue('#project-css'),
			customCSSDarkFile: '', //this.getFormValue('#project-css'),
			customFiles: this.customFilesEditor.getState(),
			stepListType: this.getFormValue('#project-steps'),
			consoleAccess: this.getFormValue('#project-console'),
			dateCreated: null
		};
	}

	getFormValue(selector) {
		const el = document.querySelector(selector);
		if (el) {
			return el.value;
		}
		return null;
	}

	setFormValue(selector, value) {
		const el = document.querySelector(selector);
		if (el) {
			el.value = value;
		}
	}

	selectSequenceCallback(url){
		document.querySelector('#project-sequence').value = url;
	}

	selectIconCallback(url){
		document.querySelector('#project-icon').value = url;
	}

	selectLogoCallback(url){
		document.querySelector('#project-logo').value = url;
	}

	onChange() {
		this.dispatchEvent(new CustomEvent('change'));
	}

	onClick(e) {
		const button = e.target.closest('button');
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
	// @ts-ignore
	const vscode = acquireVsCodeApi();
	const editor = new PProEditor();
	editor.addEventListener('change', () => {
		vscode.postMessage({ type: 'edit', edit: { state: editor.getState() } });
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
			editor.setState(body.untitled ? {} : body.value);
		}
		else if (type === 'update') {
			if (body.edits.length > 0) {
				editor.setState(body.edits[body.edits.length - 1].state);
			}
			return;
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