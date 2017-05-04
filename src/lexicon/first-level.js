/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production
import Lexem from '../lexem';
import Babelute from '../babelute';

/**
 * A FirstLevel is a Babelute that has exactly same api than its corresponding Babelute (from a DSL) but where every compounds methods has been replaced by its "atomic" equivalent.
 * (Same concept than 'first-level of understanding', as if we where stupid by always understanding only first literal sens of words.)
 * 
 * It provides sentences and lexems without any interpretation, and that could be really useful : e.g.
 * - to see sentence as "editable document" and/or for allowing meta-writing of sentences
 * - to obtain the full AST of babelute sentences 
 * 
 * @access protected
 */
export default class FirstLevel extends Babelute {

	/**
	 * construct a firstlevel babelute instance
	 * @param  {?Array} lexems array of lexems for init. (only for internal use)
	 */
	constructor(lexems) {
		super(lexems);
		this.__first_level_babelute__ = true;
	}

	/**
	 * return a FirstLevelMethod aka a method that only append an atom (lexicon, name, args)
	 * @param  {String} lexiconName the lexicon name of the appended atom
	 * @param  {String} lexemName  the lexem name of the appended atom
	 * @return {Function}           a function that append the atom
	 */
	static getFirstLevelMethod(lexiconName, lexemName) {
		assert(typeof lexiconName === 'string', 'FirstLevel.getFirstLevelMethod(...) need a string (the lexicon name) as first argument');
		assert(typeof lexemName === 'string', 'FirstLevel.getFirstLevelMethod(...) need a string (the lexem name) as second argument');
		return function (...args) {
			this._lexems.push(new Lexem(lexiconName, lexemName, args));
			return this;
		};
	}
}