const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * Assemble the AI assistant skill in dist/skill/apleno: the files of
 * templates/skill/apleno, the JSON schemas, and the source files of the
 * example apps (no data files nor third-party libraries).
 */
const SKILL_EXAMPLE_EXTENSIONS = ['.ppro', '.pseq', '.pgui', '.r', '.py', '.js', '.css', '.md'];
const SKILL_EXAMPLE_EXCLUDE = [
	'cyberrisk/main-0.py',
	'cyberrisk/modules/mathjax.js',
	'map/leaflet/',
	'map/test.R',
	'portfolio/mathjax.js'
];
const SKILL_EXAMPLE_MAX_SIZE = 100 * 1024;

function buildSkill() {
	const target = path.join('dist', 'skill', 'apleno');
	fs.rmSync(target, { recursive: true, force: true });
	fs.cpSync(path.join('templates', 'skill', 'apleno'), target, { recursive: true });
	fs.cpSync('schemas', path.join(target, 'schemas'), { recursive: true });
	fs.cpSync('examples', path.join(target, 'examples'), {
		recursive: true,
		filter: (source) => {
			const relative = path.relative('examples', source).replace(/\\/g, '/');
			if (relative === '' || fs.statSync(source).isDirectory()) {
				return !SKILL_EXAMPLE_EXCLUDE.includes(`${relative}/`);
			}
			if (!SKILL_EXAMPLE_EXTENSIONS.includes(path.extname(source).toLowerCase()) || SKILL_EXAMPLE_EXCLUDE.includes(relative)) {
				return false;
			}
			if (fs.statSync(source).size > SKILL_EXAMPLE_MAX_SIZE) {
				console.warn(`[skill] skipped ${relative}: larger than ${SKILL_EXAMPLE_MAX_SIZE / 1024} KB (add it to SKILL_EXAMPLE_EXCLUDE)`);
				return false;
			}
			return true;
		}
	});
}

async function main() {
	buildSkill();

	const ctx = await esbuild.context({
		entryPoints: [
			{ out: 'extension', in: 'src/extension/extension.ts' },
			{ out: 'debug-adapter', in: 'src/debug-adapter/debug-adapter.ts' },
			{ out: 'uninstall', in: 'src/extension/uninstall.ts' }
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outdir: 'dist',
		external: ['vscode'],
		alias: {
			// the default UMD build of jsonc-parser breaks when bundled (unresolved internal requires)
			'jsonc-parser': './node_modules/jsonc-parser/lib/esm/main.js'
		},
		logLevel: 'silent',
		loader: {
			'.html': 'text'
		},
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	const ctxMedia = await esbuild.context({
		entryPoints: [
			{ out: 'gui/gui.min', in: 'src/webview/gui/gui.ts' },
			{ out: 'gui-iframe/gui-iframe.min', in: 'src/webview/gui-iframe/gui-iframe.ts' },
			{ out: 'sequence/sequence.min', in: 'src/webview/sequence/sequence.ts' },
			{ out: 'project/project.min', in: 'src/webview/project/project.ts' }
		],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outdir: 'media',
		external: ['vscode'],
		logLevel: 'silent',
		loader: {
			'.html': 'text'
		},
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await Promise.all([
			ctx.watch(),
			ctxMedia.watch()
		]);
	} else {
		await ctx.rebuild();
		await ctx.dispose();
		await ctxMedia.rebuild();
		await ctxMedia.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
