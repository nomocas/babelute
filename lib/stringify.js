/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

/********************************************************************
 ********************************************************************
 * Stringify Babelute to serialised form (beautified or minified)
 ********************************************************************
 ********************************************************************/

var Babelute = require('./babelute');

// utils
function pushLexicScope(opt, lexic, alreadyPushed) {
	if (alreadyPushed)
		opt.lexicScope[opt.lexicScope.length - 1] = lexic;
	else
		opt.lexicScope.push(lexic);
	opt.currentLexic = lexic;
	return true;
}

function popLexicScope(opt) {
	opt.lexicScope.pop();
	opt.currentLexic = opt.lexicScope[opt.lexicScope.length - 1];
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

/********************************************************************
 ********** beautyfy
 ********************************************************************/

function beautyLexems(lexems, opt) {
	var lexemsOutput = [],
		outlength = 0,
		item,
		args,
		lexicPushed = false,
		out;
	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		// if (item.toStringify)
		// item = item.toStringify();
		if (item.lexic !== opt.currentLexic) {
			out = '#' + item.lexic + ':';
			lexemsOutput.push(out);
			lexicPushed = pushLexicScope(opt, item.lexic, lexicPushed);
		}
		if (item.args) {
			args = beautyArrayValues(removeLastUndefined(item.args), opt);
			// add returns
			if ((item.args.length > 1 || (item.args[0] && item.args[0].__babelute__)) && args.length > opt.maxLength)
				out = item.name + '(\n\t' + args.replace(/\n/g, function(s) {
					return s + '\t';
				}) + '\n)';
			else
				out = item.name + '(' + args + ')';
		} else
			out = item.name + '()';

		lexemsOutput.push(out);
		outlength += out.length;
	}
	if (lexicPushed)
		popLexicScope(opt);
	outlength += lexems.length - 1;
	return lexemsOutput.join((outlength > opt.maxLength) ? '\n' : ' ');
}

function beautyArray(arr, opt) {
	var out, addReturn, len = arr.length;
	if (!len)
		return '[]';
	out = beautyArrayValues(arr, opt);
	addReturn = (len > 1 && out.length > opt.maxLength);
	if (addReturn)
		return '[\n\t' + out.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n]';
	return '[' + out + ']';
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
	return values.join((outlength > opt.maxLength) ? ',\n' : ', ');
}

function beautyObject(obj, opt) {
	var out, addReturn;
	var keys = Object.keys(obj);
	out = beautyProperties(obj, keys, opt);
	if (keys.length > 1 && out.length > opt.maxLength) { // add returns
		return '{\n\t' + out.replace(/\n/g, function(s) {
			return s + '\t';
		}) + '\n}';
	}
	return '{ ' + out + ' }';
}

function beautyProperties(obj, keys, opt) {
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
	return (outlength > opt.maxLength) ? values.join(',\n') : values.join(', ');
}


/********************************************************************
 ********** minify
 ********************************************************************/

function valueToString(val, opt) {
	if (!val)
		return val + '';
	switch (typeof val) {
		case 'object':
			if (val.__babelute__)
				return val._stringify(opt);
			if (val.forEach)
				return (opt.beautify) ? beautyArray(val, opt) : '[' + arrayToString(val, opt) + ']';
			return (opt.beautify) ? beautyObject(val, opt) : objectToString(val, opt);
		case 'string':
			// return '"' + val.replace(/"/g, '\\"') + '"'; // adds quotes and escapes content
			return JSON.stringify(val); // adds quotes and escapes content
		case 'function':
			var out = (val + '').replace(/anonymous/, '').replace(/\n\/\*\*\//, '');
			return opt.beautify ? out : out.replace(/`[^`]*`|\n\s*/g, function(val) {
				return val[0] === "`" ? val : ' ';
			});
		default:
			return val + '';
	}
}

function arrayToString(arr, opt) {
	if (!arr.length)
		return '';
	// map output
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

/********************************************************************
 ********** end minify
 ********************************************************************/

Babelute.prototype.toString = function() {
	return this._stringify();
};

Babelute.prototype._stringify = function(opt) {

	opt = opt ||  {};
	opt.lexicScope = opt.lexicScope || [];

	if (opt.beautify) {
		opt.maxLength = opt.maxLength || 20;
		return beautyLexems(this._lexems, opt);
	}

	// else minifiy lexems
	var lexems = this._lexems,
		out = '',
		item,
		lexicPushed = false;

	for (var i = 0, len = lexems.length; i < len; ++i) {
		item = lexems[i];
		if (item.lexic !== opt.currentLexic) {
			out += '#' + item.lexic + ':';
			lexicPushed = pushLexicScope(opt, item.lexic, lexicPushed);
		}
		out += item.name + '(' + (item.args ? arrayToString(removeLastUndefined(item.args), opt) : '') + ')';
	}

	if (lexicPushed)
		popLexicScope(opt);

	return out;
};

Babelute.arrayToString = arrayToString;
Babelute.objectToString = objectToString;
Babelute.valueToString = valueToString;