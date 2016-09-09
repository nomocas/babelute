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
		this.__babelutelexem__ = true;
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
