/**
 * Babelute core Class and statics functions.
 *
 * A babelute is just a sentences (a chain of lexems with argument(s)) 
 * written with method chaining, (aka foo(1, true).bar('zoo', goo().foo()) )
 * and where lexems (each call - aka .myLexem(arg1, ...)) 
 * are simply kept in an array for further interpretations, 
 * in following object format : { lexic:'...', name:'...', args:[...] }.
 *
 * Absolutly nothing more.
 *
 * The Babelute Class is just the main helper for writing and holding babelute sentences. 
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = function(lexems) {
		this.__babelute__ = 'default'; // current lexic
		this._lexems = lexems || [];
	},
	Lexem = Babelute.Lexem = function(lexic, name, args) {
		this.__babelutelexem__ = true;
		this.lexic = lexic;
		this.name = name;
		this.args = args;
	};

Babelute.prototype = {
	// add lexem to babelute
	_append: function(lexicName, name, args) {
		this._lexems.push(new Lexem(lexicName, name, args));
		return this;
	},
	/**********************************************************
	 ********************** DEFAULT LEXEMS ********************
	 **********************************************************/
	// conditional execution
	if: function(condition, babelute, elseBabelute) {
		return this._append('default', 'if', arguments);
	},
	// each output
	each: function(collection, callback) {
		return this._append('default', 'each', arguments);
	}
};

Lexem.prototype.log = function(title) {
	console.log(title || '', this.lexic, this.name, this.args);
};

module.exports = Babelute;

//