var Babelute = require('../index');
require('../languages/html');
require('../languages/actions/html-to-string');

/**********************************************
 ***************** Test **********************
 **********************************************/

Babelute.toLexic('html', ['test']);

var h = Babelute.initializer('html');
var templ = h
	.if(true, h.div('wee"e\'e'))
	._if(true, h.h2('rooooo <hooo>haaa</hooo>'))
	.h1('hello h1')
	.section(
		h.div(`l'hotel	
			\"california\"`)
	)
	// ._use('html:h2', 'hi', h.attr('myAttr', 'he"eee<hooo>haaa</hooo>').id('bar')) // use compound html tag
	.span('bou', true, 4)
	._each([12, 22, 32, 42], function(item, index) {
		this.div(item).span(index);
	})
	.click(function(e) {
		console.log('hello world');
	})
	.section(
		h
		.attr('test', 1)
		.attr('b', true)
		.attr('c', null)
		.attr('d', "l'hotel	\"california\"")
		.attr('e', 'l\'hotel	"california"')
	)
	.test({
		hello: 'world'
	})
	.button('boum', h
		.attr('hint', 'badam!')
		.click(function(e) {
			console.log('click !');
		})
	);

function construct() {
	h
		.if(true, h.div('wee"e\'e'))
		._if(true, h.h2('rooooo'))
		.h1('hello h1')
		.section(
			h.div("l'hotel	\"california\"")
		)
		._use('html:h2', 'hi', h.attr('myAttr', 'heeee').id('bar'))
		.span('bou', true, 4)
		._each([12, 22, 32, 42], function(item, index) {
			this.div(item).span(index);
		})
		.click(function(e) {
			console.log('hello world');
		})
		.section()
		.button('boum', h
			.attr('hint', 'badam!')
			.click(function(e) {
				console.log('click !');
			})
		)
}

console.time('construction\t');
for (var i = 0; i < 10000; ++i) {
	construct();
}
console.timeEnd('construction\t'); // +- 100 ms for 10k. so 10 us for each. so 360 ns per node

console.time('html:string\t');
for (var i = 0; i < 10000; ++i)
	templ.$htmlToString();
console.timeEnd('html:string\t'); // +- 90 ms for 10k. so 9 us for each. so 335 ns per node

console.time('stringify\t');
for (var i = 0; i < 10000; ++i)
	templ._stringify({
		beautify: false,
		maxLength: 20
	});
console.timeEnd('stringify\t'); // +- 130 ms for 10k. so 13 us for each. so 480 ns per node

console.time('JSON stringify\t');
for (var i = 0; i < 10000; ++i)
	JSON.stringify(templ);
console.timeEnd('JSON stringify\t'); // +- 230 ms for 10k. so 23 us for each. so 810 ns per node

var string = JSON.stringify(templ);

console.time('JSON parse\t');
for (var i = 0; i < 10000; ++i)
	JSON.parse(string);
console.timeEnd('JSON parse\t'); // +- 270  ms for 10k. so 27 us for each. so 900 ns per node

var stringified = templ._stringify({
	beautify: true,
	maxLength: 30
});
var t = new Date().getTime(),
	n;
console.time('Babelute parse\t');
for (var i = 0; i < 10000; ++i)
	n = Babelute.parse(stringified, {
		asDoc: false,
		acceptFunctions: true
	});
console.timeEnd('Babelute parse\t'); // +- 230 ms for 10k. so 23 us for each. so 840 ns per node
var t2 = new Date().getTime() - t;

// if (typeof document !== 'undefined')
// 	document.body.innerHTML = '<div>' + t2 + '</div>';

// console.log('counts : ', Babelute.Parser.counts);

var r1 = templ && templ.$htmlToString(),
	r2 = n && n.$htmlToString();

console.log('\n\nstringified: \n\n%s\n', stringified);
// console.log('\n\nresult : \n\n%s\n', r1);
console.log('sentence : \n\n%s\n', n);
console.log('\n\nresult2 : \n\n%s\n', r2);
console.log('\n\nresult equal : %s', r1 === r2);


// var total = 0;
// for (var i in Babelute.Parser.counts)
// 	total += Babelute.Parser.counts[i];
// console.log('\n\nresult total : %s', total);


// console.log('json : \n\n%s\n', JSON.stringify(templ /*, null, ' '*/ ));