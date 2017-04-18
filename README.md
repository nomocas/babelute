# Babelute.js

> __42__ &asymp; _[ lexem( lexicon, name, arguments ), ... ]_

### Internal Domain Specific (Multi)Modeling js framework

[![Travis branch](https://img.shields.io/travis/nomocas/babelute/master.svg)](https://travis-ci.org/nomocas/babelute)
[![bitHound Overall Score](https://www.bithound.io/github/nomocas/babelute/badges/score.svg)](https://www.bithound.io/github/nomocas/babelute)
[![Coverage Status](https://coveralls.io/repos/github/nomocas/babelute/badge.svg?branch=master)](https://coveralls.io/github/nomocas/babelute?branch=master)
[![npm](https://img.shields.io/npm/v/babelute.svg)](https://www.npmjs.com/package/babelute)
[![npm-downloads](https://img.shields.io/npm/dm/babelute.svg)](https://npm-stat.com/charts.html?package=babelute)
[![licence](https://img.shields.io/npm/l/babelute.svg)](https://spdx.org/licenses/MIT)
[![dependecies](https://david-dm.org/nomocas/babelute.svg)](https://david-dm.org/)
[![dev-dependencies](https://img.shields.io/david/dev/nomocas/babelute.svg)](https://david-dm.org/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

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


## Core Libraries

- babelute (this lib)
- [babelute-uus](https://github.com/nomocas/babelute-uus) : Universal Unambiguous Sentences proposal : Welcome in Sharing Era.

## Understanding by examples

First of all, please read [Designing a DSL](https://github.com/nomocas/babelute/blob/master/manual/designing-dsl.md).

Then take a look to existing DSLs.

(work in progress)

Low Level DSLs (Developement related domains) :
- babelute-aright : Objects and types validation DSL (ultra-fast, ultra-modular) (realease in april 2017)
- babelute-lexicon-definition-language : Babelute Lexic Definition DSL and its generators. (realease in april 2017)
- [babelute-html-lexicon](https://github.com/nomocas/babelute-html-lexicon) : HTML5 DSL and its render engines. (modern, __one of the world's fastest__, one-way-binding templating (React philosophy))

High Level DSLs (Human related domains) :
- babelute-cooking : High Level Cooking DSL demo and its bunch of transformations and DSLs targets. (realease in april 2017)

## Theory background and development

(work in progress)

Theorical considerations are exposed [here](https://github.com/nomocas/babelute/blob/master/manual/theory.md).


## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright 2016-2017 (c) Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
