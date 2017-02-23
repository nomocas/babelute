/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

/*******************************************************
 ************** Babelute Acions Environment ************
 *******************************************************/

import assert from 'assert'; // removed in production

/**
 * Inner-sentence-scopes manager : hold array as stacks for inner-scopes of sentences (if needed). It's only avaiable in pragmatics, while traversing, and is dependent of what pragmatics do. See babelute-html-view as an example of usage.
 *
 * So its a simple helper aimed to (while interpreting sentences) :
 * - give a space where store/access needed variables.
 * - manage "inner sentences scopes" (as current view container, current context, etc).
 *
 * It has to be used carefully after reading this :
 *
 * For certain output types (as in Babelute-html diffing) it has to be "pure".
 * (in a functional way of thinking).
 * It means that it should contains nothing else 
 * than "local" variables produced and managed while interpreting sentences.
 * No outside-sentence variables should be needed to perform the output.
 * And so, two output from the same sentence should be the same.
 *
 * So by example, Babelute-html-view use it to keep track (for managing view's life cycle) 
 * of views tree while rendering (with the scope facility prodived here).
 * 
 * Views are inner-sentences objects, and so as needed, 
 * two render on same babelute-html sentence will provide same output.
 *
 * For other DSL and outputs types, it depends what you want and implement, but be sure of what your doing 
 * before introducing outside variables dependencies in sentences interpretations.
 */
export default class Scopes {

	/**
	 * @param  {?Object} scope initial scope object
	 */
	constructor(scope = {}) {
		/**
		 * the scopes holder
		 * @type {Object}
		 * @protected
		 */
		this.scope = scope;
	}


	/**
	 * push value to scope[name]
	 * @param  {string} name 	the scope name
	 * @param  {*} value 		the value to push
	 * @return {number}       	the new length to be consistent with array push
	 */
	push(name, value) {
		assert(typeof name === 'string', 'Pragmatics Scopes .push(...) need a string (the scope name where push) as first argument');
		assert(typeof value !== 'undefined', 'Pragmatics Scopes .push(...) need a value as second argument');
		
		this.scope[name] = this.scope[name]  || [];
		return this.scope[name].push(value);
	}

	/**
	 * pop value from scope[name]
	 * @param  {string} name the scope name to pop
	 * @return {*}      the popped value
	 */
	pop(name) {
		assert(typeof name === 'string', 'Pragmatics Scopes .pop(...) need a string (the scope name to pop) as first argument');
		
		if (!this.scope[name].length)
			return;
		return this.scope[name].pop();
	}

	/**
	 * get scope value by name
	 * @param  {string} name the scope name
	 * @return {*}      the top value
	 * @throws {Error} If scope not found with name
	 */
	get(name){
		assert(typeof name === 'string', 'Pragmatics Scopes .get(...) need a string (the scope name where get top value) as first argument');

		var scope = this.scope[name];
		if(!scope)
			throw new Error(`scope not found with : ${ name }`);
		return scope[scope.length - 1];
	}
}

