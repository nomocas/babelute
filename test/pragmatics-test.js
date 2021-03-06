/* global  describe, it */

import chai from 'chai';
import babelute from '../src/index';

const expect = chai.expect;

describe('Babelute Pragmatics core tests', () => {
	describe('simple pragmatics', () => {

		const pragmas = babelute.createPragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const subject = {};
		pragmas.zoo(subject, [true]);

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: true });
		});
	});
	describe('simple pragmatics', () => {

		const pragmas = babelute.createPragmatics();
		pragmas.addPragmas({
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});
		const subject = {};
		pragmas.zoo(subject, [true]);

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: true });
		});
	});
	describe('simple facadePragmas call', () => {

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const subject = {};
		pragmas.zoo(subject, [true]);

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: true });
		});
	});

	describe('add pragmas after construction', () => {

		const pragmas = babelute.createFacadePragmatics({
			test: true
		});

		pragmas.addPragmas({
			bar(subject, args) {
				subject.bar = args[0];
			}
		});

		const subject = {};
		pragmas.bar(subject, ['goo']);

		it('should', () => {
			expect(subject).to.deep.equal({ bar: 'goo' });
		});
	});

	describe('inner $output call', () => {
		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			},
			foo(subject, args) {
				if (args[0])
					this.$output(subject, args[0]);
			}
		});

		const subject = {};
		pragmas.foo(subject, [new Dsl().zoo('hop')]);

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: 'hop' });
		});
	});
	describe('facade if true', () => {

		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			},
			if (condition, s, f) {
				return this._append('test', 'if', [condition, s, f]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const subject = {};

		pragmas.$output(subject, new Dsl().if(true, new Dsl().zoo('hop')));

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: 'hop' });
		});
	});
	describe('facade if false with no fail handler', () => {

		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			},
			if (condition, s, f) {
				return this._append('test', 'if', [condition, s, f]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const subject = {};

		pragmas.$output(subject, new Dsl().if(false, new Dsl().zoo('hop')));

		it('should', () => {
			expect(subject).to.deep.equal({});
		});
	});
	describe('facade if false with fail handler', () => {

		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			},
			if (condition, s, f) {
				return this._append('test', 'if', [condition, s, f]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const subject = {};

		pragmas.$output(subject, new Dsl().if(false, new Dsl().zoo('bam'), new Dsl().zoo('hop')));

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: 'hop' });
		});
	});
	describe('facade each', () => {

		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			},
			each(collec, handler) {
				return this._append('test', 'each', [collec, handler]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = subject.zoo || '';
				subject.zoo += args[0];
			}
		});

		const subject = {};
		pragmas.$output(subject, new Dsl().each(['a', 'b', 'c'], function(item) {
			return new Dsl().zoo(item);
		}));

		it('should', () => {
			expect(subject).to.deep.equal({ zoo: 'abc' });
		});
	});

	describe('facade each throw if nothing is returned from handler', () => {
		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			each(collec, handler) {
				return this._append('test', 'each', [collec, handler]);
			}
		});
		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = subject.zoo || '';
				subject.zoo += args[0];
			}
		});

		const willThrow = function() {
			pragmas.$output({}, new Dsl().each(['a', 'b', 'c'], function() {}));
		};

		it('should', () => {
			expect(willThrow).to.throw();
		});
	});

	describe('facade each no collection', () => {

		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			zoo(arg) {
				return this._append('test', 'zoo', [arg]);
			},
			each(collec, handler) {
				return this._append('test', 'each', [collec, handler]);
			}
		});

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = subject.zoo || '';
				subject.zoo += args[0];
			}
		});

		const subject = {};
		pragmas.$output(subject, new Dsl().each(null, function(item) {
			return new Dsl().zoo(item);
		}));

		it('should', () => {
			expect(subject).to.deep.equal({});
		});
	});


	describe('lexicon + pragmatics with percolator', () => {

		const lexicon = babelute.createLexicon('test');
		lexicon.addAtoms(['zoo']);

		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {
			zoo(subject, args) {
				subject.zoo = args[0];
			}
		});

		const b = lexicon.initializer().zoo(true),
			percolator = {};
		const result = pragmas.$output({}, b, percolator);

		it('should', () => {
			expect(result).to.deep.equal({ zoo: true });
		});
	});

	describe('facade each throw if nothing is returned from handler', () => {
		var Dsl = babelute.Babelute.extends(babelute.Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			}
		});
		const pragmas = babelute.createFacadePragmatics({
			test: true
		}, {});

		var result = pragmas.$output({}, new Dsl().foo('bar'));

		it('should', () => {
			expect(result).to.deep.equals({});
		});
	});

});

