/*
* @Author: Gilles Coomans
*/

import assert from 'assert'; // removed in production

/**
 * Lexem class : a lexem is just an object containing 3 properties { lexicon:String, name:String, args:Arguments|Array }
 * You should never construct them directly (but if you do babelute's plugins). And it should never be extended.
 * @protected
 */
export default class Lexem {

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