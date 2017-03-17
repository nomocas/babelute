/*
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

// core classes and functions
import {
	Babelute,
	Lexem,
	fromJSON
} from './babelute.js';
import {
	createLexicon,
	init,
	getLexicon,
	registerLexicon,
	initializer,
	developOneLevel,
	developToAtoms
} from './lexicon/lexicon.js';
import { Pragmatics, createPragmatics } from './pragmatics/pragmatics-core.js';
import { FacadePragmatics, createFacadeInitializer, createFacadePragmatics } from './pragmatics/facade-pragmatics.js';
// import Scopes from './pragmatics/pragmatics-scopes.js';

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
	Pragmatics,
	FacadePragmatics
	// Scopes
};

