const esbuild = require("esbuild");

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

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			{ out: 'extension', in: 'src/extension/extension.ts' },
			{ out: 'debug-adapter', in: 'src/debug-adapter/debug-adapter.ts' }
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outdir: 'dist',
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
