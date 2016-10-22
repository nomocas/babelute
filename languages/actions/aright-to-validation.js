/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = require('../../index');

var replaceShouldBeRegExp = /%s/g,
	i18n = function(rule, language) {
		var space = i18n.data[language || i18n.currentLanguage];
		return space[rule];
	},
	formats = {
		email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i
	};

i18n.currentLanguage = 'en';
i18n.data = {
	en: {
		string: 'should be a string',
		object: 'should be an object',
		array: 'should be an array',
		'boolean': 'should be a boolean',
		number: 'should be a number',
		'null': 'should be null',
		'enum': 'enum failed (should be one of : %s)',
		equal: 'equality failed (should be : %s)',
		format: 'format failed',
		unmanaged: 'unmanaged property',
		missing: 'missing property',
		minLength: 'too short (length should be at least : %s)',
		maxLength: 'too long (length should be at max : %s)',
		minimum: 'too small (should be at minimum : %s)',
		maximum: 'too big (should be at max : %s)',
		instanceOf: 'should be instance of %s',
		or: '"or" rule not satisfied (%s)',
		not: '"not" rule not satisfied (!%s)'
	}
};

function error(errors, rule, parent, key, path, shouldBe) {
	if (path && key)
		path += '.';
	path = key ? (path + key) : path;

	if (!path)
		path = 'root';

	errors.valid = false;
	errors.map[path] = errors.map[path] || {
		value: (parent && key) ? parent[key] : parent,
		errors: []
	};
	var msg = i18n(rule);
	if (!msg)
		msg = 'missing error message for ' + rule;
	if (shouldBe)
		msg = msg.replace(replaceShouldBeRegExp, shouldBe);
	errors.map[path].errors.push(msg);
	return false;
}

Babelute.toActions('aright:validation', {
	__restrictions__: {
		aright: true
	},
	//______________________________________________________
	is: function(subject, args /* type */ , env, scope) {
		var input = subject[0],
			type = args[0];
		if (typeof input !== type)
			error(scope.errors, type, input, null, subject[1], type);
	},
	has: function(subject, args /* name, type, rule */ , env, scope) {
		var input = subject[0],
			path = subject[1],
			name = args[0],
			type = args[1],
			rule = args[2],
			value = input[name],
			actualType = typeof value;
		if (!input)
			error(scope.errors, 'missing', input, name, path);
		if (actualType === 'undefined') {
			if (!rule || rule._aright_required !== false)
				error(scope.errors, 'missing', input, name, path);
		} else if (actualType !== type)
			error(scope.errors, type, input, name, path, type);
		else if (rule)
			rule.$output(env, [value, path ? (path + '.' + name) : name]);
	},
	or: function(subject, rules, env, scope) {
		var input = subject[0],
			path = subject[1],
			ok = rules.some(function(rule) {
				var errors = {
					map: {}
				}; // fake error object
				env.pushScope('errors', errors);
				rule.$output(env, [input, path]);
				env.popScope('errors');
				return !!errors.valid;
			});
		if (!ok)
			error(scope.errors, 'or', input, null, path, rules.join(' || '));
	},
	not: function(subject, args /*input, path*/ , env, scope) {
		var input = subject[0],
			path = subject[1],
			errors = {
				map: {}
			}; // fake error object
		env.pushScope('errors', errors);
		rule.$output(env, [input, path])
		env.popScope('errors');
		if (!!errors.valid)
			error(scope.errors, 'not', input, null, path, rule._stringify());
	},
	switch: function(subject, args /* name, map */ , env, scope) {
		var input = subject[0],
			path = subject[1],
			name = args[0],
			map = args[1],
			value = input[name],
			rule = map[value] || map['default'];
		if (rule)
			rule.$output(env, [value, path ? (path + '.' + name) : name]);
	},
	//____________________________________ ARRAY
	isArray: function(subject, args, env, scope) {
		var input = subject[0];
		if (typeof input !== 'object' || !input.forEach)
			error(scope.errors, 'array', input, null, subject[1]);
	},
	array: function(subject, args /* name, rule */ , env, scope) {
		var input = subject[0],
			path = subject[1],
			name = args[0],
			rule = args[1],
			value = input[name],
			type = typeof value;
		if (type === 'undefined') {
			if (!rule || rule._aright_required !== false)
				error(scope.errors, 'missing', input, name, path);
		} else if (type !== 'object' || !input[name].forEach)
			error(scope.errors, 'array', input, name, path);
		else if (rule)
			rule.$output(env, [value, path ? (path + '.' + name) : name]);
	},
	item: function(subject, args /* rule */ , env, scope) {
		var input = subject[0],
			path = subject[1];
		for (var i = 0, len = input.length; i < len; ++i)
			args[0].$output(env, [input[i], path + '.' + i]);
	},
	// ________________________________ SIMPLE CHECKS
	maximum: function(subject, args /* max */ , env, scope) {
		if (subject[0] > args[0])
			error(scope.errors, 'maximum', subject[0], null, subject[1]);
	},
	minimum: function(subject, args /* min */ , env, scope) {
		if (subject[0] < args[0])
			error(scope.errors, 'minimum', subject[0], null, subject[1]);
	},
	equal: function(subject, args /* value */ , env, scope) {
		if (subject[0] !== args[0])
			error(scope.errors, 'equal', subject[0], null, subject[1]);
	},
	instanceOf: function(subject, args /* Class */ , env, scope) {
		if (!(subject[0] instanceof args[0]))
			error(scope.errors, 'instanceOf', subject[0], null, subject[1]);
	},
	maxLength: function(subject, args /* max */ , env, scope) {
		if (subject[0].length > args[0])
			error(scope.errors, 'maximum', subject[0], null, subject[1]);
	},
	minLength: function(subject, args /* min */ , env, scope) {
		if (subject[0].length < args[0])
			error(scope.errors, 'minimum', subject[0], null, subject[1]);
	},
	format: function(subject, args /* regexp format */ , env, scope) {
		var exp = args[0];
		if (typeof exp === 'string')
			exp = formats[exp];
		if (!exp.test(subject[0]))
			error(scope.errors, 'format', subject[0], null, subject[1]);
	},
	enum: function(subject, args /* values */ , env, scope) {
		var values = args[0];
		if (values.indexOf(subject[0]) === -1)
			error(scope.errors, 'enum', subject[0], null, subject[1], values.join(', '));
	},
	null: function(subject, args, env, scope) {
		if (subject[0] !== null)
			error(scope.errors, 'null', subject[0], null, subject[1]);
	}
});

module.exports = {
	v: Babelute.initializer('aright'),
	i18n: i18n,
	formats: formats,
	error: error
};

Babelute.prototype.$validateValue = function(value) {
	var errors = {
		map: {}
	};
	this.$output('aright:validation', [value, null], {
		errors: errors
	});
	return errors.valid === false ? errors : true;
};