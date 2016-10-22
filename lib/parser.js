/**  
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 */

function getMethod(parent, name) {
	var method = parent[name];
	if (!method)
		throw new Error('Babelute : no lexem found in current lexic (' + (parent.__babelute__ || 'default') + ') with :' + name);
	return method;
}

var elenpi = require('elenpi/v2'),
	r = elenpi.r,
	Parser = elenpi.Parser,
	Babelute = require('./babelute'),
	replaceSingleString = /\\'/g,
	replaceDoubleString = /\\"/g,
	// grammar shortcut map (1 char previsu) for values
	valuePrevisuMap = {
		'1': 'number',
		'2': 'number',
		'3': 'number',
		'4': 'number',
		'5': 'number',
		'6': 'number',
		'7': 'number',
		'8': 'number',
		'9': 'number',
		'0': 'number',
		"'": 'singlestring',
		'"': 'doublestring',
		'{': 'object',
		'[': 'array'
	},
	rules = {
		//_____________________________________
		babelute: r()
			.space()
			.oneOrMore({
				rule: 'lexem',
				separator: r().terminal(/^\s*/),
				pushTo: function(env, parent, obj) {
					// Parser.counts.countLexem++;
					if (obj.lexic && obj.lexic !== env.currentLexic) { // 'scoped' lexic management
						if (parent.__swapped__) // we have already push something before (aka second (or more) lexic change on same babelute)
							env.lexics[env.lexics.length - 1] = env.lexic;
						else
							env.lexics.push(obj.lexic); // push lexic to scope
						env.currentLexic = obj.lexic;
						var newParent = Babelute.b(obj.lexic);
						newParent._lexems = parent._lexems;
						parent.__swapped__ = newParent;
					} else if (env.asDoc) // top level lexem
						(parent.__swapped__ || parent)._append(env.currentLexic, obj.name, obj.args);
					else { // use current babelute lexic
						parent = parent.__swapped__ || parent;
						getMethod(parent, obj.name).apply(parent, obj.args);
					}
				}
			})
			.done(function(env, babelute) {
				if (babelute.__swapped__) { // 'scoped' lexic management :
					// one lexic has been pushed from this babelute
					// so pop to parent lexic
					env.lexics.pop();
					env.currentLexic = env.lexics[env.lexics.length - 1];
					babelute.__swapped__ = null;
				}
			})
			.space(),

		lexem: r().oneOf(
			// lexem (aka: name(arg1, arg2, ...))
			r().terminal(/^([\w-_]+)\s*\(\s*/, function(env, obj, cap) { // lexem name + ' ( '
				obj.name = cap[1];
				obj.args = [];
			})
			.oneOf(
				r().terminal(/^\s*\)/), // end parenthesis

				r()
				.oneOrMore({ // arguments
					rule: 'value',
					separator: r().terminal(/^\s*,\s*/),
					pushTo: function(env, parent, obj) {
						// Parser.counts.countLexemValues++;
						parent.args.push(obj.value);
					}
				})
				.terminal(/^\s*\)/) // end parenthesis
			),

			// lexic selector (aka @lexic:)
			r().terminal(/^#([\w-_]+):/, function(env, obj, cap) { // '@' + lexic name + ':'
				obj.lexic = cap[1];
			})
		),


		/***********
		 * VALUES
		 ***********/
		value: r()
			.done(function(env, obj) {
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// shortcut with first char previsu through valueMap
				env.parser.exec(valuePrevisuMap[env.string[0]] || 'wordValue', obj, env);
			}),

		number: r().terminal(/^[0-9]+(\.[0-9]+)?/, function(env, obj, cap) {
			obj.value = cap[1] ? parseFloat(cap[0] + cap[1], 10) : parseInt(cap[0], 10);
		}),
		singlestring: r().terminal(/^'((?:\\'|[^'])*)'/, function(env, obj, cap) {
			obj.value = cap[1].replace(replaceSingleString, "'");
		}),
		doublestring: r().terminal(/^"((?:\\"|[^"])*)"/, function(env, obj, cap) {
			obj.value = cap[1].replace(replaceDoubleString, '"');
		}),

		wordValue: r()
			.oneOf(
				// true|false|null|undefined|NaN|Infinity
				r().terminal(/^(?:true|false|null|undefined|NaN|Infinity)/, function(env, obj, cap) {
					switch (cap[0]) {
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
				}),
				// function
				r().one({
					rule: 'function',
					// previsu: 'f',
					set: function(env, parent, obj) {
						if (env.acceptFunctions) // todo : add warning when not allowed but present
							parent.value = Function.apply(null, obj.args.concat(obj.block));
					}
				}),
				// babelutes
				r().one({
					rule: 'babelute',
					as: function(env, descriptor) {
						return env.asDoc ? Babelute.doc(env.currentLexic) : Babelute.b(env.currentLexic);
					},
					set: function(env, parent, obj) {
						parent.value = obj;
					}
				})
			),

		object: r().one({
			rule: r()
				.terminal(/^\{\s*/) // start bracket
				.zeroOrMore({ // properties
					rule: r()
						// key
						.terminal(/^([\w-_]+)|"([^"]*)"|'([^']*)'/, function(env, obj, cap) {
							obj.key = cap[1];
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

			set: function(env, parent, obj) {
				parent.value = obj;
			}
		}),

		array: r().one({
			rule: r()
				.terminal(/^\[\s*/) // start square bracket
				.zeroOrMore({ // items
					rule: 'value',
					separator: r().terminal(/^\s*,\s*/),
					pushTo: function(env, parent, obj) {
						parent.push(obj.value);
					}
				})
				.terminal(/^\s*\]/), // end square bracket


			as: function() {
				return [];
			},
			set: function(env, parent, obj) {
				parent.value = obj;
			}
		}),

		'function': r()
			.terminal(/^function\s*\(\s*/, function(env, obj, cap) {
				obj.args = [];
				obj.block = '';
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
			.done(function(env, obj) {
				// remove last uneeded '}' in catched block (it's there for inner-blocks recursion)
				obj.block = obj.block.substring(0, obj.block.length - 1);
			}),

		scopeBlock: r() // function scope block (after first '{')
			.oneOf(
				// inner block recursion
				r().terminal(/^[^\{\}]*\{/, function(env, obj, cap) {
					obj.block += cap[0];
				})
				.oneOrMore('scopeBlock'),

				// end block 
				r().terminal(/^[^\}]*\}/, function(env, obj, cap) {
					obj.block += cap[0];
				})
			)
	};

Babelute.Parser = Parser;

var parser = new Parser(rules, 'babelute'),
	templateCache = {};

Babelute.parse = function(string, opt) {
	opt = opt ||  {};
	var env = {};
	for (var i in opt)
		env[i] = opt[i];
	env.lexics = [opt.mainLexic];
	env.currentLexic = opt.mainLexic;
	return parser.parse(string, 'babelute', Babelute.b(opt.mainLexic), env);
}

Babelute.fromJSON = function(json) {
	return JSON.parse(json, function(k, v) {
		if (!v)
			return v;
		if (v.__babelutelexem__)
			return new Babelute.Lexem(v.lexic, v.name, v.args);
		if (v.__babelute__) {
			var b = new Babelute();
			b._lexems = v._lexems;
			return b;
		}
		return v;
	});
}

module.exports = parser;