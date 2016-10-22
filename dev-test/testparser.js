var Babelute = require('./index');
require('./examples/isomorphic-html');
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


// var string = `
// html:
// if(true,div("wee\"e'e"))
// h2("rooooo <hooo>haaa</hooo>")
// h1("hello h1")
// section(
// 	div("l'hotel\t\n\t\t\t\"california\"")
// )
// span("bou",true,4)
// div(12)
// span(0)
// div(22)
// span(1)
// div(32)
// span(2)
// div(42)
// span(3)
// click(function (e) {
// 		console.log('hello world');
// 	})
// section(
// 	attr("test",1)
// 	attr("b",true)
// 	attr("c",null)
// 	attr("d","l'hotel\t\"california\"")
// 	attr("e","l'hotel\t\"california\"")
// )
// test({ hello: "world" })
// button(
// 	"boum",
// 	attr("hint","badam!")
// 	click(function (e) {
// 				console.log('click !');
// 			})
// )
// `;

var string = `
#html:if(true,div("wee\\"e'e"))
`;

console.log('string : ', string);

Babelute.toLexic('foo', {
	goo: function(a, b) {
		return this._append('foo', 'goo', [a, b]);
	}
});
Babelute.toLexic('bar', {
	zoo: function(a, b) {
		return this._append('bar', 'zoo', [a, b]);
	}
});

// 		acceptFunctions: true,
// var b = Babelute.parse('foo:goo(function(a, b){ if(e){ b = {}; } else {}  return a + b; })', { acceptFunctions: true })
var b = Babelute.parse(string, {
		acceptFunctions: true
	})
	// var b = Babelute.parse(`
	// 	foo:
	// 		goo( 
	// 			goo() 
	// 			bar:
	// 				zoo(true)
	// 			foo:
	// 				goo(1)
	// 		) 

// 	bar:
// 		zoo(true)

// `, {
// 	asDoc: false,
// 	acceptFunctions: true
// })

// console.time('Babelute parse');
// for (var i = 0; i < 10000; ++i)

// var b = Babelute.parse('foo:goo("hello\\"world") goo(true, 1, null) goo(true, 1,  goo(true, 1,  goo(true, 1, null)))  goo(true, 1, null)')
// var b = Babelute.parse('foo:goo("hello\\"world")')
console.log('\nb : ', b && b._stringify());
// console.log('\n\ncounts : ', Babelute.Parser.counts, '\n');



// console.timeEnd('Babelute parse');

// var b = Babelute.parse('foo:goo("hello\\"world") bar:zoo(true)')
// console.log('b : ', b && b.stringify());

// console.log('b', JSON.stringify(b))