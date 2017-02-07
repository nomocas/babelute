/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */

/* global describe, it */

import babelute from '../src/index.js';

import chai from 'chai';
const expect = chai.expect;

describe('Babelute base class and Lexem', () => {
	const Babelute = babelute.Babelute,
		Lexem = babelute.Lexem;

	describe('simple lexem', () => {
		const lexem = new Lexem('foo', 'bar', ['zoo']);

		it('should', () => {
			expect(JSON.stringify(lexem))
				.equals('{"lexicon":"foo","name":"bar","args":["zoo"],"__babelutelexem__":true}');
		});
	});

	describe('lexem log', () => {
		const lexem = new Lexem('foo', 'bar', ['zoo']);

		const value = lexem.log('foo');

		it('should', () => {
			expect(value)
				.equals(undefined);
		});
	});

	describe('simple append', () => {
		const b = new Babelute(),
			startLexem = JSON.stringify(b._lexems);

		b._append('testlexicon', 'mylexem', [true, false]);
		const endLexem = JSON.stringify(b._lexems);

		it('should', () => {
			expect(startLexem)
				.equals('[]');
			expect(endLexem)
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false],"__babelutelexem__":true}]');
		});
	});
	describe('double append', () => {
		const b = new Babelute(),
			startLexem = JSON.stringify(b._lexems);

		b._append('testlexicon', 'mylexem', [true, false])
			._append('testlexicon', 'mylexem2', [1, 2]);
		const endLexem = JSON.stringify(b._lexems);

		it('should', () => {
			expect(startLexem)
				.equals('[]');
			expect(endLexem)
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false],"__babelutelexem__":true},{"lexicon":"testlexicon","name":"mylexem2","args":[1,2],"__babelutelexem__":true}]');
		});
	});
});

