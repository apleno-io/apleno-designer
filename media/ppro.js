//////////////////////
function debugObj(e){
	const seen = new WeakSet();
  const parseObj = (obj) => {
    const newObj = {};

    for (const key in obj) {
      if (typeof obj[key] === 'function') {
        continue;
      }
      if (obj[key] === null) {
        newObj[key] = null;
        continue;
      }
      if (typeof obj[key] === 'object') {
        if (seen.has(obj[key])) {
          continue;
        }

        seen.add(obj[key])
        newObj[key] = parseObj(obj[key]);
      } else {
        newObj[key] = obj[key];
      }
    }

    return newObj;
  };
	console.log(parseObj(e));
}
function dropHandler(ev) {
	console.log("File(s) dropped");
	console.log(debugObj(ev));
	// Prevent default behavior (Prevent file from being opened)
	ev.preventDefault();

	for (let i = 0; i < ev.dataTransfer.files.length; ++i) {
		console.log('p');
		console.log(debugObj(ev.dataTransfer.files[i]));
		console.log(i, ev.dataTransfer.files[i]);
	}

	if (ev.dataTransfer.items) {
		// Use DataTransferItemList interface to access the file(s)
		[...ev.dataTransfer.items].forEach((item, i) => {
			console.log(debugObj(item));
			// If dropped items aren't files, reject them
			if (item.kind === "file") {
				const file = item.getAsFile();
				console.log('… file[', i, '].name = ', file.name);
			}
		});
	} else {
		// Use DataTransfer interface to access the file(s)
		[...ev.dataTransfer.files].forEach((file, i) => {
			console.log('… file[', i, '].name = ', file.name);
		});
	}
}

function dragOverHandler(ev) {
	console.log("File(s) in drop zone");

	// Prevent default behavior (Prevent file from being opened)
	ev.preventDefault();
}
//////////////////////

class PProEditor {
	constructor(parent) {
		document.getElementById('drop-zone').addEventListener('drop', dropHandler);
		document.getElementById('drop-zone').addEventListener('dragover', dragOverHandler);
	}

	setState(state) {

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