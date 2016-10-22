(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Babelute = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

// Babelute First Degree
require('./lib/first-level-babelute');

// serializer to Babelute DSL
require('./lib/stringify');

// Babelute DSL parser
Babelute.parser = require('./lib/parser');



module.exports = Babelute;
},{"./lib/babelute":2,"./lib/first-level-babelute":3,"./lib/parser":4,"./lib/stringify":5}],2:[function(require,module,exports){
/**
 * Babelute core Class and statics functions.
 *
 * A babelute is just a sentences (a chain of lexems with argument(s)) 
 * written with method chaining, (aka foo(1, true).bar('zoo', goo().foo()) )
 * and where lexems (each call - aka .myLexem(arg1, ...)) 
 * are simply kept in an array for further interpretations, 
 * in following object format : { lexic:'...', name:'...', args:[...] }.
 *
 * Absolutly nothing more.
 *
 * You could see it as an Abstract Syntax Tree of and Abstract Program that needs further interpretations. (Don't be afraid, it's highly practical and simple.) 
 *
 * You provide lexics (dictionaries) of related lexems that form an Internal (Abstract) DSL, you write sentences with them, and provide/use
 * different dictionaries of "actions" (lexems implementations) to outputing them in various situations and context.
 *
 * You could manipulate and write those babelutes as you want, translate them in and through other Internal Abstract DSLs, 
 * and produce any kind of output ou want by usings specifics "actions" dictionaries.
 *
 * It looks complex (because abstract) but at usage everything is smooth, clear and easy.
 *
 * The Babelute Class is just a helper for writing and holding babelute sentences. 
 *
 * 
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = function(lexems) {
		this.__babelute__ = 'default'; // current lexic
		this._lexems = lexems ||  [];
	},
	Lexem = Babelute.Lexem = function(lexic, name, args, handler) {
		this.__babelutelexem__ = true;
		this.lexic = lexic;
		this.name = name;
		this.args = args;
		if (handler)
			this.handler = handler;
	},
	lexicsDico = Babelute.lexics = {
		'default': {
			Cl: Babelute
		}
	},
	actionsDico = Babelute.actions = {
		'default': {
			log: function() {
				console.log.apply(console, arguments);
			},
			debug: function() {
				console.log.apply(console, ['debug:'].concat(arguments));
			},
			if: function(subject, args, env /* successBabelute, elseBabelute */ ) {
				if (args[0])
					return args[1].$output(env, subject);
				else if (args[2])
					return args[2].$output(env, subject);
			},
			all: function(subject, thenables, env) {
				return Promise.all(thenables);
			},
			then: function(subject, callbacks, env) {
				if (locals.error)
					return locals.result = args[0](locals.error);
				return locals.result = args[1](locals.result);
			},
			catch: function(subject, args, env) {
				if (locals.error)
					return locals.result = args[0](locals.error);
			}
		}
	};

Babelute.prototype = {
	/**
	 * get new dedicated babelute handler that act on same aray of lexems (current one)
	 * return new babelute specialised with lexicName
	 */
	babelute: function(lexicName) {
		var lexic = Babelute.getLexic(lexicName),
			Cl = lexic.Cl,
			b = new Cl();
		b._lexems = this._lexems;
		return b;
	},
	/**
	 * get dedicated babelute handler (independant of current array of lexems)
	 * return new babelute specialised with lexicName or current lexic
	 */
	_new: function(lexicName) {
		return Babelute.b(lexicName ||  this.__babelute__ !== true ? this.__babelute__ : null);
	},
	/*****************************************************
	 * Babelute instance modification (meta-language API)
	 *****************************************************/
	// add lexem to babelute
	_append: function(lexicName, name, args) {
		this._lexems.push(new Lexem(lexicName || this.__babelute__, name, args));
		return this;
	},
	// conditional sentences concatenation
	_if: function(condition, babelute) {
		if (condition)
			this._lexems = this._lexems.concat(babelute._lexems);
		return this;
	},
	// use a babelute (concat its lexems to local ones)
	_use: function(babelute /* could be a string in "lexicName:methodName" format */ /*, ...args */ ) {
		if (!babelute)
			return this;
		var args = [].slice.call(arguments, 1),
			method = typeof babelute === 'string' ? getMethod(babelute) : babelute;
		if (method.__babelute__)
			this._lexems = this._lexems.concat(method._lexems);
		else
			method(this._lexems, args);
		return this;
	},
	forEach: function(func, self) {
		var lexems = this._lexems;
		for (var i = 0, len = lexems.length; i < len; ++i)
			func.call(self ||  this, lexems[i], i);
	},
	// execute provided function binded on current babelute, that will receive item and index as argument.
	_each: function(arr, func, self) {
		arr.forEach(func, self || this);
		return this;
	},
	// execute provided babelutes list on current babelute.
	_useEach: function(arr) {
		arr.forEach(function(i) {
			this._use(i);
		}, this);
		return this;
	},
	/********************
	 * TRANSLATION
	 ********************/
	// translate babelute lexem through a lexic. return new babelute.
	_translation: function(lexicName) {
		// todo : optimised "recursive" translation with array of lexicsDico
		var lexic = Babelute.getLexic(lexicName),
			Cl = lexic.Cl,
			b = new Cl(),
			lexem;
		for (var i = 0, len = this._lexems.length; i < len; ++i) {
			lexem = this._lexems[i];
			var args = lexem.args.map(function(arg) {
				if (arg && arg.__babelute__)
					return arg._translation(lexicName);
				return arg;
			});
			if (b[lexem.name])
				b[lexem.name].apply(b, args);
			else
				b._lexems.push(new Lexem(lexem.lexic, lexem.name, args));
		}
		return b;
	},
	/**********************************************
	 ***************** OUTPUTS ********************
	 **********************************************/
	// specialised ouput : interpret babelute with specified actions
	'$output': function(env /* or actionsName */ , subject, scope, startIndex) {
		if (typeof env === 'string')
			env = new Environment(env, scope);

		var actions = env.actions,
			self = this,
			index = (startIndex || 0),
			lexem,
			r,
			f;
		while (lexem = this._lexems[index++]) {
			if (actions.__restrictions__ && !actions.__restrictions__[lexem.lexic])
				continue;
			f = actions[lexem.name] || actionsDico.default[lexem.name];
			if (f) {
				r = f(subject, lexem.args, env, env.scope);
				if (r && r.then) { // wait promise then continue output
					return r.then(function(s) {
						return self.$output(env, subject, null, index);
					});
				}
			}
		}
		return subject;
	},
	/**********************************************************
	 ********************** DEFAULT LEXEMS ********************
	 **********************************************************/
	// conditional execution
	if: function(condition, babelute, elseBabelute) {
		return this._append(this.__babelute__, 'if', [condition, babelute, elseBabelute]);
	},
	// log action state
	log: function() {
		return this._append(this.__babelute__, 'log', [].slice.call(arguments));
	},
	// for debug : log action state
	debug: function() {
		return this._append(this.__babelute__, 'debug', [].slice.call(arguments));
	},
	// async management
	all: function() {
		return this._append(this.__babelute__, 'all', [].slice.call(arguments));
	},
	then: function(success, fail) {
		return this._append(this.__babelute__, 'then', [success, fail]);
	},
	catch: function(fail) {
		return this._append(this.__babelute__, 'fail', [fail]);
	}
};

/*************************************************
 ********************* STATICS *******************
 *************************************************/

// Babelute main initializer
Babelute.b = function(lexicName) {
	return lexicName ? Babelute.initializer(lexicName) : new Babelute();
};

// babelute initializer management

function addToInitializer(lexic, method) {
	var Cl = lexic.Cl;
	lexic.initializer = lexic.initializer ||  {};
	lexic.initializer[method] = function() {
		var instance = new lexic.Cl();
		return instance[method].apply(instance, [].slice.call(arguments));
	}
}

function initializer(lexic) {
	lexic.initializer = lexic.initializer || {};
	Object.keys(lexic.Cl.prototype)
		.forEach(function(key) {
			if (key === '__babelute__' || key === '_lexems')
				return;
			addToInitializer(lexic, key);
		});
	return lexic.initializer;
}

// Babelute initializer provider
Babelute.initializer = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName);
	return lexic.initializer || initializer(lexic);
};

// return specified lexic.
Babelute.getLexic = function(lexicName) {
	var lexic = lexicsDico[lexicName];
	if (!lexic)
		throw new Error('Babelute : lexic not found : ' + lexicName);
	return lexic;
};

// return specified actions.
Babelute.getActions = function(actionsName) {
	var actions = actionsDico[actionsName];
	if (!actions)
		throw new Error('Babelute : actions not found : ' + actionsName);
	return actions;
};

/**
 * Add method(s) to specified lexic
 * @param  {String} lexicName  	the name of the lexic where happening method(s)
 * @param  {String | Array | Object} 	If is string : it's the name of the method. If is array of string : each string is the name of a logical atom method. If is an object : it's used as a map of methods.
 * @param  {Function} method    the method function. used only if methoName is a string.
 * @return {Babelute}   		Babelute for chaining
 */
Babelute.toLexic = function(lexicName, methodName, method) {
	var lexic = lexicsDico[lexicName] || initLexic(lexicName);
	if (typeof methodName === 'object') {
		if (methodName.forEach) { // logical atoms. pure single _append
			methodName.forEach(function(methodName) {
				addLexem(lexic, lexicName, methodName);
			});
		} else
			for (var i in methodName) {
				if (i === '__babelute__' || i === '_lexems')
					continue;
				addLexem(lexic, lexicName, i, methodName[i]);
			}
	} else
		addLexem(lexic, lexicName, methodName, method);
	return Babelute;
};

function addLexem(lexic, lexicName, methodName, method) {
	var firstLevelProto = lexic.FirstLevelCl.prototype;
	firstLevelProto[methodName] = getFirstLevelMethod(lexicName, methodName);
	lexic.Cl.prototype[methodName] = method || firstLevelProto[methodName];
	addToInitializer(lexic, methodName);
}

/**
 * Add action's method to specified actionsDico namespaces
 * @param  {String} actionsName 	namespace of actionsDico where store method(s)
 * @param  {String | Object} 		methodName  the name of the méthod or a map (object) of methods
 * @param  {Function} method      	the method function. (used only if methodName is a string)
 * @return {Babelute}             	Babelute for chaining.
 */
Babelute.toActions = function(actionsName, methodName, method) {
	var actions = actionsDico[actionsName] = actionsDico[actionsName] ||  {};
	if (typeof methodName === 'object') {
		for (var i in methodName) {
			if (i === '__restrictions__') {
				actions.__restrictions__ = actions.__restrictions__ || {};
				for (var j in methodName[i])
					actions[i][j] = methodName[i][j];
			} else
				actions[i] = methodName[i];
		}
	} else if (methodName === '__restrictions__') {
		actions.__restrictions__ = actions.__restrictions__ || {};
		for (var j in method)
			actions.__restrictions__[j] = method[j];
	} else
		actions[methodName] = method;
	return Babelute;
};

// duplicate specified lexic to newName and add provided methods to it.
Babelute.extendLexic = function(lexicName, newName, methods) {
	var lexic = Babelute.getLexic(lexicName),
		newLexic = initLexic(newName, lexic);
	if (methods)
		Babelute.toLexic(newName, methods);
	return Babelute;
};

// duplicate specified actions to newName and add provided methods to it.
Babelute.extendActions = function(actionsName, newName, methods) {
	Babelute.toActions(newName, Babelute.getActions(actionsName));
	if (methods)
		Babelute.toActions(newName, methods);
	var actions = actionsDico[newName];
	actions.__restrictions__ = actions.__restrictions__ || {};
	actions.__restrictions__[newName] = true;
	return Babelute;
};

/***************************************
 ************** Environment ************
 ***************************************/

function Environment(actionsName, scope) {
	this.__babelute__env__ = true;
	this.actions = Babelute.getActions(actionsName);
	this.scope = scope ||  null;
}

Environment.prototype = {
	pushScope: function(name, instance) {
		this.scopes = this.scopes || [];
		var scope = {};
		for (var i in this.scope)
			scope[i] = this.scope[i];
		scope[i] = instance;
		this.scopes.push(scope);
		this.scope = scope;
	},
	popScope: function(name) {
		if (!this.scopes)
			return;
		if (this.scopes.length)
			this.scopes.pop();
		this.scope = this.scopes[this.scopes.length - 1] || null;
	}
};

/**************************************
 ***************** UTILS **************
 **************************************/

// parse lexicName:methodName string format and return method from lexic
// absolutly for internal use only.
function getMethod(req) {
	var splitted = req.split(':'),
		lexicName = splitted[0],
		lexic = Babelute.getLexic(lexicName),
		methodName = splitted[1];
	if (!lexic.Cl.prototype[methodName])
		throw new Error('Babelute : method not found : ' + req);
	var instance = getInstance(lexicName, lexic);
	return function(lexems, args) {
		instance._lexems = lexems;
		instance[methodName].apply(instance, args);
	}
}

function getInstance(lexicName, lexic) {
	if (lexic.Instance)
		return lexic.Instance;
	var Cl = lexic.Cl;
	return lexic.Instance = new Cl();
}

function initLexic(lexicName, baseLexic) {
	var BaseClass = (baseLexic && baseLexic.Cl) || Babelute,
		BaseFLClass = (baseLexic && baseLexic.FirstLevelCl) || Babelute;

	var Cl = function() {
		BaseClass.call(this);
		this.__babelute__ = lexicName;
	};
	Cl.prototype = new BaseClass();

	var FirstLevelCl = function() {
		BaseFLClass.call(this);
		this.__babelute__ = lexicName;
	};
	FirstLevelCl.prototype = new BaseFLClass();

	lexic = lexicsDico[lexicName] = {
		Cl: Cl,
		FirstLevelCl: FirstLevelCl
	};
	if (baseLexic) {
		var oldI = baseLexic.initializer,
			newI = Babelute.initializer(lexicName);
		for (var i in oldI) {
			if (i === '__babelute__' || i === '_lexems')
				continue;
			addToInitializer(lexic, i);
		}
	}
	return lexic;
}

function getFirstLevelMethod(lexicName, methodName) {
	return function() {
		return this._append(lexicName, methodName, [].slice.call(arguments));
	};
}

Babelute.initLexic = initLexic;
Babelute.Environment = Environment;

module.exports = Babelute;

//
},{}],3:[function(require,module,exports){
/**
 * A FirstLevelNode is just a Bablute that keeps any appended lexem at top logical level (that means that any compounded lexem (made with other lexems) is added as an atomic lexem).
 * 
 * A Babelute Document is a Babelute that you could edit. Think about a XML/HTML Document.
 * The aim is to allow full edition and construction of Babelute sentences.
 * (babelute node wrapping, insertBefore, prepend, query nodes, etc)
 * 
 * A FirstLevelNode document, that holds others FirstLevelNode as inner lexems, forms a valid babelute.
 * Every call on a FirstLevelNode are just appended to lexems in object form (aka { name:myLexemName, args:[myArgs...] }).
 *
 * So it keeps things the more abstract possible. 
 * 
 * To became $outputable : it needs an additional translation to itself (see docs).
 */

var Babelute = require('./babelute');

var FirstLevelNode = function() {
	Babelute.call(this);
};

FirstLevelNode.prototype = new Babelute();
FirstLevelNode.prototype.babelute = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		Cl = lexic.FirstLevelCl,
		b = new Cl();
	b._lexems = this._lexems;
	return b;
};

Babelute.firstLevelInitializer = FirstLevelNode.initializer = function(lexicName) {
	var Cl = Babelute.getLexic(lexicName).FirstLevelCl;
	return lexic.FirstLevelInitializer || (lexic.FirstLevelInitializer = function() {
		return new Cl();
	});
};

Babelute.firstLevel = function(lexicName) {
	if (lexicName)
		return FirstLevelNode.initializer(lexicName)();
	return new FirstLevelNode();
};

module.exports = FirstLevelNode;
},{"./babelute":2}],4:[function(require,module,exports){
/**  
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

function getMethod(parent, name) {
	var method = parent[name];
	if (!method)
		throw new Error('Babelute : no lexem found in current lexic (' + (parent.__babelute__ || 'default') + ') with :' + name);
	return method;
}

var elenpi = require('elenpi/v2'),
	r = elenpi.r,
	Parser = elenpi.Parser,
	Babelute = require('./babelute'),
	replaceSingleString = /\\'/g,
	replaceDoubleString = /\\"/g,
	// grammar shortcut map (1 char previsu) for values
	valuePrevisuMap = {
		'1': 'number',
		'2': 'number',
		'3': 'number',
		'4': 'number',
		'5': 'number',
		'6': 'number',
		'7': 'number',
		'8': 'number',
		'9': 'number',
		'0': 'number',
		"'": 'singlestring',
		'"': 'doublestring',
		'{': 'object',
		'[': 'array'
	},
	rules = {
		//_____________________________________
		babelute: r()
			.space()
			.oneOrMore({
				rule: 'lexem',
				separator: r().terminal(/^\s*/),
				pushTo: function(env, parent, obj) {
					// Parser.counts.countLexem++;
					if (obj.lexic && obj.lexic !== env.currentLexic) { // 'scoped' lexic management
						if (parent.__swapped__) // we have already push something before (aka second (or more) lexic change on same babelute)
							env.lexics[env.lexics.length - 1] = env.lexic;
						else
							env.lexics.push(obj.lexic); // push lexic to scope
						env.currentLexic = obj.lexic;
						var newParent = Babelute.b(obj.lexic);
						newParent._lexems = parent._lexems;
						parent.__swapped__ = newParent;
					} else if (env.asDoc) // top level lexem
						(parent.__swapped__ || parent)._append(env.currentLexic, obj.name, obj.args);
					else { // use current babelute lexic
						parent = parent.__swapped__ || parent;
						getMethod(parent, obj.name).apply(parent, obj.args);
					}
				}
			})
			.done(function(env, babelute) {
				if (babelute.__swapped__) { // 'scoped' lexic management :
					// one lexic has been pushed from this babelute
					// so pop to parent lexic
					env.lexics.pop();
					env.currentLexic = env.lexics[env.lexics.length - 1];
					babelute.__swapped__ = null;
				}
			})
			.space(),

		lexem: r().oneOf(
			// lexem (aka: name(arg1, arg2, ...))
			r().terminal(/^([\w-_]+)\s*\(\s*/, function(env, obj, cap) { // lexem name + ' ( '
				obj.name = cap[1];
				obj.args = [];
			})
			.oneOf(
				r().terminal(/^\s*\)/), // end parenthesis

				r()
				.oneOrMore({ // arguments
					rule: 'value',
					separator: r().terminal(/^\s*,\s*/),
					pushTo: function(env, parent, obj) {
						// Parser.counts.countLexemValues++;
						parent.args.push(obj.value);
					}
				})
				.terminal(/^\s*\)/) // end parenthesis
			),

			// lexic selector (aka @lexic:)
			r().terminal(/^#([\w-_]+):/, function(env, obj, cap) { // '@' + lexic name + ':'
				obj.lexic = cap[1];
			})
		),


		/***********
		 * VALUES
		 ***********/
		value: r()
			.done(function(env, obj) {
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// shortcut with first char previsu through valueMap
				env.parser.exec(valuePrevisuMap[env.string[0]] || 'wordValue', obj, env);
			}),

		number: r().terminal(/^[0-9]+(\.[0-9]+)?/, function(env, obj, cap) {
			obj.value = cap[1] ? parseFloat(cap[0] + cap[1], 10) : parseInt(cap[0], 10);
		}),
		singlestring: r().terminal(/^'((?:\\'|[^'])*)'/, function(env, obj, cap) {
			obj.value = cap[1].replace(replaceSingleString, "'");
		}),
		doublestring: r().terminal(/^"((?:\\"|[^"])*)"/, function(env, obj, cap) {
			obj.value = cap[1].replace(replaceDoubleString, '"');
		}),

		wordValue: r()
			.oneOf(
				// true|false|null|undefined|NaN|Infinity
				r().terminal(/^(?:true|false|null|undefined|NaN|Infinity)/, function(env, obj, cap) {
					switch (cap[0]) {
						case 'true':
							obj.value = true;
							break;
						case 'false':
							obj.value = false;
							break;
						case 'null':
							obj.value = null;
							break;
						case 'undefined':
							obj.value = undefined;
							break;
						case 'NaN':
							obj.value = NaN;
							break;
						case 'Infinity':
							obj.value = Infinity;
							break;
					}
				}),
				// function
				r().one({
					rule: 'function',
					// previsu: 'f',
					set: function(env, parent, obj) {
						if (env.acceptFunctions) // todo : add warning when not allowed but present
							parent.value = Function.apply(null, obj.args.concat(obj.block));
					}
				}),
				// babelutes
				r().one({
					rule: 'babelute',
					as: function(env, descriptor) {
						return env.asDoc ? Babelute.doc(env.currentLexic) : Babelute.b(env.currentLexic);
					},
					set: function(env, parent, obj) {
						parent.value = obj;
					}
				})
			),

		object: r().one({
			rule: r()
				.terminal(/^\{\s*/) // start bracket
				.zeroOrMore({ // properties
					rule: r()
						// key
						.terminal(/^([\w-_]+)|"([^"]*)"|'([^']*)'/, function(env, obj, cap) {
							obj.key = cap[1];
						})
						.terminal(/^\s*:\s*/)
						// value
						.one('value'),
					separator: r().terminal(/^\s*,\s*/),
					pushTo: function(env, parent, obj) {
						parent[obj.key] = obj.value;
					}
				})
				.terminal(/^\s*\}/), // end bracket

			set: function(env, parent, obj) {
				parent.value = obj;
			}
		}),

		array: r().one({
			rule: r()
				.terminal(/^\[\s*/) // start square bracket
				.zeroOrMore({ // items
					rule: 'value',
					separator: r().terminal(/^\s*,\s*/),
					pushTo: function(env, parent, obj) {
						parent.push(obj.value);
					}
				})
				.terminal(/^\s*\]/), // end square bracket


			as: function() {
				return [];
			},
			set: function(env, parent, obj) {
				parent.value = obj;
			}
		}),

		'function': r()
			.terminal(/^function\s*\(\s*/, function(env, obj, cap) {
				obj.args = [];
				obj.block = '';
			})
			.zeroOrMore({ // arguments key
				rule: r().terminal(/^[\w-_]+/, 'key'),
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.args.push(obj.key);
				}
			})
			.terminal(/^\s*\)\s*\{/)
			.one('scopeBlock')
			.done(function(env, obj) {
				// remove last uneeded '}' in catched block (it's there for inner-blocks recursion)
				obj.block = obj.block.substring(0, obj.block.length - 1);
			}),

		scopeBlock: r() // function scope block (after first '{')
			.oneOf(
				// inner block recursion
				r().terminal(/^[^\{\}]*\{/, function(env, obj, cap) {
					obj.block += cap[0];
				})
				.oneOrMore('scopeBlock'),

				// end block 
				r().terminal(/^[^\}]*\}/, function(env, obj, cap) {
					obj.block += cap[0];
				})
			)
	};

Babelute.Parser = Parser;

var parser = new Parser(rules, 'babelute'),
	templateCache = {};

Babelute.parse = function(string, opt) {
	opt = opt ||  {};
	var env = {};
	for (var i in opt)
		env[i] = opt[i];
	env.lexics = [opt.mainLexic];
	env.currentLexic = opt.mainLexic;
	return parser.parse(string, 'babelute', Babelute.b(opt.mainLexic), env);
}

Babelute.fromJSON = function(json) {
	return JSON.parse(json, function(k, v) {
		if (!v)
			return v;
		if (v.__babelutelexem__)
			return new Babelute.Lexem(v.lexic, v.name, v.args);
		if (v.__babelute__) {
			var b = new Babelute();
			b._lexems = v._lexems;
			return b;
		}
		return v;
	});
}

module.exports = parser;
},{"./babelute":2,"elenpi/v2":6}],5:[function(require,module,exports){
/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

/********************************************************************
 ********************************************************************
 * Stringify Babelute to serialised form (beautified or minified)
 ********************************************************************
 ********************************************************************/

var Babelute = require('./babelute');

// utils
function pushLexicScope(opt, lexic, alreadyPushed) {
	if (alreadyPushed)
		opt.lexicScope[opt.lexicScope.length - 1] = lexic;
	else
		opt.lexicScope.push(lexic);
	opt.currentLexic = lexic;
	return true;
}

function popLexicScope(opt) {
	opt.lexicScope.pop();
	opt.currentLexic = opt.lexicScope[opt.lexicScope.length - 1];
}

function removeLastUndefined(arr) {
	var index = arr.length,
		len = index;
	while (index && arr[index - 1] === undefined)
		index--;
	if (index < len)
		arr.splice(index, len - index);
	return arr;
}

/********************************************************************
 ********** beautyfy
 ********************************************************************/

function beautyLexems(lexems, opt) {
	var lexemsOutput = [],
		outlength = 0,
		item,
		args,
		lexicPushed = false,
		out;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		// if (item.toStringify)
		// item = item.toStringify();
		if (item.lexic !== opt.currentLexic) {
			out = '#' + item.lexic + ':';
			lexemsOutput.push(out);
			lexicPushed = pushLexicScope(opt, item.lexic, lexicPushed);
		}
		if (item.args) {
			args = beautyArrayValues(removeLastUndefined(item.args), opt);
			// add returns
			if ((item.args.length > 1 || (item.args[0] && item.args[0].__babelute__)) && args.length > opt.maxLength)
				out = item.name + '(\n\t' + args.replace(/\n/g, function(s) {
					return s + '\t';
				}) + '\n)';
			else
				out = item.name + '(' + args + ')';
		} else
			out = item.name + '()';

		lexemsOutput.push(out);
		outlength += out.length;
	}
	if (lexicPushed)
		popLexicScope(opt);
	outlength += lexems.length - 1;
	return lexemsOutput.join((outlength > opt.maxLength) ? '\n' : ' ');
}

function beautyArray(arr, opt) {
	var out, addReturn, len = arr.length;
	if (!len)
		return '[]';
	out = beautyArrayValues(arr, opt);
	addReturn = (len > 1 && out.length > opt.maxLength);
	if (addReturn)
		return '[\n\t' + out.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n]';
	return '[' + out + ']';
}

function beautyArrayValues(arr, opt) {
	var len = arr.length;
	if (!len)
		return '';
	var out,
		values = [],
		outlength = 0;
	for (var i = 0; i < len; ++i) {
		out = valueToString(arr[i], opt);
		values.push(out);
		outlength += out.length;
	}
	outlength += len - 1;
	return values.join((outlength > opt.maxLength) ? ',\n' : ', ');
}

function beautyObject(obj, opt) {
	var out, addReturn;
	var keys = Object.keys(obj);
	out = beautyProperties(obj, keys, opt);
	if (keys.length > 1 && out.length > opt.maxLength) { // add returns
		return '{\n\t' + out.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n}';
	}
	return '{ ' + out + ' }';
}

function beautyProperties(obj, keys, opt) {
	var out,
		values = [],
		outlength = 0,
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out = valueToString(obj[key], opt);
		outlength += out.length;
		values.push(key + ': ' + out);
	}
	outlength += keys.length - 1;
	return (outlength > opt.maxLength) ? values.join(',\n') : values.join(', ');
}


/********************************************************************
 ********** minify
 ********************************************************************/

function valueToString(val, opt) {
	if (!val)
		return val + '';
	switch (typeof val) {
		case 'object':
			if (val.__babelute__)
				return val._stringify(opt);
			if (val.forEach)
				return (opt.beautify) ? beautyArray(val, opt) : '[' + arrayToString(val, opt) + ']';
			return (opt.beautify) ? beautyObject(val, opt) : objectToString(val, opt);
		case 'string':
			// return '"' + val.replace(/"/g, '\\"') + '"'; // adds quotes and escapes content
			return JSON.stringify(val); // adds quotes and escapes content
		case 'function':
			var out = (val + '').replace(/anonymous/, '').replace(/\n\/\*\*\//, '');
			return opt.beautify ? out : out.replace(/`[^`]*`|\n\s*/g, function(val) {
				return val[0] === "`" ? val : ' ';
			});
		default:
			return val + '';
	}
}

function arrayToString(arr, opt) {
	if (!arr.length)
		return '';
	// map output
	var out = '';
	for (var i = 0, len = arr.length; i < len; ++i)
		out += (i ? ',' : '') + valueToString(arr[i], opt);
	return out;
}

function objectToString(obj, opt) {
	var keys = Object.keys(obj),
		out = '',
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out += (i ? ',' : '') + key + ':' + valueToString(obj[key], opt);
	}
	return '{' + out + '}';
}

/********************************************************************
 ********** end minify
 ********************************************************************/

Babelute.prototype.toString = function() {
	return this._stringify();
};

Babelute.prototype._stringify = function(opt) {

	opt = opt ||  {};
	opt.lexicScope = opt.lexicScope || [];

	if (opt.beautify) {
		opt.maxLength = opt.maxLength || 20;
		return beautyLexems(this._lexems, opt);
	}

	// else minifiy lexems
	var lexems = this._lexems,
		out = '',
		item,
		lexicPushed = false;

	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		if (item.lexic !== opt.currentLexic) {
			out += '#' + item.lexic + ':';
			lexicPushed = pushLexicScope(opt, item.lexic, lexicPushed);
		}
		out += item.name + '(' + (item.args ? arrayToString(removeLastUndefined(item.args), opt) : '') + ')';
	}

	if (lexicPushed)
		popLexicScope(opt);

	return out;
};

Babelute.arrayToString = arrayToString;
Babelute.objectToString = objectToString;
Babelute.valueToString = valueToString;
},{"./babelute":2}],6:[function(require,module,exports){
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * elenpi v2

	//________ new api

	done(function(env, obj, string){
		//...
		return string || false;
	})
	terminal(regExp, name || function(env, obj, string, captured){
		//...
		return string || false;
	})
	char(test)
	optional(rule)
	end()

	one(rule || { 
		rule:rule, 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	zeroOrOne(rule || { 
		rule:rule, 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	oneOf([rules] || { 
		rules:[rules], 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	xOrMore({ 
		rule:rule,
		minimum:int,
		?as:function(){ return Instance }, 
		?pushTo:'name' || function(env, parent, obj){ ... },
		?separator:rule,
		?maximum:int 
	})


	V3 will be a Babelute with same api

 *
 * 
 */

(function() {
	var defaultSpaceRegExp = /^[\s\n\r]+/;

	function exec(rule, descriptor, env) {
		if (env.stop || env.error)
			return;
		if (typeof rule === 'string')
			rule = getRule(env.parser, rule);
		// Parser.counts.countExec++;
		var rules = rule._queue,
			current;
		for (var i = 0, len = rules.length; i < len; ++i) {
			current = rules[i];
			if (current.__elenpi__)
				exec(current, descriptor, env);
			else // is function
				current(env, descriptor);
			if (env.error)
				return;
			if (env.soFar > env.string.length)
				env.soFar = env.string.length;
			if (env.stop)
				return;
		}
	};

	function getRule(parser, name) {
		var r = parser.rules[name];
		if (!r)
			throw new Error('elenpi : rules not found : ' + rule);
		return r;
	}

	function Rule() {
		this._queue = [];
		this.__elenpi__ = true;
	};

	Rule.prototype = {
		// base for all rule's handlers
		done: function(callback) {
			this._queue.push(callback);
			return this;
		},
		// for debug purpose
		log: function(title) {
			title = title || '';
			return this.done(function(env, descriptor) {
				console.log("elenpi log : ", title, env, descriptor);
			});
		},
		use: function(rule) {
			var args = [].slice.call(arguments, 1);
			return this.done(function(env, descriptor) {
				if (typeof rule === 'string')
					rule = getRule(env.parser, rule);
				if (rule.__elenpi__) {
					exec(rule, descriptor, env);
					return;
				}
				var r = new Rule();
				rule.apply(r, args);
				exec(r, descriptor, env);
			});
		},
		optional: function(rule) {
			return this.done(function(env, descriptor) {
				var string = env.string;
				exec(rule, descriptor, env);
				if (env.error) {
					env.string = string;
					env.error = false;
				}
			});
		},
		terminal: function(reg, set) {
			return this.done(function(env, descriptor) {
				// console.log('terminal test : ', reg);
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// Parser.counts.countTerminalTest++;
				var cap = reg.exec(env.string);
				// console.log('terminal : ', reg, cap);
				if (cap) {
					// Parser.counts.countTerminalMatched++;
					env.string = env.string.substring(cap[0].length);
					// console.log('terminal cap 0 length : ', cap[0].length);
					// console.log('terminal string length : ', string.length, cap[0]);
					if (set) {
						if (typeof set === 'string')
							descriptor[set] = cap[0];
						else
							set(env, descriptor, cap);
					}
					return;
				}
				env.error = true;
			});
		},
		char: function(test) {
			return this.done(function(env, descriptor) {
				if (!env.string.length || env.string[0] !== test)
					env.error = true;
				else
					env.string = env.string.substring(1);
			});
		},
		xOrMore: function(rule) {
			var opt = (typeof rule === 'string' ||  rule.__elenpi__) ? {
				rule: rule
			} : rule;
			opt.minimum = opt.minimum || 0;
			opt.maximum = opt.maximum || Infinity;
			return this.done(function(env, descriptor) {
				var options = opt;
				if (!env.string.length && options.minimum > 0) {
					env.error = true;
					return;
				}
				var string = env.string,
					count = 0,
					rule = options.rule,
					pushTo = options.pushTo,
					pushToString = typeof pushTo === 'string',
					As = options.as,
					separator = options.separator,
					newDescriptor;
				// Parser.counts.countXorMore++;
				while (!env.error && env.string.length && count < options.maximum) {

					// Parser.counts.countXorMores++;

					newDescriptor = As ? As(env, descriptor) : (pushTo ? {} : descriptor);
					exec(rule, newDescriptor, env);

					if (env.error)
						break;

					count++;

					if (!newDescriptor.skip && pushTo)
						if (pushToString) {
							descriptor[pushTo] = descriptor[pushTo] || [];
							descriptor[pushTo].push(newDescriptor);
						} else
							pushTo(env, descriptor, newDescriptor);

					if (separator && env.string.length)
						exec(separator, newDescriptor, env);
				}
				env.error = (count < options.minimum);
				if (!count)
					env.string = string;
			});
		},
		zeroOrMore: function(rule) {
			return this.xOrMore(rule);
		},
		oneOrMore: function(rule) {
			if (typeof rule === 'string' || rule.__elenpi__)
				rule = {
					rule: rule,
					minimum: 1
				}
			return this.xOrMore(rule);
		},
		zeroOrOne: function(rule) {
			var options = (typeof rule === 'string' ||  rule.__elenpi__) ? {
				rule: rule
			} : rule;
			return this.done(function(env, descriptor) {
				if (!env.string.length)
					return;
				// Parser.counts.countZeroOrOne++;
				var newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
				var string = env.string;
				exec(options.rule, newDescriptor, env);
				if (!env.error) {
					if (!newDescriptor.skip && options.set) {
						if (typeof options.set === 'string')
							descriptor[options.set] = newDescriptor;
						else
							options.set(env, descriptor, newDescriptor);
					}
					return;
				}
				env.string = string;
				env.error = false;
			});
		},
		oneOf: function(rules) {
			var opt = (typeof rules === 'string' || rules.__elenpi__) ? {
				rules: [].slice.call(arguments)
			} : rules;
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					env.error = true;
					return;
				}

				var options = opt,
					count = 0,
					len = options.rules.length,
					rule,
					newDescriptor,
					string = env.string;
				// Parser.counts.countOneOf++;
				while (count < len) {
					rule = options.rules[count];
					count++;
					// Parser.counts.countOneOfs++;
					newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
					exec(rule, newDescriptor, env);
					if (!env.error) {
						if (!newDescriptor.skip && options.set) {
							if (typeof options.set === 'string')
								descriptor[options.set] = newDescriptor;
							else
								options.set(env, descriptor, newDescriptor);
						}
						return;
					}
					env.error = false;
					env.string = string;
				}
				env.error = true;
			});
		},
		one: function(rule) {
			var opt = (typeof rule === 'string' ||  (rule && rule.__elenpi__)) ? {
				rule: rule
			} : rule;
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// Parser.counts.countOne++;
				var options = opt,
					newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
				exec(options.rule, newDescriptor, env);
				if (!env.error && !newDescriptor.skip && options.set) {
					if (typeof options.set === 'string')
						descriptor[options.set] = newDescriptor;
					else
						options.set(env, descriptor, newDescriptor);
				}
			});
		},
		skip: function() {
			return this.done(function(env, descriptor) {
				descriptor.skip = true;
			});
		},
		space: function(needed) {
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					if (needed)
						env.error = true;
					return;
				}
				var cap = (env.parser.rules.space || defaultSpaceRegExp).exec(env.string);
				if (cap)
					env.string = env.string.substring(cap[0].length);
				else if (needed)
					env.error = true;
			});
		},
		end: function(needed) {
			return this.done(function(env, descriptor) {
				if (!env.string.length)
					env.stop = true;
				else if (needed)
					env.error = true;
			});
		}
	};

	var Parser = function(rules, defaultRule) {
		this.rules = rules;
		this.defaultRule = defaultRule;
	};
	Parser.prototype = {
		exec: function(rule, descriptor, env) {
			exec(rule, descriptor, env);
		},
		parse: function(string, rule, descriptor, env) {
			env = env || {};
			descriptor = descriptor || {};
			env.parser = this;
			env.soFar = Infinity;
			env.string = string;
			if (!rule)
				rule = this.rules[this.defaultRule];
			exec(rule, descriptor, env);
			if (env.error || env.string.length) {
				var pos = string.length - env.soFar;
				// todo : catch line number
				console.error('elenpi parsing failed : (pos:' + pos + ') near :\n', string.substring(Math.max(pos - 1, 0), pos + 50));
				return false;
			}
			return descriptor;
		}
	};

	// 	Parser.counts = {
	// 	countTerminalTest: 0,
	// 	countTerminalMatched: 0,
	// 	countOneOf: 0,
	// 	countOneOfs: 0,
	// 	countExec: 0,
	// 	countXorMore: 0,
	// 	countXorMores: 0,
	// 	countZeroOrOne: 0,
	// 	countOne: 0
	// };

	var elenpi = {
		r: function() {
			return new Rule();
		},
		Rule: Rule,
		Parser: Parser
	};

	if (typeof module !== 'undefined' && module.exports)
		module.exports = elenpi; // use common js if avaiable
	else this.elenpi = elenpi; // assign to global window
})();
//___________________________________________________
},{}]},{},[1])(1)
});