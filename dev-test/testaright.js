var Babelute = require('./index');
require('./languages/aright');
require('./languages/actions/aright-to-validation');

var v = Babelute.initializer('aright');


var rule = v.isString();
console.log('sentence', rule._stringify());

var result = rule.$validate('abcdef'); // return true
console.log('res  ', result);

var result = rule.$validate(1); // return true
console.log('res 2 ', JSON.stringify(result));


var result = v.string('test').$validate({
	test: 'abcdef'
});
console.log('res  ', result);


var result = v.array('test').$validate({
	test: []
}); // return true
console.log('res  ', result);



var result = v.array('test').$validate({
	test: true
}); // return true
console.log('res  ', result);


var rule = v.isString().minLength(4).maxLength(10).minLength(4).maxLength(10).isString().minLength(4).maxLength(10).minLength(4).maxLength(10);
console.time('simple-validation');
for (var i = 0, len = 100000; i < len; ++i)
	rule.$validate('abcdef');
console.timeEnd('simple-validation');

function test(value) {
	return (typeof value === 'string') && (value.length >= 4) && (value.length <= 10) && (value.length >= 4) && (value.length <= 10) && (typeof value === 'string') && (value.length >= 4) && (value.length <= 10) && (value.length >= 4) && (value.length <= 10);
}

console.time('func-validation');
for (var i = 0, len = 100000; i < len; ++i)
	test('abcdef');
console.timeEnd('func-validation');