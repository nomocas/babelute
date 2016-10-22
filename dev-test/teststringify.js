var Babelute = require('./index');
require('./examples/isomorphic-html');
var h = Babelute.initializer('html');

var babelute = h
	.div([
		1, [2, 3, 4, 5],
		[2, 3, 4, 5, 6, 7], {
			hello: 'world',
			holipop: 'bloupi goldberg'
		},
		4, {
			ho: true
		},
		h
		.div(true)
		.div(true)
		.div(
			h.div(true)
			.div(
				h.span('ho')
			)
			.div(true)
			.div(
				h.span('hoooooooo')
			)
			.div(true)
			.div(true)
			.div(true)
		)
		.div(true)
		.div(true)
		.div(true)
		.div(true)
	])
	.span(true, {
		hooo: 'hiiiiiii',
		haaaaaa: ['huuuuuue', 'heeeeeeeeeeeee']
	})
console.log('\n%s\n',
	babelute._stringify({
		beautify: true,
		maxLength: 25
	})
);

Babelute.toLexic('foo', {
	goo: function(a, b) {
		return this._append('foo', 'goo', [a, b]);
	}
});
var f = Babelute.initializer('foo');
var b = h.div(
		f.goo('hello', h.h1('wep').span(1)).goo(),
		'world',
		h.section(true), {
			a: f.goo(),
			b: h.div()
		}
	)
	.h2('bloupi')

console.log('\n%s\n',
	b._stringify({
		beautify: true,
		maxLength: 15
	})
);