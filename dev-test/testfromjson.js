var Babelute = require('./index');
require('./examples/isomorphic-html');
Babelute.toLexic('html', ['test']);

var h = Babelute.initializer('html');
var hd = Babelute.firstLevelInitializer('html');


var babelute = h
	.div(
		h
		.section(true)
	)
	.span(true, 'hiiiiiii');


console.log('fromJSON : %s', Babelute.fromJSON(JSON.stringify(babelute)).$htmlToString())

babelute = hd
	.div(
		hd
		.section(true)
	)
	.span(true, 'hiiiiiii');


console.log('\nfromJSON : %s', babelute._stringify()); //$output('html:string'))
console.log('\nfromJSON : %s', Babelute.fromJSON(JSON.stringify(babelute))._stringify()); //$output('html:string'))