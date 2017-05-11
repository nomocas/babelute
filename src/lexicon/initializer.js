/*
 * @Author: Gilles Coomans
 * @Date:   2017-03-10 13:25:25
 * @Last Modified by:   Gilles Coomans
 * @Last Modified time: 2017-05-10 11:03:28
 */

import assert from 'assert'; // removed in production
import Babelute from '../babelute';
import extend from '../utils/extends';

/**
 * Initializer Class
 * @protected
 */
class Initializer {}

/**
 * extends Initializer
 * @param  {Class} BaseInitializer the Initializer to extends
 * @return {Class}                 the extended Initalizer class
 */
Initializer.extends = extend;

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
	BabeluteClass.initializer.Class = BabeluteClass;
	Object.keys(BabeluteClass).forEach((i) => addToInitializer(Init, i));
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
		return new this.Class()[methodName](...arguments);
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

