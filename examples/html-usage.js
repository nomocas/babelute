var Babelute = require('../index');
require('../languages/html'); // load html lexic in Babelute

/**********************************************
 ************* HTML USAGE EXAMPLE *************
 **********************************************/

var h = Babelute.initializer('html');

var myBabelute = h()
	.h1('title h1')
	.if(true, h().div('hello world'))
	.div('some content')
	.h2('title h2')
	.section(
		h().class('my-class')
		.div(
			h().id('foo'),
			'bar zoo'
		)
	)
	.select(
		[{
			value: '1',
			content: 'one'
		}, {
			value: '2',
			content: 'two'
		}], h().on('change', function(e) {
			// do something with e.target
		})
	)
	.button('boum', h()
		.attr('hint', 'badam!')
		.click(function(e) {
			console.log('click !');
		})
		.onHtmlDom(function(opts, node) {
			// do something only when dom output
			// by example use jQuery on node
		})
	);

/**********************************************
 ************* HTML OUTPUTS EXAMPLE ***********
 **********************************************/

// String

require('../languages/actions/html-to-string'); // load html:string actions in Babelute

// produce string output
var stringOutput = myBabelute.$output('html:string');


// DOM

require('../languages/actions/html-to-dom'); // load html:dom actions in Babelute

// apply babelute on any dom node to decorate it (children and attributes)
if (typeof document !== 'undefined')
	myBabelute.$output('html:dom', document.body);