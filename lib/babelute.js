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
			if: function(env, subject, args /* successBabelute, elseBabelute */ ) {
				if (args[0])
					return args[1].$output(env, subject);
				else if (args[2])
					return args[2].$output(env, subject);
			},
			all: function(env, subject, thenables) {
				return Promise.all(thenables);
			},
			then: function(env, subject, callbacks) {
				if (locals.error)
					return locals.result = args[0](locals.error);
				return locals.result = args[1](locals.result);
			},
			catch: function(env, subject, args) {
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
				r = f(env, subject, lexem.args, env.scope);
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