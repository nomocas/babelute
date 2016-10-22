var Babelute = require('./index');
require('./examples/isomorphic-html');

var hd = Babelute.firstLevelInitializer('html');
var babelute = hd
	.div(
		hd
		.section(true)
	)
	.span(true, ' - hii"iiiii');

console.log('\ntranslated : %s\n', babelute._translation('html').$htmlToString());