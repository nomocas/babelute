/**
 * Babelute.
 * Javascript Internal DSMM Framework.
 * Method chaining applications to Templating and Internal Domain Specific (Multi)Modeling.
 * 
 * Domain Specific (Multi)Modeling (using DSL at all levels) solves many software design problems.
 * From developpement process (how to start, what and how to design, how to iterate, ...) 
 * to how to understand, design and articulate business related problems and/or pure code logics.
 * 
 * It relays entierly on Method Chaining pseudo design pattern.
 * In consequence, Babelute itself is made with really few code, and is really light (about 2.5ko gzip/min without own 
 * external DSL parser and serialiser - which are also really light (+- 3ko gzip/min)).
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

// core class
var Babelute = require('./lib/babelute');
// lexics
require('./lib/lexics');
// actions
require('./lib/actions');

// serializer to Babelute DSL
require('./lib/stringify');
// Babelute DSL parser
Babelute.parser = require('./lib/parser');

module.exports = Babelute;