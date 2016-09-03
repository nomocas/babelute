var Babelute = require('./index');

// var b = Babelute.parse('div(1, true, "hello", span("hiiii")) section(true) bloupi()');

// var b = Babelute.parse('div(1, false, undefined, \'hii"i\', { hello:"world", ho:div(1, true) }, null)')
// var b = Babelute.parse('div(1, false, undefined, \'hii"i\', { hello:"world", ho:1, f:div() }, false )')

// var b = Babelute.parse(`div({ 
// 			test:section({}), 
// 			tr:2 
// 		}, 
// 		[
// 			1,
// 			true,
// 			null,
// 			NaN,
// 			{},

// 		div({ t:1, v:[true], c:{ a:span({}) } })
// 		bloupi(null)
// 		foo('bar'),

// 		[Infinity, {}, div()]
// 	]
// )`);


Babelute.toLexic('foo', {
	goo: function(a, b) {
		return this._append('goo', [a, b]);
	}
});
Babelute.toLexic('bar', {
	zoo: function(a, b) {
		return this._append('zoo', [a, b]);
	}
});

// var b = Babelute.parse('div(function(a, b){ if(e){ b = {}; }else{}  return a + b; })')
var b = Babelute.parse(`
	foo:
		goo(
			1, 
			goo() 
			bar:
				zoo(true)
			foo:
				goo(1)
		) 

	bar:
		zoo(true)

`, {
	asDoc: false,
	acceptFunctions: true
})

console.log('b : ', b && b.stringify());

// console.log('b', JSON.stringify(b))
