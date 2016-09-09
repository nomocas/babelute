var Babelute = require('./index');
require('./examples/isomorphic-html');
Babelute.toLexic('html', ['test']);

var h = Babelute.initializer('html');


var babelute = h()
	.div([
		1, [2, 3, 4, 5],
		[2, 3, 4, 5, 6, 7],
		h().test({ hello: 'world', holipop: 'bloupi goldberg' }),
		4,
		h().test({ ho: true }),
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
	.span(true, h().test({ hooo: 'hiiiiiii', haaaaaa: ['huuuuuue', 'heeeeeeeeeeeee'] }))


console.log('fromJSON : %s', Babelute.fromJSON(JSON.stringify(babelute))._output('html:string'))
