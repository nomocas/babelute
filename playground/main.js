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
				h.div('hoooooojjjjjjo')
			)
			.click(function(e) {
				console.log('heu')
			})
		);
	return t;
}

function render2() {
	return h
		.text('bloupiiii')
		.div(h.span('hiii'))
		.filterableProductsTable([{
			title: 'hoooo' + Math.random(),
			label: 'hissss'
		}, {
			title: 'haaa' + Math.random(),
			label: 'huussss'
		}, {
			title: 'hiiio' + Math.random(),
			label: 'heeessss'
		}])
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
	console.log('JSON', time)
}

function testStringify(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render()._stringify();
	}
	time = new Date().valueOf() - time;
	console.log('Serialize', time)
}

function testString(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render().$htmlToString();
	}
	time = new Date().valueOf() - time;
	console.log('html:string', time)
}

function testDom(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		$root.innerHTML = '';
		render().$htmlToDOM($root)
	}
	time = new Date().valueOf() - time;
	$root.innerHTML = '';
	console.log('html:dom', time)
}

function testVdom(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToVDOM($root, nt)
	}
	time = new Date().valueOf() - time;
	console.log('html:vdom', time)
}

function testDeathmood(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToDeathmood($root, nt);
	}
	time = new Date().valueOf() - time;
	console.log('deathmood1', time)
}


function runAll(max, render) {
	console.log('________________');
	// testJSON(max, render);
	// testStringify(max, render);
	// testString(max, render);
	testDeathmood(max, render);
	// testDom(max, render);
	// testVdom(max, render);
}


var $root = document.getElementById('root'),
	$reload = document.getElementById('test-button');

$reload.addEventListener('click', function() {
	runAll(1, render3);
});


runAll(1, render3);

//