var Babelute = require('./babelute');
Babelute.fromJSON = function(json) {
	return JSON.parse(json, function(k, v) {
		if (!v)
			return v;
		if (v.__babelutelexem__)
			return new Babelute.Lexem(v.lexic, v.name, v.args);
		if (v.__babelute__)
			return new Babelute(v._lexems);
		return v;
	});
};
module.exports = Babelute;