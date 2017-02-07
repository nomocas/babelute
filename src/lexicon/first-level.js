/**
 * FirstLevel Class : 
 *
 * A Babelute subclass aimed to hold only "first-level" atoms.
 *
 * Same concept than 'first-level of understanding', as if we where stupid by always understanding only first literal sens of words.
 *
 * It provides sentences and lexems without any interpretation, and that could be really useful : e.g.
 * - to see sentence as "editable document" and/or for allowing meta-writing of sentences
 * - to obtain the full AST of babelute sentences 
 *
 * See full docs.
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

export default class FirstLevel extends Babelute {
	constructor(lexems) {
		super(lexems);
		this.__first_level_babelute__ = true;
	}
	_lexicon(lexiconName) {
		assert(typeof lexiconName === 'string', '._lexicon(...) accept only a string (a Lexicon id) as argument');
		return new(Babelute.getLexic(lexiconName).FirstLevel)(this._lexems);
	}

	static getFirstLevelMethod(lexiconName, methodName) {
		return function () {
			this._lexems.push(new Lexem(lexiconName, methodName, arguments));
			return this;
		};
	}
}