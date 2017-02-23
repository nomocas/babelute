/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production
import {
	Babelute
} from '../babelute.js';
import Scopes from './pragmatics-scopes';
import { Pragmatics } from './pragmatics-core.js';

/**
 * FacadePragmatics : a facade oriented Pragmatics subclass. You should never instanciate a FacadePragmatics directly with new. use {@link createFacadePragmatics}.
 * @example
 * // Remarque : any lexem's method will be of the following format : 
 * function(subject, args, ?scopes){
 * 	// return nothing
 * }
 */
export class FacadePragmatics extends Pragmatics {

	/**
	 * @param  {Object} targets initial targets object
	 * @param  {?Object} pragmas pragmatics methods to add
	 */
	constructor(targets, pragmas = null) {
		super(targets, pragmas);
	}

	/**
	 * "each" facade implementation
	 * @param  {Object} subject the handled subject
	 * @param  {Array|arguments} args  the lexem's args : [ collection:Array, itemHandler:Function ]
	 * @param  {Scopes} scopes  the sentence's scopes instance
	 * @return {void}         nothing
	 */
	each(subject, args /* collection, itemHandler */ , scopes) {

		assert(typeof subject === 'object', '.each facade pragma need an object as subject (first argument)');
		assert(Array.isArray(args[0]) || args[0].length, '.each facade pragma need an array (or iterable with bracket access) as first args object (first argument passed to lexem)');
		assert(typeof args[1] === 'function', '.each facade pragma need a function as second args object (second argument passed to lexem)');
		const collec = args[0],
			itemHandler = args[1];

		if (collec.length) // no supputation on collection kind : use "for"
			for (let i = 0, len = collec.length, item, templ; i < len; ++i) {
				item = collec[i];
				templ = itemHandler(item, i);
				if (templ)
					this.$output(subject, templ, scopes);
			}
	}

	/**
	 * "if" facade implementation 
	 * @param  {Object} subject the handled subject
	 * @param  {Array|arguments} args  the lexem's args : [ conditionIsTrue:Babelute, conditionIsFalse:Babelute ]
	 * @param  {Scopes} scopes  the sentence's scopes instance
	 * @return {void}         nothing
	 */
	if (subject, args /* trueBabelute, falseBabelute */ , scopes) {

		assert(typeof subject === 'object', '.if facade pragma need an object as subject (first argument)');
		assert(args[1] instanceof Babelute, '.if facade pragma need an babelute instance as second args object (second argument passed to lexem)');
		assert(!args[2] || args[2] instanceof Babelute, '.if facade pragma third args object (third argument passed to lexem) (optional) should be a babelute instance');

		if (args[0])
			this.$output(subject, args[1], scopes);
		else if (args[2])
			this.$output(subject, args[2], scopes);
	}

	/**
	 *
	 * @override
	 * @param  {Object} subject  the subject handle through interpretation
	 * @param  {Babelute} babelute the babelute "to interpret on" subject
	 * @param  {Scope} scopes   the sentence scopes instance (optional)
	 * @return {Object}        the subject
	 */
	$output(subject, babelute, scopes = null) {

		assert(typeof subject === 'object', '.$output facade pragma need an object as subject (first argument)');
		assert(babelute instanceof Babelute, '.$output facade pragma need an babelute instance as second argument');
		assert(!scopes || typeof scopes === 'object', '.$output facade pragma need an (optional) scope instance as third argument');

		for (let i = 0, lexem, len = babelute._lexems.length; i < len; ++i) {
			lexem = babelute._lexems[i];
			if (this._targets[lexem.lexicon] && this[lexem.name])
				this[lexem.name](subject, lexem.args, scopes);
		}
		return subject;
	}
}

/**
 * create a facade-ready-to-run initializer function.
 * @param  {Lexicon} lexicon    the lexicon from where take the api
 * @param  {Object} pragmatics   the pragmatics object where to find interpretation method to fire immediatly
 * @return {Function}            the facade initializer function
 * @example
 *
 * import babelute from 'babelute';
 * const myLexicon = babelute.createLexicon('my-lexicon');
 * myLexicon.addAtoms(['foo', 'bar']);
 * 
 * const myPragmas = babelute.createFacadePragmatics({
 * 	'my-lexicon':true
 * }, {
 * 	foo(subject, args, scopes){
 * 		// do something
 * 	},
 * 	bar(subject, args, scopes){
 * 		// do something
 * 	}
 * });
 *
 * const mlp = babelute.createFacadeInitializer(myLexicon, myPragmas);
 *
 * mlp(mySubject).foo(...).bar(...); // apply pragmas immediatly on subject through lexicon api's
 *
 */
export function createFacadeInitializer(lexicon, pragmatics) {
	const Facade = function(subject, scopes) {
		lexicon.Atomic.call(this);
		this._subject = subject;
		this._scopes = scopes;
	};

	Facade.prototype = Object.create(lexicon.Atomic.prototype);
	Facade.prototype.constructor = Facade;
	Facade.prototype._lexicon = null;
	Facade.prototype._append = function(lexiconName, name, args) {
		if ((!pragmatics._targets || pragmatics._targets[lexiconName]) && pragmatics[name])
			pragmatics[name](this._subject, args, this._scopes);
		return this;
	};
	return (subject, scopes = null) => {
		return new Facade(subject, scopes || new Scopes());
	};
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
 * 	foo(subject, args, scopes){
 * 		// do something
 * 	},
 * 	bar(subject, args, scopes){
 * 		// do something
 * 	}
 * });
 */
export function createFacadePragmatics(targets, pragmas = null) {
	return new FacadePragmatics(targets, pragmas);
}

