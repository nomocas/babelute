/**
 * Simple but powerful and ultra fast isomorphic html output engine.
 *
 * One small extendable lexic, two micro $output's semantics (one pure string, one pure dom), and voilà ! ;)
 */

var Babelute = require('../lib/babelute');

/*******
 *******	LANGUAGE ATOMS (simply enqueueing lexems)
 *******/
Babelute
	.toLexic('html', ['tag', 'attr', 'prop', 'class', 'id', 'text', 'on']); // simple atoms

/*******
 *******	COMPOUNDS WORDS (based on language atoms)
 *******/
// simple tags (made with .tag) (list should be completed)
['div', 'h1', 'h2', 'h3', 'section', 'span', 'button', 'option', 'article']
.forEach(function(tagName) {
	Babelute.toLexic('html', tagName, function() {
		return this.tag(tagName, [].slice.call(arguments));
	});
});

// events (made with .on) (list should be completed)
['click', 'mouseover', 'keyup']
.forEach(function(eventName) {
	Babelute.toLexic('html', eventName, function(callback) {
		return this.on(eventName, callback);
	});
});


// compounds tags (made with other tags)
var h = Babelute.initializer('html');
Babelute.toLexic('html', {
	a: function(href, content) {
		return this.tag('a', [h.attr('href', href), content]);
	},
	select: function(optionsList, selectBabelute) {
		return this.tag('select', [
			h._each(optionsList, function(opt) {
				if (opt.__babelute__)
					this.option(opt);
				else
					this.option(
						h.attr('value', opt.value),
						opt.content
					);
			}),
			selectBabelute
		]);
	},
	input: function(type, val, babelute) {
		return this.tag('input', [h.attr('type', type).attr('value', val), babelute]);
	},
	textInput: function(val, babelute) {
		return this.input('text', val, babelute);
	},
	strong: function(content) {
		return this.span(h.class('strong'), content);
	}
});

// => so 25 words defined in the lexic for the moment.
// tag, attr, prop, class, id, text, on, click, mouseover, keyUp, div, h1, h2, h3, section, article, span, button, a, select, option, strong, onHtmlString, onHtmlDom
//