/*
 * @Author: Gilles Coomans
 * @Date:   2017-05-29 23:11:20
 * @Last Modified by:   Gilles Coomans
 * @Last Modified time: 2017-06-03 18:07:26
 */

'use strict';
const Benchmark = require('benchmark');

function extractInfos(bench) {
	const infos = {
		name: bench.name,
		id: bench.id,
		runs: bench.stats.sample.length
	};
	if(bench.error)
		return Object.assign(infos, { error:bench.error });
	return Object.assign(infos, {
		hz: Math.floor(bench.hz),
		formatedHZ: Benchmark.formatNumber(bench.hz.toFixed(bench.hz < 100 ? 2 : 0)),
		precision: bench.stats.rme.toFixed(2),
		op: Math.round(1/bench.hz * Math.pow(10, 9)),
		memory: process.memoryUsage()
	});
}

function resultsToMarkdownTable(results){
	return '| name | ops/sec | precision (%) | runs | coef | ns/op |\n' 
		+  '|------|---------|---------------|------|------|-------|\n'
		+  results.map(bench => tableRow(bench)).join('\n');
}

function tableRow(bench){
	return `| ${ bench.name } | ${ bench.formatedHZ } | ${ bench.precision } | ${ bench.runs } | ${ bench.coef } | ${ bench.op } |`;
}

module.exports = {
	extractInfos,
	resultsToMarkdownTable
};
