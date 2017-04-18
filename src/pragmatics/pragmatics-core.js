/**
 * Pragmatics Class : minimal abstract class for homogeneous pragmatics.
 *
 * This is the minimal contract that a pragmatics should satisfy.
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import assert from 'assert'; // removed in production

/**
 * Base class to provide homogeneous Pragmatics interface. You should never instanciate a Pragmatics directly with new. use {@link createPragmatics}.
 */
export class Pragmatics {

	/**
	 * @param  {Object} targets initial targets object
	 * @param  {Object} pragmas pragmatics methods to add
	 */
	constructor(targets, pragmas) {

		assert(typeof targets === 'object', 'Pragmatics constructor need an object (the lexicons targets) as first argument');
		assert(typeof pragmas === 'object', 'Pragmatics constructor need an object (the pragma\'s base methods) as second argument');

		/**
		 * targets holder object
		 * @type {Object}
		 * @public
		 */
		this._targets = targets;

		if(pragmas)
			this.addPragmas(pragmas);
	}

	/**
	 * add methods to pragmatics instance
	 * @param {Object} pragmas an object containing methods to add
	 */
	addPragmas(pragmas) {

		assert(pragmas && typeof pragmas === 'object', 'pragmatics.addPragmas(...) need a valid object (the methods map to add) as argument');

		for (const i in pragmas)
			/**
			 * @ignore
			 */
			this[i] = pragmas[i];
	}

	/* istanbul ignore next */
	/**
	 * the method used to output a babelute through this pragmatics instance
	 * @abstract
	 */
	$output( /* ... */ ) {
		// to be overridden
		throw new Error('pragmatics.$output should be implemented in subclasses');
	}
}

/**
 * return a new Pragmatics instance. Do not forget to implement $output before usage.
 * @param  {Object} targets initial targets object
 * @param  {Object} pragmas pragmatics methods to add
 * @return {Pragmatics}   the Pragmatics instance
 */
export function createPragmatics(targets = {}, pragmas = {}) {
	return new Pragmatics(targets, pragmas);
}

