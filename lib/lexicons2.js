function Lexicon(name, baseLexicon) {
	this.name = name;

	var Cl = this.Cl = createClass(lexicName, (baseLexicon && baseLexicon.Cl) || Babelute);
	this.FirstDegree = createClass(lexicName, (baseLexicon && baseLexicon.FirstDegree) || BaseFirstDegree)
	this.Instance = new Cl();
	this.initializer = {
		_empty: function() {
			return new Cl();
		}
	};

	if (baseLexicon) {
		this.baseLexicon = baseLexicon;
		for (var i in baseLexicon.initializer)
			addToInitializer(this, i);
	}
}


Lexicon.prototype = {
	addAtoms: function(atomsArray) {},
	addAtom: function(name, method) {},
	addCompounds: function(map) {},
	addCompound: function(name, method) {},
	initializer: function() {},
	firstDegreeInitializer: function() {}
}

function addToInitializer(lexic, method) {
	lexic.initializer = lexic.initializer ||  {};
	lexic.fdInitializer = lexic.fdInitializer ||  {};
	lexic.initializer[method] = function() {
		var instance = new lexic.Cl();
		return instance[method].apply(instance, arguments);
	};
	lexic.fdInitializer[method] = function() {
		var instance = new lexic.FirstDegree();
		return instance[method].apply(instance, arguments);
	};
}

function getFirstDegreeMethod(lexicName, methodName) {
	return function() {
		this._lexems.push(new Lexem(lexicName, methodName, arguments));
		return this;
	};
}

function createClass(lexicName, BaseClass) {
	var Cl = function() {
		BaseClass.call(this);
		this.__babelute__ = lexicName;
	};
	Cl.prototype = new BaseClass();
	return Cl;
}


/**
 * DEFAULT FIRST DEGREE BABELUTE INIT and DEFAULT INITIALIZER
 */

function BaseFirstDegree(lexems) {
	Babelute.call(this, lexems);
	this.__babelute__ = 'default';
}
BaseFirstDegree.prototype = new Babelute();
BaseFirstDegree.prototype._babelute = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		b = new lexic.FirstDegree();
	b._lexems = this._lexems;
	return b;
};

//_____________
//

// parse lexicName:methodName string format and return method from lexic
function execMethod(babelute, req, args) {
	var splitted = req.split(':'),
		lexicName = splitted[0],
		methodName = splitted[1],
		lexic = getLexic(lexicName);
	if (!lexic.Instance[methodName])
		throw new Error('Babelute : method not found : ' + req);
	lexic.Instance[methodName].apply(babelute, args);
}

module.exports = Lexicon;