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
 * You could see it as an Abstract Syntax Tree of and Abstract Program that needs further interpretations. (Don't be afraid, it's highly practical and simple.) 
 *
 * You provide lexics (dictionaries) of related lexems that form an Internal (Abstract) DSL, you write sentences with them, and provide/use
 * different dictionaries of "actions" (lexems implementations) to outputing them in various situations and context.
 *
 * You could manipulate and write those babelutes as you want, translate them in and through other Internal Abstract DSLs, 
 * and produce any kind of output ou want by usings specifics "actions" dictionaries.
 *
 * It looks complex (because abstract) but at usage everything is smooth, clear and easy.
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
	/*****************************************************
	 * Babelute instance modification (meta-language API)
	 *****************************************************/
	// add lexem to babelute
	_append: function(lexicName, name, args) {
		this._lexems.push(new Lexem(lexicName, name, args));
		return this;
	},
	// conditional sentences concatenation
	_if: function(condition, babelute) {
		if (condition)
			this._lexems = this._lexems.concat(babelute._lexems);
		return this;
	},
	// use a babelute (concat its lexems to local ones)
	_use: function(babelute /* could be a string in "lexicName:methodName" format */ /*, ...args */ ) {
		if (!babelute)
			return this;
		var args = [].slice.call(arguments, 1);
		if (typeof babelute === 'string')
			Babelute.execMethod(this, babelute, args);
		if (babelute.__babelute__)
			this._lexems = this._lexems.concat(babelute._lexems);
		else // is function
			babelute(this._lexems, args);
		return this;
	},
	// execute provided function binded on current babelute, that will receive item and index as argument.
	_each: function(arr, func, self) {
		if (arr.__babelute__)
			arr._eachLexem(func, self || this);
		else
			arr.forEach(func, self || this);
		return this;
	},
	_eachLexem: function(func, self) {
		var lexems = this._lexems;
		for (var i = 0, len = lexems.length; i < len; ++i)
			func.call(self ||  this, lexems[i], i);
		return this;
	},
	/**********************************************************
	 ********************** DEFAULT LEXEMS ********************
	 **********************************************************/
	// conditional execution
	if: function(condition, babelute, elseBabelute) {
		return this._append(this.__babelute__, 'if', arguments);
	},
	// each output
	each: function(collection, callback) {
		return this._append(this.__babelute__, 'each', arguments);
	},
	// log action state
	log: function() {
		return this._append(this.__babelute__, 'log', arguments);
	},
	$on: function(actionsName, callback /* or Babelute */ ) {
		return this._append(actionsName, '$on', arguments);
	}
};

Lexem.prototype.log = function(title) {
	console.log(title || '', this.lexic, this.name, this.args);
};

module.exports = Babelute;

//