/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production
import {
	Babelute
} from '../babelute.js';
import { Pragmatics } from './pragmatics-core.js';

/**
 * FacadePragmatics : a facade oriented Pragmatics subclass. You should never instanciate a FacadePragmatics directly with new. use {@link createFacadePragmatics}.
 * @example
 * // Remarque : any lexem's method will be of the following format : 
 * function(subject, args, ?percolator){
 * 	// return nothing
 * }
 */
export class FacadePragmatics extends Pragmatics {

	/**
	 * @param  {Object} targets initial targets object
	 * @param  {?Object} pragmas pragmatics methods to add
	 */
	constructor(targets, pragmas) {
		super(targets, pragmas);
	}

	/**
	 * "each" facade implementation
	 * @param  {Object} subject the handled subject
	 * @param  {Array|arguments} args  the lexem's args : [ collection:Array, itemHandler:Function ]
	 * @param  {?Object} percolator  the sentence's percolator instance
	 * @return {void}         nothing
	 */
	each(subject, args /* collection, itemHandler */ , percolator) {

		assert(typeof subject === 'object', '.each facade pragma need an object as subject (first argument)');
		assert(!args[0] || Array.isArray(args[0]), '.each facade pragma need an array (or iterable with bracket access) as first args object (first argument passed to lexem)');
		assert(typeof args[1] === 'function', '.each facade pragma need a function as second args object (second argument passed to lexem)');
		
		const collec = args[0],
			itemHandler = args[1];

		if (collec && collec.length) // no supputation on collection kind : use "for"
			for (let i = 0, len = collec.length, item, templ; i < len; ++i) {
				item = collec[i];
				templ = itemHandler(item, i);
				if (!templ)
					throw new Error('.each function should return a sentence.');
				this.$output(subject, templ, percolator);
			}
	}

	/**
	 * "if" facade implementation 
	 * @param  {Object} subject the handled subject
	 * @param  {Array|arguments} args  the lexem's args : [ conditionIsTrue:Babelute, conditionIsFalse:Babelute ]
	 * @param  {?Object} percolator  the sentence's percolator instance
	 * @return {void}         nothing
	 */
	if (subject, args /* trueBabelute, falseBabelute */ , percolator) {

		assert(typeof subject === 'object', '.if facade pragma need an object as subject (first argument)');
		assert(args[1] instanceof Babelute, '.if facade pragma need an babelute instance as second args object (second argument passed to lexem)');
		assert(!args[2] || args[2] instanceof Babelute, '.if facade pragma third args object (third argument passed to lexem) (optional) should be a babelute instance');

		if (args[0])
			this.$output(subject, args[1], percolator);
		else if (args[2])
			this.$output(subject, args[2], percolator);
	}

	/**
	 *
	 * @override
	 * @param  {Object} subject  the subject handle through interpretation
	 * @param  {Babelute} babelute the babelute "to interpret on" subject
	 * @param  {Scope} percolator   the sentence percolator instance (optional)
	 * @return {Object}        the subject
	 */
	$output(subject, babelute, percolator = null) {

		assert(typeof subject === 'object', '.$output facade pragma need an object as subject (first argument)');
		assert(babelute instanceof Babelute, '.$output facade pragma need an babelute instance as second argument');
		assert(!percolator || typeof percolator === 'object', '.$output facade pragma need an (optional) scope instance as third argument');

		for (let i = 0, lexem, len = babelute._lexems.length; i < len; ++i) {
			lexem = babelute._lexems[i];
			if (this._targets[lexem.lexicon] && this[lexem.name])
				this[lexem.name](subject, lexem.args, percolator);
		}
		return subject;
	}
}

/**
 * create a FacadePragmatics instance
 * @param  {Object} targets the pragmatics targets DSL
 * @param  {?Object} pragmas the methods to add
 * @return {FacadePragmatics}     the facade pragmatics instance
 * @example
 * const myPragmas = babelute.createFacadePragmatics({
 * 	'my-lexicon':true
 * }, {
 * 	foo(subject, args, percolator){
 * 		// do something
 * 	},
 * 	bar(subject, args, percolator){
 * 		// do something
 * 	}
 * });
 */
export function createFacadePragmatics(targets, pragmas = null) {
	return new FacadePragmatics(targets, pragmas);
}

