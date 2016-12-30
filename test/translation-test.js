if (typeof require !== 'undefined') {
	var chai = require("./chai"),
		Babelute = require('../index');
	require('./test-dsl');
}

var expect = chai.expect;
var hd = Babelute.firstDegreeInitializer('babelute-test');

describe("simple _translation", function() {
	var babelute = hd
		// .what('Whow')
		.today(hd.now());

	var result = babelute._translation('babelute-test').$output('babelute-test:object', {})

	it("should", function() {
		expect(result).to.deep.equal({
			futurIs: {
				date: 'now'
			}
		});
	});
});