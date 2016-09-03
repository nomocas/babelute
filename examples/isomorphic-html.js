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
	.toLexic('html', ['attr', 'class', 'id', 'text', 'click', 'bloupi'])
	.toLexic('html', 'tag', function(name, children) {
		return this._append('tag', [name, children], function() {
			return name + '(' + Babelute.arrayToString(children) + ')';
		});
	});

// tags (compounds)
// (should be completed)
['div', 'h1', 'h2', 'section', 'span']
.forEach(function(tagName) {
	Babelute.toLexic('html', tagName, function() {
		return this.tag(tagName, [].slice.call(arguments));
	});
});

// => so 12 words defined in the lexic for the moment.
// attr, class, id, text, click, tag, div, h1, h2, section, span



/**********************************************
 ***************** DOM Actions ****************
 **********************************************/

// we only need logical atoms definitions.
Babelute.toActions('html:dom', {
	__restrictions__: {
		html: true
	},
	tag: function(opts, subject, args /*tagName, babelutes*/ ) {
		var child = document.createElement(args[0]);
		subject.appendChild(child);
		args[1].forEach(function(templ) {
			if (typeof templ === 'string')
				this.appendChild(document.createTextNode(templ));
			else if (templ)
				templ._output(opts.actions, this);
		}, child);
	},
	text: function(opts, subject, args /*value*/ ) {
		subject.appendChild(document.createTextNode(args[0]));
	},
	class: function(opts, subject, args /*className*/ ) {
		subject.classList.add(args[0]);
	},
	attr: function(opts, subject, args /*name, value*/ ) {
		subject.setAttribute(args[0], args[1]);
	},
	id: function(opts, subject, args /*value*/ ) {
		subject.id = args[0];
	},
	click: function(opts, subject, args) {
		subject.addEventListener('click', args[0]);
	}
});



/**********************************************
 ************* HTMLtoString Actions ***********
 **********************************************/

// we only need logical atoms definitions.
Babelute.toActions('html:string', {
	__restrictions__: {
		html: true
	},
	__defaultSubject__: function(opts) {
		return new TagObjDescriptor();
	},
	__finalise__: function(opts, subject) {
		return subject.children;
	},
	tag: function(opts, subject, args /*tagName, babelutes*/ ) {
		var child = new TagObjDescriptor(),
			actions = opts.actions;
		args[1].forEach(function(templ) {
			if (templ && templ.__babelute__)
				templ._output(actions, this);
			else
				this.children += templ;
		}, child);
		if (child.children)
			tagOutput(subject, child, args[0]);
	},
	text: function(opts, subject, args /*value*/ ) {
		subject.children += args[0];
	},
	class: function(opts, subject, args /*className*/ ) {
		subject.classes += ' ' + args[0];
	},
	attr: function(opts, subject, args /*name, value*/ ) {
		subject.attributes += ' ' + args[0] + '="' + args[1] + '"';
	},
	id: function(opts, subject, args /*value*/ ) {
		subject.attributes = ' id="' + args[0] + '"' + subject.attributes;
	}
});

// for tags string construction
var TagObjDescriptor = function(tagName) {
	this.children = '';
	this.classes = '';
	this.style = '';
	this.attributes = '';
};

var openTags = /br/, // should be completed
	strictTags = /span|script|meta|div|i/;

function tagOutput(descriptor, child, name) {
	var out = '<' + name + child.attributes;
	if (child.style)
		out += ' style="' + child.style + '"';
	if (child.classes)
		out += ' class="' + child.classes + '"';
	if (child.children)
		descriptor.children += out + '>' + child.children + '</' + name + '>';
	else if (openTags.test(name))
		descriptor.children += out + '>';
	else if (strictTags.test(name))
		descriptor.children += out + '></' + name + '>';
	else
		descriptor.children += out + '/>';
}


/**********************************************
 ***************** USAGE **********************
 **********************************************/

Babelute
	.toLexic('foo', ['zoo', 'bar']);

var h = Babelute.initializer('html');
var templ = h()
	.if(true, h().div('wee"e\'e'))
	._if(true, h().h2('rooooo'))
	.h1('hello h1')
	.section(
		h().div('roooo')
	)
	.span('bou', true, 4)
	._each([12, 22, 32, 42], function(item, index) {
		this.div(item).span(index);
	})
	.bloupi({
		hello: 'world',
		foo: h().div('haaaa')
	}, [1, true, 'string', { f: 1 }, h().bloupi()])
	.click(function(e) {
		console.log('hello world');
	})
	.babelute('foo')
	._use('html:h2', 'hi', h().attr('myAttr', 'heeee').id('bar'))
	.bar('weeeeeeeeeee')


function construct() {
	h()
		.if(true, h().div('wee"e\'e'))
		._if(true, h().h2('rooooo'))
		.h1('hello h1')
		.section(
			h().div('roooo')
		)
		._use('html:h2', 'hi', h().attr('myAttr', 'heeee').id('bar'))
		.span('bou', true, 4)
		._each([12, 22, 32, 42], function(item, index) {
			this.div(item).span(index);
		})
		.bloupi({
			hello: 'world',
			foo: h().div('haaaa')
		}, [1, true, 'strin', { f: 1 }, h().bloupi()])
		.click(function(e) {
			console.log('hello world');
		});
}

console.time('construction');
for (var i = 0; i < 10000; ++i) {
	construct();
}
console.timeEnd('construction'); // +- 95 ms for 10k. so 9 us for each.

console.time('html:string');
for (var i = 0; i < 10000; ++i)
	templ._output('html:string');
console.timeEnd('html:string'); // +- 65 ms for 10k. so 6 us for each.

console.time('stringify');
for (var i = 0; i < 10000; ++i)
	templ.stringify(0);
console.timeEnd('stringify'); // +- 130 ms for 10k. so 13 us for each.

console.time('JSON');
for (var i = 0; i < 10000; ++i)
	JSON.stringify(templ);
console.timeEnd('JSON'); // +- 195 ms for 10k. so 19 us for each.

var result = templ._output('html:string');

console.log('result : \n\n%s\n', result);
console.log('sentence : \n\n%s\n', templ);
// console.log('json : \n\n%s\n', JSON.stringify(templ /*, null, ' '*/ ));
