var Babelute = require('./index');
require('./languages/babelute-documentation');

//________________

var bd = Babelute.initializer('babelute-doc');

var bdoc = bd.lexic('foo',
	bd
	.description('a foo lexic')
	.lexem('goo',
		bd.description('a goo lexem')
		.argument('name',
			bd.description('a first goo arg')
		)
		.argument('boo',
			bd.description('a second goo arg')
		)
		.argumentsRest('babelutes',
			bd.description('a third rest goo arg')
		)
		.method(function(name, boo, babelutes) {
			return this._append('foo', 'name', [name])
				._append('foo', 'boo', [boo])
				._append('foo', 'zoo', [babelutes]);
		})
	)
);

console.log('\ndoc sentence : ', bdoc._stringify({
	beautify: true,
	maxLength: 25
}));

//__________________

require('./languages/translations/babelute-doc-to-html');
var htmlBdoc = bdoc._translation('babelute-doc:html')

console.log('\nhtml sentence : ', htmlBdoc._stringify({
	beautify: true,
	maxLength: 25
}));

//__________________

require('./languages/actions/html-to-string');

console.log('\nhtml string:', htmlBdoc.$htmlToString());

// _________________


require('./languages/actions/babelute-doc-to-babelute');
bdoc.$output('babelute-doc:babelute');

var f = Babelute.initializer('foo');

console.log('\ngoo sentence : ', f().goo('hooo', 'hisss')._stringify());


// _________________