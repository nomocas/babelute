/**
 * A FirstLevelNode is just a Bablute that keeps any appended lexem at top logical level (that means that any compounded lexem (made with other lexems) is added as an atomic lexem).
 * 
 * A Babelute Document is a Babelute that you could edit. Think about a XML/HTML Document.
 * The aim is to allow full edition and construction of Babelute sentences.
 * (babelute node wrapping, insertBefore, prepend, query nodes, etc)
 * 
 * A FirstLevelNode document, that holds others FirstLevelNode as inner lexems, forms a valid babelute.
 * Every call on a FirstLevelNode are just appended to lexems in object form (aka { name:myLexemName, args:[myArgs...] }).
 *
 * So it keeps things the more abstract possible. 
 * 
 * To became $outputable : it needs an additional translation to itself (see docs).
 */

var Babelute = require('./babelute');

var FirstLevelNode = function() {
	Babelute.call(this);
};

FirstLevelNode.prototype = new Babelute();
FirstLevelNode.prototype.babelute = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName),
		Cl = lexic.FirstLevelCl,
		b = new Cl();
	b._lexems = this._lexems;
	return b;
};

Babelute.firstLevelInitializer = FirstLevelNode.initializer = function(lexicName) {
	var Cl = Babelute.getLexic(lexicName).FirstLevelCl;
	return lexic.FirstLevelInitializer || (lexic.FirstLevelInitializer = function() {
		return new Cl();
	});
};

Babelute.firstLevel = function(lexicName) {
	if (lexicName)
		return FirstLevelNode.initializer(lexicName)();
	return new FirstLevelNode();
};

module.exports = FirstLevelNode;