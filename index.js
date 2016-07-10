/**
 * babelute
 * Chained mediators pattern for (much) better software design. A whole new world.
 *
 * @licence MIT
 */


/*
************************************* All code below was the first shoot before full understanding.... it's just there for reflexion base.


	Dans les chaines : 

	interprétation immédiate
	interprétation différée
	interprétation différée avec choix du dictionaire sémantique

	avantages écriture sérialisé :
			- pas obligatoire d'avoir l'api défini 
			--> au parsing on peut direct enqueuer la représentation objet
 */
/*
	dico.engine.base = {
		// mettre ici ce qui est commun. lors run : d'abord regarder dans engin courant puis regarder dans base
		log:function(){
	
		}
	}

 	Babelute.prototype.output = function(target, ?engines...){
		var handler = this._queue[0],
		index = 0,
		f;
		while (handler) {
			f = typeof handler.name === 'string' ? engine[handler.name] : handler.name;
			if (!f) {
				handler = this._queue[++index];
				continue;
			}
			if (f.__chaim__)
				f.output(target, engines);
			else
				f.apply(target, handler.args);
			handler = this._queue[++index];
		}
		return target;
	}



	//__________________________________________________
	//__________________________________________________

	var quantityMixHandler = function(name){
		return function(quantity){
			return this.mix(name, quantity);
		}
	}

	dico
		.toApi('cuisine', 'beurre', quantityMixHandler('beurre'))
		.toApi('cuisine', 'sucre', quantityMixHandler('sucre'))
		.toApi('cuisine', 'chocolat', quantityMixHandler('chocolat'))
		.toApi('cuisine', 'oeuf', quantityMixHandler('oeuf'))
		.toApi('cuisine', 'oeufBattu', quantityMixHandler('oeufBattu'))
		.toApi('cuisine', 'cuire', function(temp, duration){
			return this._enqueue('cuire', [temp, duration]);
		})
		.toApi('cuisine', 'empiler', function(path){
			var parts = [].slice.call(arguments, 1);
			return this._enqueue('empiler', [path, parts]);
		})
		.toApi('cuisine', 'mix', function(name){
			name = typeof name === 'string' ? name : false;
			var parts = [].slice.call(arguments, name ? 1 : 0);
			return this._enqueue('mix', [name, parts]);
		})

	//__________________________________________________


	dico.engine.object = {
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
	};

	// exemple (rough)

	var c = chaim.initier('recette-cuisine'), o = chaim.initier('object');
	
	var recette = c()
	.beurre(500)
	.mix('pate', c().prendre('beurre', 250), c().sucre(250), c().oeuf(3), c().farine(250))
	.cuire('pate', 180, 25);

	var gateauDB = function(recette){
		return this
			.meta('author', db().ownerID())
			.meta('creationDate', db().now())
			.use(recette)
	};

	var output = quatreQuart.output({}, 'object');

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


var Babelute = function() {
	this.__chaim__ = true;
	this._queue = [];
}

Babelute.engine = {}
Babelute.parse = function(initier, string) {}

// Babelute main initier
Babelute.ch = function(target) {
	return new Babelute(target);
}

Babelute.prototype = {
	_enqueue: function(name, args) {
		this._queue.push({ name: name, args: args });
		return this;
	},
	use: function(chaim) {
		if (!chaim)
			return this;
		var args = [].slice.call(arguments, 1);
		var method = chaim;
		if (typeof chaim === 'string') {
			method = this[chaim];
			if (!method)
				throw new Error('Babelute : method not found : ' + chaim);
		}
		if (method.__chaim__)
			this._queue = this._queue.concat(method._queue);
		else
			method.apply(this, args);
		return this;
	},
	toString: function() {
		return this._queue.map(function(item) {
			return item.name + '(' + (item.args ? item.args.join(',') : '') + ')';
		}).join('.');
	}
};


Babelute.engine.toObject = {
	object: function(name, child) {
		this[name] = {};
		if (child)
			child.toObject(this[name]);
	},
	array: function(name) {
		this[name] = [];

	}
}

Babelute.prototype.toObject = function(target) {
	var handler = this._queue[0],
		index = 0,
		f;
	while (handler) {
		f = typeof handler.name === 'string' ? engine[handler.name] : handler.name;
		if (!f) {
			handler = this._queue[++index];
			continue;
		}
		if (f.__chaim__ && f.toObject)
			f.toObject(target);
		else
			f.apply(target, handler.args);
		handler = this._queue[++index];
	}
	return target;
};
