/*******************************************************
 ************** Babelute Acions Environment ************
 *******************************************************/
/**
 * Simple helper aimed to :
 * - give a space where store/access needed variables while interpreting sentences with actions
 * - manage "inner sentences scopes" while executing actions tree.
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
 *
 */

const assert = require('assert');

export default class Scopes {
	constructor(scope = {}) {
		this.scope = scope;
		this.scopes = []; // stack
	}

	push(name, instance) {
		assert(typeof name === 'string', 'Pragmatics Scopes .push(...) need a string (the scope name where push) as first argument');
		assert(!!instance && typeof instance === 'object', 'Pragmatics Scopes need an object (the scope vaue to push) as second argument');
		const scope = this.scope = Object.assign({}, this.scope);
		scope[name] = instance;
		this.scopes.push(scope);
		return scope;
	}

	pop(name) {
		assert(typeof name === 'string', 'Pragmatics Scopes .pop(...) need a string (the scope name to pop) as first argument');
		if (!this.scopes.length)
			return;
		this.scopes.pop();
		this.scope = this.scopes[this.scopes.length - 1] || null;
		return this.scope;
	}
}