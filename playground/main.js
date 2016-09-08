Babelute = require('../index');
var html = require('../examples/isomorphic-html');
// require('../examples/isomorphic-html-usage');

var test = function() {
	// var string = `
	// 		foo:
	// 		goo(2) 
	// 		goo(
	// 			true, 1, 
	// 			goo(2) 
	// 			goo(true, 1, null)
	// 			goo(true, 1,  
	// 				goo(true, 1,  
	// 					goo(true, 1, null)
	// 				)
	// 			)  
	// 			goo(true, 1, null)
	// 		) 
	// 		goo(true, 1,  
	// 			goo(true, 1,  
	// 				goo(true, 1, null)
	// 			)
	// 		)  
	// 		goo(true, 1, null)
	// 		goo(2) 
	// 		goo(
	// 			true, 1, 
	// 			goo(2) 
	// 			goo(true, 1, null)
	// 			goo(true, 1,  
	// 				goo(true, 1,  
	// 					goo(true, 1, null)
	// 				)
	// 			)  
	// 			goo(true, 1, null)
	// 		) 
	// 		goo(true, 1,  
	// 			goo(true, 1,  
	// 				goo(true, 1, null)
	// 			)
	// 		)  
	// 	`;

	var string = 'foo:goo()';

	Babelute
		.toLexic('foo', ['goo'])
		.toLexic('bar', ['zoo']);

	var b;
	Babelute.test = function() {
		// Babelute.parse('foo:goo("hello\\"world") goo(true, 1, null) goo(true, 1,  goo(true, 1,  goo(true, 1, null)))  goo(true, 1, null)');
		// console.time('Babelute parse');
		for (var i = 0; i < 1; ++i)
			Babelute.parse(string, {
				asDoc: false,
				acceptFunctions: true
			})

		// var t = console.timeEnd('Babelute parse');

	}

	var h = Babelute.initializer('html');


	h()
		.button('test',
			h().click(function(e) {
				// var t = new Date().getTime();
				Babelute.test();
				// var t2 = new Date().getTime() - t;
				// console.log('b : ', b && b.stringify());
				// document.getElementById('results').innerHTML = '<span>' + t2 + '</span>';
			})
		)
		.div(h().id('results'))
		._output('html:dom', document.body);

	// console.log('b : ', b && b.stringify());

};

test();
