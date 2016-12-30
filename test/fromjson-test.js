/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if (typeof require !== 'undefined') {
	var chai = require("./chai"),
		Babelute = require('../index');
	require('./test-dsl');
	require('../lib/from-json');
}

var expect = chai.expect;
var h = Babelute.initializer('babelute-test');

//________________ is* family

describe("fromjson() from babelute", function() {
	var babelute = h
		// .what('Whow')
		.today(h.now());

	var r1 = babelute.$output('babelute-test:object', {});
	var result = Babelute.fromJSON(JSON.stringify(babelute)).$output('babelute-test:object', {});

	it("should", function() {
		expect(r1).to.deep.equal({
			futurIs: {
				date: 'now'
			}
		});
		expect(result).to.deep.equal(r1);
	});
});