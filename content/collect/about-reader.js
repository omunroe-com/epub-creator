(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
}) => async function collect() {
/**
 * Collects the contents of an about:reader view.
 * @return {object} Options that can be passed as argument to the EPub constructor.
 */

const doc = document.querySelector('.container').cloneNode(true);

const resources = Array.map(doc.querySelectorAll('img'), ({ src, }) => ({ src, name: src.match(/:\/\/.*?\/(.*)$/)[1], }));
const title = doc.querySelector('.reader-title').textContent;
const url = doc.querySelector('.reader-domain').href;
const author = prompt('Please enter/confirm the authors name', (
	doc.querySelector('.vcard .author.fn') || doc.querySelector('.vcard .author') || doc.querySelector('.author')
	|| doc.querySelector('.reader-credits') || { textContent: '<unknown>', }
).textContent || '<unknown>');
if (author == null) { return null; }

Array.forEach(doc.querySelectorAll('img'), img => {
	!img.alt && (img.alt = 'IMAGE');
	img.src = img.src.match(/:\/\/.*?\/(.*)$/)[1];
});
Array.forEach(doc.querySelectorAll('style, link, menu'), element => element.remove());
Array.forEach(doc.querySelectorAll('*'), element => {
	for (let i = element.attributes.length; i-- > 0;) {
		const attr = element.attributes[i];
		if ([ 'class', 'src', 'href', 'title', 'alt', ].includes(attr.name)) { continue; }
		element.removeAttributeNode(attr);
	}
});

return ({
	chapters: [ {
		name: 'content.xhtml',
		title,
		content: toXML(doc),
		mimeType: 'text/xhtml-body',
		linear: true,
	}, ],
	title,
	description: `Offline reader version of ${url}`,
	language: null,
	creator: [ { name: author, role: 'author', }, ],
	resources,
	cover: false,
	nav: false,
});


function toXML(element) {
	return (new global.XMLSerializer).serializeToString(element);
}

}); })(this);
