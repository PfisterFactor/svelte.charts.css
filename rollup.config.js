import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import sveltePreprocess from 'svelte-preprocess';
import typescript from '@rollup/plugin-typescript';
import execute from "rollup-plugin-execute";

const pkg = require('./package.json');

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/index.ts',
	output: [
		{
			name: "SvelteChartCss",
			sourcemap: true,
			format: "es",
			file: pkg.module,
		},
		{
			name: "SvelteChartCss",
			sourcemap: true,
			file: pkg.main,
			format: 'umd',
			plugins: [
				// we only want to run this once, so we'll just make it part of this output's plugins
				execute([
					"tsc --outDir ./dist --declaration",
					"node scripts/preprocess.js",
				]),
			],
		},

	],
	plugins: [
		svelte({
			preprocess: sveltePreprocess(),
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve(),
		typescript(),
		terser()
	]
};
