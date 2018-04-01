import babelute from '../index';
class Pragmatics {
	constructor(targets = {}, pragmas = {}) {
		this.targets = targets;
		this.pragmas = pragmas;
	}

	addPragmas(pragmas) {
		Object.assign(
			this.pragmas,
			typeof pragmas === 'function' ? pragmas(this.initializer()) : pragmas
		);
		return this; // allow chaining
	}

	addTargets(targets) {
		Object.assign(this.targets, targets);
		return this; // allow chaining
	}
}

//________________ FACADE PRAGMAS

const defaultFacadePragmas = {
	each(subject, collection, itemHandler) {
		if (collection)
			collection.forEach((item, index) => this.$apply(itemHandler(item, index), subject));
	},
	if (subject, condition, trueSentence, falseSentence = null) {
		const sentence = condition ? trueSentence : falseSentence;
		if (sentence)
			this.$apply(
				typeof sentence === 'function' ? sentence(subject) : sentence,
				subject
			);
	}
};

class FacadePragmatics extends Pragmatics {

	constructor(targets = null, pragmas = null) {
		super(targets, pragmas || Object.assign({}, defaultFacadePragmas));
	}

	initializer() {
		if (this._initializer)
			return this._initializer;

		const Chain = this.FacadeChain = this.FacadeChain || FacadeChain.extend();
		this._initializer = subject => new Chain(subject);

		Object.keys(this.pragmas)
			.filter(key => !/^(?:if|each)$/.test(key))
			.forEach(key => FacadeChain.addMethod(Chain, key, this.pragmas));

		return this._initializer;
	}

	createDialect() {
		const dialect = new (this.constructor)(Object.assign({}, this.targets), Object.create(this.pragmas));
		this.initializer(); // to be sure that it has been created
		dialect.FacadeChain = FacadeChain.extend(this.FacadeChain);
		return dialect;
	}

	$apply(sentence, subject = {}) {
		sentence._lexems.forEach(lexem => {
			const args = lexem.args;
			this.targets[lexem.lexicon] && this.pragmas[lexem.name] && this.pragmas[lexem.name](subject, args[0], args[1], args[2], args[3], args[4])
		});
		return subject;
	}

	addPragmas(pragmas) {
		const p = this.initializer(); // to be sure that it has been created

		if (typeof pragmas === 'function')
			pragmas = pragmas(p);

		Object.keys(pragmas).forEach(key => {
			this.pragmas[key] = pragmas[key];
			FacadeChain.addMethod(this.FacadeChain, key, this.pragmas);
		});

		return this; // allow chaining
	}

	toFunctionalFacadePragmatics() {
		const fpfp = {},
			pragmas = this.pragmas,
			FFP = new FunctionalFacadePragmatics(Object.assign({}, this.targets), fpfp);
		Object.keys(pragmas)
			.forEach(key => fpfp[key] = (...args) => {

				// Translate sentences arguments to function before application 
				// (as classical translation)
				args = args.map(arg => arg && arg.__babelute__ ? FFP.$toFunction(arg) : arg);

				return (subject) => {
					// spread arguments operator make code 10 times slower !!
					// so we use this trick : 10 predef arguments.
					// good code shoudn't need that much.
					pragmas[key](subject, args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8], args[9]);
					return subject;
				};
			});
		return FFP;
	}

	toLexicon(name) {
		return babelute
			.createLexicon(name)
			.addAtoms(Object.keys(this.pragmas)); // add all pragmas methods as atoms
	}
}

function createFacadePragmatics(targets) {
	return new FacadePragmatics(targets);
}

//___________ FACADE CHAIN

class FacadeChain {

	constructor(subject = {}) {
		this._subject = subject;
	}

	each(collection, itemHandler) {
		if (collection)
			collection.forEach((item, index) => itemHandler(this._subject, item, index));
	}

	if (condition, trueFunc, falseFunc = null) {
		const func = condition ? trueFunc : falseFunc;
		if (func)
			func(this._subject)
	}

	$val() {
		return this._subject;
	}

	static addMethod(Chain, name, pragmas) {
		// spread arguments operator make code 10 times slower !!
		// so use this trick : 10 predef arguments.
		Chain.prototype[name] = function(a, b, c, d, e, f, g, h, i, j) {
			pragmas[name](this._subject, a, b, c, d, e, f, g, h, i, j);
			return this;
		};
	}

	static extend(BaseChain = FacadeChain) {
		const Chain = function(subject = {}) {
			this._subject = subject;
		};
		Chain.prototype = Object.create(BaseChain.prototype);
		Chain.prototype.constructor = Chain;
		return Chain;
	}
}


//___________ FUNCTIONAL FACADE

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

class FunctionalFacadePragmatics extends Pragmatics {

	constructor(targets = null, pragmas = null) {
		super(targets, pragmas || Object.assign({}, defaultFacadePragmas));
	}

	$apply(sentence, subject = {}) {
		sentence._lexems.forEach(lexem =>
			this.targets[lexem.lexicon] && this.pragmas[lexem.name] && this.pragmas[lexem.name](...lexem.args)(subject)
		);
		return subject;
	}

	$toFunction(sentence) {
		const funcs = [];
		sentence._lexems.forEach(lexem =>
			this.targets[lexem.lexicon] && this.pragmas[lexem.name] && funcs.push(this.pragmas[lexem.name](
				// Translate sentences arguments to function before application 
				// (as classical translation)
				...lexem.args.map(arg => (arg && arg.__babelute__) ? this.$toFunction(arg) : arg)
			))
		);
		return pipe(...funcs);
	}
}

export {
	Pragmatics,
	FacadePragmatics,
	createFacadePragmatics,
	FacadeChain,
	pipe
};

