var Babelute = require('../index');

Babelute.toLexic('babelute-test', ['welcome', 'sharing', 'era', 'futur', 'now']);

var h = Babelute.initializer('babelute-test');

Babelute.toLexic('babelute-test', {
		what: function(title) {
			return this.welcome(h.sharing().era(title));
		},
		today: function(when) {
			return this.futur(when);
		}
	})
	.toActions('babelute-test:object', {
		__restrictions__: {
			"babelute-test": true
		},
		now: function(subject, args) {
			subject.date = 'now';
		},
		futur: function(subject, args, env) {
			subject.futurIs = args[0].$output(env, {});

		}
	});

module.exports = Babelute.getLexic('babelute-test');