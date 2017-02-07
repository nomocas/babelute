/**
 * JSON to babelute parser
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016-2017 Gilles Coomans
 */

import {
	Babelute,
	Lexem
} from './babelute.js';

export default function fromJSON(json) {
	return JSON.parse(json, (k, v) => {
		if (!v)
			return v;
		if (v.__babelutelexem__)
			return new Lexem(v.lexic, v.name, v.args);
		if (v.__babelute__)
			return new Babelute(v._lexems);
		return v;
	});
}