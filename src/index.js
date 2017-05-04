/*
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

import Lexem from './lexem';
import Babelute from './babelute';
import fromJSON from './from-json';

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
} from './lexicon/lexicon';

import FirstLevel from './lexicon/first-level';
import { Pragmatics, createPragmatics } from './pragmatics/pragmatics-core';
import { FacadePragmatics, createFacadePragmatics } from './pragmatics/facade-pragmatics';

export default {
	createLexicon,
	createPragmatics,
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

