/*
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

// core classes and functions
import {
	Babelute,
	Lexem
} from './babelute.js';
import FirstLevel from './lexicon/first-level.js';
import {
	Lexicon,
	Initializer,
	initializer,
	firstLevelInitializer
} from './lexicon/lexicon.js';
import fromJSON from './from-json.js';
import Pragmatics from './pragmatics/pragmatics-core.js';
import FacadePragmatics from './pragmatics/facade-pragmatics.js';
import Scopes from './pragmatics/pragmatics-scopes.js';

export default {
	Babelute,
	Lexem,
	FirstLevel,
	Lexicon,
	Initializer,
	initializer,
	firstLevelInitializer,
	fromJSON,
	Pragmatics,
	FacadePragmatics,
	Scopes
};

