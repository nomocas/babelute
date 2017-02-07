/*
 * @Author: Gilles Coomans
 */

const Scopes = require('./pragmatics-scopes');

export default function createFacadeInitializer(lexicon, pragmatics) {
	const Facade = function(subject, scopes) {
		lexicon.Atomic.call(this);
		this._subject = subject;
		this._scopes = scopes;
	};

	Facade.prototype = Object.create(lexicon.Atomic.prototype);
	Facade.prototype.constructor = Facade;
	Facade.prototype._lexicon = null;
	Facade.prototype._append = function(lexiconName, name, args) {
		if ((!pragmatics._targets || pragmatics._targets[lexiconName]) && pragmatics[name])
			pragmatics[name](this._subject, args, this._scopes);
		return this;
	};
	return (subject, scopes = null) => {
		return new Facade(subject, scopes || new Scopes());
	};
}
