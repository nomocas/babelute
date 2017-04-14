/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

/* global describe, it */

import babelute from '../src/index.js';

import chai from 'chai';
const expect = chai.expect;

const Babelute = babelute.Babelute,
	Lexem = babelute.Lexem;

describe('Babelute base class and Lexem', () => {


	describe('simple lexem', () => {
		const lexem = new Lexem('foo', 'bar', ['zoo']);

		it('should be in object form', () => {
			expect(JSON.stringify(lexem))
				.equals('{"lexicon":"foo","name":"bar","args":["zoo"]}');
		});
	});

	describe('simple append', () => {
		const b = new Babelute(),
			startLexem = JSON.stringify(b._lexems);

		b._append('testlexicon', 'mylexem', [true, false]);
		const endLexem = JSON.stringify(b._lexems);

		it('should append once', () => {
			expect(startLexem)
				.equals('[]');
			expect(endLexem)
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false]}]');
		});
	});
	describe('double append', () => {
		const b = new Babelute(),
			startLexem = JSON.stringify(b._lexems);

		b._append('testlexicon', 'mylexem', [true, false])
			._append('testlexicon', 'mylexem2', [1, 2]);
		const endLexem = JSON.stringify(b._lexems);

		it('should append twice', () => {
			expect(startLexem)
				.equals('[]');
			expect(endLexem)
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false]},{"lexicon":"testlexicon","name":"mylexem2","args":[1,2]}]');
		});
	});

	describe('Babelute.extends', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			}
		});

		const b = new MyBabelute().foo('bar');

		it('should contains needed lexems', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bar"] }]);
		});
	});


	describe('_use', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute().foo('bar').zoo(true);

		const c = new MyBabelute()._use(b);

		it('should insert needed lexems', () => {
			expect(c._lexems)
				.to.deep.equals([{
					lexicon: "test",
					name: "foo",
					args: ["bar"]
				}, {
					lexicon: "test",
					name: "zoo",
					args: [true]
				}]);
		});
	});

	describe('_use on simple Babelute', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute().foo('bar').zoo(true);

		const c = new babelute.Babelute()._use(b);

		it('should prodive needed lexems', () => {
			expect(c._lexems)
				.to.deep.equals([{
					lexicon: "test",
					name: "foo",
					args: ["bar"]
				}, {
					lexicon: "test",
					name: "zoo",
					args: [true]
				}]);
		});
	});
	describe('_if', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute()._if(true, new MyBabelute().foo('bar').zoo(true));

		it('should insert sentence', () => {
			expect(b._lexems)
				.to.deep.equals([{
					lexicon: "test",
					name: "foo",
					args: ["bar"]
				}, {
					lexicon: "test",
					name: "zoo",
					args: [true]
				}]);
		});
	});
	describe('_if with else', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute()._if(false, new MyBabelute().foo('bar'), new MyBabelute().zoo(true));

		it('should insert "else" sentence', () => {
			expect(b._lexems)
				.to.deep.equals([{
					lexicon: "test",
					name: "zoo",
					args: [true]
				}]);
		});
	});
	describe('_each', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute()._each([1, 2, 3], (item) => new MyBabelute().foo(item));

		it('should insert multiple sentence', () => {
			expect(b._lexems)
				.to.deep.equals([{
					lexicon: "test",
					name: "foo",
					args: [1]
				}, {
					lexicon: "test",
					name: "foo",
					args: [2]
				}, {
					lexicon: "test",
					name: "foo",
					args: [3]
				}]);
		});
	});

	describe('fromJSON', () => {

		const MyBabelute = Babelute.extends(Babelute, {
			foo(title) {
				return this._append('test', 'foo', [title]);
			},
			zoo(goo) {
				return this._append('test', 'zoo', [goo]);
			}
		});

		const b = new MyBabelute().foo('ho').zoo(true),
			c = babelute.fromJSON(JSON.stringify(b));

		it('should parse correctly', () => {
			expect(c._lexems)
				.to.deep.equals(b._lexems);
		});
	});
});

