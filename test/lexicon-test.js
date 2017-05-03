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
		const lexicon = babelute.createLexicon('test1');

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
				.that.deep.equals([{ lexicon: 'test1', name: 'bloupi', args: [1, true, 'hello'] }]);
		});
		it('should produce a single atom with provided args in FirstLevel mode', () => {
			const b = new lexicon.FirstLevel().bloupi(1, true, 'hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test1', name: 'bloupi', args: [1, true, 'hello'] }]);
		});
		it('should produce a single atom with provided args in SecondLevel mode', () => {
			const b = new lexicon.SecondLevel().bloupi(1, true, 'hello');

			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'test1', name: 'bloupi', args: [1, true, 'hello'] }]);
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

	describe('test auto catch of lexicon in developOneLexem', () => {
		const lexicon = babelute.createLexicon('testz');
		babelute.registerLexicon(lexicon);
		lexicon.addAtoms(['zoo'])
			.addCompounds(() => {
				return {
					foo(title) {
						return this.zoo(title + '-123');
					}
				};
			});


		it('should produce a single atom with provided args in Atomic through developOneLevel', () => {
			const b = new lexicon.Atomic().foo('hello');
			const c = babelute.developOneLevel(b._lexems[0]);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'testz', name: 'zoo', args: ['hello-123'] }]);
		});

		it('should produce a single atom with provided args in FirstLevel through developOneLevel', () => {
			const b = new lexicon.FirstLevel().foo('hello');
			const c = babelute.developOneLevel(b._lexems[0]);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'testz', name: 'zoo', args: ['hello-123'] }]);
		});
	});

	describe('test auto catch of lexicon in developToAtoms', () => {
		const lexicon = babelute.createLexicon('testz1');
		babelute.registerLexicon(lexicon);
		lexicon.addAtoms(['zoo'])
			.addCompounds(() => {
				return {
					foo(title) {
						return this.zoo(title + '-123');
					}
				};
			});


		it('should produce a single atom with provided args in Atomic through developOneLevel', () => {
			const b = new lexicon.Atomic().foo('hello');
			const c = babelute.developToAtoms(b._lexems[0]);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'testz1', name: 'zoo', args: ['hello-123'] }]);
		});

		it('should produce a single atom with provided args in FirstLevel through developOneLevel', () => {
			const b = new lexicon.FirstLevel().foo('hello');
			const c = babelute.developToAtoms(b._lexems[0]);
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([{ lexicon: 'testz1', name: 'zoo', args: ['hello-123'] }]);
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

	describe('create dialect of dialect', () => {
		const lexicon = babelute.createLexicon('test');
		lexicon.addAtoms(['foo']);

		const dialect = lexicon.createDialect('test2');
		dialect.addAtoms(['bar']);

		const dialect2 = dialect.createDialect('test45');
		dialect2.addAtoms(['zoo']);

		it('should provide a lexicon\'s instance', () => {
			expect(dialect2).to.be.instanceof(babelute.Lexicon);
		});
		it('should hold an Atomic function which is a Babelute Subclass', () => {
			expect(dialect2.Atomic.prototype).to.be.instanceof(lexicon.Atomic);
		});
		it('should hold an FirstLevel function which is a Babelute Subclass', () => {
			expect(dialect2.FirstLevel.prototype).to.be.instanceof(lexicon.FirstLevel);
		});
		it('should hold an SecondLevel function which is a Babelute Subclass', () => {
			expect(dialect2.SecondLevel.prototype).to.be.instanceof(lexicon.SecondLevel);
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
	describe('simple Babelute _use', () => {
		const lexicon = babelute.createLexicon('test2');
		lexicon.addAtoms(['foo']);
		babelute.registerLexicon(lexicon);

		const b = new babelute.Babelute()._use('test2:foo', 1);

		it('should insert sub-sentence in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test2', name: 'foo', args: [1] },
				]);
		});
	});
	describe('simple Babelute _use throw when not found', () => {
		const lexicon = babelute.createLexicon('test3');
		lexicon.addAtoms(['foo']);
		babelute.registerLexicon(lexicon);

		const throwIt = function() {
			new babelute.Babelute()._use('test3:fool', 1);
		}
		it('should throw', () => {
			expect(throwIt).to.throw();
		});
	});
	describe('simple Babelute _use with another babelute', () => {
		const lexicon = babelute.createLexicon('test');
		lexicon.addAtoms(['foo']);
		const b = new babelute.Babelute()._use(lexicon.initializer().foo(1));

		it('should insert sub-sentence in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
				]);
		});
	});
	describe('simple Babelute _use with another babelute (firstLevel)', () => {
		const lexicon = babelute.createLexicon('test');
		lexicon.addAtoms(['foo']);
		const b = new babelute.FirstLevel()._use(lexicon.initializer(true).foo(1));

		it('should insert sub-sentence in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
				]);
		});
	});
	describe('simple Babelute _use with null (firstLevel)', () => {
		const lexicon = babelute.createLexicon('test');
		lexicon.addAtoms(['foo']);
		const b = new babelute.FirstLevel()._use(null);

		it('should insert sub-sentence in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([]);
		});
	});
	describe('lexicon _use registred lexicon', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test4');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer().foo(1)._use('test4:bar', 2);

		it('should insert lexem from another lexicon in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test4', name: 'bar', args: [2] }
				]);
		});
	});
	describe('lexicon _use registred lexicon in FirstLevel', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addAtoms(['foo']);

		const dialect = babelute.createLexicon('test5');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer(true).foo(1)._use('test5:bar', 2);

		it('should insert lexem from another lexicon in current sentence', () => {
			expect(b).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test', name: 'foo', args: [1] },
					{ lexicon: 'test5', name: 'bar', args: [2] }
				]);
		});
	});
	describe('lexicon _use registred lexicon in FirstLevel and through compounds', () => {
		const lexicon = babelute.createLexicon('test');

		lexicon.addCompounds((h) => {
			return {
				foo() {
					return h._use('test6:bar', 1);
				}
			};
		});

		const dialect = babelute.createLexicon('test6');
		dialect.addAtoms(['bar']);

		babelute.registerLexicon(dialect);

		const b = lexicon.initializer(true).foo(1)
		const c = babelute.developToAtoms(b._lexems[0], lexicon);

		it('should insert lexem from another lexicon in current sentence', () => {
			expect(c).to.be.instanceof(babelute.Babelute)
				.that.have.property('_lexems')
				.that.deep.equals([
					{ lexicon: 'test6', name: 'bar', args: [1] }
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

		const lexicon = babelute.createLexicon('test7');

		lexicon.addAtoms(['foo']);

		babelute.registerLexicon(lexicon);

		const b = babelute.initializer('test7').foo('bouh');

		it('should provide the needed lexicon initializer', () => {
			expect(b._lexems)
				.to.deep.equals([{ "lexicon": "test7", "name": "foo", "args": ["bouh"] }]);
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
	describe('_translateLexemsThrough lexicon', () => {

		const target = babelute.createLexicon('target-test');

		target.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(goo);
					},
					foo(title) {
						return this.bloupi(title);
					}
				};
			});
		const src = babelute.createLexicon('src-test');

		src.addAtoms(['bar', 'foo']);

		const b = src.initializer().foo('hello').bar('bye')._translateLexemsThrough(target);

		it('should insert needed lexems', () => {
			expect(b._lexems)
				.to.deep.equals([
					{ lexicon: 'target-test', name: 'bloupi', args: ['hello'] },
					{ lexicon: 'target-test', name: 'zoo', args: ['bye'] }
				]);
		});
	});

	describe('_translateLexemsThrough lexicon and FirstLevel', () => {

		const target = babelute.createLexicon('target-test');

		target.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(goo);
					},
					foo(title) {
						return this.bloupi(title);
					}
				};
			});
		const src = babelute.createLexicon('src-test');

		src.addAtoms(['bar', 'foo']);

		const b = src.initializer().foo('hello').bar('bye')._translateLexemsThrough(target, true);

		it('should insert needed lexems', () => {
			expect(b._lexems)
				.to.deep.equals([
					{ lexicon: 'target-test', name: 'foo', args: ['hello'] },
					{ lexicon: 'target-test', name: 'bar', args: ['bye'] }
				]);
		});
	});

	describe('_translateLexemsThrough lexicons map', () => {

		const target = babelute.createLexicon('target-test');

		target.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(goo);
					},
					foo(title) {
						return this.bloupi(title);
					}
				};
			});
		const src = babelute.createLexicon('src-test');

		src.addAtoms(['bar', 'foo']);

		const b = src.initializer().foo('hello').bar('bye')._translateLexemsThrough({ 'src-test': target });

		it('should insert needed lexems', () => {
			expect(b._lexems)
				.to.deep.equals([
					{ lexicon: 'target-test', name: 'bloupi', args: ['hello'] },
					{ lexicon: 'target-test', name: 'zoo', args: ['bye'] }
				]);
		});
	});

	describe('_translateLexemsThrough lexicons map with no associate lexicon', () => {

		const target = babelute.createLexicon('target-test');

		target.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(goo);
					},
					foo(title) {
						return this.bloupi(title);
					}
				};
			});
		const src = babelute.createLexicon('src-test');

		src.addAtoms(['bar', 'foo']);

		const b = src.initializer().foo('hello').bar('bye')._translateLexemsThrough({ 'src-test1': target });

		it('should insert needed lexems', () => {
			expect(b._lexems)
				.to.deep.equals([]);
		});
	});



	describe('_translateLexemsThrough arguments translation', () => {

		const target = babelute.createLexicon('target-test');

		target.addAtoms(['bloupi', 'zoo'])
			.addCompounds(() => {
				return {
					bar(goo) {
						return this.zoo(goo);
					},
					foo(title) {
						return this.bloupi(title);
					}
				};
			});
		const src = babelute.createLexicon('src-test');

		src.addAtoms(['bar', 'foo']);

		const h = src.initializer(),
			b = h.foo(h.bar('bye'))._translateLexemsThrough(target);

		it('should insert needed lexems', () => {
			expect(b._lexems[0].args[0]._lexems)
				.to.deep.equals([
					{ lexicon: 'target-test', name: 'zoo', args: ['bye'] }
				]);
		});
	});



	describe('getLexicon throw error if no lexicon found', () => {
		const throwIt = function() {
			return babelute.getLexicon('foo');
		};

		it('should throw error', () => {
			expect(throwIt).to.throw('lexicon not found : foo');
		});
	});
	describe('register lexicon with name', () => {
		const target = babelute.createLexicon('test');
		babelute.registerLexicon(target, 'test2');


		it('should throw error', () => {
			expect(babelute.lexicons.test2).to.equal(target);
		});
	});
});

