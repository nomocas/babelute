/*
 * @Author: Gilles Coomans
 * @Date:   2017-05-27 09:48:34
 * @Last Modified by:   Gilles Coomans
 * @Last Modified time: 2017-06-01 11:55:09
 */
/* eslint no-console:0 */
'use strict';
const Benchmark = require('benchmark');

import {
	extractInfos,
	resultsToMarkdownTable
} from './extract-benchmark-infos';


import {
	constanteVanilla,
	immediateObjectVanilla,
	vanillaByStep,
	functionalSplittedVanilla,
	functionalPipedVanilla
} from './vanilla';


import {
	japi,
	jali,
	createSentence,
	createFFPPage,
	createFFPPipedPage
	// facadePragmasSplittedPage
} from './babelute-facade-pragmatics';

// const pipe = newPragmas.pipe;

const model = {
		name: 'foo'
	},
	data = [{ id: 'foo1', title: 'hello' }, { id: 'foo2', title: 'world' }],
	query = {
		fields: ['title']
	},
	pageInfos = {
		totalPages: 13,
		self: 3
	};

const sentence = createSentence(model, data, query, pageInfos);
const functionalFFPPage = createFFPPage(model, data, query, pageInfos);
const functionalFFPPipedPage = createFFPPipedPage(model, data, query, pageInfos);
const functionalPipedVanillaPage = functionalPipedVanilla.page(model, data, query, pageInfos);

function updatePageInfos(pageInfos) {
	pageInfos.self = Math.round(Math.random() * 100);
	pageInfos.totalPages = Math.round(Math.random() * 100);
}

var suite = new Benchmark.Suite;
var benchData = [];
// add tests
suite
	.add('jsonapi FP initializer', function() {
		updatePageInfos(pageInfos)
		japi({}).page(model, data, query, pageInfos);
	})
	.add('jsonapi Lexicon toObject (with rebuild)', function() {
		updatePageInfos(pageInfos)
		jali.page(model, data, query, pageInfos).$toObject({});
	})
	.add('jsonapi Lexicon toObject (no rebuild)', function() {
		updatePageInfos(pageInfos)
		sentence.$toObject({});
	})
	.add('jsonapi Lexicon toFunction()({}) (so rebuild)', function() {
		updatePageInfos(pageInfos)
		jali.page(model, data, query, pageInfos).$toFunction()({});
	})
	.add('jsonapi FFP piped (with rebuild)', function() {
		updatePageInfos(pageInfos)
		createFFPPipedPage(model, data, query, pageInfos)({});
	})
	.add('jsonapi FFP piped (no rebuild)', function() {
		updatePageInfos(pageInfos)
		functionalFFPPipedPage({});
	})
	.add('jsonapi FFP (with rebuild)', function() {
		updatePageInfos(pageInfos)
		createFFPPage(model, data, query, pageInfos)({});
	})
	.add('jsonapi FFP (no rebuild)', function() {
		updatePageInfos(pageInfos)
		functionalFFPPage({});
	})
	.add('vanilla:functional-splitted', function() {
		updatePageInfos(pageInfos)
		functionalSplittedVanilla.page({}, model, data, query, pageInfos);
	})
	.add('vanilla:functional-piped (with rebuild)', function() {
		updatePageInfos(pageInfos)
		functionalPipedVanilla.page(model, data, query, pageInfos)({});
	})
	.add('vanilla:functional-piped (no rebuild)', function() {
		updatePageInfos(pageInfos)
		functionalPipedVanillaPage({});
	})
	.add('vanilla:bystep', function() {
		updatePageInfos(pageInfos)
		vanillaByStep(model, data, query, pageInfos);
	})
	.add('vanilla:constante', function() {
		updatePageInfos(pageInfos)
		constanteVanilla(model, data, query, pageInfos);
	})
	// .add('vanilla:immediate2', function() {
	// 	updatePageInfos(pageInfos);
	// 	immediateVanilla2(model, data, query, pageInfos);
	// })
	.add('vanilla:immediate object', function() {
		updatePageInfos(pageInfos);
		immediateObjectVanilla(model, data, query, pageInfos);
	})
	// add listeners
	.on('cycle', function(event) {
		console.log(String(event.target));
		benchData.push(extractInfos(event.target));
		global.gc();
	})
	.on('complete', function() {
		console.log('\nFastest is ', this.filter('fastest').map('name'));

		benchData
			.sort((a, b) => {
				return b.hz - a.hz;
			});

		const first = benchData[0];

		benchData.forEach((b) => {
			b.coef = (b.hz / first.hz).toFixed(2);
		});

		console.log(resultsToMarkdownTable(benchData));
	})
	// run async
	.run({ 'async': true });

