/**  
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

var elenpi = require('elenpi/v2'),
	r = elenpi.r,
	Parser = elenpi.Parser,
	Babelute = require('./babelute'),
	rules = {
		//_____________________________________
		babelute: r()
			.space()
			.zeroOrMore({
				rule: 'lexem',
				separator: r().terminal(/^\s*/),
				pushTo: function(env, parent, obj) {
					if (obj.lexic) { // 'scoped' lexic management
						if (parent._popLexic) // we have already push something before (aka second (or more) lexic change on same babelute)
							env.lexics[env.lexics.length - 1] = env.lexic;
						else
							env.lexics.push(obj.lexic); // push lexic to scope
						env.currentLexic = obj.lexic;
						parent._popLexic = true;

						// add current lexic to current babelute
						var lexic = Babelute.getLexic(obj.lexic);
						for (var i in lexic)
							parent[i] = lexic[i];
						parent.__babelute__ = obj.lexic;

					} else if (env.asDoc) // top level lexem
						parent._append(obj.name, obj.args);
					else { // use current babelute lexic
						if (!parent[obj.name])
							throw new Error('Babelute : no lexem found in current lexic (' + (env.currentLexic || 'default') + ') with :' + obj.name);
						parent[obj.name].apply(parent, obj.args);
					}
				}
			})
			.done(function(env, babelute, string) {
				if (babelute._popLexic) { // 'scoped' lexic management
					// one lexic has been pushed from this babelute
					// so pop to parent lexic
					env.lexics.pop();
					env.currentLexic = env.lexics[env.lexics.length - 1];
				}
				return string;
			})
			.space(),

		lexem: r().oneOf(
			// lexic selector
			r().terminal(/^([\w-_]+):/, function(env, obj, string, cap) { // lexic name + ':'
				obj.lexic = cap[1];
				return string;
			}),

			// lexem (aka: name(arg1, arg2, ...))
			r().terminal(/^([\w-_]+)\s*\(\s*/, function(env, obj, string, cap) { // lexem name + ' ( '
				obj.name = cap[1];
				obj.args = [];
				return string;
			})
			.zeroOrMore({ // arguments
				rule: 'value',
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.args.push(obj.value);
				}
			})
			.terminal(/^\s*\)/) // end parenthesis
		),

		value: r().oneOf(
			// integer
			r().terminal(/^[0-9]+/, function(env, obj, string, cap) {
				obj.value = parseInt(cap[0], 10);
				return string;
			}),
			// float
			r().terminal(/^[0-9]*\.[0-9]+/, function(env, obj, string, cap) {
				obj.value = parseFloat(cap[0], 10);
				return string;
			}),
			// 'singlestring'
			r().terminal(/^'([^']*)'/, function(env, obj, string, cap) {
				obj.value = cap[1];
				return string;
			}),
			// "doublestring"
			r().terminal(/^"([^"]*)"/, function(env, obj, string, cap) {
				obj.value = cap[1];
				return string;
			}),
			// true|false|null|undefined|NaN|Infinity
			r().terminal(/^(true|false|null|undefined|NaN|Infinity)/, function(env, obj, string, cap) {
				switch (cap[1]) {
					case 'true':
						obj.value = true;
						break;
					case 'false':
						obj.value = false;
						break;
					case 'null':
						obj.value = null;
						break;
					case 'undefined':
						obj.value = undefined;
						break;
					case 'NaN':
						obj.value = NaN;
						break;
					case 'Infinity':
						obj.value = Infinity;
						break;
				}
				return string;
			}),
			// object
			r().one({
				rule: 'object',
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			}),
			// array
			r().one({
				rule: 'array',
				as: function() {
					return [];
				},
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			}),
			// function
			r().one({
				rule: 'function',
				set: function(env, parent, obj) {
					if (env.acceptFunctions) // todo : add warning when not allowed but present
						parent.value = Function.apply(null, obj.args.concat(obj.block));
				}
			}),
			// babelute
			r().one({
				rule: 'babelute',
				as: function(env, descriptor) {
					return Babelute.b(env.currentLexic);
				},
				set: function(env, parent, obj) {
					parent.value = obj;
				}
			})
		),

		object: r()
			.terminal(/^\{\s*/) // start bracket
			.zeroOrMore({ // properties
				rule: r()
					// key
					.terminal(/^([\w-_]+)|"([^"]*)"|'([^']*)'/, function(env, obj, string, cap) {
						obj.key = cap[1];
						return string;
					})
					.terminal(/^\s*:\s*/)
					// value
					.one('value'),
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent[obj.key] = obj.value;
				}
			})
			.terminal(/^\s*\}/), // end bracket

		array: r()
			.terminal(/^\[\s*/) // start square bracket
			.zeroOrMore({ // items
				rule: 'value',
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.push(obj.value);
				}
			})
			.terminal(/^\s*\]/), // end square bracket

		'function': r()
			.terminal(/^function\s*\(\s*/, function(env, obj, string, cap) {
				obj.args = [];
				obj.block = '';
				return string;
			})
			.zeroOrMore({ // arguments key
				rule: r().terminal(/^[\w-_]+/, 'key'),
				separator: r().terminal(/^\s*,\s*/),
				pushTo: function(env, parent, obj) {
					parent.args.push(obj.key);
				}
			})
			.terminal(/^\s*\)\s*\{/)
			.one('scopeBlock')
			.done(function(env, obj, string) {
				// remove last uneeded '}' in catched block (it's there for inner-blocks recursion)
				obj.block = obj.block.substring(0, obj.block.length - 1);
				return string;
			}),

		scopeBlock: r() // function scope block (after first '{')
			.oneOf(
				// inner block recursion
				r().terminal(/^[^\{\}]*\{/, function(env, obj, string, cap) {
					obj.block += cap[0];
					return string;
				})
				.oneOrMore('scopeBlock'),

				// end block 
				r().terminal(/^[^\}]*\}/, function(env, obj, string, cap) {
					obj.block += cap[0];
					return string;
				})
			)
	};

var parser = new Parser(rules, 'babelute'),
	templateCache = {};

Babelute.parse = function(string, opt) {
	opt = opt ||  {};
	var env = {};
	for (var i in opt)
		env[i] = opt[i];
	env.lexics = [opt.mainLexic];
	env.currentLexic = opt.mainLexic;
	return templateCache[string] = parser.parse(string, 'babelute', Babelute.b(opt.mainLexic), env);
}

module.exports = parser;

/*
console.log(y.expression.parseTemplate("click ( '12', 14, true, p(2, 4, span( false).p())). div(12345)"));
 */
