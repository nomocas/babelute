/*
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

import {
	Babelute,
	Lexem,
	fromJSON
} from './babelute.js';

import {
	Lexicon,
	createLexicon,
	init,
	getLexicon,
	registerLexicon,
	initializer,
	developOneLevel,
	developToAtoms,
	lexicons
} from './lexicon/lexicon.js';

import FirstLevel from './lexicon/first-level.js';
import { Pragmatics, createPragmatics } from './pragmatics/pragmatics-core.js';
import { FacadePragmatics, createFacadeInitializer, createFacadePragmatics } from './pragmatics/facade-pragmatics.js';

export default {
	createLexicon,
	createPragmatics,
	createFacadeInitializer,
	createFacadePragmatics,
	init,
	initializer,
	getLexicon,
	registerLexicon,
	developOneLevel,
	developToAtoms,
	fromJSON,
	Babelute,
	Lexem,
	FirstLevel,
	Pragmatics,
	FacadePragmatics,
	Lexicon,
	lexicons
};

