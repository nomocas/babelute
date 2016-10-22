var Babelute = require('../../lib/babelute');
require('../html');

var h = Babelute.initializer('html');

Babelute.extendLexic('html', 'babelute-doc:html', {
	lexic: function(name, babelute) {
		return this.div(
			h.class('lexic')
			.h1(name),
			babelute
		);
	},
	lexem: function(name, babelute) {
		return this.div(
			h.class('lexem')
			.h2(name),
			babelute
		);
	},
	actions: function(name, babelute) {
		return this.div(
			h.class('actions')
			.h1(name),
			babelute
		);
	},
	action: function(name, babelute) {
		return this.div(
			h.class('action')
			.h2(name),
			babelute
		);
	},
	description: function(text) {
		return this.div(
			h.class('description')
			.text(text)
		);
	},
	argument: function(name, babelute) {
		return this.div(
			h.class('argument')
			.h3(name),
			babelute
		);
	},
	argumentsRest: function(name, babelute) {
		return this.div(
			h.class('arguments-rest')
			.h3('...' + name),
			babelute
		);
	},
	method: function(func) {
		return this.div(
			h.class('method')
			.text(func + '')
		);
	}
});