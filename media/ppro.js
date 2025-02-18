//////////////////////
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
	console.log("File(s) in drop zone");

	// Prevent default behavior (Prevent file from being opened)
	ev.preventDefault();
}
//////////////////////

function setFormValue(selector, value){
	const el = document.querySelector(selector);
	if(el){
		el.value = value;
	}
}

class CustomFilesEditor {
	constructor(parent, files) {
		this.parent = parent;
		this.parent.innerHTML = `
			<button data-role="add-file">Add File</button>
		`;
		this.onClick = this.onClick.bind(this);
		this.parent.addEventListener('click', this.onClick);
		setTimeout(() => this.setState(files), 0);
	}

	setState(state) {
		this.files = state;
	}

	getState() {
		return this.files;
	}

	onClick(e) {
		const button = e.target.closest('button');
		if(button){
			const role = button.dataset.role;
			if(role === 'add-file'){
				this.addFile();
				return;
			}

			const fileId = e.target.closest('[data-file]');
			if(fileId === null){
				return;
			}
			if(role === ''){

			}
		}
	}
}

class PProEditor {
	constructor(parent) {
		document.getElementById('drop-zone').addEventListener('drop', dropHandler);
		document.getElementById('drop-zone').addEventListener('dragover', dragOverHandler);
	}

	setState(state) {
		setFormValue('#project-name', state.name);
		setFormValue('#project-author', state.company);
		setFormValue('#project-description', state.description);
		setFormValue('#project-sequence', state.sequenceStart);
		setFormValue('#project-wd', state.defaultWorkingDirectory);
		setFormValue('#project-outputfolder', state.outputFolderName);
		// TODO: Custom files
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
	const editor = new PProEditor(document.querySelector('.ppro'));

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