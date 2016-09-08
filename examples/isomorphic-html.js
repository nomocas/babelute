/**
 * Simple but powerful and ultra fast isomorphic html _output engine.
 *
 * One small extendable lexic, two micro _output's semantics (one pure string, one pure dom), and voilà ! ;)
 */

var Babelute = require('../index');

/**********************************************
 ***************** Lexic **********************
 **********************************************/

// logical atoms
Babelute
	.toLexic('html', ['attr', 'class', 'id', 'text', 'click'])
	.toLexic('html', 'tag', function(name, children) {
		return this._append('tag', [name, children], null, function() {
			return name + '(' + Babelute.arrayToString(children) + ')';
		});
	});

// tags (compounds) (should be completed)
['div', 'h1', 'h2', 'section', 'span', 'button', 'a']
.forEach(function(tagName) {
	Babelute.toLexic('html', tagName, function() {
		return this.tag(tagName, [].slice.call(arguments));
	});
});

// => so 14 words defined in the lexic for the moment.
// attr, class, id, text, click, tag, div, h1, h2, section, span, button, a



/**********************************************
 ***************** DOM Actions ****************
 **********************************************/

// we only need logical atoms definitions.
Babelute.toActions('html:dom', {
	__restrictions__: {
		html: true,
		'html:dom': true
	},
	tag: function(opts, node, args /* tagName, babelutes */ ) {
		var child = document.createElement(args[0]);
		node.appendChild(child);
		args[1].forEach(function(templ) {
			if (templ && templ.__babelute__)
				templ._output(opts, this);
			else
				this.appendChild(document.createTextNode(templ));
		}, child);
	},
	text: function(opts, node, args /* value */ ) {
		node.appendChild(document.createTextNode(args[0]));
	},
	class: function(opts, node, args /* className */ ) {
		node.classList.add(args[0]);
	},
	attr: function(opts, node, args /* name, value */ ) {
		node.setAttribute(args[0], args[1]);
	},
	id: function(opts, node, args /* value */ ) {
		node.id = args[0];
	},
	click: function(opts, node, args /* callback */ ) {
		node.addEventListener('click', args[0]);
	}
});



/**********************************************
 ************* HTML-to-String Actions ***********
 **********************************************/

// we only need logical atoms definitions. (without user interactions. aka click.)
Babelute.toActions('html:string', {
	__restrictions__: {
		html: true,
		'html:string': true
	},
	__defaultSubject__: function(opts) {
		return new TagDescriptor();
	},
	__finalise__: function(opts, tag) {
		return tag.children;
	},
	tag: function(opts, tag, args /* tagName, babelutes */ ) {
		var child = new TagDescriptor(),
			actions = opts.actions,
			babelutes = args[1],
			templ;
		for (var i = 0, len = babelutes.length; i < len; ++i) {
			templ = babelutes[i];
			if (templ && templ.__babelute__)
				templ._output(opts, child);
			else if (typeof templ === 'string')
				child.children += templ.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			else
				child.children += templ;
		}
		tagOutput(tag, child, args[0]);
	},
	text: function(opts, tag, args /* value */ ) {
		tag.children += escape(args[0]);
	},
	class: function(opts, tag, args /* className */ ) {
		tag.classes += ' ' + args[0];
	},
	attr: function(opts, tag, args /* name, value */ ) {
		var value = args[1];
		tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? value.replace(/"/g, '\\"') /*.replace(/</g, '&lt;').replace(/>/g, '&gt;') */ : value) + '"';
		// tag.attributes += ' ' + args[0] + '=' + (typeof value === 'string' ? JSON.stringify(value) : ('"' + value + '"'));
	},
	id: function(opts, tag, args /* value */ ) {
		tag.attributes = ' id="' + args[0] + '"' + tag.attributes;
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
