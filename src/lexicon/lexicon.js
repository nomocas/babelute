/**
 * Babelute Lexicon class and helpers.
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production

import {
	Babelute,
	Lexem
} from '../babelute.js';

import FirstLevel from './first-level.js';

/**
 * Lexicons dico : where to store public lexicon
 * @type {Object}
 * @private
 */
const lexicons = {};

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
 * Lexicon class : helpers to store and manage DSL's API.
 * 
 * A __Lexicon__ is just an object aimed to handle, store and construct easily a DSL (its lexic - i.e. the bunch of words that compose it)
 * and its related Atomic/FirstLevel/SecondLevel Babelute subclasses, and their initializers.
 *
 * One DSL = One lexicon.
 *
 * A lexicon could extend another lexicon to manage dialects.
 *
 * You should never use frontaly the constructor (aka never use new Lexicon in  your app). Use createLexicon in place.
 * 
 * @protected
 */
class Lexicon {

	/**
	 * @param  {string} name   the lexicon name
	 * @param  {?Lexicon} parent an optional parent lexicon to be extended here
	 */
	constructor(name, parent = null) {

		assert(typeof name === 'string' && name.length, 'Lexicon constructor need a valid name as first argument'); // all assertions will be removed in production
		assert(!parent || parent instanceof Lexicon, 'Lexicon constructor second (optional) argument should be another Lexicon that will be used as parent');

		/**
		 * the parent lexicon (if any)
		 * @type {Lexicon}
		 * @protected
		 */
		this.parent = parent;

		/**
		 * the lexicon's name
		 * @type {String}
		 */
		this.name = name;
		parent = parent || {};

		// the three APIs :
		/**
		 * interpretable sentences API (finally always made from syntactical atoms (aka last level))
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
		 * the atomic initializer instance
		 * @type {Initializer}
		 */
		this.initializer = this.Atomic.initializer;

		/**
		 * the first-level initializer instance
		 * @type {Initializer}
		 */
		this.firstLevelInitializer = this.FirstLevel.initializer;

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
		const atomicMethods = producer(this.Atomic.initializer);

		assert(atomicMethods && typeof atomicMethods === 'object', 'lexicon.addCompounds(function(){...}) need a function that return an object containing dsl methods to add');

		for (let i in atomicMethods)
			this.Atomic.prototype[i] = atomicMethods[i];

		// SecondLevel API is simply produced with the related FirstLevel initializer. 
		// (so same producer method, same api, but different handler for inner composition)
		// is the only thing to do to gain capability to handle full AST. (see docs)
		const secondLevelCompounds = producer(this.FirstLevel.initializer);
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
	 * @protected
	 */
	useAtomic(babelute, name, args) {
		assert(babelute && babelute.__babelute__, 'lexicon.useAtomic(...) need a babelute intance as first argument');
		assert(typeof name === 'string', 'lexicon.useAtomic(...) need a string (a method name) as second argument');

		if (!this.Atomic.instance[name])
			throw new Error(`Babelute (${ this.name }) : method not found : ${ name }`);
		this.Atomic.instance[name].apply(babelute, args);
	}

	/**
	 * @protected
	 */
	useFirstLevel(babelute, name, args) {
		assert(babelute && babelute.__babelute__, 'lexicon.useFirstLevel(...) need a babelute intance as first argument');
		assert(typeof name === 'string', 'lexicon.useFirstLevel(...) need a string (a method name) as second argument');

		if (!this.FirstLevel.instance[name])
			throw new Error(`Babelute (${ this.name }) : method not found : ${ name }`);
		this.FirstLevel.instance[name].apply(babelute, args);
	}

	/**
	 * @protected
	 */
	translateToAtomic(babelute, targets) {
		return translate(babelute, this.Atomic, targets || this.targets);
	}

	/**
	 * @protected
	 */
	translateToFirstLevel(babelute, targets) {
		return translate(babelute, this.FirstLevel, targets || this.targets);
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
 * Initializer Class
 * @private
 */
class Initializer {
	static extends(BaseInitializer) {

		assert(BaseInitializer === Initializer || (BaseInitializer.prototype instanceof Initializer), 'Initializer.extends accepts only a Initializer Class (or subclass) as argument');

		const Class = function() {};
		Class.prototype = Object.create(BaseInitializer.prototype);
		Class.prototype.constructor = Class;
		return Class;
	}
}

/**
 * create a Initializer (based on a Babelute subclass) and instanciate it
 * @param  {Babelute} BabeluteClass   a Babelute subclass from where create initializer
 * @param  {?Initializer} BaseInitializer a parent initializer to be extended (optional)
 * @return {Initializer}               the Initializer instance
 */
function createInitializer(BabeluteClass, BaseInitializer = null) {

	assert(BabeluteClass === Babelute || (BabeluteClass.prototype instanceof Babelute), 'Lexicon createInitializer accepts only a Babelute Class (or subclass) as first argument');
	assert(!BaseInitializer || BaseInitializer === Initializer || (BaseInitializer.prototype instanceof Initializer), 'Lexicon createInitializer accepts only a Initializer Class (or subclass) as second argument');

	const Init = BabeluteClass.Initializer = BaseInitializer ? Initializer.extends(BaseInitializer) : Initializer;
	BabeluteClass.initializer = new Init();
	BabeluteClass.initializer._empty = function() {
		return new BabeluteClass();
	};
	BabeluteClass.initializer.BabeluteClass = BabeluteClass;
	Object.keys(BabeluteClass)
		.forEach((i) => {
			addToInitializer(Init, i);
		});
	return BabeluteClass.initializer;
}

/**
 * add method to initializer
 * @private
 * @param {Initializer} Initializer Initializer class where add methods in proto
 * @param {string} methodName  the name of method to add
 */
function addToInitializer(Initializer, methodName) {
	Initializer.prototype[methodName] = function() {
		return this.BabeluteClass.prototype[methodName].apply(new this.BabeluteClass(), arguments);
	};
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
		const {
			lexiconName,
			methodName
		} = babelute.split(':');
		getLexicon(lexiconName)[firstLevel ? 'useFirstLevel' : 'useAtomic'](self, methodName, args);
	} else if (babelute.__babelute__)
		self._lexems = self._lexems.concat(babelute._lexems);
	return self;
}

/**
 * Translation
 */
function translate(babelute, BabeluteClass, targets) {
	const b = new BabeluteClass();
	babelute._lexems.forEach(function(lexem) {
		if ((targets && !targets[lexem.lexicon]) || this[lexem.name]) // simply forwards lexem (copy) if not in targets
			this._lexems.push(new Lexem(lexem.lexicon, lexem.name, lexem.args));
		else
			this[lexem.name].apply(this, lexem.args.map((value) => {
				if (!value || !value.__babelute__)
					return value;
				return translate(value, BabeluteClass, targets);
			}));
	}, b);
	return b;
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
 * develop a FirstLevel babelute through SecondLevel API. It means that each lexem will be translate
 * @param  {Lexem} lexem the lexem to develop
 * @return {[type]}       [description]
 * @throws {Error} If lexicon not found with lexem.lexicon
 * @throws {Error} If method not found in lexicon
 */
function developOneLevel(lexem) {
	assert(lexem && lexem.__babelutelexem__, 'lexicon.developOneLevel(...) need a lexem intance as first argument');

	const lexicon = getLexicon(lexem.lexicon);

	assert(lexicon.secondLevel[lexem.name], 'lexicon.developOneLevel(...) : lexem\'s name not found in its own referenced lexicon');

	return lexicon.secondLevel[lexem.name].apply(new lexicon.FirstLevel(), lexem.args);
}

export {
	Lexicon,
	createLexicon,
	init,
	getLexicon,
	registerLexicon,
	initializer,
	developOneLevel
};

