const assert = require('assert'); // removed in production
/**
 * Babelute core
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

/**
 * Lexem class : a lexem is just an object containing 3 properties { lexicon:String, name:String, args:Arguments|Array }
 * A Babelute (just below) is just a holder for an array of Lexem instances.
 * 
 */
export class Lexem {
	constructor(lexicon, name, args) {
		assert(typeof lexicon === 'string' && lexicon.length, 'Lexicon\'s name should be a valid string');
		assert(typeof name === 'string' && lexicon.length, 'Lexem\'s name should be a valid string');
		this.lexicon = lexicon;
		this.name = name;
		this.args = args;
		this.__babelutelexem__ = true; // useful marker for fast instanceof replacement
	}

	log(title) {
		console.log(title || 'lexem', this.lexicon, this.name, this.args); // eslint-disable-line no-console
	}
}

/**
 * Babelute Class : just the main helper for writing and holding a babelute sentence. (aka an array of Lexems)
 *
 * Will be the base class for all DSLs handlers.
 *
 * Manage lexems array and lexicon
 * 
 * Babelute API and Lexem Naming Conventions : 
 * 
 * 		- any "meta-language" method (aka any method that handle the sentence it self - appending new lexem, changing current lexicon, sentences translations, ...) 
 * 			must start with and underscore : e.g. _append, _lexicon, _if,  _each, _eachLexem, _translate...
 *
 *		- any "pragmatics output related" method should start with a '$' and should be named with followed format : e.g. .$myLexiconToMyOutputType(...)
 *
 * 		- any DSL lexems (so any other "api"'s method) should start with a simple alphabetic char : e.g. .myLexem(), .description(), .title(), ...
 */
/** Class for holding array of lexems */
export class Babelute {

	constructor(lexems) {
		assert(!lexems || Array.isArray(lexems), 'Babelute\'s constructor accept only an array of lexems as argument (optionaly)');
		this._lexems = lexems || []; // where lexems goes
		this.__babelute__ = true; // useful marker for fast instanceof replacement
	}

	/**
	 * The absolute Babelute Atom : add a lexem to babelute's array
	 * @param  {String} lexiconName [description]
	 * @param  {String} name      [description]
	 * @param  {Arguments|Array} args   the lexem's arguments (either an array or maybe directly the arguments object from when lexem is called)
	 * @return {Babelute} the current Babelute instance
	 */
	_append(lexiconName, name, args) {
		this._lexems.push(new Lexem(lexiconName, name, args));
		return this;
	}

	/**
	 * create Babelute subclass
	 * @param  {Babelute} BaseClass the class to subclass
	 * @return {Babelute}           The subclass
	 */
	static extends(BaseClass, api) {
		assert(BaseClass === Babelute || (BaseClass.prototype instanceof Babelute), 'Babelute.extends accepts only a Babelute Class (or subclass) as argument');
		const B = function(lexems) {
			BaseClass.call(this, lexems);
		};
		B.prototype = Object.create(BaseClass.prototype);
		B.prototype.constructor = B;
		if (typeof api === 'object')
		// Object.assign(B.prototype, api);
			for (var i in api)
				B.prototype[i] = api[i];
		return B;
	}
}

