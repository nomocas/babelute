var Babelute = require('./index');
require('./examples/isomorphic-html');
var h = Babelute.initializer('html');


var babelute = h()
	.div([
		1, [2, 3, 4, 5],
		[2, 3, 4, 5, 6, 7],
		{ hello: 'world', holipop: 'bloupi goldberg' },
		4,
		{ ho: true },
		h()
		.div(true)
		.div(true)
		.div(
			h().div(true)
			.div(
				h().span('ho')
			)
			.div(true)
			.div(
				h().span('hoooooooo')
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
	.span(true, { hooo: 'hiiiiiii', haaaaaa: ['huuuuuue', 'heeeeeeeeeeeee'] })


console.log(
	Babelute.valueToString(babelute, {
		beautify: true,
		maxLength: 25
	})
);
