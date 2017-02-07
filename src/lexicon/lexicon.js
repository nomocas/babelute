/**
 * Babelute Lexicon class and helpers.
 *
 * A Lexicon is just a proposition to handle and construct easily a Babelute API 
 * and its related FirstLevel/SecondLevel APIs, and their initializers.
 *
 * One DSL = One lexicon.
 *
 * A lexicon could be extended to manage dialects.
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

const assert = require('assert');
import {
	Babelute,
	Lexem
} from '../babelute.js';
import FirstLevel from './first-level.js';

const lexicons =  {}; // Lexicons dico : where to store public lexicon

/**
 * Lexicon class : helpers to manage Babelute's lexicons
 */

export class Lexicon {

	constructor(name, parentLexicon = null) {

		assert(typeof name === 'string' && name.length, 'Lexicon constructor need a valid name as first argument'); // all assertions will be removed in production
		assert(!parentLexicon || parentLexicon instanceof Lexicon, 'Lexicon constructor second (optional) argument should be another Lexicon that will be used as parent');

		this.parentLexicon = parentLexicon;
		this.name = name;
		parentLexicon = parentLexicon || {};

		// the three APIs :
		// this one is to get the interpretable sentences (last level)
		this.Atomic = initClass(parentLexicon.Atomic || Babelute);
		// this one is to get the "document" sentences
		this.FirstLevel = initClass(parentLexicon.FirstLevel || FirstLevel);
		// this one is to get the whole AST (aka the whole tree between first level and last level - never used directly)
		this.SecondLevel = Babelute.extends(parentLexicon.SecondLevel || Babelute);

		if (parentLexicon.Atomic)
			Object.keys(parentLexicon.Atomic.initializer)
			.forEach((key) => {
				addToInitializer(this.Atomic.Initializer, key);
				addToInitializer(this.FirstLevel.Initializer, key);
			});
	}

	addAtoms(atomsArray) {

		assert(Array.isArray(atomsArray), 'lexicon.addAtoms(...) need an array as first argument');

		atomsArray.forEach((name) => addAtom(this, name));
		return this;
	}

	addCompounds(producer) {

		assert(typeof producer === 'function', 'lexicon.addCompounds(...) need a function (that return an object containing dsl methods) as first argument');

		// Atomic API is produced with Atomic initializer
		const atomicMethods = producer(this.Atomic.initializer);

		assert(atomicMethods && typeof atomicMethods === 'object', 'lexicon.addCompounds(function(){...}) need a function that return an object containing dsl methods to add');

		Object.assign(this.Atomic.prototype, atomicMethods);

		// SecondLevel API is simply produced with the related FirstLevel initializer. 
		// (so same producer method, same api, but different handler for inner composition)
		// is the only thing to do to gain capability to handle full AST. (see docs)
		Object.assign(this.SecondLevel.prototype, producer(this.FirstLevel.initializer));

		Object.keys(atomicMethods)
			.forEach((key) => {
				this.FirstLevel.prototype[key] = FirstLevel.getFirstLevelMethod(this.name, key);
				addToInitializer(this.Atomic.Initializer, key);
				addToInitializer(this.FirstLevel.Initializer, key);
			});
		return this;
	}

	developOneLevel(lexem) {
		assert(lexem && lexem.__babelutelexem__, 'lexicon.developOneLevel(...) need a lexem intance as first argument');
		assert(this.SecondLevel.prototype[lexem.name], 'lexicon.developOneLevel(...) : lexem should come from the lexicon itself');

		return lexem.developped = this.SecondLevel.prototype[lexem.name].apply(new this.FirstLevel(), lexem.args);
	}

	useAtomic(babelute, name, args) {
		assert(babelute && babelute.__babelute__, 'lexicon.useAtomic(...) need a babelute intance as first argument');
		assert(typeof name === 'string', 'lexicon.useAtomic(...) need a string (a method name) as second argument');

		if (!this.Atomic.instance[name])
			throw new Error(`Babelute (${ this.name }) : method not found : ${ name }`);
		this.Atomic.instance[name].apply(babelute, args);
	}

	useFirstLevel(babelute, name, args) {
		assert(babelute && babelute.__babelute__, 'lexicon.useFirstLevel(...) need a babelute intance as first argument');
		assert(typeof name === 'string', 'lexicon.useFirstLevel(...) need a string (a method name) as second argument');

		if (!this.FirstLevel.instance[name])
			throw new Error(`Babelute (${ this.name }) : method not found : ${ name }`);
		this.FirstLevel.instance[name].apply(babelute, args);
	}

	translateToAtomic(babelute, targets) {
		return translate(babelute, this.Atomic, targets || this.targets);
	}

	translateToFirstLevel(babelute, targets) {
		return translate(babelute, this.FirstLevel, targets || this.targets);
	}

	/**
	 * Lexicons dictionary management
	 */
	static get(name) {
		assert(typeof name === 'string', 'Lexicon.get(...) need a string (a lexicon name) as first argument');

		const lexicon = lexicons[name];
		if (!lexicon)
			throw new Error('lexicon not found : ' + name);
		return lexicon;
	}

	static register(lexicon, name = null) {
		assert(lexicon instanceof Lexicon, 'Lexicon.register(...) first argument should be a Lexicon');
		assert(!name || typeof name === 'string', 'Lexicon.register(...) need a string (a lexicon name) as second argument');

		lexicons[name || lexicon.name] = lexicon;
	}
}

Lexicon.lexicons = lexicons;

/**
 *  add syntactical atom lexem to lexicon (actually to inner classes that reflect API)
 *  A syntactical Atom method is a function that only add one lexem.
 */

function addAtom(lexicon, name) {
	assert(lexicon instanceof Lexicon, 'Lexicon addAtom(...) first argument should be a Lexicon where add syntactical atom');
	assert(typeof name === 'string', 'Lexicon addAtom(...) need a string (a method name) as second argument');

	lexicon.Atomic.prototype[name] = lexicon.FirstLevel.prototype[name] = lexicon.SecondLevel.prototype[name] = FirstLevel.getFirstLevelMethod(lexicon.name, name);
	addToInitializer(lexicon.Atomic.Initializer, name);
	addToInitializer(lexicon.FirstLevel.Initializer, name);
}

/**
 * change current babelute's lexicon for next lexems
 * @param  {String} lexiconName the lexicon to use
 * @return {babelute}  a new Babelute with needed lexicon (i.e. with lexicon's API)
 */
Babelute.prototype._lexicon = function(lexiconName) {
	assert(typeof lexiconName === 'string', '._lexicon(...) accept only a string (a Lexicon id) as argument');

	return new(Lexicon.get(lexiconName).Atomic)(this._lexems);
};

/**
 * babelute lexicon's Classes initialisation
 */

function initClass(BaseClass) {
	const Class = Babelute.extends(BaseClass);
	createInitializer(Class, BaseClass.Initializer);
	Class.instance = new Class();
	return Class;
}

/**
 * Manage initializers
 */

export class Initializer {
	static extends(BaseInitializer) {

		assert(BaseInitializer === Initializer || (BaseInitializer.prototype instanceof Initializer), 'Initializer.extends accepts only a Initializer Class (or subclass) as argument');

		const Class = function() {};
		Class.prototype = Object.create(BaseInitializer.prototype);
		Class.prototype.constructor = Class;
		return Class;
	}
}

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

function addToInitializer(Initializer, methodName) {
	Initializer.prototype[methodName] = function() {
		return this.BabeluteClass.prototype[methodName].apply(new this.BabeluteClass(), arguments);
	};
}


/**
 * Provide Babelute Subclass "initializer" object (the one with all the flattened shortcut api for starting sentences easily)
 * @param  {String|Babelute} lexiconName Either the lexiconName where catch the Babelute Class from where get or create the initializer object. Or directly a Babelute Class.
 * @return {Object}   An initializer object with shortcuted API from Babelute's prototype
 */
export function initializer(lexiconName) {
	assert(typeof lexiconName === 'string', 'Babelute.initializer(...) accept only a string (a Lexicon id) as argument');
	return Lexicon.get(lexiconName).Atomic.initializer;
}

/**
 * Same thing that static initializer method but return a the needed "FirstLevel initializer"
 * @param  {String} lexiconName The lexiconName where catch the Babelute Class from where get or create the initializer object
 * @return {Object}  An initializer object with shortcuted API from FirstLevel Babelute's prototype
 */
export function firstLevelInitializer(lexiconName) {
	assert(typeof lexiconName === 'string', 'Babelute.firstLevelInitializer(...) accept only a string (a Lexicon id) as argument');
	return Lexicon.get(lexiconName).FirstLevel.initializer;
}

/**
 * _use cases
 */

/**
 * use a babelute (an other sentence) at this point in the current sentence
 * @param  {String|Babelute} babelute Either a String formatted as 'mylexicon:myMethod' (which gives what lexem to call), or a Babelute instance (which will be inserted in current sentence)
 * @return {Babelute} the current Babelute instance
 */
Babelute.prototype._use = function(babelute /* could be a string in "lexiconName:methodName" format */ /*, ...args */ ) {
	assert(!babelute || typeof babelute === 'string' || babelute.__babelute__);
	return babelute ? use(this, babelute, [].slice.call(arguments, 1), false) : this;
};
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
		Lexicon.get(lexiconName)[firstLevel ? 'useFirstLevel' : 'useAtomic'](self, methodName, args);
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

