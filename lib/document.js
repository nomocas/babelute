/**
 * A Babelute Document is a Babelute that you could edit. Think about a XML/HTML Document.
 * The aim is to allow full edition and construction of Babelute sentences.
 * (babelute node wrapping, insertBefore, prepend, query nodes, etc)
 * 
 * A BabeluteDocNode document, that holds others BabeluteDocNode as inner lexems, forms a Babelute Document.
 * A BabeluteDocNode is just a Bablute that keeps appended lexem at top logical level (that means there is absolutly no interpretation to logical atoms).
 * Every call on a BabeluteDocNode are just appended to lexems in object form (aka { name:myLexemName, args:[myArgs...] }).
 *
 * So it keeps things the more abstract possible. And needs an additional translation to itself (see docs).
 */

var Babelute = require('./babelute');

var BabeluteDocNode = function() {
	Babelute.call(this);
};

function lexicToFirstLevel(lexicName, lexic) {
	var out = {};
	Object.keys(lexic)
		.forEach(function(i) {
			out[i] = function() {
				return this._append(lexicName, i, [].slice.call(arguments));
			};
		});
	return out;
}

function getClass(lexicName, lexic) {
	var cache = lexic.__cache__ || {};
	return cache.FirstLevelClass = cache.FirstLevelClass || Babelute.extend(lexicName, lexicToFirstLevel(lexicName, lexic));
}

BabeluteDocNode.prototype = new Babelute();
var proto = {
	babelute: function(lexicName) {
		var lexic = Babelute.getLexic(lexicName),
			b = new getClass(lexicName, lexic)();
		b._lexems = this._lexems;
		this._append('babelute', [lexicName]);
		return b;
	}
};

for (var i in proto)
	BabeluteDocNode.prototype[i] = proto[i];

Babelute.docInitializer = BabeluteDocNode.initializer = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		cache = lexic.__cache__ = lexic.__cache__ || {};
	if (cache.FirstLevelInitializer)
		return cache.FirstLevelInitializer;
	var Cl = getClass(lexicName, lexic);
	return cache.FirstLevelInitializer = function() {
		return new Cl();
	};
};

Babelute.doc = function(lexicName) {
	if (lexicName)
		return BabeluteDocNode.initializer(lexicName)();
	return new BabeluteDocNode();
};

module.exports = BabeluteDocNode;
