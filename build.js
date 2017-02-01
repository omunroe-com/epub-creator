/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals __dirname, module, process */ // license: MPL-2.0

const {
	concurrent: { promisify, },
	functional,
	fs: { FS, },
	process: { execute, },
} = require('es6lib');
const { join, resolve, basename, } = require('path');

const fsExtra = require('fs-extra');
const copy = promisify(fsExtra.copy);
const remove = promisify(fsExtra.remove);
const writeFile = promisify(fsExtra.outputFile);

let log = function() { return arguments[arguments.length - 1]; };

async function build(options) {
	const packageJson = require('./package.json');

	// files from '/' to be included
	const files = {
		'.': [
			'background/',
			'common/',
			'content/',
			'ui/',
			options.chrome && 'icon.png',
			'icon.svg',
			'LICENSE',
			'manifest.json',
			'package.json',
			'README.md',
		],
		node_modules: {
			jszip: [
				'dist/jszip.min.js',
				'LICENSE.markdown',
			],
			es6lib: [
				'template.js',
				'concurrent.js',
				'dom.js',
				'functional.js',
				'index.js',
				'namespace.js',
				'network.js',
				'object.js',
				'port.js',
				'require.js',
				'string.js',
			],
			'web-ext-utils': {
				browser: [
					'index.js',
					'version.js',
				],
				options: {
					'.': [ 'index.js', ],
					editor: [
						'about.js',
						'about.css',
						'index.js',
						'index.css',
						'inline.css',
						'inline.html',
						'inline.js',
					],
				},
				update: [
					'index.js',
				],
				utils: [
					'inject.js',
					'run-in-tab.js',
				],
			},
		},
	};

	const manifestJson = {
		manifest_version: 2,
		name: packageJson.title,
		short_name: packageJson.title,
		version: packageJson.version + (options.beta ? 'b'+ options.beta : ''),
		author: packageJson.author,
		license: packageJson.license,
		description: packageJson.description,
		repository: packageJson.repository,
		contributions: packageJson.contributions,

		icons: options.chrome ? { 64: 'icon.png', } : { 512: 'icon.svg', },

		minimum_chrome_version: '55.0.0',
		applications: {
			gecko: {
				id: '@'+ packageJson.name,
				strict_min_version: '52.0',
			},
		},

		permissions: [
			'notifications',
			'storage',
			'tabs',
			'*://*/*',
		],
		optional_permissions: [ ],

		background: { page: 'background/index.html', },
		content_scripts: [ ],
		browser_action: {
			default_title: packageJson.title,
			default_popup: 'ui/panel/index.html',
			default_icon: options.chrome ? { 64: 'icon.png', } : { 512: 'icon.svg', },
		},
		options_ui: {
			page: 'node_modules/web-ext-utils/options/editor/inline.html',
			open_in_tab: false,
		},
		web_accessible_resources: [ ], // must be empty

		run_update: { // options for the es6lib/update module
			'base_path': '/update/',
		},

		incognito: 'spanning', // firefox doesn't support anything else
	};

	const outputName = manifestJson.name.toLowerCase().replace(/[^a-z0-9\.-]+/g, '_') +'-'+ manifestJson.version;
	const outDir = options.outDir || resolve(__dirname, './build');

	(await Promise.all([
		buildUpdate(options.update  || { }),
		writeFile(join('.', 'manifest.json'), JSON.stringify(manifestJson), 'utf8'),
		(!options.outDir || options.clearOutDir) && (await remove(outDir).catch(() => log('Could not clear output dir'))),
	]));

	(await Promise.all([
		copyFiles(files, '.', join(outDir, '.')),
	]));

	const bin = 'node "'+ resolve(__dirname, 'node_modules/web-ext/bin/web-ext') +'"';
	const run = command => execute(log('running:', command), { cwd: outDir, });

	if (options.zip || (options.zip == null && !options.run && !options.post)) {
		(await promisify(require('zip-dir'))(outDir, {
			filter: path => !(/\.(?:zip|xpi)$/).test(path),
			saveTo: join(outDir, outputName +'.zip'),
		}));
		log('Created WebExtension package', join(outDir, outputName +'.zip'));
	}
	if (options.post) {
		const url = options.post.url
		? typeof options.post.url === 'number' ? 'http://localhost:'+ options.post.url +'/' : options.post.url
		: 'http://localhost:8888/';
		log((await run(bin +' post --post-url "'+ url +'"')));
	}
	if (options.run) {
		log((await run(bin +' run'+ (options.run.bin ? ' --firefox-binary "'+ options.run.bin  +'"' : ''))));
	}

	return outputName;
}

async function buildUpdate(_) {
	const outputJson = promisify(require('fs-extra').outputJson);
	for (const component of (await FS.readdir(resolve(__dirname, `update`)).catch(() => [ ]))) {
		const names = (await FS.readdir(resolve(__dirname, `update/${ component }`)))
		.filter(_=>_ !== 'versions.json')
		.map(path => basename(path).slice(0, -3));
		(await outputJson(resolve(__dirname, `update/${ component }/versions.json`), names));
	}
}

async function copyFiles(files, from, to) {
	const paths = [ ];
	(function addPaths(prefix, module) {
		if (Array.isArray(module)) { return void paths.push(...module.filter(_=>_).map(file => join(prefix, file))); }
		Object.keys(module).forEach(key => module[key] && addPaths(join(prefix, key), module[key]));
	})('.', files);

	(await Promise.all(paths.map(path =>
		copy(join(from, path), join(to, path))
		.catch(error => console.warn('Skipping missing file/folder "'+ path +'"', error))
	)));
}


if (require.main === module) {
	log = functional.log; // enable logging
	module.exports = build(require('json5').parse(process.argv[2] || '{ }'))
	.then(name => log('Build done:', name))
	.catch(error => { console.error(error); process.exitCode = 1; throw error; });
} else {
	module.exports = build;
}
