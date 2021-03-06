(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/dom': { saveAs, },
	'common/epub': EPub,
	'common/options': options,
	require,
}) => async (collector, params = { }) => {

	const collect = (await require.async('content/collect/'+ collector));
	const contents = (await collect({ styles: options.collectStyles.value, ...params, }));
	if (!contents) { return null; }

	const book = new EPub(Object.assign(contents, { markNav: options.setNavProperty.value, }));
	(await book.loadResources());
	saveAs((await book.toBlob()), book.name);

	return book.name;
}); })(this);
