/*
* @Author: Gilles Coomans
*/
import assert from 'assert'; // removed in production
import Babelute from './babelute';
import Lexem from './lexem';
/**
 * deserialize json to babelute
 * @param  {String} json the json string
 * @return {Babelute}      the deserialized babelute
 * @throws {Error} If json is badly formated
 */
export default function fromJSON(json) {
	assert(typeof json === 'string', 'babelute.fromJSON need a string as first argument');
	return JSON.parse(json, (k, v) => {
		if (v && v.__babelute__)
			return new Babelute(v._lexems.map((lexem) => {
				return new Lexem(lexem.lexicon, lexem.name, lexem.args);
			}));
		return v;
	});
}
