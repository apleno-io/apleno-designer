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

function setFormValue(selector, value) {
	const el = document.querySelector(selector);
	if (el) {
		el.value = value;
	}
}

class CustomFilesEditor {
	constructor(parent, files) {
		this.parent = parent;
		this.parent.innerHTML = `
			<div class="customfiles-list"></div>
			<button data-role="add-file">Add File</button>
		`;
		this.onClick = this.onClick.bind(this);
		this.parent.addEventListener('click', this.onClick);
		setTimeout(() => {
			this.setState(files);
			this.render();
		}, 0);
	}

	setState(state) {
		this.files = state;
	}

	getState() {
		return this.files;
	}

	render() {
		this.parent.querySelector('.customfiles-list').innerHTML = `
			${this.files.map((file, i) => `
				<div class="flex-horizontal" data-file="${i}">
					<input class="flex-child-grow" type="text" value="${file}">
					<button class="flex-child-shrink" data-role="up"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 7C12.2652 7 12.5196 7.10536 12.7071 7.29289L19.7071 14.2929C20.0976 14.6834 20.0976 15.3166 19.7071 15.7071C19.3166 16.0976 18.6834 16.0976 18.2929 15.7071L12 9.41421L5.70711 15.7071C5.31658 16.0976 4.68342 16.0976 4.29289 15.7071C3.90237 15.3166 3.90237 14.6834 4.29289 14.2929L11.2929 7.29289C11.4804 7.10536 11.7348 7 12 7Z" fill="#000000"></path> </g></svg></button>
					<button class="flex-child-shrink" data-role="down"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7 10L12 15L17 10" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
					<button class="flex-child-shrink" data-role="remove"><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M18 6L17.1991 18.0129C17.129 19.065 17.0939 19.5911 16.8667 19.99C16.6666 20.3412 16.3648 20.6235 16.0011 20.7998C15.588 21 15.0607 21 14.0062 21H9.99377C8.93927 21 8.41202 21 7.99889 20.7998C7.63517 20.6235 7.33339 20.3412 7.13332 19.99C6.90607 19.5911 6.871 19.065 6.80086 18.0129L6 6M4 6H20M16 6L15.7294 5.18807C15.4671 4.40125 15.3359 4.00784 15.0927 3.71698C14.8779 3.46013 14.6021 3.26132 14.2905 3.13878C13.9376 3 13.523 3 12.6936 3H11.3064C10.477 3 10.0624 3 9.70951 3.13878C9.39792 3.26132 9.12208 3.46013 8.90729 3.71698C8.66405 4.00784 8.53292 4.40125 8.27064 5.18807L8 6" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg></button>
				</div>
			`).join('')}`;
	}

	addFile() {
		this.files.push('');
		this.render();
	}

	removeFile(fileId) {
		this.files.splice(fileId, 1);
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
			console.log(fileId);
			if (fileId === null) {
				return;
			}
			if (role === 'up') {
				this.moveFile(fileId, -1);
			}
			else if (role === 'down') {
				this.moveFile(fileId, 1);
			}
			else if (role === 'remove') {
				this.removeFile(fileId);
			}
		}
	}
}

class PProEditor {
	constructor() {
		this.customFilesEditor = new CustomFilesEditor(document.body.querySelector('#project-customFiles'), []);
	}

	setState(state) {
		setFormValue('#project-name', state.name);
		setFormValue('#project-author', state.company);
		setFormValue('#project-description', state.description);
		setFormValue('#project-sequence', state.sequenceStart);
		setFormValue('#project-wd', state.defaultWorkingDirectory);
		setFormValue('#project-outputfolder', state.outputFolderName);
		this.customFilesEditor.setState(state.customFiles);
		setFormValue('#project-console', state.consoleAccess);
		setFormValue('#project-logo', state.sidebarLogo);
		setFormValue('#project-steps', state.stepListType);
		// TODO: Changelog
		// TODO: CSS
	}

	getState() {
		return {};
	}
}

(function () {
	// @ts-ignore
	const vscode = acquireVsCodeApi();
	const editor = new PProEditor();

	window.addEventListener('message', async e => {
		const { type, body, requestId } = e.data;
		if (type === 'init') {
			editor.setState(body.untitled ? {} : body.value);
		}
		else if (type === 'update') {
			editor.setState(body.content);
			return;
		}
		else if (type === 'getFileData') {
			vscode.postMessage({ type: 'response', requestId, body: editor.getState() });
			return;
		}
	});

	vscode.postMessage({ type: 'ready' });
}());