/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

/********************************************************************
 * Stringify Babelute to serialised form (aka Babelute DSL)
 ********************************************************************/

var Babelute = require('./babelute');

function beautyArray(arr, opt) {
	var v, addReturn;
	v = arrayToString(arr, opt);
	addReturn = (arr.length > 1 && v.length > opt.maxLength);
	if (addReturn)
		return '[\n\t' + v.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n]';
	return '[' + v + ']';
}

function beautyObject(obj, opt) {
	var v, addReturn;
	var keys = Object.keys(obj);
	v = propertiesToString(obj, keys, opt);
	if (keys.length > 1 && v.length > opt.maxLength) { // add returns
		return '{\n\t' + v.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n}';
	}
	return '{ ' + v + ' }';
}

function beautyArrayValues(arr, opt) {
	var len = arr.length;
	if (!len)
		return '';
	var out,
		values = [],
		outlength = 0;
	for (var i = 0; i < len; ++i) {
		out = valueToString(arr[i], opt);
		values.push(out);
		outlength += out.length;
	}
	outlength += len - 1;
	return values.join((outlength > opt.maxLength) ? ',\n' : ',');
}

function beautyLexems(lexems, opt) {
	var lexemsOutput = [],
		outlength = 0,
		item,
		args,
		v;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		if (item.babeluteString)
			item = item.babeluteString();

		if (item.args) {
			args = beautyArrayValues(removeLastUndefined(item.args), opt);
			// add returns
			if ((item.args.length > 1 || (item.args[0] && item.args[0].__babelute__)) && args.length > opt.maxLength)
				v = item.name + '(\n\t' + args.replace(/\n/g, function(s) {
					return s + '\t';
				}) + '\n)';
			else
				v = item.name + '(' + args + ')';
		} else
			v = item.name + '()';

		lexemsOutput.push(v);
		outlength += v.length;
	}
	outlength += lexems.length - 1;
	return lexemsOutput.join((outlength > opt.maxLength) ? '\n' : '');
}

function valueToString(val, opt) {
	if (!val)
		return val + '';
	switch (typeof val) {
		case 'object':
			if (val.__babelute__)
				return val.stringify(opt);
			if (val.forEach)
				return (opt.beautify) ? beautyArray(val, opt) : '[' + arrayToString(val, opt) + ']';
			return (opt.beautify) ? beautyObject(val, opt) : objectToString(val, opt);
		case 'string':
			// return '"' + val.replace(/"/g, '\\"') + '"'; // adds quotes and escapes content
			return JSON.stringify(val); // adds quotes and escapes content
		default:
			return val + '';
	}
}

function removeLastUndefined(arr) {
	var index = arr.length,
		len = index;
	while (index && arr[index - 1] === undefined)
		index--;
	if (index < len)
		arr.splice(index, len - index);
	return arr;
}

function arrayToString(arr, opt) {
	if (!arr.length)
		return '';
	// map output
	if (opt.beautify)
		return beautyArrayValues(arr, opt);
	var out = '';
	for (var i = 0, len = arr.length; i < len; ++i)
		out += (i ? ',' : '') + valueToString(arr[i], opt);
	return out;
}

function objectToString(obj, opt) {
	var keys = Object.keys(obj),
		out = '',
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out += (i ? ',' : '') + key + ':' + valueToString(obj[key], opt);
	}
	return '{' + out + '}';
}

function propertiesToString(obj, keys, opt) {
	var out,
		values = [],
		outlength = 0,
		key;
	for (var i = 0, len = keys.length; i < len; ++i) {
		key = keys[i];
		out = valueToString(obj[key], opt);
		outlength += out.length;
		values.push(key + ': ' + out);
	}
	outlength += keys.length - 1;
	return (outlength > opt.maxLength) ? values.join(',\n') : values.join(',');
}

Babelute.prototype.toString = function() {
	return this.stringify();
};

Babelute.prototype.stringify = function(opt) {
	opt = opt ||  {};
	if (opt.beautify)
		return beautyLexems(this._lexems, opt);

	var lexems = this._lexems,
		out = '',
		item;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		if (item.babeluteString)
			item = item.babeluteString();
		out += item.name + '(' + (item.args ? arrayToString(removeLastUndefined(item.args), opt) : '') + ')';
	}
	return out;
};

Babelute.arrayToString = arrayToString;
Babelute.objectToString = objectToString;
Babelute.valueToString = valueToString;
