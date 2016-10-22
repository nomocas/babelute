var Babelute = require('../../lib/babelute');

// utils :
var mapEncode = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;" // ' -> &apos; for XML only
	},
	mapDecode = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": "\"",
		"&#39;": "'"
	};

function encodeHtmlSpecialChars(str) {
	return str.replace(/[&<>"']/g, function(m) {
		return mapEncode[m];
	});
}

function decodeHtmlSpecialChars(str) {
	return str.replace(/(&amp;|&lt;|&gt;|&quot;|&#39;)/g, function(m) {
		return mapDecode[m];
	});
}

/**********************************************
 ************* HTML-to-String Actions ***********
 **********************************************/


Babelute.toLexic('html', {
	// only-on-string-output handler
	onHtmlString: function(callback) {
		return this._append('html:string', 'onHtmlString', [callback]);
	}
});

// actions :
// we only need logical atoms definitions. (without user interactions. aka click etc.)
Babelute.toActions('html:string', {
	// Output engines related
	__restrictions__: {
		html: true,
		'html:string': true
	},
	// Actions
	tag: function(tag, args /* tagName, babelutes */ , env) {
		var child = new TagDescriptor(),
			actions = env.actions,
			babelutes = args[1],
			templ;
		for (var i = 0, len = babelutes.length; i < len; ++i) {
			templ = babelutes[i];
			if (typeof templ === 'undefined')
				continue;
			if (templ.__babelute__)
				templ.$output(env, child);
			else if (typeof templ === 'string')
				child.children += encodeHtmlSpecialChars(templ); //.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			else
				child.children += templ;
		}
		tagOutput(tag, child, args[0]);
	},
	text: function(tag, args /* value */ ) {
		tag.children += encodeHtmlSpecialChars(args[0]);
	},
	class: function(tag, args /* className */ ) {
		tag.classes += ' ' + args[0];
	},
	attr: function(tag, args /* name, value */ ) {
		var value = args[1];
		// tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? encodeHtmlSpecialChars(value) : value) + '"';
		tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? value.replace(/"/g, '\\"').replace(/</g, '&lt;').replace(/>/g, '&gt;') : value) + '"';
	},
	id: function(tag, args /* value */ ) {
		tag.attributes = ' id="' + args[0] + '"' + tag.attributes;
	},
	onHtmlString: function(tag, args) {
		args[0](tag);
	}
});

// for tags string construction
var TagDescriptor = function(tagName) {
	this.children = '';
	this.classes = '';
	this.style = '';
	this.attributes = '';
};

var openTags = /br/, // should be completed
	strictTags = /span|script|meta|div|i/;

function tagOutput(tag, child, name) {
	var out = '<' + name + child.attributes;
	if (child.style)
		out += ' style="' + child.style + '"';
	if (child.classes)
		out += ' class="' + child.classes + '"';
	if (child.children)
		tag.children += out + '>' + child.children + '</' + name + '>';
	else if (openTags.test(name))
		tag.children += out + '>';
	else if (strictTags.test(name))
		tag.children += out + '></' + name + '>';
	else
		tag.children += out + '/>';
}

Babelute.prototype.$htmlToString = function() {
	return this.$output('html:string', new TagDescriptor()).children;
};