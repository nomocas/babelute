/*
* @Author: Gilles Coomans
* @Date:   2017-03-10 13:25:25
* @Last Modified by:   Gilles Coomans
* @Last Modified time: 2017-03-10 22:31:48
*/

import assert from 'assert'; // removed in production

import {
	Babelute
} from '../babelute.js';

/**
 * Initializer Class
 * @protected
 */
class Initializer {
	/**
	 * extends Initializer
	 * @param  {[type]} BaseInitializer [description]
	 * @return {[type]}                 [description]
	 */
	static extends(BaseInitializer) {

		assert(BaseInitializer === Initializer || (BaseInitializer.prototype instanceof Initializer), 'Initializer.extends accepts only a Initializer Class (or subclass) as argument');

		const Class = function() {};
		Class.prototype = Object.create(BaseInitializer.prototype);
		Class.prototype.constructor = Class;
		return Class;
	}
}

/**
 * create a Initializer (based on a Babelute subclass) and instanciate it
 * @param  {Babelute} BabeluteClass   a Babelute subclass from where create initializer
 * @param  {?Initializer} BaseInitializer a parent initializer to be extended (optional)
 * @return {Initializer}               the Initializer instance
 * @protected
 */
function createInitializer(BabeluteClass, BaseInitializer = null) {

	assert(BabeluteClass === Babelute || (BabeluteClass.prototype instanceof Babelute), 'Lexicon createInitializer accepts only a Babelute Class (or subclass) as first argument');
	assert(!BaseInitializer || BaseInitializer === Initializer || (BaseInitializer.prototype instanceof Initializer), 'Lexicon createInitializer accepts only a Initializer Class (or subclass) as second argument');

	const Init = BabeluteClass.Initializer = BaseInitializer ? Initializer.extends(BaseInitializer) : Initializer;
	BabeluteClass.initializer = new Init();
	BabeluteClass.initializer._empty = function() {
		return new BabeluteClass();
	};
	BabeluteClass.initializer.BabeluteClass = BabeluteClass;
	Object.keys(BabeluteClass)
		.forEach((i) => {
			addToInitializer(Init, i);
		});
	return BabeluteClass.initializer;
}

/**
 * add method to initializer
 * @protected
 * @param {Initializer} Initializer Initializer class where add methods in proto
 * @param {string} methodName  the name of method to add
 */
function addToInitializer(Initializer, methodName) {
	Initializer.prototype[methodName] = function() {
		return this.BabeluteClass.prototype[methodName].apply(new this.BabeluteClass(), arguments);
	};
}

// add base Babelute's api
['_use', '_each', '_if', '_append', '_lexicon']
.forEach((methodName) => {
	addToInitializer(Initializer, methodName);
});

export {
	Initializer,
	createInitializer,
	addToInitializer
};

