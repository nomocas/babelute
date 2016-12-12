/**
 * A FirstDegreeNode is just a Bablute that keeps any appended lexem at top logical level (that means that any compounded lexem (made with other lexems) is added as an atomic lexem).
 * 
 * A Babelute Document is a Babelute that you could edit. Think about a XML/HTML Document.
 * The aim is to allow full edition and construction of Babelute sentences.
 * (babelute node wrapping, insertBefore, prepend, query nodes, etc)
 * 
 * A FirstDegreeNode document, that holds others FirstDegreeNode as inner lexems, forms a valid babelute.
 * Every call on a FirstDegreeNode are just appended to lexems in object form (aka { name:myLexemName, args:[myArgs...] }).
 *
 * So it keeps things the more abstract possible. 
 * 
 * To became $outputable : it needs an additional translation to itself.
 * aka : bfd('myLexic').bla().bla()._translate('myLexic').$output(...)
 *
 * See docs for more infos
 */

var Babelute = require('./babelute'),
	Lexem = Babelute.Lexem,
	lexicsDico = {};

/********************
 * TRANSLATION
 ********************/

/*
	WARNING AND TODO : 
	- finalise theory on objects and array translations
		==> the problems = it's heavy to translate all objects and array by default
		==> all arrays and objects does not necessary contain babelutes that need translation

		==> so we would need to declare what needs translation and what not
		
		as in babelute documentation

		but if we do that, we need to follow documentation while translating
 */

Babelute.prototype._translation = function(lexicName) {
	var lexic = getLexic(lexicName),
		b = new lexic.Cl();
	this._lexems.forEach(function(lexem) {
		var args = [];
		for (var i = 0, len = lexem.args.length; i < len; ++i)
			args.push(translateValue(lexicName, lexem.args[i]));
		if (this[lexem.name])
			this[lexem.name].apply(this, args);
		else
			this._lexems.push(new Lexem(lexem.lexic, lexem.name, args));
	}, b);
	return b;
}

function translateValue(lexicName, value) {
	if (!value)
		return value;
	if (value.__babelute__)
		return value._translation(lexicName);
	else if (typeof value === 'object') {
		if (value.forEach)
			return value.map(function(item) {
				return translateValue(lexicName, item);
			});
		var obj = {};
		for (var i in value)
			obj[i] = translateValue(lexicName, value[i]);
		return obj;
	} else return value;
}

/**
 * get new dedicated babelute handler that act on same aray of lexems (current one)
 * return new babelute specialised with lexicName
 */
Babelute.prototype._babelute = function(lexicName) {
	var lexic = getLexic(lexicName),
		Cl = lexic.Cl,
		b = new Cl();
	b._lexems = this._lexems;
	return b;
};
/**
 * get new babelute handler of same type than current one (independant of current array of lexems)
 * return new babelute specialised with lexicName or current lexic
 */
Babelute.prototype._new = function(lexicName) {
	return initializer(lexicName ||  this.__babelute__ !== true ? this.__babelute__ : null);
};

/**
 * Add method(s) to specified lexic
 * @param  {String} lexicName  	the name of the lexic where happening method(s)
 * @param  {String | Array | Object} 	If is string : it's the name of the method. If is array of string : each string is the name of a logical atom method. If is an object : it's used as a map of methods.
 * @param  {Function} method    the method function. used only if methoName is a string.
 * @return {Babelute}   		Babelute for chaining
 */
function toLexic(lexicName, methodName, method) {
	var lexic = lexicsDico[lexicName] || extendLexic('default', lexicName).getLexic(lexicName);
	if (typeof methodName === 'object') {
		if (methodName.forEach) {
			// array of logical atoms. pure single _append
			methodName.forEach(function(methodName) {
				addLexem(lexic, lexicName, methodName);
			});
		} else {
			// map of methods
			for (var i in methodName)
				addLexem(lexic, lexicName, i, methodName[i]);
		}
	} else
		addLexem(lexic, lexicName, methodName, method);
	return Babelute;
}

function addLexem(lexic, lexicName, methodName, method) {
	var fdproto = lexic.FirstDegree.prototype;
	fdproto[methodName] = getFirstDegreeMethod(lexicName, methodName);
	lexic.Cl.prototype[methodName] = method || fdproto[methodName];
	addToInitializer(lexic, methodName);
}

// duplicate specified lexic to newName and add provided methods to it.
function extendLexic(lexicName, newName, methods) {
	initLexic(newName, getLexic(lexicName));
	if (methods)
		toLexic(newName, methods);
	return Babelute;
}

// return specified lexic.
function getLexic(lexicName) {
	var lexic = lexicsDico[lexicName];
	if (!lexic)
		throw new Error('Babelute : lexic not found : ' + lexicName);
	return lexic;
}

function createClass(lexicName, BaseClass) {
	var Cl = function() {
		BaseClass.call(this);
		this.__babelute__ = lexicName;
	};
	Cl.prototype = new BaseClass();
	return Cl;
}

function initLexic(lexicName, baseLexic) {
	var lexic = lexicsDico[lexicName] = {
		Cl: createClass(lexicName, (baseLexic && baseLexic.Cl) || Babelute),
		FirstDegree: createClass(lexicName, (baseLexic && baseLexic.FirstDegree) || BaseFirstDegree)
	};
	lexic.Instance = new lexic.Cl();
	lexic.initializer = {
		_empty: function() {
			return new lexic.Cl();
		}
	};
	if (baseLexic)
		for (var i in baseLexic.initializer)
			addToInitializer(lexic, i);
	return lexic;
}

// babelute initializer management

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

// Babelute initializer provider
function initializer(lexicName) {
	return getLexic(lexicName || 'default').initializer;
}

function firstDegreeInitializer(lexicName) {
	return getLexic(lexicName || 'default').fdInitializer;
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
lexicsDico['default'] = {
	Cl: Babelute,
	FirstDegree: BaseFirstDegree
};
for (var i in Babelute.prototype) {
	if (i[0] === '_')
		continue;
	BaseFirstDegree.prototype[i] = getFirstDegreeMethod('default', i);
	addToInitializer(lexicsDico['default'], i);
}
//_________ UTILS

function getFirstDegreeMethod(lexicName, methodName) {
	return function() {
		this._lexems.push(new Lexem(lexicName, methodName, arguments));
		return this;
	};
}

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

Babelute.getLexic = getLexic;
Babelute.FirstDegree = BaseFirstDegree;
Babelute.lexics = lexicsDico;
Babelute.initializer = initializer;
Babelute.firstDegreeInitializer = firstDegreeInitializer;
Babelute.execMethod = execMethod;
Babelute.toLexic = toLexic;
Babelute.extendLexic = extendLexic;
Babelute.expandOneDegreeLexem = function(lexem) {
	var lexic = getLexic(lexem.lexic);
	return lexem.developped = lexic.Instance[lexem.name].apply(new lexic.FirstDegree(), lexem.args);
};

module.exports = lexicsDico;

//