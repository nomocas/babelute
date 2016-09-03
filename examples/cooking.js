/**
 * Cooking Domain Language and translations.
 *
 * How to resolve cooking model definitly.
 *
 * Talk about cooking, translate lexem to html/string or html/dom, translate it to graphics/svg or to dietetic/object
 */

var Babelute = require('../index');

// logical atoms
Babelute.toLexic('cooking', ['napper', 'melanger', 'cuire', 'ingredient']);

// ingredients (composed) : should be completed
['beurre', 'sucre', 'chocolat', 'farine', 'oeuf', 'oeufBattu', 'lait']
.forEach(function(name) {
	Babelute.toLexic('cooking', name, function(quantity) {
		return this.ingredient(name, quantity);
	});
});

// translations
var h = Babelute.initializer('html');
Babelute.toLexic('cooking:html', {
	napper: function() {
		return this._use(
			h().div(
				// ...
			)
		);
	},
	melanger: function(nom, ingredients) {
		return this._use(
			h().h1('Mélanger')
			._each(ingredients, h().div(...))
		);
	},
	cuire: function() {},
	ingredient: function() {}
});

// usage

var babelute = b('cooking').melanger(...).cuire('...', b('cooking').melanger(...));


var toHtml = bablute._translation('cooking:html');

toHTML._output('html:dom', myNode);
var stringResult = toHTML._output('html:string');

bablute._translation('cooking:graphics')._output('svg');
bablute._translation('cooking:dietetic')._output('object');

var mBD = bd()
	.babelute('cooking')
	._append('mix', [zoo, bar])
	._append('cuire', [bloupi, foo])
	._use('foo:bar')

mBD._translation('cooking')._translation('cooking:html');



// 
// liexical i18n example
// 

Babelute.toLexic('cooking:fr:en', {
	empiler: function() {
		return this._use(
			b('cooking').stack(
				// ...
			)
		);
	},
	melanger: function() {},
	cuire: function() {},
	ingredient: function() {}
});

var babelute = b('cooking:fr').cuire('...');
bablute._translation('cooking:fr:en', 'cooking:html'); //> traduction du lexic francais vers l'anglais avant traduction postérieur : l'anglais sert de language de référence dans ce cas



/*
	Traduction et changement d'initializer

	parce que lors du parsing elenpi => évaluation up-bottom et que lors du parsin JS c'est du bottom-up ==> on ne peut pas utilier .babelute(...)
	par contre on peut :
		au parsing : à la lecture de "xxx:" (changement d'initializer)
			==> utiliser un .use(h()...)
		A la traduction : 
			==> utiliser un .use(h()...) aussi
 */

/*
	La seule différence entre une babelute simple et un doc :
	le doc reste au tout premier niveau : pas de composition.
	donc lorque .babelute() sur un doc : chope (ou crée) version non composée du lexic demandé

	==> le pilot peut donc s'appliquer sur l'un ou l'autre sans restrictions aucunes
 */



/*
Babelute.toSemantic('toObject', {
	mix:function(name, parts){
		var obj = this[name] = {
			type:'mix',
			name:name
		};
		if(parts)
			if(obj.forEach)
				obj.parts = parts.map(function(p){ return p.output({}, 'object'); });
			else
				obj.quantity = parts || 0;
	},
	cuire:function(name, temp, duration){
		this[name].cooked = {
			temparature:temp,
			duration:duration
		}
	},
	empiler:function(path, parts){
		if(!this[path] || !this[path].type === 'stack')
		{
			var stack = {
				type:'stack',
				name:path
			};
			if(this[path])
				stack.layers = [this[path]];
			else
				stack.layers= [];
			this[path] = stack;
		}
		stack.layers = stack.layers.concat(parts.map(function(p){ return p.output({}, 'object'); }));
	},
	prendre:function(path, quantity){
		
	}
});

var c = babelute.initializer('cooking');

var recette = c()
.beurre(500)
.mix('pate', c().prendre('beurre', 250), c().sucre(250), c().oeuf(3), c().farine(250))
.cuire('pate', 180, 25);


Babelute.prototype.gateauChocolat = function() {
	return this
		.mix('pâte', c().beurre(250), c().farine(250), c().oeufBattu(3))
		.mix('coulis', c().menthe(3), c().framboises(200))
		.attendre('15min')
		.mix('gateau', c().prendre('pâte', 2 / 3), c().sucre(250))
		.empiler('gateau', c().prendre('coulis'), c().prendre('pâte', 1 / 3), c().napage('chocolat'))
		.cuire('gateau', 180, '25min');
}


 */
