/**
 * Pragmatics Class : minimal abstract class for homogeneous pragmatics.
 *
 * This is the minimal contract that a pragmatics should satisfy.
 */

const assert = require('assert');

export default class Pragmatics {
	constructor(targets = {}, pragmas = {}) {

		assert(typeof targets === 'object', 'Pragmatics constructor need an object (the lexicons targets) as first argument');
		assert(typeof pragmas === 'object', 'Pragmatics constructor need an object (the pragma\'s base methods) as second argument');

		this._targets = targets;
		if (pragmas)
			Object.assign(this, pragmas);
	}

	addPragmas(pragmas) {

		assert(pragmas && typeof pragmas === 'object', 'pragmatics.addPragmas(...) need a valid object (the methods map to add) as argument');

		Object.assign(this, pragmas);
	}

	/* istanbul ignore next */
	$output( /* ... */ ) {
		// to be overridden
		assert(false, 'pragmatics.$output should implemented in subclasses');
	}
}