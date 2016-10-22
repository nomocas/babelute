Babelute = require('../index');
require('../languages/html');
require('../babelute-html/html-view');
Babelute.extendLexic('html', 'myhtml');

var h = Babelute.initializer('myhtml');

Babelute.toLexic('myhtml', {
	filterableProductsTable: function(products) {
		return this.view({
			filterProducts: function(filter, products) {
				return products.filter(function(prod) {
					return prod.title.indexOf(filter) > -1;
				});
			},
			getInitialState: function() {
				return {
					filter: ''
				};
			},
			render: function(state) {
				return h.div(
					h.class('filterable-products-table')
					.searchBar(state.filter, function(e) {
						state.set({
							filter: e.target.value
						});
					})
					.productsTable(this.filterProducts(state.filter, products))
					.button('add one', h.click(function(e) {
						products.unshift({
							title: 'haaaiiu' + Math.random(),
							label: 'youhou'
						});
						state.render();
					}))
				);
			}
		});
	},
	productsTable: function(products) {
		return this.div(
			h.class('products-table')
			._each(products, this.product)
		);
	},
	product: function(product) {
		return this.div(
			h.class('product-row')
			.h3(product.title)
			.div(product.label)
			.text('floupi doupi')
			.div('second text')
			.click(function(e) {
				console.log('heu')
			})
		);
	},
	searchBar: function(filter, updateFilter) {
		return this.div(
			h.class('search-bar')
			.textInput(filter,
				h.attr('placeHolder', 'search term')
				.on('input', updateFilter)
			)
		);
	}
});

/**
 * usage
 */

function render3() {
	var t = h.div('world' + Math.random(),
		h.attr('bloupi', 'foo')
		.h3('hooooooo' + Math.random())
		.section('hello',
			h.div('hoooooojjjjjjo')
		)
	)
	for (var i = 0; i < 500; ++i)
		t.div('world' + Math.random(),
			h.attr('bloupi', 'foo')
			.h3('hooooooo' + Math.random())
			.section('hello',
				h.attr('bloupi', 'foo').div('hoooooojjjjjjo')
			)
			.click(function(e) {
				console.log('heu')
			})
		);
	return t;
}

function getProducts() {
	var products = [];
	for (var i = 0; i < 100; ++i)
		products.push({
			title: 'hoooo' + Math.random(),
			label: 'hissss'
		}, {
			title: 'haaa',
			label: 'huussss'
		}, {
			title: 'hiiio',
			label: 'heeessss'
		});
	return products;
}



function render2() {
	return h
		.text('bloupiiii')
		.div(h.span('hiii'))
		.filterableProductsTable(getProducts())
		.div('yeeeeeehaaaaa');
}

var t = render2();

function render() {
	return t;
}


/**
 * outputs
 */

require('../languages/actions/html-to-string');
require('../languages/actions/html-to-dom');
require('../babelute-html/html-to-vdom');
require('../babelute-html/html-to-deathmood');

// console.log('j : %s', JSON.stringify(t))
// console.log('t : %s', t._stringify())
// console.log('r : %s', t.$htmlToString());

// 

function testJSON(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		JSON.stringify(render());
	}
	time = new Date().valueOf() - time;
	console.log('JSON : %s - %s', time, time / max);
}

function testStringify(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render()._stringify();
	}
	time = new Date().valueOf() - time;
	console.log('Serialize : %s - %s', time, time / max);
}

function testString(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render().$htmlToString();
	}
	time = new Date().valueOf() - time;
	console.log('html:string : %s - %s', time, time / max);
}

function testDom(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		$root.innerHTML = '';
		render().$htmlToDOM($root)
	}
	time = new Date().valueOf() - time;
	console.log('html:dom : %s - %s', time, time / max);
}

function testVdom(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToVDOM($root, nt)
	}
	time = new Date().valueOf() - time;
	// console.log('html:vdom', time)
}

function testDeathmood(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToDeathmood($root, nt);
	}
	time = new Date().valueOf() - time;
	console.log('html:deathmood : %s - %s', time, time / max);
	return nt;
}


function runAll(max, render) {
	console.log('________________ %sx', max);
	testJSON(max, render);
	testStringify(max, render);
	testString(max, render);
	testDeathmood(max, render); // 152, 148, 100 - 320, 800, 275 -   400, 1400, 426 ---   544, 2033, 618  --- 258, 337, 111
	testDom(max, render); // 178, 219, 161  -  496, 1001, 320 --  535, 1650, 476 - 587, 2127, 651  --- 684, 872, 166
	// testVdom(max, render);
}

var currentRender = render2;

var $root = document.getElementById('root'),
	$singleDOMTest = document.getElementById('single-dom-test-button'),
	$singleDeathMoodTest = document.getElementById('single-deathmood-test-button'),
	$domTest = document.getElementById('test-dom-button'),
	$deathmoodTest = document.getElementById('test-deathmood-button'),
	$all = document.getElementById('test-all-button'),
	$clear = document.getElementById('clear-button');


var maxTest = 200,
	testDelay = 50;

$domTest.addEventListener('click', function() {
	$root.innerHTML = '';
	var count = 0,
		totalTime = 0,
		intervalID = setInterval(function() {
			var time = new Date().valueOf();
			$root.innerHTML = '';
			currentRender().$htmlToDOM($root);
			time = new Date().valueOf() - time;
			totalTime += time;
			count++;
			if (count === maxTest) {
				console.log('dom 100x : %s - %s', totalTime, totalTime / maxTest)
				clearInterval(intervalID);
			}
		}, testDelay);
});
$deathmoodTest.addEventListener('click', function() {
	$root.innerHTML = '';
	var count = 0,
		totalTime = 0,
		nt,
		intervalID = setInterval(function() {
			var time = new Date().valueOf();
			nt = currentRender().$htmlToDeathmood($root, nt);
			time = new Date().valueOf() - time;
			totalTime += time;
			count++;
			if (count === maxTest) {
				console.log('deathmood 100x : %s - %s', totalTime, totalTime / maxTest)
				clearInterval(intervalID);
			}
		}, testDelay);
});

$all.addEventListener('click', function() {
	$root.innerHTML = '';
	runAll(100, currentRender);
});

var nt;
$singleDeathMoodTest.addEventListener('click', function() {
	var time = new Date().valueOf();
	nt = currentRender().$htmlToDeathmood($root, nt);
	time = new Date().valueOf() - time;
	console.log('single deathmood test', time)
});
$singleDOMTest.addEventListener('click', function() {
	var time = new Date().valueOf();
	$root.innerHTML = '';
	currentRender().$htmlToDOM($root)
	time = new Date().valueOf() - time;
	console.log('single dom test', time)
});

$clear.addEventListener('click', function() {
	$root.innerHTML = '';
	nt = null;
});

// runAll(1, currentRender);

//