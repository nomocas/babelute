var Babelute = require('../../lib/babelute');
require('../html');

var h = Babelute.initializer('html');

Babelute.toLexic('aright:html', {
	is: function(type) {
		return this._use(
			h.div(
				h.class('aright-is')
				.text('is ' + name)
			)
		);
	},
	has: function(name, type, babelute) {
		return this._use(
			h.div(
				h.class('aright-property')
				.text('property "' + name + '" of type "' + type + (babelute ? '" as : ' : '')),
				babelute
			)
		);
	},
	or: function() {
		var rules = [].slice.call(arguments);
		return this._use(
			h.div(
				h.class('aright-or')
				.text('or : ')
				._useEach(rules)
			)
		);
	},
	not: function(babelute) {
		return this._use(
			h.div(
				h.class('aright-not')
				.text('not : '),
				babelute
			)
		);
	},
	switch: function(name, map) {
		var keys = Object.keys();
		return this._use(
			h.div(
				h.class('aright-switch')
				.text('switch( ' + name + ' )')
				.each(keys, function(key) {
					this.div(
						h.class('aright-switch-rule'),
						'key :',
						map[key]
					)
				})
			)
		);
	},
	item: function(max) {},
	array: function(max) {}
});

[
	'required',
	'minLength',
	'maxLength',
	'minimum',
	'maximum',
	'format',
	'enum',
	'equal',
	'instanceOf',
	'isArray',
	'null',
]
.forEach(function(check) {
	Babelute.toLexic('aright:html', check, function(value) {
		return this._use(
			h.div(
				h.class('aright-check')
				.text(check + ' : ' + value)
			)
		);
	});
});

//