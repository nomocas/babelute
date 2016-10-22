/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = require('../index');

Babelute
	.toLexic('aright', [
		'is',
		'has',
		'strict',
		'not',
		'switch',
		'required',
		'minLength',
		'maxLength',
		'minimum',
		'maximum',
		'format',
		'enum',
		'item',
		'equal',
		'instanceOf',
		'type',
		'array',
		'isArray',
		'null'
	])
	.toLexic('aright', {
		between: function(min, max) {
			return this.minimum(min).maximum(max);
		},
		isNull: function() {
			return this.equal(null);
		},
		or: function() {
			return this._append('aright', 'or', [].slice.call(arguments));
		},
		required: function(yes) {
			this._aright_required = !!yes;
			return this;
		},
		email: function() {
			return this.isString().format('email').minLength(6);
		}
	});

['object', 'string', 'func', 'bool', 'number', 'boolean']
.forEach(function(type) {
	Babelute.toLexic('aright', 'is' + type[0].toUpperCase() + type.substring(1), function() {
		return this.is(type);
	});
	Babelute.toLexic('aright', type, function(name, babelute) {
		return this.has(name, type, babelute);
	});
});

//______________________________________________________