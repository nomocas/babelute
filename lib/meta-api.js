/*****************************************************
 * Babelute instances modification API (meta-language API)
 *
 * Absolutly optional
 *****************************************************/

var proto = require('./babelute').prototype;

// conditional sentences concatenation
proto._if = function(condition, babelute) {
	if (condition)
		this._lexems = this._lexems.concat(babelute._lexems);
	return this;
};
// meta each : modify babelute sentence directly. provided function should return a babelute.
proto._each = function(arr, func) {
	var self = this;
	arr.forEach(function(item, index) {
		self._use(func(item, index));
	});
	return this;
};
// iterate over babelute's lexems and execute provided function as a .forEach(function(item, index){})
proto._eachLexem = function(func, self) {
	var lexems = this._lexems;
	for (var i = 0, len = lexems.length; i < len; ++i)
		func.call(self ||  this, lexems[i], i);
	return this;
};