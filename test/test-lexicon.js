/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

/* global describe, it */

import chai from 'chai';
import babelute from '../src/index.js';

const expect = chai.expect;


describe('Babelute Lexicon tests', () => {
	describe('first test', () => {
		const testlexicon = new babelute.Lexicon('test-lexicon');

		it('should', () => {
			expect(testlexicon).to.not.equal(null);
		});
	});

	describe('second test', () => {
		const lexicon = new babelute.Lexicon('test');

		lexicon
			.addAtoms(['bloupi', 'foo', 'bar'])
			.addCompounds((h) => {
				return {
					bah() {
						return this.foo(h.bloupi('buh')).bar('ho');
					}
				};
			});
		it('should', () => {
			expect(lexicon.Atomic).to.not.equal(null);
		});
	});

});
