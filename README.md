# Babelute.js

> __42__ &asymp; _[ lexem( lexicon, name, arguments ), ... ]_

### Internal Domain Specific (Multi)Modeling js framework

[![Travis branch](https://img.shields.io/travis/nomocas/babelute/master.svg)](https://travis-ci.org/nomocas/babelute)
[![bitHound Overall Score](https://www.bithound.io/github/nomocas/babelute/badges/score.svg)](https://www.bithound.io/github/nomocas/babelute)
[![Coverage Status](https://coveralls.io/repos/github/nomocas/babelute/badge.svg?branch=master)](https://coveralls.io/github/nomocas/babelute?branch=master)
[![dependecies](https://david-dm.org/nomocas/babelute.svg)](https://david-dm.org/)
[![dev-dependencies](https://img.shields.io/david/dev/nomocas/babelute.svg)](https://david-dm.org/)
[![npm-downloads](https://img.shields.io/npm/dm/babelute.svg)](https://npm-stat.com/charts.html?package=babelute)
[![npm](https://img.shields.io/npm/v/babelute.svg)](https://www.npmjs.com/package/babelute)
[![licence](https://img.shields.io/npm/l/babelute.svg)](https://spdx.org/licenses/MIT)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-green.svg)](https://conventionalcommits.org)

Really small, simple, incredibly powerful and super fast __Descriptive Internal DSLs__ tools.


> "_A Babelut(t)e is a sort of long toffee flavoured with honey or vergeoise (demerara sugar) from [...] Flanders, Belgium_".

> __Etymology__ : "_[A french word that] is likely to come from the Flemish "babbelen", speaking a lot, and "uit", finished because when you eat the toffee, you cannot speak anymore (either because you are enjoying it or because you cannot open the mouth).[...]_" - src : [wikipedia](https://en.wikipedia.org/wiki/Babelutte)

Babelute.js core library (this lib) provides helpers to :
- define and manage Internal DSLs for __modeling__ any kind of problems
- with a simple (meta)grammar - based on Method Chaining - for writing __structured unambiguous "sentences"__ (called __babelutes__)
- and to provide ways :
	- to manage __dictionaries of related lexems__ (called __lexicons__) that form DSL semantic fields and their __Internal Denotation__
	- to translate DSL sentences to other DSL sentences (by example through __dedicated bridge-DSLs__ with their own lexicon(s))
	- to interpret sentences in many context with specific __fine grained dedicated implementations__ (called __pragmatics__)

The idea is __really simple__ : lets __write structured sentence with some DSL to encapsulate information__ (aka modeling). Then use different "interpretation" engines to __do something with this information__ (aka implementations).

## Core Libraries

- [babelute](https://github.com/nomocas/babelute) (this lib) : provides Lexicon and Pragmatics base for writting DSLs.
- [babelute-uus](https://github.com/nomocas/babelute-uus) : Universal Unambiguous Sentences proposal : Welcome in Sharing Era. For storing and sharing sentences.
- [babelute-ldl](https://github.com/nomocas/babelute-ldl) : Babelute Lexicon Definition DSL (Sentences Schema) and its generators.

## Understanding by real examples

Low Level DSLs (Developement related domains) :
- [aright-*](https://github.com/nomocas/aright-lexicon) : Objects and types validation DSL (ultra-fast, ultra-modular)
- [htsl-*](https://github.com/nomocas/htsl-lexicon) : HTML5 DSL and its render engines. (modern, __one of the world's fastest__, one-way-binding templating (React philosophy))

High Level DSLs (Human related domains) :
- babelute-cooking : High Level Cooking DSL demo and its bunch of transformations and DSLs targets. (realease in summer 2017)

Please read [Designing a DSL](https://github.com/nomocas/babelute/blob/master/manual/designing-dsl.md) for more infos.

## Theory background and development

Theorical considerations are exposed [here](https://github.com/nomocas/babelute/blob/master/manual/theory.md) (work in progress).

## Usage

```
npm i babelute --save
```

The aim is to define __Descriptive Internal DSLs__ :

- Descriptive : Write what you want and not how to achieve it
- Internal : made and handleable with pure host-language objects and syntax (v.s. an External DSL that has it's own particular syntax)
- DSL : a bunch of related words (and so concepts) from a particular domain

By defining __Words as Functions__ that receive arguments :

```javascript
.aWords(arg1, arg2, ...)
```

And to write __structured sentences__ with them through __Method Chaining__ :

```javascript
h.this().is().a(h.sentence(true)) // this is an example : there is no such DSL... ;)
```

How to get that :
```javascript
// my-dsl-lexicon.js
import babelute from 'babelute';

/* A lexicon is where to store your words */
const lexicon = babelute.createLexicon('my-dsl');

/* 
Atoms are words (of your DSL) that are not expressed with other words from the same lexicon (aka Domain).
In other words, they are words that should be expressed precisely 
with some other domains concepts for particular contexts.
In other words, they need translation or implementation that are outside the scope of the current Domain.
(see designing-a-dsl in babelute's doc for more infos)
*/
lexicon.addAtoms([
	'foo', // .foo(...args)
	'bar', // .bar(...args)
	'zoo', // .zoo(...args)
	'doo'  // .doo(...args)
]);
// don't worry, there is strict formal ways of defining allowed atoms arguments

/* Compounds words are words (of your DSL) that are expressed with other words from the same lexicon */
lexicon.addCompounds((h) => {
	// h is the lexicon's initializer (see below)
	return {
		goo(arg1, arg2) {
			// this is called the "Internal Denotation" of the compound lexem (here 'goo')
			return this.foo(arg1).bar(arg2);
		},
		boo(...some){
			return this.zoo(h.doo(some).foo('lollipop'));
		}
	};
});

export default lexicon;
```
```javascript
import lexicon from 'my-dsl-lexicon';
/* initializer are just a helper to start sentence with your lexicon */
const h = lexicon.initializer();

/* then write sentences with your DSL to describe what you want */
const mySentence = h.goo('hello', 'world').boo('one', 'two', 'three').foo(true);
```

Compounds words (here `goo` and `boo`) are made of __atoms__ (or of other compounds words that are themselves made of atoms by recursivity), and so __sentences below are exactly equivalent__ (they hold the same lexems list and structure):
```javascript
const mySentence = h.goo('hello', 'world').boo('one', 'two', 'three').foo(true);
// is deeply equal to
const mySentence2 = 
	h.foo('hello')
	.bar('world')
	.zoo(
		h.doo(['one', 'two', 'three'])
		.foo('lollipop')
	)
	.foo(true);
```

So sentences are finally __always composed of atoms__ (those words that need implementation - see below).

Of course, you are totally free to create any Internal DSL you want. Apart they should be "Description Oriented" (it is babelute's purpose), you could imagine whatever you want... Remember just that the aim is to define descriptive DSL to catch informations.

So, until here, we have just __described things__ (so we've stored information and knowledge in sentences - ok, imagine that we have ;) and we haven't defined yet any mean to interpret them and to make them useful.

So we need to define an "interpretation" engine which is called here a __pragmatics__ engine.

The cool fact is that, basically, as __sentences are always made of atoms__, we just need to provides implementation for our __atoms__, whatever the number of compounds words we have.

Let's define a simple engine that use sentences made with `my-dsl` to decorate an object (called `subject` below) : 
```javascript
// my-dsl-to-object-pragmatics.js
const myPragmas = {
	foo(subject, args /* foo's args received in sentence */){
		// do something on subject with args
		// ...
	},
	bar(subject, args /* bar's args received in sentence */){
		// do something on subject with args
		// ...
	},
	zoo(subject, args /* zoo's args received in sentence */){
		subject.zoo = {};
		if(args[0].__babelute__)
			this.$output(args[0], subject.zoo);
		else
			...
	},
	doo(subject, args /* doo's args received in sentence */){
		// do something on subject with args
		// ...
	},

	// by convention, the method's name used for interpretation start with a '$' 
	$output(babelute, subject = {}){
		babelute._lexems.forEach((lexem) => 
			lexem.lexicon === 'my-dsl' 
			&& this[lexem.name]
			&& this[lexem.name](subject, lexem.args) 
			// simple mapping between lexem's name and own methods
		);
		return subject;
	}
};

export default myPragmas;
```

```javascript
import lexicon from 'my-dsl-lexicon';
import myDSLToObject from 'my-dsl-to-object-pragmatics';

const h = lexicon.initializer(), 
	subject = {},
	sentence = h.goo('hello', 'world').boo(['one', 'two', 'three']);

myDSLToObject.$output(sentence, subject);
```

Straight forward...

Again, of course you are totally free to interpret sentences exactly as you want. There is no constraints. And you could imagine many differents output kind and usage (from simple Facade for manipulating objects states, to full Code Generation Tools). Imagination is the limit.


Finally, lets define a dialect of `my-dsl` :

```javascript
// my-dsl-dialect-lexicon.js
import myDSLLexicon from 'my-dsl-lexicon';

const myDialectLexicon = myDSLLexicon.createDialect('my-dsl-dialect');

myDialectLexicon.addCompounds((h) => ({
	myNewWord(...){
		return this.foo('...').goo(...);
	},
	myOtherNewWord(...){
		return this.boo('...').bar(...).doo();
	},
	...
}));

export default myDialectLexicon;
```
```javascript
import lexicon from 'my-dsl-dialect-lexicon';
const h = lexicon.initializer();
const mySentence = h.myOtherNewWord('hello', 'world')...;

...

// of course always usable with pragmatics that work with my-dsl

import myDSLToObject from 'my-dsl-to-object-pragmatics';

const decoratedObject = myDSLToObject.$output(mySentence);
```

Please read [Designing a DSL](https://github.com/nomocas/babelute/blob/master/manual/designing-dsl.md) for more infos.

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright 2016-2017 (c) Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
