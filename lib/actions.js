var Babelute = require('./babelute'),
	actionsDico = Babelute.actions = {
		'default': {
			log: function() {
				console.log.apply(console, arguments);
			},
			if: function(subject, args /* successBabelute, elseBabelute */ , env) {
				if (args[0])
					return args[1].$output(env, subject);
				else if (args[2])
					return args[2].$output(env, subject);
			},
			each: function(subject, args /* collection, callback */ , env) {
				var collec = args[0],
					callback = args[1];
				if (!collec || !collec.forEach)
					return;
				collec.forEach(function(item, i) {
					var templ = callback(env, subject, item, i);
					if (templ)
						templ.$output(env, subject);
				});
			},
			$on: function(subject, args /* collection, callback */ , env) {
				args[0](subject, env, env.scope);
			}
		}
	};

/***************************************
 ************** Environment ************
 ***************************************/

function Environment(actionsName, scope) {
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

Babelute.Environment = Environment;

/**********************************************
 ***************** OUTPUTS ********************
 **********************************************/
// specialised ouput : interpret babelute with specified actions
Babelute.prototype.$output = function(env /* or actionsName */ , subject, scope) {
	if (typeof env === 'string')
		env = new Environment(env, scope);
	if (env.actions.$output) // custom output
		return env.actions.$output(this, env, subject);
	// default output
	this.$each(env, subject, function(subject, lexem, handler, env, index) {
		handler(subject, lexem.args, env, env.scope);
	});
	return subject;
};

Babelute.prototype.$each = function(env, subject, callback) {
	var actions = env.actions,
		index = 0,
		lexem,
		f;
	while (lexem = this._lexems[index]) {
		if (actions.__restrictions__ && !actions.__restrictions__[lexem.lexic]) {
			index++;
			continue;
		}
		f = actions[lexem.name] || actionsDico.default[lexem.name];
		if (f)
			callback(subject, lexem, f, env, index);
		index++;
	}
	return this;
};

Babelute.prototype.$sequence = function(env, subject, callback) {
	return execSequenceElem(this, subject, env, callback, 0);
};

function execSequenceElem(babelute, subject, env, callback, index) {
	var actions = env.actions,
		index = (startIndex || 0),
		r,
		lexem = babelute._lexems[index];
	if (actions.__restrictions__ && !actions.__restrictions__[lexem.lexic])
		return;
	var f = actions[lexem.name] || actionsDico.default[lexem.name];
	if (f)
		r = callback(lexem, f, env, index);
	if (r && r.then)
		r.then(function(s) {
			if (index < babelute._lexems.length - 1)
				return execSequenceElem(babelute, s, env, callback, index + 1);
			return s;
		});
	if (index < babelute._lexems.length - 1)
		return execSequenceElem(babelute, r, env, callback, index + 1);
}

/**********************************************
 ***************** ACTIONS MNGT ***************
 **********************************************/

// return associated action from lexic/lexemName.
Babelute.getActionHandler = function(actions, lexic, lexemName) {
	if (typeof actions === 'string')
		actions = Babelute.getActions(actions);
	if (actions.__restrictions__ && !actions.__restrictions__[lexemLexic])
		return null;
	return actions[lexemName] || actionsDico.default[lexemName] || null;
};

// return specified actions dico.
Babelute.getActions = function(actionsName) {
	var actions = actionsDico[actionsName];
	if (!actions)
		throw new Error('Babelute : actions not found : ' + actionsName);
	return actions;
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

/**
 * Add action's method to specified actionsDico namespaces
 * @param  {String} actionsName 	namespace of actionsDico where store method(s)
 * @param  {String || Object} 		methodName  the name of the method or a map (object) of methods
 * @param  {Function} method      	the method function. (used only if methodName is a string)
 * @return {Babelute}             	Babelute for chaining.
 */
Babelute.toActions = function(actionsName, methodName, method) {
	var actions = actionsDico[actionsName] = actionsDico[actionsName] ||  {};
	if (typeof methodName === 'string') {
		var m = {};
		m[methodName] = method;
		methodName = m;
	}
	for (var i in methodName) {
		if (i === '__restrictions__') {
			actions.__restrictions__ = actions.__restrictions__ || {};
			for (var j in methodName[i])
				actions[i][j] = methodName[i][j];
		} else
			actions[i] = methodName[i];
	}
	return Babelute;
};


/**
 * Facade problem that could appear : 
 * 	- 
 */

var facadeCache = {};

Babelute.facadeInitializer = function(lexicName, actionsName) {
	var cacheName = lexicName + '-' + actionsName;
	if (facadeCache[cacheName])
		return facadeCache[cacheName];
	var lexic = Babelute.getLexic(lexicName),
		actions = Babelute.getActions(actionsName),
		Facade = function(subject, env) {
			lexic.Cl.call(this);
			this._subject = subject;
			this._env = env;
		};

	Facade.prototype = new lexic.Cl();
	Facade.prototype._babelute = null;
	Facade.prototype._append = function(lexic, name, args) {
		if (actions.__restrictions__ && !actions.__restrictions__[lexic])
			return;
		f = actions[name] || actionsDico.default[name];
		if (f)
			f(this._subject, args, this._env, this._env.scope);
		return this;
	}
	return facadeCache[cacheName] = function(subject, env) {
		return new Facade(subject, env || new Environment(actionsName));
	};
};

module.exports = actionsDico;

//