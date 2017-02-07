const assert = require('assert');
import {
	Babelute
} from './babelute.js';

/*****************************************************
 * Babelute instances modification API (meta-language API)
 *****************************************************/

const metaApi = {
	/**
	 * conditional sentences concatenation.
	 *
	 * Apply modification at sentence writing time (aka the babelute does not contains the _if lexems. _if has immediatly been applied).
	 * 
	 * @param  {*} condition any value that will be casted to Boolean (!!)
	 * @param  {Babelute} babelute  which sentence to insert if !!condition === true
	 * @param  {Babelute} elseBabelute  which sentence to insert if !!condition === false
	 * @return {Babelute}     the current Babelute instance
	 */
	_if(condition, babelute, elseBabelute) {

		assert(babelute instanceof Babelute, '._if meta-api need an babelute instance as second argument');
		assert(!elseBabelute || elseBabelute instanceof Babelute, '._if meta-api need an babelute instance as third argument (optional)');

		if (condition)
			this._lexems = this._lexems.concat(babelute._lexems);
		else if (elseBabelute)
			this._lexems = this._lexems.concat(elseBabelute._lexems);
		return this;
	},

	/**
	 * For each item from array : execute function and concatenate returned babelute sentence to current one. 
	 * Provided function must return a babelute.
	 *
	 * Apply modification at sentence writing time (aka the babelute does not contains the _each lexems. _each has immediatly been applied).
	 * 
	 * @param  {Array} array  the array to iterate on
	 * @param  {Function} func the function to handle each item. it must return a babelute.
	 * @return {Babelute}     the current Babelute instance
	 */
	_each(array, func) {

		assert(Array.isArray(array) || array.length, '._each meta-api need an array (or iterable with bracket access) as first argument');
		assert(typeof func === 'function', '._each meta-api need a function as second argument');

		array.forEach((item, index) => {
			const b = func(item, index);
			if (b && b.__babelute__)
				this._lexems.push.apply(this._lexems, b._lexems);
		});
		return this;
	}

};

Object.assign(Babelute.prototype, metaApi);

export default Babelute;