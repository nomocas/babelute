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


/**
 * Todo :
 *
 * 		debug translation 				OK
 *
 * 		_append : should add lexicName : 		OK
 *
 * 		on add to lexic(lexicName) :      ==> 	OK 
 * 		first time : create immediatly Babelute children class
 * 		after : modify existing prototypes (babelute, docs, and dothat if any) in place of clearing cache
 *
 * 		==> same thing when extending lexic : use inheritance to keep tracking of parent prototype    	==> 	OK
 *
 * 		scoped lexics management on stringify  				OK
 * 		
 * 		manage restrictions with mixins when extending Lexics/Actions/API  					OK
 *
 *		scope management
 *			use env.scope() to get current scope object or maybe pass it as fourth argument in actions
 *			env.pushScope({ name:instance })
 *			env.popScope(name)
 *
 *		$output({
 *			actions:'yamvish:dom',
 *			scope:{
 *				context: context || new Context(...)
 *			}
 *		})
 * 
 * 
 * 		finalise time management in actions
 * 			maybe add flag in actions namespace to say 'allowAsync'
 * 		manage result forwarding and promise listening 
 *    	 		
 * 		do simple example with async manager in env
 *
 *		manage in-lexem-actions
 * 
 *		translation/output table
 * 
 *
 * 		//_____________ after
 * 
 * 
 *		add Filter style with @myFunc
 *
 * 		add def mecanism  with dereferencement (aka $myVar)
 *
 *		work on babelute doc pilot : external query DSL ? api ?
 *  		.0 = args[0]
 *  		.name = select lexems with matching name
 *    		.#lexic = select lexems with matching lexic
 *    		.#lexic:lexem = select lexems with matching lexic and lexem name
 *    		.*
 *    		.*(filter)
 *    		.**(0=is=babelute)
 *    	 	.**(div|span|#foo:goo.0=is=babelute)
 * 		
 * 		extract yaom
 *
 * 		extract dothat
 * 
 * 		bridge between babelute actions and dothat API
 *
 * 		add tests
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
