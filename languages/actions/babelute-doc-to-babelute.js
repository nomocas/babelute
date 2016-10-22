var Babelute = require('../../lib/babelute');

Babelute.toActions('babelute-doc:babelute', {
	__restrictions__: {
		'babelute-doc': true
	},
	lexic: function(notused, args /* lexicname, babelute */ , env) {
		var lexicName = args[0],
			lexic = Babelute.lexics[lexicName] = Babelute.lexics[lexicName] || Babelute.initLexic(lexicName);
		lexic.doc = lexic.doc ||  {};
		env.currentLexic = lexicName;
		args[1].$output(env, lexic.doc);
	},
	lexem: function(lexicDoc, args /* lexemName, babelute */ , env) {
		var lexem = lexicDoc[args[0]] = args[1].$output(env, {
			arguments: []
		});
		Babelute.toLexic(env.currentLexic, args[0], lexem.method);
	},
	actions: function(notused, args /* actionsName, babelute */ , env) {
		var actionsName = args[0],
			actions = Babelute.actions[actionsName] = Babelute.actions[actionsName] || {};
		actions.doc = actions.doc ||  {};
		env.currentActions = actionsName;
		args[1].$output(env, actions.doc);
	},
	action: function(actionDoc, args /* actionName, babelute */ , env) {
		var action = actionDoc[args[0]] = args[1].$output(env, {});
		Babelute.toActions(env.currentActions, args[0], action.method);
	},
	extend: function(actionDoc, args) {

	},
	description: function(descriptor, args /* text */ , env) {
		descriptor.description = args[0];
	},
	argument: function(descriptor, args /* argName, babelute */ , env) {
		var arg = args[1].$output(env, {
			name: args[0],
			validation: args[1]
		});
		descriptor.arguments.push(arg);
	},
	argumentsRest: function(descriptor, args /* argName, babelute */ , env) {
		var arg = args[1].$output(env, {
			rest: true,
			name: args[0],
			validation: args[1]
		});
		descriptor.arguments.push(arg);
	},
	method: function(descriptor, args /* function */ ) {
		descriptor.method = args[0];
	}
});

Babelute.prototype.$babeluteDocToBabelute = function() {
	return this.$output('babelute-doc:babelute');
};