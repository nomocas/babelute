/**
 * Babelute.
 * Javascript Internal DSMM Framework.
 * Method chaining applications to Templating and Internal Domain Specific (Multi)Modeling.
 * Aka demonstration that everything is about languages.
 * 
 * Domain Language (Multi)Modeling solves many software design problems.
 * From developpement process (how to start, what and how to design, how to iterate, ...) 
 * to how to understand, design and articulate business related problems and/or pure code logics.
 * 
 * It provides natural ways of thinking models and code that are really close to how human mind 
 * works. Much much more close than OOP (including AOP) is.
 *
 * Babelute gives elegant and really simple ways to define/handle/use/transform chainable methods
 * in pure javascript or through it's own simple external DSL (a minimalist optimal string representation 
 * of call chains for babelute sentences serialisation).
 * 
 * It relays entierly on Method Chaining pseudo design pattern.
 * In consequence, it's made with really few code, and is really light (less than 2ko gzip/min without own 
 * external DSL parser - which is also really light (+- 1ko gzip/min) and made with its dedicated Fluent Interface)
 *
 * Babelute's parsing and output are both really fast. 
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

// core class and statics
var Babelute = require('./lib/babelute');

// serializer to Babelute DSL
require('./lib/stringify');

// Babelute DSL parser
Babelute.parser = require('./lib/parser');

// Babelute Document
require('./lib/document');

module.exports = Babelute;
