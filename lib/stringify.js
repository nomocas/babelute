/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

/********************************************************************
 * Stringify Babelute to serialised form (aka Babelute DSL)
 ********************************************************************/

var Babelute = require('./babelute');

function valueToString(val, tab) {
	if (val && val.__babelute__)
		return val.stringify(tab + 1);
	switch (typeof val) {
		case 'function':
			return String(val);
		case 'object':
			if (!val)
				return val;
			if (val.forEach)
				return '[' + arrayToString(val, tab + 1) + ']';
			return objectToString(val, tab + 1);
		case 'string':
			return JSON.stringify(val); // adds quotes and escapes content
		default:
			return val;
	}
}

function arrayToString(arr, tab) {
	if (!arr.length)
		return '';
	// remove lasts undefined
	var index = arr.length,
		out = '';
	while (index && arr[index - 1] === undefined)
		index--;
	if (index < arr.length)
		arr.splice(index, arr.length - index);
	// map output
	for (var i = 0, len = arr.length; i < len; ++i)
		out += (i ? ', ' : '') + valueToString(arr[i], 0);
	return out;
}

function objectToString(obj, tab) {
	var keys = Object.keys(obj),
		out = '',
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out += (i ? ',\n\t' : '') + key + ': ' + valueToString(obj[key], 0);
	}
	return '{\n\t' + out + '\n}';
}

// serialised bablute string outputs
Babelute.prototype.toString = function() {
	return this.stringify(0);
};

Babelute.prototype.stringify = function(tab) {
	var lexems = this._lexems,
		out = '',
		item;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		out += (i ? '\n' : '') + (item.babeluteString ? item.babeluteString() : (item.name ? item.name + '(' + (item.args ? arrayToString(item.args, tab + 1) : '') + ')' : ''));
	}
	return out;
};

Babelute.arrayToString = arrayToString;
Babelute.objectToString = objectToString;
Babelute.valueToString = valueToString;
