(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Babelute.
 * Method chaining applications to Templating and Domain Language (multi)Modeling.
 * 
 * Domain Language (Multi)Modeling solves many software design problems.
 * From developpement process (how to start, what to design, how to design, how to iterate, ...) 
 * to how to understand, design and articulate business related problems and/or pure code logics.
 * 
 * It provides natural ways of thinking models and code that are really close to how human mind 
 * works. Much much more close than OO (including AOP) is.
 *
 * Babelute gives elegant and really simple ways to define/handle/use/transform chainable methods
 * in pure javascript or through it's own simple DSL
 * (a minimalist optimal string representation of call chains for writing/serialising babelute 
 * sentences and/or lexics).
 * 
 * It relays entierly on Method Chaining pseudo design pattern.
 * In consequence, it's made with really few code, and is really light (less than 2ko gzip/min without own 
 * DSL parser - which is also really light (+- 1ko gzip/min))
 *
 * Babelute's parsing and output are both really fast. 
 * The pattern and method are already heavily used in other fast libs, that solve elegantly really 
 * disconnected problems,  
 * that have shown that was a really good approach to have both 
 * expressivness and performance (jquery (zepto, sprint), elenpi, aright, yamvish, deepjs chains, ...).
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

},{"./lib/babelute":2,"./lib/document":3,"./lib/parser":4,"./lib/stringify":5}],2:[function(require,module,exports){
/**
 * Babelute core Class and statics functions.
 *
 * A babelute is just a Fluent Interface base class where handlers (seen as lexems) are simply kept (in simple form) in a queue for 
 * further calls. It could be seen as a simple chained templating mecanism (for any purpose).
 * 
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = function() {
		this.__babelute__ = 'default';
		this._lexems = [];
	},
	Actions = Babelute.actions = {
		'default': {
			log: function(opts, subject) {
				console.log.apply(console, arguments);
			},
			if: function(opts, subject, args) {
				if (args[0])
					args[1]._output(opts, subject);
			}
		}
	},
	Lexic = Babelute.lexic = {},
	Lexem = function(lexic, name, args, handler, toString) {
		this.lexic = lexic;
		this.name = name;
		this.args = args;
		if (handler)
			this.handler = handler;
		if (toString)
			this.babeluteString = toString;
	};

Babelute.Lexem = Lexem;

// Produce a Babelute derivation with provided lexic.
function extendBabelute(lexicName, lexic) {
	var Cl = function() {
		Babelute.call(this);
		this.__babelute__ = lexicName;
	};
	Cl.prototype = new Babelute();
	for (var i in lexic)
		Cl.prototype[i] = lexic[i];
	return Cl;
}

// parse lexicName:methodName string format and return method from lexic
function getMethod(req) {
	var splitted = req.split(':'),
		lexicName = splitted[0],
		lexic = Babelute.getLexic(lexicName),
		methodName = splitted[1],
		method = lexic[methodName];
	if (!method)
		throw new Error('Babelute : method not found : ' + req);
	if (method.__babelute__)
		return method;
	var temp = getInstance(lexicName, lexic);
	return function(lexems, args) {
		temp._lexems = lexems;
		temp[methodName].apply(temp, args);
	}
}

function getClass(lexicName, lexic) {
	var cache = lexic.__cache__ = lexic.__cache__ || {};
	return cache.BabeluteClass = cache.BabeluteClass || extendBabelute(lexicName, lexic);
}

function getInstance(lexicName, lexic) {
	var Cl = getClass(lexicName, lexic);
	return lexic.__cache__.Instance = lexic.__cache__.Instance || new Cl();
}

Babelute.extend = extendBabelute;

Babelute.prototype = {
	/**
	 * Change current lexic
	 * return new babelute specialised with lexicName
	 */
	babelute: function(lexicName) {
		var lexic = Babelute.getLexic(lexicName),
			Cl = getClass(lexicName, lexic),
			b = new Cl();
		b._lexems = this._lexems;
		this._append('babelute', [lexicName]); // just for string output because normally there is no more interpretation in any language
		return b;
	},
	/**
	 * Babelute instance modification (meta-language API)
	 */
	// add lexem to babelute
	_append: function(name, args, handler, toString) {
		this._lexems.push(new Lexem(this.__babelute__, name, args, handler, toString));
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
	// conditional sentences concatenation
	_if: function(condition, babelute) {
		if (condition)
			this._lexems = this._lexems.concat(babelute._lexems);
		return this;
	},
	// execute provided function binded on current babelute, that will receive item and index as argument.
	_each: function(arr, func) {
		arr.forEach(func, this);
		return this;
	},
	// inline lexics/actions addition : It allows languages definitions through babelute sentences and so through babelute docs and all their tools
	_toLexic: function(lexicName, methodName, method) {
		Babelute.toLexic(lexicName, methodName, method);
	},
	_toActions: function(actionsName, methodName, method) {
		Babelute.toActions(actionsName, methodName, method);
	},
	/**
	 * OUTPUTS
	 */
	// specialised ouput : interpret babelute with specified actions
	_output: function(opts, subject) {
		if (typeof opts === 'string')
			opts = { actions: Babelute.getActions(opts) };

		var dico = opts.actions,
			handler,
			index = -1,
			f;
		subject = subject || (dico.__defaultSubject__ ? dico.__defaultSubject__(opts) : {});
		while (handler = this._lexems[++index]) {
			if (dico.__restrictions__ && !dico.__restrictions__[handler.lexic])
				continue;
			f = typeof handler.name === 'string' ? (dico[handler.name] || Actions.default[handler.name]) : handler.name;
			if (!f)
				continue;
			if (f.__babelute__)
				f._output(opts, subject);
			else
				f(opts, subject, handler.args);
		}
		if (dico.__finalise__)
			return dico.__finalise__(opts, subject);
		return subject;
	},
	/**
	 * TRANSLATION
	 */
	// translate babelute lexem through a lexic. return new babelute.
	_translation: function(lexicName) {
		// todo : optimised "recursive" translation with array of lexics
		var lexic = Babelute.getLexic(lexicName),
			b = new getClass(lexicName, lexic)();
		this._lexems.forEach(function(lexem) {
			if (lexic[lexem.name])
				lexic[lexem.name].apply(this, lexem.args);
			else
				this._lexems.push(lexem);
		}, b);
		return b;
	},
	/**
	 * COMMON INTERPRETABLES
	 */
	// conditional execution
	if: function(condition, babelute, elseBabelute) {
		return this._append('if', [condition, babelute, elseBabelute]);
	},
	// log action state
	log: function() {
		return this._append('log', [].slice.call(arguments));
	}
};

// Babelute main initializer
Babelute.b = function(lexicName) {
	if (lexicName)
		return Babelute.initializer(lexicName)();
	return new Babelute();
};

// Babelute initializer provider
Babelute.initializer = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		cache = lexic.__cache__ = lexic.__cache__ || {};
	if (cache && cache.BabeluteInitializer)
		return cache.BabeluteInitializer;
	var Cl = getClass(lexicName, lexic);
	return cache.BabeluteInitializer = function() {
		return new Cl();
	};
};

// return specified lexic.
Babelute.getLexic = function(lexicName) {
	var lexic = Lexic[lexicName];
	if (!lexic)
		throw new Error('Babelute : lexic not found : ' + lexicName);
	return lexic;
};

// return specified actions.
Babelute.getActions = function(actionsName) {
	var actions = Actions[actionsName];
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
	var lexic = Lexic[lexicName] = Lexic[lexicName] ||  {};
	lexic.__cache__ = {}; // kill any previously cached Class and Initializer
	if (typeof methodName === 'object') {
		if (methodName.forEach) {
			methodName.forEach(function(methodName) {
				lexic[methodName] = function() {
					return this._append(methodName, [].slice.call(arguments));
				};
			})
		} else
			for (var i in methodName)
				lexic[i] = methodName[i];
	} else if (!method)
		lexic[methodName] = function() {
			return this._append(methodName, [].slice.call(arguments));
		};
	else
		lexic[methodName] = method;
	return Babelute;
};

/**
 * Add action's method to specified Actions namespaces
 * @param  {String} actionsName 	namespace of Actions where store method(s)
 * @param  {String | Object} 		methodName  the name of the méthod or a map (object) of methods
 * @param  {Function} method      	the method function. (used only if methodName is a string)
 * @return {Babelute}             	Babelute for chaining.
 */
Babelute.toActions = function(actionsName, methodName, method) {
	var actions = Actions[actionsName] = Actions[actionsName] ||  {};
	if (typeof methodName === 'object') {
		for (var i in methodName)
			actions[i] = methodName[i];
	} else
		actions[methodName] = method;
	return Babelute;
};

// duplicate specified lexic to newName and add provided methods to it.
Babelute.extendsLexic = function(lexicName, newName, methods) {
	Babelute.toLexic(newName, Babelute.getLexic(lexicName));
	if (methods)
		Babelute.toLexic(newName, methods);
	return Babelute;
};

// duplicate specified actions to newName and add provided methods to it.
Babelute.extendsActions = function(actionsName, newName, methods) {
	Babelute.toActions(newName, Babelute.getActions(actionsName));
	if (methods)
		Babelute.toActions(newName, methods);
	return Babelute;
};

module.exports = Babelute;

},{}],3:[function(require,module,exports){
/**
 * A Babelute Document is a Babelute that you could edit. Think about a XML/HTML Document.
 * The aim is to allow full edition and construction of Babelute sentences.
 * (babelute node wrapping, insertBefore, prepend, query nodes, etc)
 * 
 * A BabeluteDocNode document, that holds others BabeluteDocNode as inner lexems, forms a Babelute Document.
 * A BabeluteDocNode is just a Bablute that keeps appended lexem at top logical level (that means there is absolutly no interpretation to logical atoms).
 * Every call on a BabeluteDocNode are just appended to lexems in object form (aka { name:myLexemName, args:[myArgs...] }).
 *
 * So it keeps things the more abstract possible. And needs an additional translation to itself (see docs).
 */

var Babelute = require('./babelute');

var BabeluteDocNode = function() {
	Babelute.call(this);
};

function lexicToFirstLevel(lexicName, lexic) {
	var out = {};
	Object.keys(lexic)
		.forEach(function(i) {
			out[i] = function() {
				return this._append(lexicName, i, [].slice.call(arguments));
			};
		});
	return out;
}

function getClass(lexicName, lexic) {
	var cache = lexic.__cache__ || {};
	return cache.FirstLevelClass = cache.FirstLevelClass || Babelute.extend(lexicName, lexicToFirstLevel(lexicName, lexic));
}

BabeluteDocNode.prototype = new Babelute();
var proto = {
	babelute: function(lexicName) {
		var lexic = Babelute.getLexic(lexicName),
			b = new getClass(lexicName, lexic)();
		b._lexems = this._lexems;
		this._append('babelute', [lexicName]);
		return b;
	}
};

for (var i in proto)
	BabeluteDocNode.prototype[i] = proto[i];

Babelute.docInitializer = BabeluteDocNode.initializer = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		cache = lexic.__cache__ = lexic.__cache__ || {};
	if (cache.FirstLevelInitializer)
		return cache.FirstLevelInitializer;
	var Cl = getClass(lexicName, lexic);
	return cache.FirstLevelInitializer = function() {
		return new Cl();
	};
};

Babelute.doc = function(lexicName) {
	if (lexicName)
		return BabeluteDocNode.initializer(lexicName)();
	return new BabeluteDocNode();
};

module.exports = BabeluteDocNode;

},{"./babelute":2}],4:[function(require,module,exports){
/**  
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

var elenpi = require('elenpi/v2'),
	r = elenpi.r,
	Parser = elenpi.Parser,
	Babelute = require('./babelute'),
	rules = {
		//_____________________________________
		babelute: r()
			.space()
			.zeroOrMore({
				rule: 'lexem',
				separator: r().terminal(/^\s*/),
				pushTo: function(env, parent, obj) {
					if (obj.lexic) { // 'scoped' lexic management
						if (parent._popLexic) // we have already push something before (aka second (or more) lexic change on same babelute)
							env.lexics[env.lexics.length - 1] = env.lexic;
						else
							env.lexics.push(obj.lexic); // push lexic to scope
						env.currentLexic = obj.lexic;
						parent._popLexic = true;

						// add current lexic to current babelute
						var lexic = Babelute.getLexic(obj.lexic);
						for (var i in lexic)
							parent[i] = lexic[i];
						parent.__babelute__ = obj.lexic;

					} else if (env.asDoc) // top level lexem
						parent._append(obj.name, obj.args);
					else { // use current babelute lexic
						if (!parent[obj.name])
							throw new Error('Babelute : no lexem found in current lexic (' + (env.currentLexic || 'default') + ') with :' + obj.name);
						parent[obj.name].apply(parent, obj.args);
					}
				}
			})
			.done(function(env, babelute, string) {
				if (babelute._popLexic) { // 'scoped' lexic management :
					// one lexic has been pushed from this babelute
					// so pop to parent lexic
					env.lexics.pop();
					env.currentLexic = env.lexics[env.lexics.length - 1];
				}
				return string;
			})
			.space(),

		lexem: r().oneOf(
			// lexic selector (aka lexic:)
			r().terminal(/^([\w-_]+):/, function(env, obj, string, cap) { // lexic name + ':'
				obj.lexic = cap[1];
				return string;
			}),

			// lexem (aka: name(arg1, arg2, ...))
			r().terminal(/^([\w-_]+)\s*\(\s*/, function(env, obj, string, cap) { // lexem name + ' ( '
				obj.name = cap[1];
				obj.args = [];
				return string;
			})
			.zeroOrMore({ // arguments
				rule: 'value',
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.args.push(obj.value);
				}
			})
			.terminal(/^\s*\)/) // end parenthesis
		),

		value: r().oneOf(
			// integer
			r().terminal(/^[0-9]+/, function(env, obj, string, cap) {
				obj.value = parseInt(cap[0], 10);
				return string;
			}),
			// float
			r().terminal(/^[0-9]*\.[0-9]+/, function(env, obj, string, cap) {
				obj.value = parseFloat(cap[0], 10);
				return string;
			}),
			// 'singlestring'
			r().terminal(/^'((?:\\'|[^'])*)'/, function(env, obj, string, cap) {
				obj.value = cap[1].replace(/\\'/g, "'");
				return string;
			}),
			// "doublestring"
			r().terminal(/^"((?:\\"|[^"])*)"/, function(env, obj, string, cap) {
				obj.value = cap[1].replace(/\\"/g, '"');
				return string;
			}),
			// true|false|null|undefined|NaN|Infinity
			r().terminal(/^(true|false|null|undefined|NaN|Infinity)/, function(env, obj, string, cap) {
				switch (cap[1]) {
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
				return string;
			}),
			// object
			r().one({
				rule: 'object',
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			}),
			// array
			r().one({
				rule: 'array',
				as: function() {
					return [];
				},
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			}),
			// function
			r().one({
				rule: 'function',
				set: function(env, parent, obj) {
					if (env.acceptFunctions) // todo : add warning when not allowed but present
						parent.value = Function.apply(null, obj.args.concat(obj.block));
				}
			}),
			// babelute
			r().one({
				rule: 'babelute',
				as: function(env, descriptor) {
					return Babelute.b(env.currentLexic);
				},
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			})
		),

		object: r()
			.terminal(/^\{\s*/) // start bracket
			.zeroOrMore({ // properties
				rule: r()
					// key
					.terminal(/^([\w-_]+)|"([^"]*)"|'([^']*)'/, function(env, obj, string, cap) {
						obj.key = cap[1];
						return string;
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

		array: r()
			.terminal(/^\[\s*/) // start square bracket
			.zeroOrMore({ // items
				rule: 'value',
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.push(obj.value);
				}
			})
			.terminal(/^\s*\]/), // end square bracket

		'function': r()
			.terminal(/^function\s*\(\s*/, function(env, obj, string, cap) {
				obj.args = [];
				obj.block = '';
				return string;
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
			.done(function(env, obj, string) {
				// remove last uneeded '}' in catched block (it's there for inner-blocks recursion)
				obj.block = obj.block.substring(0, obj.block.length - 1);
				return string;
			}),

		scopeBlock: r() // function scope block (after first '{')
			.oneOf(
				// inner block recursion
				r().terminal(/^[^\{\}]*\{/, function(env, obj, string, cap) {
					obj.block += cap[0];
					return string;
				})
				.oneOrMore('scopeBlock'),

				// end block 
				r().terminal(/^[^\}]*\}/, function(env, obj, string, cap) {
					obj.block += cap[0];
					return string;
				})
			)
	};

var parser = new Parser(rules, 'babelute'),
	templateCache = {};

Babelute.parse = function(string, opt) {
	opt = opt ||  {};
	var env = {};
	for (var i in opt)
		env[i] = opt[i];
	env.lexics = [opt.mainLexic];
	env.currentLexic = opt.mainLexic;
	return templateCache[string] = parser.parse(string, 'babelute', Babelute.b(opt.mainLexic), env);
}

module.exports = parser;

/*
console.log(y.expression.parseTemplate("click ( '12', 14, true, p(2, 4, span( false).p())). div(12345)"));
 */

},{"./babelute":2,"elenpi/v2":6}],5:[function(require,module,exports){
/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

/********************************************************************
 * Stringify Babelute to serialised form (aka Babelute DSL)
 ********************************************************************/

var Babelute = require('./babelute');

function valueToString(val, tab) {
	if (val && val.__babelute__)
		return val.stringify(tab + 1);
	switch (typeof val) {
		case 'function':
			return String(val);
		case 'object':
			if (!val)
				return val;
			if (val.forEach)
				return '[' + arrayToString(val, tab + 1) + ']';
			return objectToString(val, tab + 1);
		case 'string':
			return '"' + val.replace(/"/g, '\\"') + '"'; // adds quotes and escapes content
			// return JSON.stringify(val); // adds quotes and escapes content
		default:
			return val;
	}
}

function arrayToString(arr, tab) {
	if (!arr.length)
		return '';
	// remove lasts undefined
	var index = arr.length,
		out = '';
	while (index && arr[index - 1] === undefined)
		index--;
	if (index < arr.length)
		arr.splice(index, arr.length - index);
	// map output
	for (var i = 0, len = arr.length; i < len; ++i)
		out += (i ? ', ' : '') + valueToString(arr[i], 0);
	return out;
}

function objectToString(obj, tab) {
	var keys = Object.keys(obj),
		out = '',
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out += (i ? ',\n\t' : '') + key + ': ' + valueToString(obj[key], 0);
	}
	return '{\n\t' + out + '\n}';
}

// serialised bablute string outputs
Babelute.prototype.toString = function() {
	return this.stringify(0);
};

Babelute.prototype.stringify = function(tab) {
	var lexems = this._lexems,
		out = '',
		item;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		out += (i ? '\n' : '') + (item.babeluteString ? item.babeluteString() : (item.name ? item.name + '(' + (item.args ? arrayToString(item.args, tab + 1) : '') + ')' : ''));
	}
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
		?as:Class, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	zeroOrOne(rule || { 
		rule:rule, 
		?as:Class, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	oneOf([rules] || { 
		rules:[rules], 
		?as:Class, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	xOrMore({ 
		rule:rule,
		minimum:int,
		?as:Class,
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

	function exec(string, rule, descriptor, parser, env) {
		if (typeof rule === 'string')
			rule = parser.rules[rule];
		var rules = rule._queue;
		for (var i = 0, len = rules.length; i < len; ++i) {
			var current = rules[i];
			if (current.__elenpi__)
				string = exec(string, current, descriptor, parser, env);
			else // is function
				string = current.call(parser, env, descriptor, string);
			if (string === false)
				return false;
			env.soFar = string.length;
		}
		return string;
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
			return this.done(function(env, descriptor, string) {
				console.log("elenpi log : ", title, string, descriptor);
				return string;
			});
		},
		use: function(rule) {
			var args = [].slice.call(arguments, 1);
			return this.done(function(env, descriptor, string) {
				if (typeof rule === 'string')
					rule = getRule(this, rule);
				if (rule.__elenpi__)
					return exec(string, rule, descriptor, this, env);
				var r = new Rule();
				rule.apply(r, args);
				return exec(string, r, descriptor, this, env);
			});
		},
		optional: function(rule) {
			return this.done(function(env, descriptor, string) {
				if (typeof rule === 'string')
					rule = getRule(this, rule);
				var newString = exec(string, rule, descriptor, this, env);
				return newString === false ? string : newString;
			});
		},
		terminal: function(reg, set) {
			return this.done(function(env, descriptor, string) {
				if (!string)
					return false;
				var cap = reg.exec(string);
				if (cap) {
					if (set) {
						if (typeof set === 'string')
							descriptor[set] = cap[0];
						else
							return set.call(this, env, descriptor, string.substring(cap[0].length), cap);
					}
					return string.substring(cap[0].length);
				}
				return false;
			});
		},
		char: function(test) {
			return this.done(function(env, descriptor, string) {
				if (!string)
					return false;
				if (string[0] === test)
					return string.substring(1);
				return false;
			});
		},
		xOrMore: function(rule) {
			var options = (typeof rule === 'string' ||  rule.__elenpi__) ? { rule: rule } : rule;
			options.minimum = options.minimum || 0;
			return this.done(function(env, descriptor, string) {
				if (typeof options.rule === 'string')
					options.rule = getRule(this, options.rule);
				var newString = true,
					count = 0;
				while (newString && string) {
					if (options.maximum && options.maximum === count)
						break;
					var newDescriptor = options.as ? options.as(env, descriptor) : (options.pushTo ? {} : descriptor);
					newString = exec(string, options.rule, newDescriptor, this, env);
					if (newString !== false) {
						count++;
						string = newString;
						if (!newDescriptor.skip && options.pushTo)
							if (typeof options.pushTo === 'string') {
								descriptor[options.pushTo] = descriptor[options.pushTo] || [];
								descriptor[options.pushTo].push(newDescriptor);
							} else
								options.pushTo(env, descriptor, newDescriptor);
						if (options.separator && string) {
							newString = exec(string, options.separator, newDescriptor, this, env);
							if (newString !== false)
								string = newString;
						}
					}
				}
				if (count < options.minimum)
					return false;
				return string;
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
			var options = (typeof rule === 'string' ||  rule.__elenpi__) ? { rule: rule } : rule;
			return this.done(function(env, descriptor, string) {
				if (typeof options.rule === 'string')
					options.rule = getRule(this, options.rule);
				var newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor),
					res = exec(string, options.rule, newDescriptor, this, env);
				if (res !== false) {
					if (!newDescriptor.skip && options.set) {
						if (typeof options.set === 'string')
							descriptor[options.set] = newDescriptor;
						else
							options.set(env, descriptor, newDescriptor);
					}
					string = res;
				}
				return string;
			});
		},
		oneOf: function(rules) {
			var options = (typeof rules === 'string' || rules.__elenpi__) ? { rules: [].slice.call(arguments) } : rules;
			return this.done(function(env, descriptor, string) {
				if (!string)
					return false;
				var count = 0;
				while (count < options.rules.length) {
					var rule = options.rules[count];
					if (typeof rule === 'string')
						rule = getRule(this, rule);
					var newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor),
						newString = exec(string, rule, newDescriptor, this, env);
					if (newString !== false) {
						if (!newDescriptor.skip && options.set) {
							if (typeof options.set === 'string')
								descriptor[options.set] = newDescriptor;
							else
								options.set(env, descriptor, newDescriptor);
						}
						return newString;
					}
					count++;
				}
				return false;
			});
		},
		one: function(rule) {
			var options = (typeof rule === 'string' ||  (rule && rule.__elenpi__)) ? { rule: rule } : rule;
			return this.done(function(env, descriptor, string) {
				if (typeof options.rule === 'string')
					options.rule = getRule(this, options.rule);
				var newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor),
					newString = exec(string, options.rule, newDescriptor, this, env);
				if (newString !== false && !newDescriptor.skip && options.set) {
					if (typeof options.set === 'string')
						descriptor[options.set] = newDescriptor;
					else
						options.set(env, descriptor, newDescriptor);
				}
				return newString;
			});
		},
		skip: function() {
			return this.done(function(env, descriptor, string) {
				descriptor.skip = true;
				return string;
			});
		},
		space: function(needed) {
			return this.done(function(env, descriptor, string) {
				if (!string)
					if (needed)
						return false;
					else
						return string;
				var cap = (this.rules.space || defaultSpaceRegExp).exec(string);
				if (cap)
					return string.substring(cap[0].length);
				else if (needed)
					return false;
				return string;
			});
		},
		end: function(needed) {
			return this.done(function(env, descriptor, string) {
				if (!string || !needed)
					return string;
				return false;
			});
		}
	};

	var Parser = function(rules, defaultRule) {
		this.rules = rules;
		this.defaultRule = defaultRule;
	};
	Parser.prototype = {
		exec: function(string, descriptor, rule, env) {
			env = env || {};
			if (!rule)
				rule = this.rules[this.defaultRule];
			return exec(string, rule, descriptor, this, env);
		},
		parse: function(string, rule, descriptor, env) {
			env = env || {};
			descriptor = descriptor || {};
			var ok = this.exec(string, descriptor, rule, env);
			if (ok === false || (ok && ok.length > 0)) {
				var pos = string.length - env.soFar;
				// todo : catch line number
				console.error('elenpi parsing failed : (pos:' + pos + ') near :\n', string.substring(Math.max(pos - 1, 0), pos + 50));
				return false;
			}
			return descriptor;
		}
	};

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

},{}]},{},[1]);
