const assert = require('assert');
import {
	Babelute
} from '../babelute.js';
import Pragmatics from './pragmatics-core.js';

/**
 * FacadePragmatics pragmatics format :
 * 	function(subject, args, ?scopes){
 * 		// return nothing
 * 	}
 */
export default class FacadePragmatics extends Pragmatics {
	constructor(targets, pragmas) {
		super(targets, pragmas);
	}

	each(subject, args /* collection, itemHandler */ , scopes) {

		assert(typeof subject === 'object', '.each facade pragma need an object as subject (first argument)');
		assert(Array.isArray(args[0]) || args[0].length, '.each facade pragma need an array (or iterable with bracket access) as first args object (first argument passed to lexem)');
		assert(typeof args[1] === 'function', '.each facade pragma need a function as second args object (second argument passed to lexem)');

		const collec = args[0];
		const itemHandler = args[1];
		if (!collec.length)
			return;

		// no supputation on collection kind : use "for"
		for (let i = 0, len = collec.length, item, templ; i < len; ++i) {
			item = collec[i];
			templ = itemHandler(item, i);
			if (templ)
				this.$output(subject, templ, scopes);
		}
	}

	if (subject, args /* successBabelute, elseBabelute */ , scopes) {

		assert(typeof subject === 'object', '.if facade pragma need an object as subject (first argument)');
		assert(args[1] instanceof Babelute, '.if facade pragma need an babelute instance as second args object (second argument passed to lexem)');
		assert(!args[2] || args[2] instanceof Babelute, '.if facade pragma third args object (third argument passed to lexem) (optional) should be a babelute instance');

		if (args[0])
			this.$output(subject, args[1], scopes);
		else if (args[2])
			this.$output(subject, args[2], scopes);
	}

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