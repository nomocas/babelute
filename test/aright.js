/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 *
 */
if (typeof require !== 'undefined')
	var chai = require("./chai"),
		Babelute = require('../index'),
		aright = require("../languages/aright"),
		v = Babelute.initializer('aright');
else
	var v = aright.v;

var expect = chai.expect;

//________________ is* family

describe("is string success", function() {
	var result = v().isString().validate('abcdef'); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("is string fail", function() {
	var result = v().isString().validate(12); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("is number success", function() {
	var result = v().isNumber().validate(12); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("is number fail", function() {
	var result = v().isNumber().validate(true); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("is bool success", function() {
	var result = v().isBool().validate(true); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("is bool fail", function() {
	var result = v().isBool().validate(1); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("is func success", function() {
	var result = v().isFunction().validate(function() {}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("is func fail", function() {
	var result = v().isFunction().validate(1); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("isArray success", function() {
	var result = v().isArray().validate([]); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("isArray fail", function() {
	var result = v().isArray().validate({}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("isObject success", function() {
	var result = v().isObject().validate({}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("isObject fail", function() {
	var result = v().isObject().validate(true); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

//________________ properties family

describe("string success", function() {
	var result = v().string('test').validate({
		test: 'abcdef'
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("string fail", function() {
	var result = v().string('test').validate({
		test: 1
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("number success", function() {
	var result = v().number('test').validate({
		test: 1
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("number fail", function() {
	var result = v().number('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("bool success", function() {
	var result = v().bool('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("bool fail", function() {
	var result = v().bool('test').validate({
		test: 1
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("func success", function() {
	var result = v().func('test').validate({
		test: function() {}
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("func fail", function() {
	var result = v().func('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("array success", function() {
	var result = v().array('test').validate({
		test: []
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("array fail", function() {
	var result = v().array('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("object success", function() {
	var result = v().object('test').validate({
		test: {}
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("object fail", function() {
	var result = v().object('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("null success", function() {
	var result = v().null('test').validate({
		test: null
	}); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});
describe("null fail", function() {
	var result = v().null('test').validate({
		test: true
	}); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

//_______________________________ CONSTRAINTS

describe("enumerable fail", function() {
	var result = v().enumerable(['bloupi', 'foo']).validate('bloup');
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("enumerable success", function() {
	var result = v().enumerable(['bloupi', 'foo']).validate('bloupi');
	it("should", function() {
		expect(result).to.equals(true);
	});
});


describe("max fail", function() {
	var result = v().maximum(3).validate(4);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("max success", function() {
	var result = v().maximum(3).validate(2);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("min fail", function() {
	var result = v().minimum(3).validate(2);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("min success", function() {
	var result = v().minimum(3).validate(4);
	it("should", function() {
		expect(result).to.equals(true);
	});
});


describe("maxLength fail", function() {
	var result = v().maxLength(3).validate('abcd');
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("maxLength success", function() {
	var result = v().maxLength(3).validate('ab');
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("minLength fail", function() {
	var result = v().minLength(3).validate('ab');
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("minLength success", function() {
	var result = v().minLength(3).validate('abc');
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("equal fail", function() {
	var result = v().equal(3).validate(2);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("equal success", function() {
	var result = v().equal(3).validate(3);
	it("should", function() {
		expect(result).to.equals(true);
	});
});


describe("required fail", function() {
	var result = v().required().validate(undefined);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("required success", function() {
	var result = v().required().validate(3);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

//_____________________ format

describe("email fail", function() {
	var result = aright.rules.email.validate('abcdef');
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("email success", function() {
	var result = aright.rules.email.validate('john@doe.com');
	it("should", function() {
		expect(result).to.equals(true);
	});
});

//_______________________ OR

describe("or success", function() {
	var rule = v().or(v().isString(), v().isNumber()),
		result = rule.validate('john@doe.com') && rule.validate(1);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("or fail", function() {
	var rule = v().or(v().isString(), v().isNumber()),
		result = rule.validate([]);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});
//_______________________ NOT

describe("not success", function() {
	var rule = v().not(v().isString(), v().isNumber()),
		result = rule.validate([]) && rule.validate(true);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("not fail", function() {
	var rule = v().not(v().isString(), v().isNumber()),
		result = rule.validate('bloupi');
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

//_______________________ SWITCH

describe("switch string", function() {
	var rule = v()
		.switch('type', {
			'string': v().string('type').string('foo'),
			'number': v().string('type').number('foo')
		})
		.strict(false),
		result = rule.validate({
			type: 'string',
			foo: 'bar'
		});
	console.log('switch string : ', result.map);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("switch number fail", function() {
	var rule = v().switch('type', {
			'string': v().string('type').string('foo'),
			'number': v().string('type').number('foo')
		}),
		result = rule.validate({
			type: 'number',
			foo: 'bar'
		});
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

//_____________________ types

describe("type success", function() {
	var rule = v().type('string', 'number'),
		result = rule.validate('abc') && rule.validate(1);
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("type fail", function() {
	var rule = v().type('string', 'number'),
		result = rule.validate([]) && rule.validate(false);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

//_____________________ types

describe("instanceOf success", function() {
	var rule = v().instanceOf(Date),
		result = rule.validate(new Date());
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("instanceOf fail", function() {
	var rule = v().instanceOf(Date),
		result = rule.validate(true);
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});


// ____________________ full rules

describe("string + format + minLength", function() {
	var result = v().isString().format(/abc/).minLength(6).validate('abcdef'); // return true
	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("string + format + maxLength fail", function() {
	var result = v().isString().format(/abc/).maxLength(6).validate('abcdefgh'); // return true
	it("should", function() {
		expect(result).to.not.equals(true);
	});
});

describe("full rule", function() {
	var rule = v()
		.isObject()
		.string('email', v().format('email').required(false))
		.number('index', v().equal(24))
		.bool('flag')
		.array('collection',
			v().item(
				v().isString()
			)
		)
		.object('child',
			v().string('title')
		)
		.bool('test');

	var result = rule.validate({
		email: 'aaa@bbb.com',
		index: 24,
		flag: true,
		collection: ['hello'],
		child: {
			title: 'hello'
		},
		test: true
	});

	it("should", function() {
		expect(result).to.equals(true);
	});
});

describe("full rule fail with report check", function() {
	var rule = v()
		.isObject()
		.string('email', v().format('email').required(false))
		.number('index', v().equal(24))
		.bool('flag')
		.array('collection',
			v().item(
				v().isString()
			)
		)
		.object('child',
			v().string('title')
		)
		.bool('test');

	var result = rule.validate({
		email: 'aaa@bbb',
		index: 1,
		flag: 'hello',
		collection: [1],
		child: null,
		test: 3
	});

	it("should", function() {
		expect(result).to.deep.equals({
			"valid": false,
			"map": {
				"email": {
					"value": "aaa@bbb",
					"errors": [
						"format failed"
					]
				},
				"index": {
					"value": 1,
					"errors": [
						"equality failed (should be : 24)"
					]
				},
				"flag": {
					"value": "hello",
					"errors": [
						"should be a boolean"
					]
				},
				"collection.0": {
					"value": 1,
					"errors": [
						"should be a string"
					]
				},
				"child.title": {
					"value": null,
					"errors": [
						"missing property"
					]
				},
				"test": {
					"value": 3,
					"errors": [
						"should be a boolean"
					]
				}
			},
			"value": {
				"email": "aaa@bbb",
				"index": 1,
				"flag": "hello",
				"collection": [
					1
				],
				"child": null,
				"test": 3
			}
		});
	});
});