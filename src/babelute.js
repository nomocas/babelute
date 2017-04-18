/**
 * Babelute core
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production

/**
 * Lexem class : a lexem is just an object containing 3 properties { lexicon:String, name:String, args:Arguments|Array }
 * You should never construct them directly (but if you do babelute's plugins). And it should never be extended.
 * @protected
 */
export class Lexem {

	/**
	 * construct a new lexem instance
	 * @param  {String} lexicon the lexicon's name of the lexem
	 * @param  {String} name    the lexem's name
	 * @param  {Array|arguments} args  the lexem's arguments (an array or the "callee arguments" object) 
	 */
	constructor(lexicon, name, args) {
		assert(typeof lexicon === 'string' && lexicon.length, 'Lexicon\'s name should be a valid string');
		assert(typeof name === 'string' && lexicon.length, 'Lexem\'s name should be a valid string');
		assert(Array.isArray(args) || typeof args.length !== 'undefined', 'Lexem\'s args should be an array (or iterable with bracket access)');

		/**
		 * the lexicon name from where the lexem comes
		 * @type {String}
		 */
		this.lexicon = lexicon;

		/**
		 * the lexem's name
		 * @type {String}
		 */
		this.name = name;

		/**
		 * The lexem's arguments array (or arguments object)
		 * @type {Array|arguments}
		 */
		this.args = args;
	}
}

/**
 * Babelute subclass(es) instances : for holding array of lexems (i.e. a sentence) written through the DSL's API.
 *
 * Will be the base class for all DSLs handlers.
 *
 * Babelute API and lexems Naming Conventions : 
 * 
 * - any "meta-language" method (aka any method that handle the sentence it self - appending new lexem, changing current lexicon, sentences translations, ...) 
 * must start with and underscore : e.g. _append, _lexicon, _if,  _each, _eachLexem, _translate...
 * - any "pragmatics output related" method should start with a '$' and should be named with followed format : e.g. .$myLexiconToMyOutputType(...)
 * - any DSL lexems (so any other "api"'s method) should start with a simple alphabetic char : e.g. .myLexem(), .description(), .title(), ...
 * 		
 * @public
 */
export class Babelute {

	/**
	 * construct a babelute instance
	 * @param  {?Array} lexems array of lexems for init. (only for internal use)
	 */
	constructor(lexems = null) {
		assert(!lexems || Array.isArray(lexems), 'Babelute\'s constructor accept only an array of lexems as argument (optionaly)');

		/**
		 * the array where lexems are stored
		 * @type {Array}
		 */
		this._lexems = lexems || [];

		/**
		 * useful marker for fast instanceof replacement (frame/multiple-js-runtime friendly)
		 * @type {Boolean}
		 */
		this.__babelute__ = true;
	}

	/**
	 * The absolute Babelute atom method : add a lexem to babelute's array
	 * @public
	 * @param  {String} lexiconName the current lexicon name
	 * @param  {String} name      the lexem's name
	 * @param  {Array|arguments} args   the lexem's arguments (either an array or maybe directly the arguments object from when lexem is called)
	 * @return {Babelute} 	the current Babelute instance
	 */
	_append(lexiconName, name, args) {

		this._lexems.push(new Lexem(lexiconName, name, args));

		return this;
	}


	/**
	 * conditional sentences concatenation.
	 *
	 * Apply modification at sentence writing time (aka the babelute does not contains the _if lexems. _if has immediatly been applied).
	 * 
	 * @public
	 * @param  {*} condition any value that will be casted to Boolean (!!)
	 * @param  {Babelute} babelute  which sentence to insert if !!condition === true
	 * @param  {?Babelute} elseBabelute  which sentence to insert if !!condition === false
	 * @return {Babelute}     the current Babelute instance
	 */
	_if(condition, babelute, elseBabelute = null) {

		assert(babelute instanceof Babelute, '._if meta-api need an babelute instance as second argument');
		assert(!elseBabelute || elseBabelute instanceof Babelute, '._if meta-api need an babelute instance as third argument (optional)');

		if (condition)
			this._lexems = this._lexems.concat(babelute._lexems);
		else if (elseBabelute)
			this._lexems = this._lexems.concat(elseBabelute._lexems);
		return this;
	}

	/**
	 * For each item from array : execute function and concatenate returned babelute sentence to current one. 
	 * Provided function must return a babelute.
	 *
	 * Apply modification at sentence writing time (aka the babelute does not contains the _each lexems. _each has immediatly been applied).
	 * 
	 * @public
	 * @param  {Array} array  the array to iterate on
	 * @param  {Function} func the function to handle each item. it must return a babelute.
	 * @return {Babelute}     the current Babelute instance
	 */
	_each(array, func) {

		assert(!array || Array.isArray(array), '._each meta-api need an array (or iterable with bracket access) as first argument');
		assert(typeof func === 'function', '._each meta-api need a function as second argument');

		if (array)
			array.forEach((item, index) => {
				const b = func(item, index);

				assert(b instanceof Babelute, '._each need a function that return a babelute');

				this._lexems.push.apply(this._lexems, b._lexems);
			});
		return this;
	}

	/**
	 * Use a babelute (another sentence) at this point in the current sentence
	 * @public
	 * @param  {string|Babelute} babelute Either a string formatted as 'mylexicon:myMethod' (which gives the lexem's method to call), or a Babelute instance (which will be inserted in current sentence)
	 * @param  {?...args} args the optional arguments to use when calling lexem (only if first argument is a string)
	 * @return {Babelute} the current Babelute instance
	 * @throws {Error} If lexicon not found (when first arg is string)
	 * @throws {Error} If method not found in lexicon (when first arg is string)
	 */
	/* istanbul ignore next */
	_use(babelute, ...args) { // eslint-disable-line no-unused-vars
		// will be implemented in lexicon
	}


	/**
	 * Change current lexicon for next lexems
	 * @public
	 * @param  {string} lexiconName the lexicon to use
	 * @return {Babelute}  a new Babelute from lexicon (i.e. with lexicon's API)
	 * @throws {Error} If lexicon not found with lexiconName
	 */
	/* istanbul ignore next */
	_lexicon(lexiconName) { // eslint-disable-line no-unused-vars
		// will be implemented in lexicon
	}

	_translate(handler) {
		return handler(this);
	}

	_translateLexems(handler) {
		return this._translate((sentence) => {
			const b = new Babelute();
			sentence._lexems.forEach((lexem) => b._use(handler(lexem)));
			return b;
		});
	}

	/**
	 * translate current sentence's lexems through a Lexicon or a map of Lexicon.
	 * 
	 * @param  {Lexicon|Object}  lexicon    the Lexicon (or a map of Lexicon) to get translation from
	 * @param  {Boolean} firstLevel true if should produce FirstLevel translation (i.e. targetLexicon.FirstLevel). False otherwise.
	 * @return {Babelute}             a new Babelute instance with translated lexems.
	 */
	/* istanbul ignore next */
	_translateLexemsThrough(lexicon, firstLevel = false) { // eslint-disable-line no-unused-vars

	}

	/**
	 * Create Babelute subclass
	 * @param  {Babelute} BaseClass the class to be extended
	 * @param  {?Object} api an object containing methods to add to prototype
	 * @return {Babelute}   The subclass
	 * @throws {AssertionError} (only in dev mode) If BaseClass is not a Babelute Subclass (or Babelute)
	 */
	static extends(BaseClass, api = null) {
		assert(BaseClass === Babelute || (BaseClass.prototype instanceof Babelute), 'Babelute.extends accepts only a Babelute Class (or subclass) as first argument');
		assert(!api || typeof api === 'object', 'Babelute.extends need a (optional) valid object containing methods as second argument');
		const B = function(lexems) {
			BaseClass.call(this, lexems);
		};
		B.prototype = Object.create(BaseClass.prototype);
		B.prototype.constructor = B;
		for (var i in api) // Object.assign seems to bug when used on prototype (not investigate enough : so use plain old for-in syntax)
			B.prototype[i] = api[i];
		return B;
	}
}


/**
 * deserialize json to babelute
 * @param  {String} json the json string
 * @return {Babelute}      the deserialized babelute
 * @throws {Error} If json is badly formated
 */
export function fromJSON(json) {
	assert(typeof json === 'string', 'babelute.fromJSON need a string as first argument');
	return JSON.parse(json, (k, v) => {
		if (v && v.__babelute__)
			return new Babelute(v._lexems.map((lexem) => {
				return new Lexem(lexem.lexicon, lexem.name, lexem.args);
			}));
		return v;
	});
}

