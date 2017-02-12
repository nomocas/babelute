/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

/* global describe, it */

import chai from 'chai';
import babelute from '../src/index.js';

const expect = chai.expect;

/**
 * @public
 * @param  {[type]}   'Babelute Lexicon       tests' [description]
 * @param  {Function} ()        [description]
 * @return {[type]}             [description]
 */
describe('Babelute Lexicon tests', () => {
	describe('first test', () => {
		const testlexicon = babelute.createLexicon('test-lexicon');

		it('should', () => {
			expect(testlexicon).to.not.equal(null);
		});
	});

	describe('second test', () => {
		const lexicon = babelute.createLexicon('test');

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

