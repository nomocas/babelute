/**
 * Babelute Lexicon class and helpers.
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production
import Lexem from '../lexem';
import Babelute from '../babelute';
import FirstLevel from './first-level';
import { addToInitializer, createInitializer } from './initializer';

/**
 * Lexicons dico : where to store public (registered) lexicon
 * @type {Object}
 * @private
 */
const lexicons = {};

/**
 * Lexicon class : helpers to store and manage DSL's API.
 * 
 * A __Lexicon__ is just an object aimed to handle, store and construct easily a DSL (its lexicon - i.e. the bunch of words that compose it)
 * and its related Atomic/FirstLevel/SecondLevel Babelute subclasses, and their initializers.
 *
 * One DSL = One lexicon.
 *
 * A lexicon could extend another lexicon to manage dialects.
 *
 * You should never use frontaly the constructor (aka never use new Lexicon in  your app). Use createLexicon or createDialect in place.
 * 
 * @public
 */
class Lexicon {

	/**
	 * @param  {string} name   the lexicon name
	 * @param  {?Lexicon} parent an optional parent lexicon to be extended here
	 */
	constructor(name, parent) {

		assert(typeof name === 'string' && name.length, 'Lexicon constructor need a valid name as first argument'); // all assertions will be removed in production
		assert(!parent || parent instanceof Lexicon, 'Lexicon constructor second (optional) argument should be another Lexicon that will be used as parent');

		/**
		 * the parent lexicon (if any)
		 * @type {Lexicon}
		 * @public
		 */
		this.parent = parent;
		parent = parent || {};

		/**
		 * the lexicon's name
		 * @type {String}
		 */
		this.name = name;

		// the three APIs :
		/**
		 * interpretable sentences API (finally always made from syntactic/semantic atoms (aka last level))
		 * @type {Babelute}
		 * @protected
		 */
		this.Atomic = initClass(parent.Atomic || Babelute);
		/**
		 * "document" sentences API (first level : aka all methods has been replaced by fake atomic methods)
		 * @type {Babelute}
		 * @protected
		 */
		this.FirstLevel = initClass(parent.FirstLevel || FirstLevel);
		/**
		 * AST-provider API aka the whole tree between first level and last level. Never use it directly : its used under the hood by {@link developOneLevel} method.
		 * @type {Babelute}
		 * @protected
		 */
		this.SecondLevel = Babelute.extends(parent.SecondLevel || Babelute);

		/**
		 * the secondLevel instance
		 * @type {Babelute}
		 * @protected
		 */
		this.secondLevel = new this.SecondLevel();

		if (parent.Atomic)
			Object.keys(parent.Atomic.initializer)
			.forEach((key) => {
				addToInitializer(this.Atomic.Initializer, key);
				addToInitializer(this.FirstLevel.Initializer, key);
			});
	}

	/**
	 * add atomic lexem (atoms) to lexicon
	 * @param {string[]} atomsArray array of atoms name (as string)
	 * @return {Lexicon} the lexicon itself
	 */
	addAtoms(atomsArray) {

		assert(Array.isArray(atomsArray), 'lexicon.addAtoms(...) need an array as first argument');

		atomsArray.forEach((name) => addAtom(this, name));

		return this;
	}

	/**
	 * add compounds lexems to lexicon
	 * @param {Function} producer a function that take a babelute initializer as argument and that return an object containing methods (lexems) to add to lexicon
	 * @return {Lexicon} the lexicon itself
	 */
	addCompounds(producer) {

		assert(typeof producer === 'function', 'lexicon.addCompounds(...) need a function (that return an object containing dsl methods) as first argument');

		// Atomic API is produced with Atomic initializer
		const atomicMethods = producer(this.Atomic.initializer, false);

		assert(atomicMethods && typeof atomicMethods === 'object', 'lexicon.addCompounds(function(){...}) need a function that return an object containing dsl methods to add');

		for (let i in atomicMethods)
			this.Atomic.prototype[i] = atomicMethods[i];

		// SecondLevel API is simply produced with the related FirstLevel initializer. 
		// (so same producer method, same api, but different handler for inner composition)
		// is the only thing to do to gain capability to handle full AST. (see docs)
		const secondLevelCompounds = producer(this.FirstLevel.initializer, true);
		for (let j in secondLevelCompounds)
			this.SecondLevel.prototype[j] = secondLevelCompounds[j];

		Object.keys(atomicMethods)
			.forEach((key) => {
				this.FirstLevel.prototype[key] = FirstLevel.getFirstLevelMethod(this.name, key);
				addToInitializer(this.Atomic.Initializer, key);
				addToInitializer(this.FirstLevel.Initializer, key);
			});
		return this;
	}

	/**
	 * add aliases lexems to lexicon (aliases are like shortcuts : they are added as this to Atomic, FirstLevel and SecondLevel API)
	 * @param {Object} methods an object containing methods (lexems) to add to lexicon
	 * @return {Lexicon} the lexicon itself
	 */
	addAliases(producer) {
		
		const producerType = typeof producer;

		assert(producerType === 'function' || producerType === 'object', 'lexicon.addAliases(...) need a function (that return an object containing aliases methods) as first argument');
		
		const methods = producerType === 'function' ? producer() : producer;

		assert(methods && typeof methods === 'object', 'lexicon.addAliases(function(){...}) need a function that return an object containing aliases methods to add');
		
		Object.keys(methods)
			.forEach((key) => {
				this.Atomic.prototype[key] = this.FirstLevel.prototype[key] = this.SecondLevel.prototype[key] = methods[key];
				addToInitializer(this.Atomic.Initializer, key);
				addToInitializer(this.FirstLevel.Initializer, key);
			});
		return this;
	}

	/**
	 * @protected
	 */
	use(babelute, name, args, firstLevel) {
		assert(babelute && babelute.__babelute__, 'lexicon.use(...) need a babelute intance as first argument');
		assert(typeof name === 'string', 'lexicon.use(...) need a string (a method name) as second argument');

		const instance = firstLevel ? this.FirstLevel.instance : this.Atomic.instance;

		if (!instance[name])
			throw new Error(`Babelute (${ this.name }) : method not found : ${ name }`);
		instance[name].apply(babelute, args);
	}

	/**
	 * return lexicon's initializer instance. (atomic or firstlevel depending on argument)
	 * @public
	 * @param  {Boolean} firstLevel true if you want firstLevel initializer, false overwise.
	 * @return {Initializer}           the needed initializer instance
	 */
	initializer(firstLevel) {
		return firstLevel ? this.FirstLevel.initializer : this.Atomic.initializer;
	}

	/**
	 * Create a dialect from this lexicon. a dialect is also a Lexicon.
	 * @param  {String} name the new lexicon name
	 * @return {Lexicon}      the new Lexicon that inherit from this one
	 */
	createDialect(name) {

		assert(typeof name === 'string', 'lexicon.createDialect(...) need a string (the new lexicon name) as first argument');
		
		return new Lexicon(name, this);
	}
}

/**
 *  Add syntactical atom lexem to lexicon (actually to inner classes that reflect API). A syntactical Atom method is a function that only add one lexem.
 *  @private
 */
function addAtom(lexicon, name) {
	assert(lexicon instanceof Lexicon, 'Lexicon addAtom(...) first argument should be a Lexicon where add syntactical atom');
	assert(typeof name === 'string', 'Lexicon addAtom(...) need a string (a method name) as second argument');

	lexicon.Atomic.prototype[name] = lexicon.FirstLevel.prototype[name] = lexicon.SecondLevel.prototype[name] = FirstLevel.getFirstLevelMethod(lexicon.name, name);
	addToInitializer(lexicon.Atomic.Initializer, name);
	addToInitializer(lexicon.FirstLevel.Initializer, name);
}

/**
 * babelute lexicon's Classes initialisation
 * @private
 */
function initClass(BaseClass) {
	const Class = Babelute.extends(BaseClass);
	createInitializer(Class, BaseClass.Initializer);
	Class.instance = new Class();
	return Class;
}

/**
 * Way to create lexicon instances
 * @public
 * @param  {string} name   the name of the lexicon
 * @param  {Lexicon} parent a lexicon instance as parent for this one (optional)
 * @return {Lexicon}      a lexicon instance
 */
function createLexicon(name, parent = null) {
	return new Lexicon(name, parent);
}

/**
 * getLexicon registred lexicon by name
 * 
 * @param  {string} lexiconName the lexicon's name
 * @return {Lexicon}      the lexicon
 * @throws {Error} If lexicon not found with lexiconName
 */
function getLexicon(lexiconName) {
	assert(typeof lexiconName === 'string', 'Lexicon.getLexicon(...) need a string (a lexicon name) as first argument');

	const lexicon = lexicons[lexiconName];
	if (!lexicon)
		throw new Error('lexicon not found : ' + lexiconName);
	return lexicon;
}

/**
 * registerLexicon lexicon by name
 * @param  {Lexicon} lexicon the lexicon instance to registerLexicon
 * @param  {?string} name    lexicon name (optional : if not provided : use the one from lexicon itself)
 */
function registerLexicon(lexicon, name = null) {
	assert(lexicon instanceof Lexicon, 'Lexicon.registerLexicon(...) first argument should be a Lexicon');
	assert(!name || typeof name === 'string', 'Lexicon.registerLexicon(...) need a string (a lexicon name) as second argument');

	lexicons[name || lexicon.name] = lexicon;
}

/*
 * _lexicon handeling
 */

// implementation of already declared method in Babelute's proto
Babelute.prototype._lexicon = function(lexiconName) {
	assert(typeof lexiconName === 'string', '._lexicon(...) accept only a string (a Lexicon id) as argument');
	return new(getLexicon(lexiconName).Atomic)(this._lexems);
};

FirstLevel.prototype._lexicon = function(lexiconName) {
	assert(typeof lexiconName === 'string', '._lexicon(...) accept only a string (a Lexicon id) as argument');
	return new(getLexicon(lexiconName).FirstLevel)(this._lexems);
};

/*
 * translation through lexicon (already delcared in Babelute proto)
 * @TODO: translation and each and if
 * each :
 * 	.each(collec, handler)
 * 	translated to 
 * 	.each(collec, wrap(handler, translationInfos))
 * 	
 * 	==> should translate automatically output from handler
 * if ==> same things : wrap handlers
 * ==> while translating : when lexem.name === "each" (or "if") (should always be present in target lexicon)
 * 	==> apply wrapping
 */

Babelute.prototype._translateLexemsThrough = function(lexicon, firstLevel = false) {
	const map = (lexicon instanceof Lexicon) ? null : lexicon;
	return this._translateLexems((lexem) => {
		if (map)
			lexicon = map[lexem.lexicon];
		if (!lexicon)
			return null;
		const args = translateArgs(lexem.args, lexicon, firstLevel);
		const b = new (firstLevel ? lexicon.FirstLevel : lexicon.Atomic)();
		return b[lexem.name] && b[lexem.name](...args);
	});
};

function translateArgs(args, lexicon, firstLevel){
	const result = [];
	for(let i = 0, len = args.length; i < len; ++i)
		if(args[i] && args[i].__babelute__)
			result.push(args[i]._translateLexemsThrough(lexicon, firstLevel));
		else
			result.push(args[i]);
	return result;
}



/**
 * _use handeling
 */

// implementation of already declared method in Babelute's proto
Babelute.prototype._use = function(babelute /* could be a string in "lexiconName:methodName" format */ , ...args) {
	assert(!babelute || typeof babelute === 'string' || babelute.__babelute__);
	return babelute ? use(this, babelute, args, false) : this;
};

// implementation of already declared method in Babelute's proto
FirstLevel.prototype._use = function(babelute /* could be a string in "lexiconName:methodName" format */ /*, ...args */ ) {
	assert(!babelute || typeof babelute === 'string' || babelute.__babelute__);
	return babelute ? use(this, babelute, [].slice.call(arguments, 1), true) : this;
};

function use(self, babelute, args, firstLevel) {
	if (typeof babelute === 'string') {
		const splitted = babelute.split(':');
		getLexicon(splitted[0]).use(self, splitted[1], args, firstLevel);
	} else
		self._lexems = self._lexems.concat(babelute._lexems);
	return self;
}


/**
 * return a new babelute from needed lexicon
 * @param  {string} lexiconName             the lexicon from where to take api
 * @param  {Boolean} asFirstLevel  True if it needs to return a FirstLevel instance. False or ommitted : returns an Atomic instance.
 * @return {[type]}                  the babelute instance (either an Atomic or a FirstLevel)
 * @throws {Error} If lexicon not found with lexiconName
 */
function init(lexiconName, asFirstLevel) {
	if (lexiconName)
		return new(getLexicon(lexiconName)[asFirstLevel ? 'FirstLevel' : 'Atomic'])();
	else if (asFirstLevel)
		return new FirstLevel();
	return new Babelute();
}

/**
 * develop a FirstLevel compounds-words-lexem through SecondLevel API. It returns the FirstLevel sentence corresponding to lexem's semantic developement.
 * @param  {Lexem} lexem the lexem to develop
 * @param {?Lexicon} lexicon the optional lexicon to use
 * @return {FirstLevel} the developed sentence
 * @throws {Error} If lexicon not found with lexem.lexicon
 * @throws {Error} If method not found in lexicon
 */
function developOneLevel(lexem, lexicon = null) {
	assert(lexem && lexem instanceof Lexem, 'lexicon.developOneLevel(...) need a lexem intance as first argument');
	assert(lexicon === null || lexicon instanceof Lexicon, 'lexicon.developOneLevel(...) second argument should be null or an instance of Lexicon');

	lexicon = lexicon || getLexicon(lexem.lexicon);
	assert(lexicon.secondLevel[lexem.name], `lexicon.developOneLevel(...) : lexem\'s name (${lexem.name}) not found in its own referenced lexicon (${ lexem.lexicon })`);

	return lexicon.secondLevel[lexem.name].apply(new lexicon.FirstLevel(), lexem.args);
}

/**
 * develop a FirstLevel lexem through Atomic API. Return the atomic representation of the lexem (in its own language).
 * @param  {Lexem} lexem the lexem to develop
 * @param {?Lexicon} lexicon the optional lexicon to use
 * @return {Babelute} the developed sentence
 * @throws {Error} If lexicon not found with lexem.lexicon
 * @throws {Error} If method not found in lexicon
 */
function developToAtoms(lexem, lexicon = null) {
	assert(lexem && lexem instanceof Lexem, 'lexicon.developToAtoms(...) need a lexem intance as first argument');
	assert(lexicon === null || lexicon instanceof Lexicon, 'lexicon.developToAtoms(...) second argument should be null or an instance of Lexicon');

	lexicon = lexicon || getLexicon(lexem.lexicon);

	assert(lexicon.Atomic.instance[lexem.name], 'lexicon.developToAtoms(...) : lexem\'s name  (${lexem.name}) not found in its own referenced lexicon (${ lexem.lexicon })');

	return lexicon.Atomic.instance[lexem.name].apply(new lexicon.Atomic(), lexem.args);
}

/**
 * Provide Babelute Subclass "initializer" object (the one with all the flattened shortcut api for starting sentences easily)
 * @param  {string} lexiconName The lexiconName where catch the Babelute Class from where getLexicon or create the initializer object.
 * @param  {boolean} asFirstLevel true if should return a first-level instance. false to return an atomic instance.
 * @return {Object}   An initializer object with shortcuted API from lexicon's Atomic prototype
 * @throws {Error} If lexicon not found with lexiconName
 */
function initializer(lexiconName, asFirstLevel) {
	assert(typeof lexiconName === 'string', 'Babelute.initializer(...) accept only a string (a Lexicon id) as argument');
	if (!asFirstLevel)
		return getLexicon(lexiconName).Atomic.initializer;
	return getLexicon(lexiconName).FirstLevel.initializer;
}

export {
	Lexicon,
	createLexicon,
	getLexicon,
	registerLexicon,
	init,
	initializer,
	developOneLevel,
	developToAtoms,
	lexicons
};

