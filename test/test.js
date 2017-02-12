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

		it('should', () => {
			expect(JSON.stringify(lexem))
				.equals('{"lexicon":"foo","name":"bar","args":["zoo"]}');
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
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false]}]');
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
				.equals('[{"lexicon":"testlexicon","name":"mylexem","args":[true,false]},{"lexicon":"testlexicon","name":"mylexem2","args":[1,2]}]');
		});
	});
});

