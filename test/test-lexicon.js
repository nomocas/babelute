/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

/* global describe, it */

import chai from 'chai';
import babelute from '../src/index.js';

const expect = chai.expect;

describe('Babelute Lexicon tests', () => {

	describe('create lexicon', () => {
		const testlexicon = babelute.createLexicon('test-lexicon');

		it('should provide lexicon\'s instance', () => {
			expect(testlexicon).to.be.instanceof(babelute.Lexicon);
		});
		it('should hold an Atomic function which is a Babelute Subclass', () => {
			expect(testlexicon.Atomic.prototype).to.be.instanceof(babelute.Babelute);
		});
		it('should hold an FirstLevel function which is a Babelute Subclass', () => {
			expect(testlexicon.FirstLevel.prototype).to.be.instanceof(babelute.Babelute);
		});
		it('should hold an SecondLevel function which is a Babelute Subclass', () => {
			expect(testlexicon.SecondLevel.prototype).to.be.instanceof(babelute.Babelute);
		});
		it('should hold an SecondLevel instance which is a SecondLevel instance', () => {
			expect(testlexicon.secondLevel).to.be.instanceof(testlexicon.SecondLevel);
		});
	});

	describe('add simple atoms', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['bloupi']);

		it('should be holded in the three protos', () => {
			expect(lexicon.Atomic.prototype).to.have.property('bloupi').that.is.a('function');
			expect(lexicon.FirstLevel.prototype).to.have.property('bloupi').that.is.a('function');
			expect(lexicon.SecondLevel.prototype).to.have.property('bloupi').that.is.a('function');
		});
		it('should produce a single atom with provided args in Atomic mode', () => {
			const b = new lexicon.Atomic().bloupi(1, true, 'hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'bloupi', args: [1, true, 'hello'] }]);
		});
		it('should produce a single atom with provided args in FirstLevel mode', () => {
			const b = new lexicon.FirstLevel().bloupi(1, true, 'hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'bloupi', args: [1, true, 'hello'] }]);
		});
		it('should produce a single atom with provided args in SecondLevel mode', () => {
			const b = new lexicon.SecondLevel().bloupi(1, true, 'hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'bloupi', args: [1, true, 'hello'] }]);
		});
	});

	describe('add simple compounds', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['bloupi', 'bar'])
			.addCompounds(() => {
				return {
					foo(title) {
						return this.bloupi(1, false).bar(title);
					}
				};
			});

		it('should be holded in the three protos', () => {
			expect(lexicon.Atomic.prototype).to.have.property('foo').that.is.a('function');
			expect(lexicon.FirstLevel.prototype).to.have.property('foo').that.is.a('function');
			expect(lexicon.SecondLevel.prototype).to.have.property('foo').that.is.a('function');
		});
		it('should produce a double atoms with provided args in Atomic mode', () => {
			const b = new lexicon.Atomic().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'bloupi', args: [1, false] },
					{ lexicon: 'test', name: 'bar', args: ['hello'] }
				]);
		});
		it('should produce a single atom with provided args in FirstLevel mode', () => {
			const b = new lexicon.FirstLevel().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'foo', args: ['hello'] }]);
		});
		it('should produce a double atom with provided args in SecondLevel mode', () => {
			const b = new lexicon.SecondLevel().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'bloupi', args: [1, false] },
					{ lexicon: 'test', name: 'bar', args: ['hello'] }
				]);
		});
	});

	describe('add compounds that mix atoms and other compounds', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(1).zoo(goo);
					},
					foo(title) {
						return this.bloupi().bar(title);
					}
				};
			});

		it('should produce a triple atoms with provided args in Atomic mode', () => {
			const b = new lexicon.Atomic().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'bloupi', args: [] },
					{ lexicon: 'test', name: 'zoo', args: [1] },
					{ lexicon: 'test', name: 'zoo', args: ['hello'] }
				]);
		});
		it('should produce a single atom with provided args in FirstLevel mode', () => {
			const b = new lexicon.FirstLevel().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'foo', args: ['hello'] }]);
		});
		it('should produce a double atom with provided args in FirstLevel through developOneLevel', () => {
			const b = new lexicon.FirstLevel().foo('hello');
			const c = babelute.developOneLevel(b._lexems[0], lexicon);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'bloupi', args: [] },
					{ lexicon: 'test', name: 'bar', args: ['hello'] }
				]);
		});
		it('should produce a double atom with provided args in FirstLevel through developToAtoms', () => {
			const b = new lexicon.FirstLevel().foo('hello');
			const c = babelute.developToAtoms(b._lexems[0], lexicon);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'bloupi', args: [] },
					{ lexicon: 'test', name: 'zoo', args: [1] },
					{ lexicon: 'test', name: 'zoo', args: ['hello'] }
				]);
		});
	});

	describe('add aliases', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['zoo'])
			.addAliases({
				foo(title) {
					return this.zoo(title + '-123');
				}
			});

		it('should produce a single atom with provided args in Atomic mode', () => {
			const b = new lexicon.Atomic().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'zoo', args: ['hello-123'] }]);
		});
		it('should produce a single atom with provided args in FirstLevel mode', () => {
			const b = new lexicon.FirstLevel().foo('hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'zoo', args: ['hello-123'] }]);
		});
		it('should produce a single atom with provided args in FirstLevel through developOneLevel', () => {
			const b = new lexicon.FirstLevel().foo('hello');
			const c = babelute.developOneLevel(b._lexems[0], lexicon);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test', name: 'zoo', args: ['hello-123'] }]);
		});
	});

	describe('create dialect', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = lexicon.createDialect('test2');
		dialect.addAtoms(['bar']);


		it('should provide a lexicon\'s instance', () => {
			expect(dialect).to.be.instanceof(babelute.Lexicon);
		});
		it('should hold an Atomic function which is a Babelute Subclass', () => {
			expect(dialect.Atomic.prototype).to.be.instanceof(lexicon.Atomic);
		});
		it('should hold an FirstLevel function which is a Babelute Subclass', () => {
			expect(dialect.FirstLevel.prototype).to.be.instanceof(lexicon.FirstLevel);
		});
		it('should hold an SecondLevel function which is a Babelute Subclass', () => {
			expect(dialect.SecondLevel.prototype).to.be.instanceof(lexicon.SecondLevel);
		});
	});

	describe('lexicon _use', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test2');
		dialect.addAtoms(['bar']);

		const b = lexicon.initializer().foo(1)._use(dialect.initializer().bar(2));


		it('should insert sub-sentence in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test2', name: 'bar', args: [2] }
				]);
		});
	});

	describe('lexicon _use registred lexicon', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test2');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer().foo(1)._use('test2:bar', 2);

		it('should insert lexem from another lexicon in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test2', name: 'bar', args: [2] }
				]);
		});
	});
	describe('lexicon _use registred lexicon in FirstLevel', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test2');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer(true).foo(1)._use('test2:bar', 2);

		it('should insert lexem from another lexicon in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test2', name: 'bar', args: [2] }
				]);
		});
	});
	describe('initializer._empty', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const b = lexicon.initializer()._empty().foo('bouh');

		it('should provide an empty babelute instance from lexicon', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bouh"] }]);
		});
	});

	describe('babelute.initializer', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.initializer('test').foo('bouh');

		it('should provide the needed lexicon initializer', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bouh"] }]);
		});
	});

	describe('babelute.initializer with FirstLevel', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.initializer('test', true).foo('bouh');

		it('should provide the needed FirstLevel initializer', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bouh"] }]);
		});
	});

	describe('babelute.init', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.init('test').foo('bouh');

		it('should provide an empty babelute instance from lexicon', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bouh"] }]);
		});
	});

	describe('babelute.init with FirstLevel', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.init('test', true).foo('bouh');

		it('should provide empty FirstLevel instance', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test", "name": "foo", "args": ["bouh"] }]);
		});
		it('should provide FirstLevel\'s instance', () => {
			expect(b).to.be.instanceof(babelute.FirstLevel);
		});
	});

	describe('babelute.init without lexicon', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.init();

		it('should provide empty instance ', () => {
			expect(b._lexems).to.deep.equals([]);
		});
		it('should provide Babelute\'s instance', () => {
			expect(b).to.be.instanceof(babelute.Babelute);
		});
	});

	describe('babelute.init without lexicon and with FirstLevel', () => {

		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.init(null, true);

		it('should provide a empty FirstLevel instance', () => {
			expect(b._lexems).to.deep.equals([]);
		});
		it('should provide FirstLevel\'s instance', () => {
			expect(b).to.be.instanceof(babelute.FirstLevel);
		});
	});

	describe('use _lexicon to change current lexicon', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test2');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer().foo(1)._lexicon('test2').bar(2);

		it('should change lexicon of current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test2', name: 'bar', args: [2] }
				]);
		});
	});

	describe('use _lexicon to change current lexicon in FirstLevel', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test2');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer(true).foo(1)._lexicon('test2').bar(2);

		it('should change lexicon of current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test2', name: 'bar', args: [2] }
				]);
		});
	});
});

