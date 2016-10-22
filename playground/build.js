(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Babelute = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 * 
 * Simple virtual dom diffing (finally quite fast) : Based on :
 * https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060#.baku8vbw8
 * and
 * https://medium.com/@deathmood/write-your-virtual-dom-2-props-events-a957608f5c76#.6sqmdjuvz
 *
 * Added : 
 * => DocFragment management (aka vnode = { type:'fragment', children:[...], props:{} }) (e.g useful for component)
 *
 * Main code change : 
 * => store dom node's ref in associated vnode, no more use of child index
 * => better events listener management (always remove olds + add news)
 *
 * @usage
 * 		const deathmood = require('deathmood-vdom'),
 * 			h = deathmood.createVNode;
 *
 * 		function render(){
 * 			return h('fragment', null, [
 * 					h('div', 
 * 						{ className:'foo', id:'bar', myAttr:'zoo' }, // attributes
 * 						[ // children
 * 							h('span', null, ['hello world'])
 * 						],
 * 						[ // events
 * 							{ 
 * 								name:'click', 
 * 								callback:function(e){ ... }
 * 							}
 * 						]
 * 					),
 * 					h('section', ...)
 * 					...
 * 				]);
 * 		}
 * 		
 *  	// ...
 *  	var oldVNode;
 *	  	//...
 *	  	var newVNode = render();
 *	  	deathmood.update(document.body, newVNode, oldVNode);
 *	  	oldVNode = newVNode;
 */

function createElement($parent, vnode) {
	if (typeof vnode.text !== 'undefined')
		return vnode.node = document.createTextNode(vnode.text); // store text-node in vnode
	var $el;
	if (vnode.type === 'fragment') {
		vnode.parent = $parent; // store parent in vnode, keep $parent as recursion parent
		$el = document.createDocumentFragment();
	} else { // is a tag
		$parent = vnode.node = $el = document.createElement(vnode.type); // store dom-node in vnode, set recursion parent as produced node
		setLocals($el, vnode); // set props and listeners
	}
	for (var i = 0, len = vnode.children.length; i < len; ++i) // recursion on vnode children
		$el.appendChild(createElement($parent, vnode.children[i]));
	return $el; // DocumentFragment or DomNode
}

function update($parent, newNode, oldNode) {
	if (!oldNode)
		$parent.appendChild(createElement($parent, newNode));

	else if (!newNode)
		removeElement(oldNode); // remove fragment or node

	else if (changed(newNode, oldNode)) {
		// (vnode type or text value) has changed
		$parent.insertBefore(createElement($parent, newNode), firstElement(oldNode));
		removeElement(oldNode); // remove fragment or node

	} else if (newNode.type) // is not a text node, no type change
		updateElement(newNode, oldNode);

	else // is a text node
		newNode.node = oldNode.node; // forward node to new vnode
}

function updateElement(newNode, oldNode) {
	var subParent;
	if (newNode.type !== 'fragment') { // is a tag
		// update props and listeners
		updateLocals(oldNode.node, newNode, oldNode);
		// forward node to new vdom, set subparent as tag's node (so normal recursion)
		subParent = newNode.node = oldNode.node;
	} else // is fragment : forward parent in new vnode, set subParent as $parent (transparent recursion)
		subParent = newNode.parent = oldNode.parent;

	const len = Math.max(newNode.children.length, oldNode.children.length);
	for (var i = 0; i < len; i++)
		update(subParent, newNode.children[i], oldNode.children[i]);
}

function updateLocals($target, newNode, oldNode) {
	var props = assign({}, newNode.props, oldNode.props);
	for (var i in props)
		updateProp($target, i, newNode.props[i], oldNode.props[i]);
	// remove all olds and add all news events listener : not really performance oriented 
	// but do the job for multiple events handler with same name (aka click)
	if (oldNode.on)
		oldNode.on.forEach(function(event) {
			$target.removeEventListener(event.name, event.callback);
		});
	if (newNode.on)
		newNode.on.forEach(function(event) {
			$target.addEventListener(event.name, event.callback);
		});
}

function setLocals($target, node) {
	for (var i in node.props)
		setProp($target, i, node.props[i]);
	if (node.on)
		node.on.forEach(function(event) {
			$target.addEventListener(event.name, event.callback);
		});
}

function removeElement(vnode) {
	if (vnode.type !== 'fragment')
		vnode.node.parentNode.removeChild(vnode.node);
	else
		for (var i = 0, len = vnode.children.length; i < len; ++i)
			removeElement(vnode.children[i]);
}

function firstElement(vnode) {
	if (vnode.type !== 'fragment')
		return vnode.node;
	return firstElement(vnode.children[0]);
}

function changed(node1, node2) {
	return node1.type !== node2.type || node1.text !== node2.text;
}

function setProp($target, name, value) {
	if (name === 'className')
		$target.setAttribute('class', value);
	else if (typeof value === 'boolean')
		setBooleanProp($target, name, value);
	else
		$target.setAttribute(name, value);
}

function setBooleanProp($target, name, value) {
	if (value) {
		$target.setAttribute(name, value);
		$target[name] = true;
	} else
		$target[name] = false;
}

function removeBooleanProp($target, name) {
	$target.removeAttribute(name);
	$target[name] = false;
}

function removeProp($target, name, value) {
	if (name === 'className')
		$target.removeAttribute('class');
	else if (typeof value === 'boolean')
		removeBooleanProp($target, name);
	else
		$target.removeAttribute(name);
}

function updateProp($target, name, newVal, oldVal) {
	if (!newVal)
		removeProp($target, name, oldVal);
	else if (!oldVal || newVal !== oldVal)
		setProp($target, name, newVal);
}

// Object.assign immitation (only for 1 or 2 arguments as needed here)
function assign($root, obj, obj2) {
	for (var i in obj)
		$root[i] = obj[i];
	for (var i in obj2)
		$root[i] = obj2[i];
	return $root;
}

module.exports = {
	createVNode: function(type, props, children, events) {
		return {
			type: type,
			props: props || {},
			children: children || [],
			on: events || null
		};
	},
	update: update,
	firstElement: firstElement
};
},{}],3:[function(require,module,exports){
var deathmood = require('./deathmood-vdom'),
	Babelute = require('../lib/babelute'),
	State = require('./view-state');

require('../languages/html');

Babelute.toLexic('html', 'view')
	.toActions('html:deathmood', {
		view: function(env, vnode, args /* opts */ ) {
			var state;
			const opts = args[0],
				frag = {
					type: 'fragment',
					props: {},
					children: [],
				},
				doRender = function() {
					var vnode = {
						type: 'fragment',
						props: {},
						children: [],
					};
					opts.render(state).$output(env, vnode);
					if (frag.parent)
						deathmood.update(frag.parent, vnode, frag);
					frag.children = vnode.children;
				},
				render = function() {
					requestAnimationFrame(doRender);
				};
			vnode.children.push(frag);
			state = new State(opts.getInitialState ? opts.getInitialState() : {}, render);
			doRender();
		},
		tag: function(env, vnode, args /*name, babelutes*/ ) {
			const tag = {
				type: args[0],
				props: {},
				children: []
			};
			vnode.children.push(tag);
			args[1].forEach(function(templ) {
				if (typeof templ === 'undefined')
					return;
				if (templ.__babelute__) {
					templ.$output(env, this);
				} else
					this.children.push({
						text: templ + ''
					});
			}, tag);
		},
		attr: function(env, vnode, args /* name, value */ ) {
			vnode.props[args[0]] = args[1];
		},
		prop: function(env, vnode, args /* name, flag */ ) {
			vnode.props[args[0]] = args[1];
		},
		class: function(env, vnode, args /* name */ ) {
			vnode.props.className = (vnode.props.className || '') + ' ' + args[0];
		},
		id: function(env, vnode, args /* value */ ) {
			vnode.props.id = args[0];
		},
		text: function(env, vnode, args /* value */ ) {
			vnode.children.push({
				text: args[0]
			});
		},
		on: function(env, vnode, args /* event, callback */ ) {
			vnode.on = vnode.on || [];
			vnode.on.push({
				name: args[0],
				callback: args[1]
			});
		}
	});

Babelute.prototype.$htmlToDeathmood = function(node, oldFragment) {
	var frag = {
		type: 'fragment',
		props: {},
		children: []
	};
	this.$output('html:deathmood', frag);
	requestAnimationFrame(function() {
		deathmood.update(node, frag, oldFragment);
	});
	return frag;
};

//
},{"../languages/html":10,"../lib/babelute":11,"./deathmood-vdom":2,"./view-state":6}],4:[function(require,module,exports){
const Babelute = require('../lib/babelute'),
	State = require('./view-state'),
	vh = require('virtual-dom/h'),
	diff = require('virtual-dom/diff'),
	patch = require('virtual-dom/patch'),
	createElement = require('virtual-dom/create-element');

require('../languages/html');
const hp = Babelute.initializer('html');

/**
 * For ev-* management from virtualdom
 */
const Delegator = require("dom-delegator"),
	del = Delegator();

/**
 * vdom actions
 */
Babelute.toLexic('html', ['view'])
	.toActions('html:vdom', {
		__restrictions__: {
			html: true,
			'html:vdom': true
		},
		view: function(env, vnode, args) {
			var opts = args[0],
				oldTree,
				rootNode,
				state,
				doRender = function() {
					var descriptor = {
							properties: {},
							children: [],
							selector: ''
						},
						outputBabelute = opts.render(state);

					// render new nodes
					outputBabelute.$output(env, descriptor);
					var tree = vh('div', descriptor.properties, descriptor.children);

					if (!rootNode) { // first render
						rootNode = createElement(tree);
						node.appendChild(rootNode);
					} else { // rerender
						var patches = diff(oldTree, tree);
						rootNode = patch(rootNode, patches);
					}
					oldTree = tree;
				},
				render = function() {
					requestAnimationFrame(doRender);
				};

			state = new State(opts.getInitialState ? opts.getInitialState() : {}, render);

			doRender();
		},
		tag: function(opts, vnode, args /* tagName, babelutes */ ) {
			var descriptor = {
				properties: {},
				children: [],
				selector: ''
			};
			args[1].forEach(function(templ) {
				if (typeof templ === 'undefined')
					return;
				if (templ.__babelute__)
					templ.$output(opts, descriptor);
				else
					descriptor.children.push(templ); // auto escaped when added to dom.
			});
			var tag = vh(args[0] + descriptor.selector, descriptor.properties, descriptor.children);
			vnode.children.push(tag);
		},
		text: function(opts, vnode, args /* value */ ) {
			vnode.children.push(args[0]);
		},
		class: function(opts, vnode, args /* className */ ) {
			vnode.properties.selector += '.' + args[0];
		},
		attr: function(opts, vnode, args /* name, value */ ) {
			vnode.properties[args[0]] = args[1];
		},
		id: function(opts, vnode, args /* value */ ) {
			vnode.properties.selector += '#' + args[0];
		},
		on: function(opts, vnode, args /* eventName, callback */ ) {
			vnode.properties['ev-' + args[0]] = args[1];
		}
	});

Babelute.prototype.$htmlToVDOM = function(parent, oldTree) {
	var descriptor = {
		properties: {},
		children: [],
		selector: ''
	};
	this.$output('html:vdom', descriptor);
	var tree = vh('div', descriptor.properties, descriptor.children);
	requestAnimationFrame(function() {
		if (!oldTree) { // first render
			tree.rootNode = createElement(tree);
			parent.appendChild(tree.rootNode);
		} else { // rerender
			tree.rootNode = oldTree.rootNode;
			var patches = diff(oldTree, tree);
			tree.rootNode = patch(tree.rootNode, patches);
		}
	});
	return tree;
};
},{"../languages/html":10,"../lib/babelute":11,"./view-state":6,"dom-delegator":17,"virtual-dom/create-element":30,"virtual-dom/diff":31,"virtual-dom/h":32,"virtual-dom/patch":40}],5:[function(require,module,exports){
/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = require('../lib/babelute'),
	State = require('./view-state');

require('../languages/html');

Babelute.toLexic('html', ['view'])
	.toActions('html:dom', {
		view: function(env, node, args) {
			var rendered,
				state;
			const opts = args[0],
				doRender = function() {
					const frag = new DocumentFragment(),
						outputBabelute = opts.render(state);
					var nextSibling;

					if (rendered) {
						// keep track of nextSibling
						nextSibling = rendered[rendered.length - 1].nextSibling;
						// remove previously rendered nodes
						rendered.forEach(node.removeChild, node);
					}
					// render new nodes
					outputBabelute.$output(env, frag);

					// copy children and insert new nodes
					rendered = [].slice.call(frag.children);
					node.insertBefore(frag, nextSibling);
				},
				render = function() {
					requestAnimationFrame(doRender);
				};

			state = new State(opts.getInitialState ? opts.getInitialState() : {}, render);
			doRender();
		}
	})
	.toActions('html:string', {
		view: function(env, descriptor, args) {
			const opts = args[0];
			opts.render(new State(opts.getInitialState ? opts.getInitialState() : {})).$output(env, descriptor);
		}
	});
},{"../languages/html":10,"../lib/babelute":11,"./view-state":6}],6:[function(require,module,exports){
/**
 * View state
 */
function State(state, render) {
	this.render = render;
	for (var i in state)
		this[i] = state[i];
}

State.prototype = {
	set: function(path, value) {
		var changed = false;
		if (arguments.length === 1) {
			for (var i in path)
				if (this[i] !== path[i]) {
					changed = true;
					this[i] = path[i];
				}
		} else if (this[path] !== value) {
			changed = true;
			this[path] = value;
		}
		if (changed)
			this.render();
	},
	toggle: function(path) {
		this[path] = !this[path];
		this.render();
	},
	push: function(path, value) {},
	pop: function(path, value) {}
};

module.exports = State;
},{}],7:[function(require,module,exports){
/**
 * Babelute.
 * Javascript Internal DSMM Framework.
 * Method chaining applications to Templating and Internal Domain Specific (Multi)Modeling.
 * Aka demonstration that everything is about languages.
 * 
 * Domain Language (Multi)Modeling solves many software design problems.
 * From developpement process (how to start, what and how to design, how to iterate, ...) 
 * to how to understand, design and articulate business related problems and/or pure code logics.
 * 
 * It provides natural ways of thinking models and code that are really close to how human mind 
 * works. Much much more close than OOP (including AOP) is.
 *
 * Babelute gives elegant and really simple ways to define/handle/use/transform chainable methods
 * in pure javascript or through it's own simple external DSL (a minimalist optimal string representation 
 * of call chains for babelute sentences serialisation).
 * 
 * It relays entierly on Method Chaining pseudo design pattern.
 * In consequence, it's made with really few code, and is really light (less than 2ko gzip/min without own 
 * external DSL parser - which is also really light (+- 1ko gzip/min) and made with its dedicated Fluent Interface)
 *
 * Babelute's parsing and output are both really fast. 
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */


/**
 * Todo :
 *
 * 		debug translation 				OK
 *
 * 		_append : should add lexicName : 		OK
 *
 * 		on add to lexic(lexicName) :      ==> 	OK 
 * 		first time : create immediatly Babelute children class
 * 		after : modify existing prototypes (babelute, docs, and dothat if any) in place of clearing cache
 *
 * 		==> same thing when extending lexic : use inheritance to keep tracking of parent prototype    	==> 	OK
 *
 * 		scoped lexics management on stringify  				OK
 * 		
 * 		manage restrictions with mixins when extending Lexics/Actions/API  					OK
 *
 *		scope management
 *			use env.scope() to get current scope object or maybe pass it as fourth argument in actions
 *			env.pushScope({ name:instance })
 *			env.popScope(name)
 *
 *		$output({
 *			actions:'yamvish:dom',
 *			scope:{
 *				context: context || new Context(...)
 *			}
 *		})
 * 
 * 
 * 		finalise time management in actions
 * 			maybe add flag in actions namespace to say 'allowAsync'
 * 		manage result forwarding and promise listening 
 *    	 		
 * 		do simple example with async manager in env
 *
 *		manage in-lexem-actions
 * 
 *		translation/output table
 * 
 *
 * 		//_____________ after
 * 
 * 
 *		add Filter style with @myFunc
 *
 * 		add def mecanism  with dereferencement (aka $myVar)
 *
 *		work on babelute doc pilot : external query DSL ? api ?
 *  		.0 = args[0]
 *  		.name = select lexems with matching name
 *    		.#lexic = select lexems with matching lexic
 *    		.#lexic:lexem = select lexems with matching lexic and lexem name
 *    		.*
 *    		.*(filter)
 *    		.**(0=is=babelute)
 *    	 	.**(div|span|#foo:goo.0=is=babelute)
 * 		
 * 		extract yaom
 *
 * 		extract dothat
 * 
 * 		bridge between babelute actions and dothat API
 *
 * 		add tests
 */

// core class and statics
var Babelute = require('./lib/babelute');

// Babelute First Degree
require('./lib/first-level-babelute');

// serializer to Babelute DSL
require('./lib/stringify');

// Babelute DSL parser
Babelute.parser = require('./lib/parser');



module.exports = Babelute;
},{"./lib/babelute":11,"./lib/first-level-babelute":12,"./lib/parser":13,"./lib/stringify":14}],8:[function(require,module,exports){
var Babelute = require('../../lib/babelute');
/**********************************************
 ************** HTML to DOM Actions ***********
 **********************************************/

Babelute.toLexic('html', {
	// only-on-dom-output handler
	onHtmlDom: function(callback) {
		return this._append('html:dom', 'onHtmlDom', [callback]);
	}
});

// we only need to provides language atoms implementations.
Babelute.toActions('html:dom', {
	__restrictions__: {
		html: true,
		'html:dom': true
	},
	tag: function(env, node, args /* tagName, babelutes */ ) {
		var child = document.createElement(args[0]);
		node.appendChild(child);
		args[1].forEach(function(templ) {
			if (typeof templ === 'undefined')
				return;
			if (templ.__babelute__)
				templ.$output(env, this);
			else
				this.appendChild(document.createTextNode(templ)); // auto escaped when added to dom.
		}, child);
	},
	text: function(env, node, args /* value */ ) {
		node.appendChild(document.createTextNode(args[0]));
	},
	class: function(env, node, args /* className */ ) {
		node.classList.add(args[0]);
	},
	attr: function(env, node, args /* name, value */ ) {
		node.setAttribute(args[0], args[1]);
	},
	id: function(env, node, args /* value */ ) {
		node.id = args[0];
	},
	on: function(env, node, args /* eventName, callback */ ) {
		node.addEventListener(args[0], args[1]);
	},
	onHtmlDom: function(env, node, args /* callback */ ) {
		args[0](env, node);
	}
});

Babelute.prototype.$htmlToDOM = function(node) {
	return this.$output('html:dom', node);
};
},{"../../lib/babelute":11}],9:[function(require,module,exports){
var Babelute = require('../../lib/babelute');

// utils :
var mapEncode = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;" // ' -> &apos; for XML only
	},
	mapDecode = {
		"&amp;": "&",
		"&lt;": "<",
		"&gt;": ">",
		"&quot;": "\"",
		"&#39;": "'"
	};

function encodeHtmlSpecialChars(str) {
	return str.replace(/[&<>"']/g, function(m) {
		return mapEncode[m];
	});
}

function decodeHtmlSpecialChars(str) {
	return str.replace(/(&amp;|&lt;|&gt;|&quot;|&#39;)/g, function(m) {
		return mapDecode[m];
	});
}

/**********************************************
 ************* HTML-to-String Actions ***********
 **********************************************/


Babelute.toLexic('html', {
	// only-on-string-output handler
	onHtmlString: function(callback) {
		return this._append('html:string', 'onHtmlString', [callback]);
	}
});

// actions :
// we only need logical atoms definitions. (without user interactions. aka click etc.)
Babelute.toActions('html:string', {
	// Output engines related
	__restrictions__: {
		html: true,
		'html:string': true
	},
	// Actions
	tag: function(env, tag, args /* tagName, babelutes */ ) {
		var child = new TagDescriptor(),
			actions = env.actions,
			babelutes = args[1],
			templ;
		for (var i = 0, len = babelutes.length; i < len; ++i) {
			templ = babelutes[i];
			if (typeof templ === 'undefined')
				continue;
			if (templ.__babelute__)
				templ.$output(env, child);
			else if (typeof templ === 'string')
				child.children += encodeHtmlSpecialChars(templ); //.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			else
				child.children += templ;
		}
		tagOutput(tag, child, args[0]);
	},
	text: function(env, tag, args /* value */ ) {
		tag.children += encodeHtmlSpecialChars(args[0]);
	},
	class: function(env, tag, args /* className */ ) {
		tag.classes += ' ' + args[0];
	},
	attr: function(env, tag, args /* name, value */ ) {
		var value = args[1];
		// tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? encodeHtmlSpecialChars(value) : value) + '"';
		tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? value.replace(/"/g, '\\"').replace(/</g, '&lt;').replace(/>/g, '&gt;') : value) + '"';
	},
	id: function(env, tag, args /* value */ ) {
		tag.attributes = ' id="' + args[0] + '"' + tag.attributes;
	},
	onHtmlString: function(env, tag, args) {
		args[0](env, tag);
	}
});

// for tags string construction
var TagDescriptor = function(tagName) {
	this.children = '';
	this.classes = '';
	this.style = '';
	this.attributes = '';
};

var openTags = /br/, // should be completed
	strictTags = /span|script|meta|div|i/;

function tagOutput(tag, child, name) {
	var out = '<' + name + child.attributes;
	if (child.style)
		out += ' style="' + child.style + '"';
	if (child.classes)
		out += ' class="' + child.classes + '"';
	if (child.children)
		tag.children += out + '>' + child.children + '</' + name + '>';
	else if (openTags.test(name))
		tag.children += out + '>';
	else if (strictTags.test(name))
		tag.children += out + '></' + name + '>';
	else
		tag.children += out + '/>';
}

Babelute.prototype.$htmlToString = function() {
	return this.$output('html:string', new TagDescriptor()).children;
};
},{"../../lib/babelute":11}],10:[function(require,module,exports){
/**
 * Simple but powerful and ultra fast isomorphic html output engine.
 *
 * One small extendable lexic, two micro $output's semantics (one pure string, one pure dom), and voilà ! ;)
 */

var Babelute = require('../lib/babelute');

/*******
 *******	LANGUAGE ATOMS (simply enqueueing lexems)
 *******/
Babelute
	.toLexic('html', ['tag', 'attr', 'prop', 'class', 'id', 'text', 'on']); // simple atoms

/*******
 *******	COMPOUNDS WORDS (based on language atoms)
 *******/
// simple tags (made with .tag) (list should be completed)
['div', 'h1', 'h2', 'h3', 'section', 'span', 'button', 'option', 'article']
.forEach(function(tagName) {
	Babelute.toLexic('html', tagName, function() {
		return this.tag(tagName, [].slice.call(arguments));
	});
});

// events (made with .on) (list should be completed)
['click', 'mouseover', 'keyup']
.forEach(function(eventName) {
	Babelute.toLexic('html', eventName, function(callback) {
		return this.on(eventName, callback);
	});
});


// compounds tags (made with other tags)
var h = Babelute.initializer('html');
Babelute.toLexic('html', {
	a: function(href, content) {
		return this.tag('a', [h.attr('href', href), content]);
	},
	select: function(optionsList, selectBabelute) {
		return this.tag('select', [
			h._each(optionsList, function(opt) {
				if (opt.__babelute__)
					this.option(opt);
				else
					this.option(
						h.attr('value', opt.value),
						opt.content
					);
			}),
			selectBabelute
		]);
	},
	input: function(type, val, babelute) {
		return this.tag('input', [h.attr('type', type).attr('value', val), babelute]);
	},
	textInput: function(val, babelute) {
		return this.input('text', val, babelute);
	},
	strong: function(content) {
		return this.span(h.class('strong'), content);
	}
});

// => so 25 words defined in the lexic for the moment.
// tag, attr, prop, class, id, text, on, click, mouseover, keyUp, div, h1, h2, h3, section, article, span, button, a, select, option, strong, onHtmlString, onHtmlDom
//
},{"../lib/babelute":11}],11:[function(require,module,exports){
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
 * The Babelute Class is just a helper for writing and holding babelute sentences. 
 *
 * 
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = function(lexems) {
		this.__babelute__ = 'default'; // current lexic
		this._lexems = lexems ||  [];
	},
	Lexem = Babelute.Lexem = function(lexic, name, args, handler) {
		this.__babelutelexem__ = true;
		this.lexic = lexic;
		this.name = name;
		this.args = args;
		if (handler)
			this.handler = handler;
	},
	lexicsDico = Babelute.lexics = {
		'default': {
			Cl: Babelute
		}
	},
	actionsDico = Babelute.actions = {
		'default': {
			log: function() {
				console.log.apply(console, arguments);
			},
			debug: function() {
				console.log.apply(console, ['debug:'].concat(arguments));
			},
			if: function(env, subject, args /* successBabelute, elseBabelute */ ) {
				if (args[0])
					return args[1].$output(env, subject);
				else if (args[2])
					return args[2].$output(env, subject);
			},
			all: function(env, subject, thenables) {
				return Promise.all(thenables);
			},
			then: function(env, subject, callbacks) {
				if (locals.error)
					return locals.result = args[0](locals.error);
				return locals.result = args[1](locals.result);
			},
			catch: function(env, subject, args) {
				if (locals.error)
					return locals.result = args[0](locals.error);
			}
		}
	};

Babelute.prototype = {
	/**
	 * get new dedicated babelute handler that act on same aray of lexems (current one)
	 * return new babelute specialised with lexicName
	 */
	babelute: function(lexicName) {
		var lexic = Babelute.getLexic(lexicName),
			Cl = lexic.Cl,
			b = new Cl();
		b._lexems = this._lexems;
		return b;
	},
	/**
	 * get dedicated babelute handler (independant of current array of lexems)
	 * return new babelute specialised with lexicName or current lexic
	 */
	_new: function(lexicName) {
		return Babelute.b(lexicName ||  this.__babelute__ !== true ? this.__babelute__ : null);
	},
	/*****************************************************
	 * Babelute instance modification (meta-language API)
	 *****************************************************/
	// add lexem to babelute
	_append: function(lexicName, name, args) {
		this._lexems.push(new Lexem(lexicName || this.__babelute__, name, args));
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
		var args = [].slice.call(arguments, 1),
			method = typeof babelute === 'string' ? getMethod(babelute) : babelute;
		if (method.__babelute__)
			this._lexems = this._lexems.concat(method._lexems);
		else
			method(this._lexems, args);
		return this;
	},
	forEach: function(func, self) {
		var lexems = this._lexems;
		for (var i = 0, len = lexems.length; i < len; ++i)
			func.call(self ||  this, lexems[i], i);
	},
	// execute provided function binded on current babelute, that will receive item and index as argument.
	_each: function(arr, func, self) {
		arr.forEach(func, self || this);
		return this;
	},
	// execute provided babelutes list on current babelute.
	_useEach: function(arr) {
		arr.forEach(function(i) {
			this._use(i);
		}, this);
		return this;
	},
	/********************
	 * TRANSLATION
	 ********************/
	// translate babelute lexem through a lexic. return new babelute.
	_translation: function(lexicName) {
		// todo : optimised "recursive" translation with array of lexicsDico
		var lexic = Babelute.getLexic(lexicName),
			Cl = lexic.Cl,
			b = new Cl(),
			lexem;
		for (var i = 0, len = this._lexems.length; i < len; ++i) {
			lexem = this._lexems[i];
			var args = lexem.args.map(function(arg) {
				if (arg && arg.__babelute__)
					return arg._translation(lexicName);
				return arg;
			});
			if (b[lexem.name])
				b[lexem.name].apply(b, args);
			else
				b._lexems.push(new Lexem(lexem.lexic, lexem.name, args));
		}
		return b;
	},
	/**********************************************
	 ***************** OUTPUTS ********************
	 **********************************************/
	// specialised ouput : interpret babelute with specified actions
	'$output': function(env /* or actionsName */ , subject, scope, startIndex) {
		if (typeof env === 'string')
			env = new Environment(env, scope);

		var actions = env.actions,
			self = this,
			index = (startIndex || 0),
			lexem,
			r,
			f;
		while (lexem = this._lexems[index++]) {
			if (actions.__restrictions__ && !actions.__restrictions__[lexem.lexic])
				continue;
			f = actions[lexem.name] || actionsDico.default[lexem.name];
			if (f) {
				r = f(env, subject, lexem.args, env.scope);
				if (r && r.then) { // wait promise then continue output
					return r.then(function(s) {
						return self.$output(env, subject, null, index);
					});
				}
			}
		}
		return subject;
	},
	/**********************************************************
	 ********************** DEFAULT LEXEMS ********************
	 **********************************************************/
	// conditional execution
	if: function(condition, babelute, elseBabelute) {
		return this._append(this.__babelute__, 'if', [condition, babelute, elseBabelute]);
	},
	// log action state
	log: function() {
		return this._append(this.__babelute__, 'log', [].slice.call(arguments));
	},
	// for debug : log action state
	debug: function() {
		return this._append(this.__babelute__, 'debug', [].slice.call(arguments));
	},
	// async management
	all: function() {
		return this._append(this.__babelute__, 'all', [].slice.call(arguments));
	},
	then: function(success, fail) {
		return this._append(this.__babelute__, 'then', [success, fail]);
	},
	catch: function(fail) {
		return this._append(this.__babelute__, 'fail', [fail]);
	}
};

/*************************************************
 ********************* STATICS *******************
 *************************************************/

// Babelute main initializer
Babelute.b = function(lexicName) {
	return lexicName ? Babelute.initializer(lexicName) : new Babelute();
};

// babelute initializer management

function addToInitializer(lexic, method) {
	var Cl = lexic.Cl;
	lexic.initializer = lexic.initializer ||  {};
	lexic.initializer[method] = function() {
		var instance = new lexic.Cl();
		return instance[method].apply(instance, [].slice.call(arguments));
	}
}

function initializer(lexic) {
	lexic.initializer = lexic.initializer || {};
	Object.keys(lexic.Cl.prototype)
		.forEach(function(key) {
			if (key === '__babelute__' || key === '_lexems')
				return;
			addToInitializer(lexic, key);
		});
	return lexic.initializer;
}

// Babelute initializer provider
Babelute.initializer = function(lexicName) {
	var lexic = Babelute.getLexic(lexicName);
	return lexic.initializer || initializer(lexic);
};

// return specified lexic.
Babelute.getLexic = function(lexicName) {
	var lexic = lexicsDico[lexicName];
	if (!lexic)
		throw new Error('Babelute : lexic not found : ' + lexicName);
	return lexic;
};

// return specified actions.
Babelute.getActions = function(actionsName) {
	var actions = actionsDico[actionsName];
	if (!actions)
		throw new Error('Babelute : actions not found : ' + actionsName);
	return actions;
};

/**
 * Add method(s) to specified lexic
 * @param  {String} lexicName  	the name of the lexic where happening method(s)
 * @param  {String | Array | Object} 	If is string : it's the name of the method. If is array of string : each string is the name of a logical atom method. If is an object : it's used as a map of methods.
 * @param  {Function} method    the method function. used only if methoName is a string.
 * @return {Babelute}   		Babelute for chaining
 */
Babelute.toLexic = function(lexicName, methodName, method) {
	var lexic = lexicsDico[lexicName] || initLexic(lexicName);
	if (typeof methodName === 'object') {
		if (methodName.forEach) { // logical atoms. pure single _append
			methodName.forEach(function(methodName) {
				addLexem(lexic, lexicName, methodName);
			});
		} else
			for (var i in methodName) {
				if (i === '__babelute__' || i === '_lexems')
					continue;
				addLexem(lexic, lexicName, i, methodName[i]);
			}
	} else
		addLexem(lexic, lexicName, methodName, method);
	return Babelute;
};

function addLexem(lexic, lexicName, methodName, method) {
	var firstLevelProto = lexic.FirstLevelCl.prototype;
	firstLevelProto[methodName] = getFirstLevelMethod(lexicName, methodName);
	lexic.Cl.prototype[methodName] = method || firstLevelProto[methodName];
	addToInitializer(lexic, methodName);
}

/**
 * Add action's method to specified actionsDico namespaces
 * @param  {String} actionsName 	namespace of actionsDico where store method(s)
 * @param  {String | Object} 		methodName  the name of the méthod or a map (object) of methods
 * @param  {Function} method      	the method function. (used only if methodName is a string)
 * @return {Babelute}             	Babelute for chaining.
 */
Babelute.toActions = function(actionsName, methodName, method) {
	var actions = actionsDico[actionsName] = actionsDico[actionsName] ||  {};
	if (typeof methodName === 'object') {
		for (var i in methodName) {
			if (i === '__restrictions__') {
				actions.__restrictions__ = actions.__restrictions__ || {};
				for (var j in methodName[i])
					actions[i][j] = methodName[i][j];
			} else
				actions[i] = methodName[i];
		}
	} else if (methodName === '__restrictions__') {
		actions.__restrictions__ = actions.__restrictions__ || {};
		for (var j in method)
			actions.__restrictions__[j] = method[j];
	} else
		actions[methodName] = method;
	return Babelute;
};

// duplicate specified lexic to newName and add provided methods to it.
Babelute.extendLexic = function(lexicName, newName, methods) {
	var lexic = Babelute.getLexic(lexicName),
		newLexic = initLexic(newName, lexic);
	if (methods)
		Babelute.toLexic(newName, methods);
	return Babelute;
};

// duplicate specified actions to newName and add provided methods to it.
Babelute.extendActions = function(actionsName, newName, methods) {
	Babelute.toActions(newName, Babelute.getActions(actionsName));
	if (methods)
		Babelute.toActions(newName, methods);
	var actions = actionsDico[newName];
	actions.__restrictions__ = actions.__restrictions__ || {};
	actions.__restrictions__[newName] = true;
	return Babelute;
};

/***************************************
 ************** Environment ************
 ***************************************/

function Environment(actionsName, scope) {
	this.__babelute__env__ = true;
	this.actions = Babelute.getActions(actionsName);
	this.scope = scope ||  null;
}

Environment.prototype = {
	pushScope: function(name, instance) {
		this.scopes = this.scopes || [];
		var scope = {};
		for (var i in this.scope)
			scope[i] = this.scope[i];
		scope[i] = instance;
		this.scopes.push(scope);
		this.scope = scope;
	},
	popScope: function(name) {
		if (!this.scopes)
			return;
		if (this.scopes.length)
			this.scopes.pop();
		this.scope = this.scopes[this.scopes.length - 1] || null;
	}
};

/**************************************
 ***************** UTILS **************
 **************************************/

// parse lexicName:methodName string format and return method from lexic
// absolutly for internal use only.
function getMethod(req) {
	var splitted = req.split(':'),
		lexicName = splitted[0],
		lexic = Babelute.getLexic(lexicName),
		methodName = splitted[1];
	if (!lexic.Cl.prototype[methodName])
		throw new Error('Babelute : method not found : ' + req);
	var instance = getInstance(lexicName, lexic);
	return function(lexems, args) {
		instance._lexems = lexems;
		instance[methodName].apply(instance, args);
	}
}

function getInstance(lexicName, lexic) {
	if (lexic.Instance)
		return lexic.Instance;
	var Cl = lexic.Cl;
	return lexic.Instance = new Cl();
}

function initLexic(lexicName, baseLexic) {
	var BaseClass = (baseLexic && baseLexic.Cl) || Babelute,
		BaseFLClass = (baseLexic && baseLexic.FirstLevelCl) || Babelute;

	var Cl = function() {
		BaseClass.call(this);
		this.__babelute__ = lexicName;
	};
	Cl.prototype = new BaseClass();

	var FirstLevelCl = function() {
		BaseFLClass.call(this);
		this.__babelute__ = lexicName;
	};
	FirstLevelCl.prototype = new BaseFLClass();

	lexic = lexicsDico[lexicName] = {
		Cl: Cl,
		FirstLevelCl: FirstLevelCl
	};
	if (baseLexic) {
		var oldI = baseLexic.initializer,
			newI = Babelute.initializer(lexicName);
		for (var i in oldI) {
			if (i === '__babelute__' || i === '_lexems')
				continue;
			addToInitializer(lexic, i);
		}
	}
	return lexic;
}

function getFirstLevelMethod(lexicName, methodName) {
	return function() {
		return this._append(lexicName, methodName, [].slice.call(arguments));
	};
}

Babelute.initLexic = initLexic;
Babelute.Environment = Environment;

module.exports = Babelute;

//
},{}],12:[function(require,module,exports){
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
},{"./babelute":11}],13:[function(require,module,exports){
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
},{"./babelute":11,"elenpi/v2":29}],14:[function(require,module,exports){
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
},{"./babelute":11}],15:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = addEvent

function addEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        events[type] = handler
    } else if (Array.isArray(event)) {
        if (event.indexOf(handler) === -1) {
            event.push(handler)
        }
    } else if (event !== handler) {
        events[type] = [event, handler]
    }
}

},{"ev-store":19}],16:[function(require,module,exports){
var globalDocument = require("global/document")
var EvStore = require("ev-store")
var createStore = require("weakmap-shim/create-store")

var addEvent = require("./add-event.js")
var removeEvent = require("./remove-event.js")
var ProxyEvent = require("./proxy-event.js")

var HANDLER_STORE = createStore()

module.exports = DOMDelegator

function DOMDelegator(document) {
    if (!(this instanceof DOMDelegator)) {
        return new DOMDelegator(document);
    }

    document = document || globalDocument

    this.target = document.documentElement
    this.events = {}
    this.rawEventListeners = {}
    this.globalListeners = {}
}

DOMDelegator.prototype.addEventListener = addEvent
DOMDelegator.prototype.removeEventListener = removeEvent

DOMDelegator.allocateHandle =
    function allocateHandle(func) {
        var handle = new Handle()

        HANDLER_STORE(handle).func = func;

        return handle
    }

DOMDelegator.transformHandle =
    function transformHandle(handle, broadcast) {
        var func = HANDLER_STORE(handle).func

        return this.allocateHandle(function (ev) {
            broadcast(ev, func);
        })
    }

DOMDelegator.prototype.addGlobalEventListener =
    function addGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];
        if (listeners.indexOf(fn) === -1) {
            listeners.push(fn)
        }

        this.globalListeners[eventName] = listeners;
    }

DOMDelegator.prototype.removeGlobalEventListener =
    function removeGlobalEventListener(eventName, fn) {
        var listeners = this.globalListeners[eventName] || [];

        var index = listeners.indexOf(fn)
        if (index !== -1) {
            listeners.splice(index, 1)
        }
    }

DOMDelegator.prototype.listenTo = function listenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    this.events[eventName]++;

    if (this.events[eventName] !== 1) {
        return
    }

    var listener = this.rawEventListeners[eventName]
    if (!listener) {
        listener = this.rawEventListeners[eventName] =
            createHandler(eventName, this)
    }

    this.target.addEventListener(eventName, listener, true)
}

DOMDelegator.prototype.unlistenTo = function unlistenTo(eventName) {
    if (!(eventName in this.events)) {
        this.events[eventName] = 0;
    }

    if (this.events[eventName] === 0) {
        throw new Error("already unlistened to event.");
    }

    this.events[eventName]--;

    if (this.events[eventName] !== 0) {
        return
    }

    var listener = this.rawEventListeners[eventName]

    if (!listener) {
        throw new Error("dom-delegator#unlistenTo: cannot " +
            "unlisten to " + eventName)
    }

    this.target.removeEventListener(eventName, listener, true)
}

function createHandler(eventName, delegator) {
    var globalListeners = delegator.globalListeners;
    var delegatorTarget = delegator.target;

    return handler

    function handler(ev) {
        var globalHandlers = globalListeners[eventName] || []

        if (globalHandlers.length > 0) {
            var globalEvent = new ProxyEvent(ev);
            globalEvent.currentTarget = delegatorTarget;
            callListeners(globalHandlers, globalEvent)
        }

        findAndInvokeListeners(ev.target, ev, eventName)
    }
}

function findAndInvokeListeners(elem, ev, eventName) {
    var listener = getListener(elem, eventName)

    if (listener && listener.handlers.length > 0) {
        var listenerEvent = new ProxyEvent(ev);
        listenerEvent.currentTarget = listener.currentTarget
        callListeners(listener.handlers, listenerEvent)

        if (listenerEvent._bubbles) {
            var nextTarget = listener.currentTarget.parentNode
            findAndInvokeListeners(nextTarget, ev, eventName)
        }
    }
}

function getListener(target, type) {
    // terminate recursion if parent is `null`
    if (target === null || typeof target === "undefined") {
        return null
    }

    var events = EvStore(target)
    // fetch list of handler fns for this event
    var handler = events[type]
    var allHandler = events.event

    if (!handler && !allHandler) {
        return getListener(target.parentNode, type)
    }

    var handlers = [].concat(handler || [], allHandler || [])
    return new Listener(target, handlers)
}

function callListeners(handlers, ev) {
    handlers.forEach(function (handler) {
        if (typeof handler === "function") {
            handler(ev)
        } else if (typeof handler.handleEvent === "function") {
            handler.handleEvent(ev)
        } else if (handler.type === "dom-delegator-handle") {
            HANDLER_STORE(handler).func(ev)
        } else {
            throw new Error("dom-delegator: unknown handler " +
                "found: " + JSON.stringify(handlers));
        }
    })
}

function Listener(target, handlers) {
    this.currentTarget = target
    this.handlers = handlers
}

function Handle() {
    this.type = "dom-delegator-handle"
}

},{"./add-event.js":15,"./proxy-event.js":27,"./remove-event.js":28,"ev-store":19,"global/document":22,"weakmap-shim/create-store":25}],17:[function(require,module,exports){
var Individual = require("individual")
var cuid = require("cuid")
var globalDocument = require("global/document")

var DOMDelegator = require("./dom-delegator.js")

var versionKey = "13"
var cacheKey = "__DOM_DELEGATOR_CACHE@" + versionKey
var cacheTokenKey = "__DOM_DELEGATOR_CACHE_TOKEN@" + versionKey
var delegatorCache = Individual(cacheKey, {
    delegators: {}
})
var commonEvents = [
    "blur", "change", "click",  "contextmenu", "dblclick",
    "error","focus", "focusin", "focusout", "input", "keydown",
    "keypress", "keyup", "load", "mousedown", "mouseup",
    "resize", "select", "submit", "touchcancel",
    "touchend", "touchstart", "unload"
]

/*  Delegator is a thin wrapper around a singleton `DOMDelegator`
        instance.

    Only one DOMDelegator should exist because we do not want
        duplicate event listeners bound to the DOM.

    `Delegator` will also `listenTo()` all events unless
        every caller opts out of it
*/
module.exports = Delegator

function Delegator(opts) {
    opts = opts || {}
    var document = opts.document || globalDocument

    var cacheKey = document[cacheTokenKey]

    if (!cacheKey) {
        cacheKey =
            document[cacheTokenKey] = cuid()
    }

    var delegator = delegatorCache.delegators[cacheKey]

    if (!delegator) {
        delegator = delegatorCache.delegators[cacheKey] =
            new DOMDelegator(document)
    }

    if (opts.defaultEvents !== false) {
        for (var i = 0; i < commonEvents.length; i++) {
            delegator.listenTo(commonEvents[i])
        }
    }

    return delegator
}

Delegator.allocateHandle = DOMDelegator.allocateHandle;
Delegator.transformHandle = DOMDelegator.transformHandle;

},{"./dom-delegator.js":16,"cuid":18,"global/document":22,"individual":23}],18:[function(require,module,exports){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 *
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */

/*global window, navigator, document, require, process, module */
(function (app) {
  'use strict';
  var namespace = 'cuid',
    c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    safeCounter = function () {
      c = (c < discreteValues) ? c : 0;
      c++; // this is not subliminal
      return c - 1;
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock();

        counter = pad(safeCounter().toString(base), blockSize);

      return  (letter + timestamp + counter + fingerprint + random);
    };

  api.slug = function slug() {
    var date = new Date().getTime().toString(36),
      counter,
      print = api.fingerprint().slice(0,1) +
        api.fingerprint().slice(-1),
      random = randomBlock().slice(-2);

      counter = safeCounter().toString(36).slice(-4);

    return date.slice(-2) +
      counter + print + random;
  };

  api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
          count = 0;

        for (i in window) {
          count++;
        }

        return count;
      }());

    api.globalCount = function () { return cache; };
    return cache;
  };

  api.fingerprint = function browserPrint() {
    return pad((navigator.mimeTypes.length +
      navigator.userAgent.length).toString(36) +
      api.globalCount().toString(36), 4);
  };

  // don't change anything from here down.
  if (app.register) {
    app.register(namespace, api);
  } else if (typeof module !== 'undefined') {
    module.exports = api;
  } else {
    app[namespace] = api;
  }

}(this.applitude || this));

},{}],19:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":21}],20:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],21:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":20}],22:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":1}],23:[function(require,module,exports){
(function (global){
var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual

function Individual(key, value) {
    if (root[key]) {
        return root[key]
    }

    Object.defineProperty(root, key, {
        value: value
        , configurable: true
    })

    return value
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],24:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],25:[function(require,module,exports){
var hiddenStore = require('./hidden-store.js');

module.exports = createStore;

function createStore() {
    var key = {};

    return function (obj) {
        if ((typeof obj !== 'object' || obj === null) &&
            typeof obj !== 'function'
        ) {
            throw new Error('Weakmap-shim: Key must be object')
        }

        var store = obj.valueOf(key);
        return store && store.identity === key ?
            store : hiddenStore(obj, key);
    };
}

},{"./hidden-store.js":26}],26:[function(require,module,exports){
module.exports = hiddenStore;

function hiddenStore(obj, key) {
    var store = { identity: key };
    var valueOf = obj.valueOf;

    Object.defineProperty(obj, "valueOf", {
        value: function (value) {
            return value !== key ?
                valueOf.apply(this, arguments) : store;
        },
        writable: true
    });

    return store;
}

},{}],27:[function(require,module,exports){
var inherits = require("inherits")

var ALL_PROPS = [
    "altKey", "bubbles", "cancelable", "ctrlKey",
    "eventPhase", "metaKey", "relatedTarget", "shiftKey",
    "target", "timeStamp", "type", "view", "which"
]
var KEY_PROPS = ["char", "charCode", "key", "keyCode"]
var MOUSE_PROPS = [
    "button", "buttons", "clientX", "clientY", "layerX",
    "layerY", "offsetX", "offsetY", "pageX", "pageY",
    "screenX", "screenY", "toElement"
]

var rkeyEvent = /^key|input/
var rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/

module.exports = ProxyEvent

function ProxyEvent(ev) {
    if (!(this instanceof ProxyEvent)) {
        return new ProxyEvent(ev)
    }

    if (rkeyEvent.test(ev.type)) {
        return new KeyEvent(ev)
    } else if (rmouseEvent.test(ev.type)) {
        return new MouseEvent(ev)
    }

    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    this._rawEvent = ev
    this._bubbles = false;
}

ProxyEvent.prototype.preventDefault = function () {
    this._rawEvent.preventDefault()
}

ProxyEvent.prototype.startPropagation = function () {
    this._bubbles = true;
}

function MouseEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < MOUSE_PROPS.length; j++) {
        var mousePropKey = MOUSE_PROPS[j]
        this[mousePropKey] = ev[mousePropKey]
    }

    this._rawEvent = ev
}

inherits(MouseEvent, ProxyEvent)

function KeyEvent(ev) {
    for (var i = 0; i < ALL_PROPS.length; i++) {
        var propKey = ALL_PROPS[i]
        this[propKey] = ev[propKey]
    }

    for (var j = 0; j < KEY_PROPS.length; j++) {
        var keyPropKey = KEY_PROPS[j]
        this[keyPropKey] = ev[keyPropKey]
    }

    this._rawEvent = ev
}

inherits(KeyEvent, ProxyEvent)

},{"inherits":24}],28:[function(require,module,exports){
var EvStore = require("ev-store")

module.exports = removeEvent

function removeEvent(target, type, handler) {
    var events = EvStore(target)
    var event = events[type]

    if (!event) {
        return
    } else if (Array.isArray(event)) {
        var index = event.indexOf(handler)
        if (index !== -1) {
            event.splice(index, 1)
        }
    } else if (event === handler) {
        events[type] = null
    }
}

},{"ev-store":19}],29:[function(require,module,exports){
/**
 * @author Gilles Coomans <gilles.coomans@gmail.com>
 * elenpi v2

	//________ new api

	done(function(env, obj, string){
		//...
		return string || false;
	})
	terminal(regExp, name || function(env, obj, string, captured){
		//...
		return string || false;
	})
	char(test)
	optional(rule)
	end()

	one(rule || { 
		rule:rule, 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	zeroOrOne(rule || { 
		rule:rule, 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	oneOf([rules] || { 
		rules:[rules], 
		?as:function(){ return Instance }, 
		?set:'name' || function(env, parent, obj){ ... } 
	})
	xOrMore({ 
		rule:rule,
		minimum:int,
		?as:function(){ return Instance }, 
		?pushTo:'name' || function(env, parent, obj){ ... },
		?separator:rule,
		?maximum:int 
	})


	V3 will be a Babelute with same api

 *
 * 
 */

(function() {
	var defaultSpaceRegExp = /^[\s\n\r]+/;

	function exec(rule, descriptor, env) {
		if (env.stop || env.error)
			return;
		if (typeof rule === 'string')
			rule = getRule(env.parser, rule);
		// Parser.counts.countExec++;
		var rules = rule._queue,
			current;
		for (var i = 0, len = rules.length; i < len; ++i) {
			current = rules[i];
			if (current.__elenpi__)
				exec(current, descriptor, env);
			else // is function
				current(env, descriptor);
			if (env.error)
				return;
			if (env.soFar > env.string.length)
				env.soFar = env.string.length;
			if (env.stop)
				return;
		}
	};

	function getRule(parser, name) {
		var r = parser.rules[name];
		if (!r)
			throw new Error('elenpi : rules not found : ' + rule);
		return r;
	}

	function Rule() {
		this._queue = [];
		this.__elenpi__ = true;
	};

	Rule.prototype = {
		// base for all rule's handlers
		done: function(callback) {
			this._queue.push(callback);
			return this;
		},
		// for debug purpose
		log: function(title) {
			title = title || '';
			return this.done(function(env, descriptor) {
				console.log("elenpi log : ", title, env, descriptor);
			});
		},
		use: function(rule) {
			var args = [].slice.call(arguments, 1);
			return this.done(function(env, descriptor) {
				if (typeof rule === 'string')
					rule = getRule(env.parser, rule);
				if (rule.__elenpi__) {
					exec(rule, descriptor, env);
					return;
				}
				var r = new Rule();
				rule.apply(r, args);
				exec(r, descriptor, env);
			});
		},
		optional: function(rule) {
			return this.done(function(env, descriptor) {
				var string = env.string;
				exec(rule, descriptor, env);
				if (env.error) {
					env.string = string;
					env.error = false;
				}
			});
		},
		terminal: function(reg, set) {
			return this.done(function(env, descriptor) {
				// console.log('terminal test : ', reg);
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// Parser.counts.countTerminalTest++;
				var cap = reg.exec(env.string);
				// console.log('terminal : ', reg, cap);
				if (cap) {
					// Parser.counts.countTerminalMatched++;
					env.string = env.string.substring(cap[0].length);
					// console.log('terminal cap 0 length : ', cap[0].length);
					// console.log('terminal string length : ', string.length, cap[0]);
					if (set) {
						if (typeof set === 'string')
							descriptor[set] = cap[0];
						else
							set(env, descriptor, cap);
					}
					return;
				}
				env.error = true;
			});
		},
		char: function(test) {
			return this.done(function(env, descriptor) {
				if (!env.string.length || env.string[0] !== test)
					env.error = true;
				else
					env.string = env.string.substring(1);
			});
		},
		xOrMore: function(rule) {
			var opt = (typeof rule === 'string' ||  rule.__elenpi__) ? {
				rule: rule
			} : rule;
			opt.minimum = opt.minimum || 0;
			opt.maximum = opt.maximum || Infinity;
			return this.done(function(env, descriptor) {
				var options = opt;
				if (!env.string.length && options.minimum > 0) {
					env.error = true;
					return;
				}
				var string = env.string,
					count = 0,
					rule = options.rule,
					pushTo = options.pushTo,
					pushToString = typeof pushTo === 'string',
					As = options.as,
					separator = options.separator,
					newDescriptor;
				// Parser.counts.countXorMore++;
				while (!env.error && env.string.length && count < options.maximum) {

					// Parser.counts.countXorMores++;

					newDescriptor = As ? As(env, descriptor) : (pushTo ? {} : descriptor);
					exec(rule, newDescriptor, env);

					if (env.error)
						break;

					count++;

					if (!newDescriptor.skip && pushTo)
						if (pushToString) {
							descriptor[pushTo] = descriptor[pushTo] || [];
							descriptor[pushTo].push(newDescriptor);
						} else
							pushTo(env, descriptor, newDescriptor);

					if (separator && env.string.length)
						exec(separator, newDescriptor, env);
				}
				env.error = (count < options.minimum);
				if (!count)
					env.string = string;
			});
		},
		zeroOrMore: function(rule) {
			return this.xOrMore(rule);
		},
		oneOrMore: function(rule) {
			if (typeof rule === 'string' || rule.__elenpi__)
				rule = {
					rule: rule,
					minimum: 1
				}
			return this.xOrMore(rule);
		},
		zeroOrOne: function(rule) {
			var options = (typeof rule === 'string' ||  rule.__elenpi__) ? {
				rule: rule
			} : rule;
			return this.done(function(env, descriptor) {
				if (!env.string.length)
					return;
				// Parser.counts.countZeroOrOne++;
				var newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
				var string = env.string;
				exec(options.rule, newDescriptor, env);
				if (!env.error) {
					if (!newDescriptor.skip && options.set) {
						if (typeof options.set === 'string')
							descriptor[options.set] = newDescriptor;
						else
							options.set(env, descriptor, newDescriptor);
					}
					return;
				}
				env.string = string;
				env.error = false;
			});
		},
		oneOf: function(rules) {
			var opt = (typeof rules === 'string' || rules.__elenpi__) ? {
				rules: [].slice.call(arguments)
			} : rules;
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					env.error = true;
					return;
				}

				var options = opt,
					count = 0,
					len = options.rules.length,
					rule,
					newDescriptor,
					string = env.string;
				// Parser.counts.countOneOf++;
				while (count < len) {
					rule = options.rules[count];
					count++;
					// Parser.counts.countOneOfs++;
					newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
					exec(rule, newDescriptor, env);
					if (!env.error) {
						if (!newDescriptor.skip && options.set) {
							if (typeof options.set === 'string')
								descriptor[options.set] = newDescriptor;
							else
								options.set(env, descriptor, newDescriptor);
						}
						return;
					}
					env.error = false;
					env.string = string;
				}
				env.error = true;
			});
		},
		one: function(rule) {
			var opt = (typeof rule === 'string' ||  (rule && rule.__elenpi__)) ? {
				rule: rule
			} : rule;
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					env.error = true;
					return;
				}
				// Parser.counts.countOne++;
				var options = opt,
					newDescriptor = options.as ? options.as(env, descriptor) : (options.set ? {} : descriptor);
				exec(options.rule, newDescriptor, env);
				if (!env.error && !newDescriptor.skip && options.set) {
					if (typeof options.set === 'string')
						descriptor[options.set] = newDescriptor;
					else
						options.set(env, descriptor, newDescriptor);
				}
			});
		},
		skip: function() {
			return this.done(function(env, descriptor) {
				descriptor.skip = true;
			});
		},
		space: function(needed) {
			return this.done(function(env, descriptor) {
				if (!env.string.length) {
					if (needed)
						env.error = true;
					return;
				}
				var cap = (env.parser.rules.space || defaultSpaceRegExp).exec(env.string);
				if (cap)
					env.string = env.string.substring(cap[0].length);
				else if (needed)
					env.error = true;
			});
		},
		end: function(needed) {
			return this.done(function(env, descriptor) {
				if (!env.string.length)
					env.stop = true;
				else if (needed)
					env.error = true;
			});
		}
	};

	var Parser = function(rules, defaultRule) {
		this.rules = rules;
		this.defaultRule = defaultRule;
	};
	Parser.prototype = {
		exec: function(rule, descriptor, env) {
			exec(rule, descriptor, env);
		},
		parse: function(string, rule, descriptor, env) {
			env = env || {};
			descriptor = descriptor || {};
			env.parser = this;
			env.soFar = Infinity;
			env.string = string;
			if (!rule)
				rule = this.rules[this.defaultRule];
			exec(rule, descriptor, env);
			if (env.error || env.string.length) {
				var pos = string.length - env.soFar;
				// todo : catch line number
				console.error('elenpi parsing failed : (pos:' + pos + ') near :\n', string.substring(Math.max(pos - 1, 0), pos + 50));
				return false;
			}
			return descriptor;
		}
	};

	// 	Parser.counts = {
	// 	countTerminalTest: 0,
	// 	countTerminalMatched: 0,
	// 	countOneOf: 0,
	// 	countOneOfs: 0,
	// 	countExec: 0,
	// 	countXorMore: 0,
	// 	countXorMores: 0,
	// 	countZeroOrOne: 0,
	// 	countOne: 0
	// };

	var elenpi = {
		r: function() {
			return new Rule();
		},
		Rule: Rule,
		Parser: Parser
	};

	if (typeof module !== 'undefined' && module.exports)
		module.exports = elenpi; // use common js if avaiable
	else this.elenpi = elenpi; // assign to global window
})();
//___________________________________________________
},{}],30:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":42}],31:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":62}],32:[function(require,module,exports){
var h = require("./virtual-hyperscript/index.js")

module.exports = h

},{"./virtual-hyperscript/index.js":49}],33:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],34:[function(require,module,exports){
arguments[4][19][0].apply(exports,arguments)
},{"dup":19,"individual/one-version":36}],35:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],36:[function(require,module,exports){
arguments[4][21][0].apply(exports,arguments)
},{"./index.js":35,"dup":21}],37:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":1}],38:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],39:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],40:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":45}],41:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":53,"is-object":38}],42:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":51,"../vnode/is-vnode.js":54,"../vnode/is-vtext.js":55,"../vnode/is-widget.js":56,"./apply-properties":41,"global/document":37}],43:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],44:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":56,"../vnode/vpatch.js":59,"./apply-properties":41,"./update-widget":46}],45:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":42,"./dom-index":43,"./patch-op":44,"global/document":37,"x-is-array":39}],46:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":56}],47:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":34}],48:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],49:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":52,"../vnode/is-vhook":53,"../vnode/is-vnode":54,"../vnode/is-vtext":55,"../vnode/is-widget":56,"../vnode/vnode.js":58,"../vnode/vtext.js":60,"./hooks/ev-hook.js":47,"./hooks/soft-set-hook.js":48,"./parse-tag.js":50,"x-is-array":39}],50:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":33}],51:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":52,"./is-vnode":54,"./is-vtext":55,"./is-widget":56}],52:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],53:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],54:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":57}],55:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":57}],56:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],57:[function(require,module,exports){
module.exports = "2"

},{}],58:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":52,"./is-vhook":53,"./is-vnode":54,"./is-widget":56,"./version":57}],59:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":57}],60:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":57}],61:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":53,"is-object":38}],62:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":51,"../vnode/is-thunk":52,"../vnode/is-vnode":54,"../vnode/is-vtext":55,"../vnode/is-widget":56,"../vnode/vpatch":59,"./diff-props":61,"x-is-array":39}],63:[function(require,module,exports){
Babelute = require('../index');
require('../languages/html');
require('../babelute-html/html-view');
Babelute.extendLexic('html', 'myhtml');

var h = Babelute.initializer('myhtml');

Babelute.toLexic('myhtml', {
	filterableProductsTable: function(products) {
		return this.view({
			filterProducts: function(filter, products) {
				return products.filter(function(prod) {
					return prod.title.indexOf(filter) > -1;
				});
			},
			getInitialState: function() {
				return {
					filter: ''
				};
			},
			render: function(state) {
				return h.div(
					h.class('filterable-products-table')
					.searchBar(state.filter, function(e) {
						state.set({
							filter: e.target.value
						});
					})
					.productsTable(this.filterProducts(state.filter, products))
					.button('add one', h.click(function(e) {
						products.unshift({
							title: 'haaaiiu' + Math.random(),
							label: 'youhou'
						});
						state.render();
					}))
				);
			}
		});
	},
	productsTable: function(products) {
		return this.div(
			h.class('products-table')
			._each(products, this.product)
		);
	},
	product: function(product) {
		return this.div(
			h.class('product-row')
			.h3(product.title)
			.div(product.label)
		);
	},
	searchBar: function(filter, updateFilter) {
		return this.div(
			h.class('search-bar')
			.textInput(filter,
				h.attr('placeHolder', 'search term')
				.on('input', updateFilter)
			)
		);
	}
});

/**
 * usage
 */



function render3() {
	var t = h.div('world' + Math.random(),
		h.attr('bloupi', 'foo')
		.h3('hooooooo' + Math.random())
		.section('hello',
			h.div('hoooooojjjjjjo')
		)
	)
	for (var i = 0; i < 500; ++i)
		t.div('world' + Math.random(),
			h.attr('bloupi', 'foo')
			.h3('hooooooo' + Math.random())
			.section('hello',
				h.div('hoooooojjjjjjo')
			)
			.click(function(e) {
				console.log('heu')
			})
		);
	return t;
}

function render2() {
	return h
		.text('bloupiiii')
		.div(h.span('hiii'))
		.filterableProductsTable([{
			title: 'hoooo' + Math.random(),
			label: 'hissss'
		}, {
			title: 'haaa' + Math.random(),
			label: 'huussss'
		}, {
			title: 'hiiio' + Math.random(),
			label: 'heeessss'
		}])
		.div('yeeeeeehaaaaa');
}

var t = render2();

function render() {
	return t;
}


/**
 * outputs
 */

require('../languages/actions/html-to-string');
require('../languages/actions/html-to-dom');
require('../babelute-html/html-to-vdom');
require('../babelute-html/html-to-deathmood');

// console.log('j : %s', JSON.stringify(t))
// console.log('t : %s', t._stringify())
// console.log('r : %s', t.$htmlToString());

// 

function testJSON(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		JSON.stringify(render());
	}
	time = new Date().valueOf() - time;
	console.log('JSON', time)
}

function testStringify(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render()._stringify();
	}
	time = new Date().valueOf() - time;
	console.log('Serialize', time)
}

function testString(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render().$htmlToString();
	}
	time = new Date().valueOf() - time;
	console.log('html:string', time)
}

function testDom(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		$root.innerHTML = '';
		render().$htmlToDOM($root)
	}
	time = new Date().valueOf() - time;
	$root.innerHTML = '';
	console.log('html:dom', time)
}

function testVdom(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToVDOM($root, nt)
	}
	time = new Date().valueOf() - time;
	console.log('html:vdom', time)
}

function testDeathmood(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToDeathmood($root, nt);
	}
	time = new Date().valueOf() - time;
	console.log('deathmood1', time)
}


function runAll(max, render) {
	console.log('________________');
	// testJSON(max, render);
	// testStringify(max, render);
	// testString(max, render);
	testDeathmood(max, render);
	// testDom(max, render);
	// testVdom(max, render);
}


var $root = document.getElementById('root'),
	$reload = document.getElementById('test-button');

$reload.addEventListener('click', function() {
	runAll(1, render3);
});


runAll(1, render3);

//
},{"../babelute-html/html-to-deathmood":3,"../babelute-html/html-to-vdom":4,"../babelute-html/html-view":5,"../index":7,"../languages/actions/html-to-dom":8,"../languages/actions/html-to-string":9,"../languages/html":10}]},{},[63])(63)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC40LjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8ubnZtL3ZlcnNpb25zL25vZGUvdjQuNC40L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiYmFiZWx1dGUtaHRtbC9kZWF0aG1vb2QtdmRvbS5qcyIsImJhYmVsdXRlLWh0bWwvaHRtbC10by1kZWF0aG1vb2QuanMiLCJiYWJlbHV0ZS1odG1sL2h0bWwtdG8tdmRvbS5qcyIsImJhYmVsdXRlLWh0bWwvaHRtbC12aWV3LmpzIiwiYmFiZWx1dGUtaHRtbC92aWV3LXN0YXRlLmpzIiwiaW5kZXguanMiLCJsYW5ndWFnZXMvYWN0aW9ucy9odG1sLXRvLWRvbS5qcyIsImxhbmd1YWdlcy9hY3Rpb25zL2h0bWwtdG8tc3RyaW5nLmpzIiwibGFuZ3VhZ2VzL2h0bWwuanMiLCJsaWIvYmFiZWx1dGUuanMiLCJsaWIvZmlyc3QtbGV2ZWwtYmFiZWx1dGUuanMiLCJsaWIvcGFyc2VyLmpzIiwibGliL3N0cmluZ2lmeS5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2FkZC1ldmVudC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2RvbS1kZWxlZ2F0b3IuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9jdWlkL2Rpc3QvYnJvd3Nlci1jdWlkLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL29uZS12ZXJzaW9uLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2NyZWF0ZS1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy93ZWFrbWFwLXNoaW0vaGlkZGVuLXN0b3JlLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcHJveHktZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9yZW1vdmUtZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZWxlbnBpL3YyLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2RpZmYuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3BhdGNoLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vZG9tLWluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vcGF0Y2gtb3AuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9wYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9ob29rcy9ldi1ob29rLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaG9va3Mvc29mdC1zZXQtaG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92aXJ0dWFsLWh5cGVyc2NyaXB0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvcGFyc2UtdGFnLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2hhbmRsZS10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12aG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12dGV4dC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92cGF0Y2guanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdnRleHQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdnRyZWUvZGlmZi1wcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92dHJlZS9kaWZmLmpzIiwicGxheWdyb3VuZC9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hjQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVYQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNhQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIiLCIvKipcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnNcbiAqIEBsaWNlbmNlIE1JVFxuICogQGNvcHlyaWdodCAyMDE2IEdpbGxlcyBDb29tYW5zXG4gKiBcbiAqIFNpbXBsZSB2aXJ0dWFsIGRvbSBkaWZmaW5nIChmaW5hbGx5IHF1aXRlIGZhc3QpIDogQmFzZWQgb24gOlxuICogaHR0cHM6Ly9tZWRpdW0uY29tL0BkZWF0aG1vb2QvaG93LXRvLXdyaXRlLXlvdXItb3duLXZpcnR1YWwtZG9tLWVlNzRhY2MxMzA2MCMuYmFrdTh2Ync4XG4gKiBhbmRcbiAqIGh0dHBzOi8vbWVkaXVtLmNvbS9AZGVhdGhtb29kL3dyaXRlLXlvdXItdmlydHVhbC1kb20tMi1wcm9wcy1ldmVudHMtYTk1NzYwOGY1Yzc2Iy42c3FtZGp1dnpcbiAqXG4gKiBBZGRlZCA6IFxuICogPT4gRG9jRnJhZ21lbnQgbWFuYWdlbWVudCAoYWthIHZub2RlID0geyB0eXBlOidmcmFnbWVudCcsIGNoaWxkcmVuOlsuLi5dLCBwcm9wczp7fSB9KSAoZS5nIHVzZWZ1bCBmb3IgY29tcG9uZW50KVxuICpcbiAqIE1haW4gY29kZSBjaGFuZ2UgOiBcbiAqID0+IHN0b3JlIGRvbSBub2RlJ3MgcmVmIGluIGFzc29jaWF0ZWQgdm5vZGUsIG5vIG1vcmUgdXNlIG9mIGNoaWxkIGluZGV4XG4gKiA9PiBiZXR0ZXIgZXZlbnRzIGxpc3RlbmVyIG1hbmFnZW1lbnQgKGFsd2F5cyByZW1vdmUgb2xkcyArIGFkZCBuZXdzKVxuICpcbiAqIEB1c2FnZVxuICogXHRcdGNvbnN0IGRlYXRobW9vZCA9IHJlcXVpcmUoJ2RlYXRobW9vZC12ZG9tJyksXG4gKiBcdFx0XHRoID0gZGVhdGhtb29kLmNyZWF0ZVZOb2RlO1xuICpcbiAqIFx0XHRmdW5jdGlvbiByZW5kZXIoKXtcbiAqIFx0XHRcdHJldHVybiBoKCdmcmFnbWVudCcsIG51bGwsIFtcbiAqIFx0XHRcdFx0XHRoKCdkaXYnLCBcbiAqIFx0XHRcdFx0XHRcdHsgY2xhc3NOYW1lOidmb28nLCBpZDonYmFyJywgbXlBdHRyOid6b28nIH0sIC8vIGF0dHJpYnV0ZXNcbiAqIFx0XHRcdFx0XHRcdFsgLy8gY2hpbGRyZW5cbiAqIFx0XHRcdFx0XHRcdFx0aCgnc3BhbicsIG51bGwsIFsnaGVsbG8gd29ybGQnXSlcbiAqIFx0XHRcdFx0XHRcdF0sXG4gKiBcdFx0XHRcdFx0XHRbIC8vIGV2ZW50c1xuICogXHRcdFx0XHRcdFx0XHR7IFxuICogXHRcdFx0XHRcdFx0XHRcdG5hbWU6J2NsaWNrJywgXG4gKiBcdFx0XHRcdFx0XHRcdFx0Y2FsbGJhY2s6ZnVuY3Rpb24oZSl7IC4uLiB9XG4gKiBcdFx0XHRcdFx0XHRcdH1cbiAqIFx0XHRcdFx0XHRcdF1cbiAqIFx0XHRcdFx0XHQpLFxuICogXHRcdFx0XHRcdGgoJ3NlY3Rpb24nLCAuLi4pXG4gKiBcdFx0XHRcdFx0Li4uXG4gKiBcdFx0XHRcdF0pO1xuICogXHRcdH1cbiAqIFx0XHRcbiAqICBcdC8vIC4uLlxuICogIFx0dmFyIG9sZFZOb2RlO1xuICpcdCAgXHQvLy4uLlxuICpcdCAgXHR2YXIgbmV3Vk5vZGUgPSByZW5kZXIoKTtcbiAqXHQgIFx0ZGVhdGhtb29kLnVwZGF0ZShkb2N1bWVudC5ib2R5LCBuZXdWTm9kZSwgb2xkVk5vZGUpO1xuICpcdCAgXHRvbGRWTm9kZSA9IG5ld1ZOb2RlO1xuICovXG5cbmZ1bmN0aW9uIGNyZWF0ZUVsZW1lbnQoJHBhcmVudCwgdm5vZGUpIHtcblx0aWYgKHR5cGVvZiB2bm9kZS50ZXh0ICE9PSAndW5kZWZpbmVkJylcblx0XHRyZXR1cm4gdm5vZGUubm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpOyAvLyBzdG9yZSB0ZXh0LW5vZGUgaW4gdm5vZGVcblx0dmFyICRlbDtcblx0aWYgKHZub2RlLnR5cGUgPT09ICdmcmFnbWVudCcpIHtcblx0XHR2bm9kZS5wYXJlbnQgPSAkcGFyZW50OyAvLyBzdG9yZSBwYXJlbnQgaW4gdm5vZGUsIGtlZXAgJHBhcmVudCBhcyByZWN1cnNpb24gcGFyZW50XG5cdFx0JGVsID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuXHR9IGVsc2UgeyAvLyBpcyBhIHRhZ1xuXHRcdCRwYXJlbnQgPSB2bm9kZS5ub2RlID0gJGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh2bm9kZS50eXBlKTsgLy8gc3RvcmUgZG9tLW5vZGUgaW4gdm5vZGUsIHNldCByZWN1cnNpb24gcGFyZW50IGFzIHByb2R1Y2VkIG5vZGVcblx0XHRzZXRMb2NhbHMoJGVsLCB2bm9kZSk7IC8vIHNldCBwcm9wcyBhbmQgbGlzdGVuZXJzXG5cdH1cblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKSAvLyByZWN1cnNpb24gb24gdm5vZGUgY2hpbGRyZW5cblx0XHQkZWwuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudCgkcGFyZW50LCB2bm9kZS5jaGlsZHJlbltpXSkpO1xuXHRyZXR1cm4gJGVsOyAvLyBEb2N1bWVudEZyYWdtZW50IG9yIERvbU5vZGVcbn1cblxuZnVuY3Rpb24gdXBkYXRlKCRwYXJlbnQsIG5ld05vZGUsIG9sZE5vZGUpIHtcblx0aWYgKCFvbGROb2RlKVxuXHRcdCRwYXJlbnQuYXBwZW5kQ2hpbGQoY3JlYXRlRWxlbWVudCgkcGFyZW50LCBuZXdOb2RlKSk7XG5cblx0ZWxzZSBpZiAoIW5ld05vZGUpXG5cdFx0cmVtb3ZlRWxlbWVudChvbGROb2RlKTsgLy8gcmVtb3ZlIGZyYWdtZW50IG9yIG5vZGVcblxuXHRlbHNlIGlmIChjaGFuZ2VkKG5ld05vZGUsIG9sZE5vZGUpKSB7XG5cdFx0Ly8gKHZub2RlIHR5cGUgb3IgdGV4dCB2YWx1ZSkgaGFzIGNoYW5nZWRcblx0XHQkcGFyZW50Lmluc2VydEJlZm9yZShjcmVhdGVFbGVtZW50KCRwYXJlbnQsIG5ld05vZGUpLCBmaXJzdEVsZW1lbnQob2xkTm9kZSkpO1xuXHRcdHJlbW92ZUVsZW1lbnQob2xkTm9kZSk7IC8vIHJlbW92ZSBmcmFnbWVudCBvciBub2RlXG5cblx0fSBlbHNlIGlmIChuZXdOb2RlLnR5cGUpIC8vIGlzIG5vdCBhIHRleHQgbm9kZSwgbm8gdHlwZSBjaGFuZ2Vcblx0XHR1cGRhdGVFbGVtZW50KG5ld05vZGUsIG9sZE5vZGUpO1xuXG5cdGVsc2UgLy8gaXMgYSB0ZXh0IG5vZGVcblx0XHRuZXdOb2RlLm5vZGUgPSBvbGROb2RlLm5vZGU7IC8vIGZvcndhcmQgbm9kZSB0byBuZXcgdm5vZGVcbn1cblxuZnVuY3Rpb24gdXBkYXRlRWxlbWVudChuZXdOb2RlLCBvbGROb2RlKSB7XG5cdHZhciBzdWJQYXJlbnQ7XG5cdGlmIChuZXdOb2RlLnR5cGUgIT09ICdmcmFnbWVudCcpIHsgLy8gaXMgYSB0YWdcblx0XHQvLyB1cGRhdGUgcHJvcHMgYW5kIGxpc3RlbmVyc1xuXHRcdHVwZGF0ZUxvY2FscyhvbGROb2RlLm5vZGUsIG5ld05vZGUsIG9sZE5vZGUpO1xuXHRcdC8vIGZvcndhcmQgbm9kZSB0byBuZXcgdmRvbSwgc2V0IHN1YnBhcmVudCBhcyB0YWcncyBub2RlIChzbyBub3JtYWwgcmVjdXJzaW9uKVxuXHRcdHN1YlBhcmVudCA9IG5ld05vZGUubm9kZSA9IG9sZE5vZGUubm9kZTtcblx0fSBlbHNlIC8vIGlzIGZyYWdtZW50IDogZm9yd2FyZCBwYXJlbnQgaW4gbmV3IHZub2RlLCBzZXQgc3ViUGFyZW50IGFzICRwYXJlbnQgKHRyYW5zcGFyZW50IHJlY3Vyc2lvbilcblx0XHRzdWJQYXJlbnQgPSBuZXdOb2RlLnBhcmVudCA9IG9sZE5vZGUucGFyZW50O1xuXG5cdGNvbnN0IGxlbiA9IE1hdGgubWF4KG5ld05vZGUuY2hpbGRyZW4ubGVuZ3RoLCBvbGROb2RlLmNoaWxkcmVuLmxlbmd0aCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG5cdFx0dXBkYXRlKHN1YlBhcmVudCwgbmV3Tm9kZS5jaGlsZHJlbltpXSwgb2xkTm9kZS5jaGlsZHJlbltpXSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUxvY2FscygkdGFyZ2V0LCBuZXdOb2RlLCBvbGROb2RlKSB7XG5cdHZhciBwcm9wcyA9IGFzc2lnbih7fSwgbmV3Tm9kZS5wcm9wcywgb2xkTm9kZS5wcm9wcyk7XG5cdGZvciAodmFyIGkgaW4gcHJvcHMpXG5cdFx0dXBkYXRlUHJvcCgkdGFyZ2V0LCBpLCBuZXdOb2RlLnByb3BzW2ldLCBvbGROb2RlLnByb3BzW2ldKTtcblx0Ly8gcmVtb3ZlIGFsbCBvbGRzIGFuZCBhZGQgYWxsIG5ld3MgZXZlbnRzIGxpc3RlbmVyIDogbm90IHJlYWxseSBwZXJmb3JtYW5jZSBvcmllbnRlZCBcblx0Ly8gYnV0IGRvIHRoZSBqb2IgZm9yIG11bHRpcGxlIGV2ZW50cyBoYW5kbGVyIHdpdGggc2FtZSBuYW1lIChha2EgY2xpY2spXG5cdGlmIChvbGROb2RlLm9uKVxuXHRcdG9sZE5vZGUub24uZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0JHRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50Lm5hbWUsIGV2ZW50LmNhbGxiYWNrKTtcblx0XHR9KTtcblx0aWYgKG5ld05vZGUub24pXG5cdFx0bmV3Tm9kZS5vbi5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQkdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQubmFtZSwgZXZlbnQuY2FsbGJhY2spO1xuXHRcdH0pO1xufVxuXG5mdW5jdGlvbiBzZXRMb2NhbHMoJHRhcmdldCwgbm9kZSkge1xuXHRmb3IgKHZhciBpIGluIG5vZGUucHJvcHMpXG5cdFx0c2V0UHJvcCgkdGFyZ2V0LCBpLCBub2RlLnByb3BzW2ldKTtcblx0aWYgKG5vZGUub24pXG5cdFx0bm9kZS5vbi5mb3JFYWNoKGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHQkdGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQubmFtZSwgZXZlbnQuY2FsbGJhY2spO1xuXHRcdH0pO1xufVxuXG5mdW5jdGlvbiByZW1vdmVFbGVtZW50KHZub2RlKSB7XG5cdGlmICh2bm9kZS50eXBlICE9PSAnZnJhZ21lbnQnKVxuXHRcdHZub2RlLm5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh2bm9kZS5ub2RlKTtcblx0ZWxzZVxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSB2bm9kZS5jaGlsZHJlbi5sZW5ndGg7IGkgPCBsZW47ICsraSlcblx0XHRcdHJlbW92ZUVsZW1lbnQodm5vZGUuY2hpbGRyZW5baV0pO1xufVxuXG5mdW5jdGlvbiBmaXJzdEVsZW1lbnQodm5vZGUpIHtcblx0aWYgKHZub2RlLnR5cGUgIT09ICdmcmFnbWVudCcpXG5cdFx0cmV0dXJuIHZub2RlLm5vZGU7XG5cdHJldHVybiBmaXJzdEVsZW1lbnQodm5vZGUuY2hpbGRyZW5bMF0pO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VkKG5vZGUxLCBub2RlMikge1xuXHRyZXR1cm4gbm9kZTEudHlwZSAhPT0gbm9kZTIudHlwZSB8fCBub2RlMS50ZXh0ICE9PSBub2RlMi50ZXh0O1xufVxuXG5mdW5jdGlvbiBzZXRQcm9wKCR0YXJnZXQsIG5hbWUsIHZhbHVlKSB7XG5cdGlmIChuYW1lID09PSAnY2xhc3NOYW1lJylcblx0XHQkdGFyZ2V0LnNldEF0dHJpYnV0ZSgnY2xhc3MnLCB2YWx1ZSk7XG5cdGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKVxuXHRcdHNldEJvb2xlYW5Qcm9wKCR0YXJnZXQsIG5hbWUsIHZhbHVlKTtcblx0ZWxzZVxuXHRcdCR0YXJnZXQuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbn1cblxuZnVuY3Rpb24gc2V0Qm9vbGVhblByb3AoJHRhcmdldCwgbmFtZSwgdmFsdWUpIHtcblx0aWYgKHZhbHVlKSB7XG5cdFx0JHRhcmdldC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuXHRcdCR0YXJnZXRbbmFtZV0gPSB0cnVlO1xuXHR9IGVsc2Vcblx0XHQkdGFyZ2V0W25hbWVdID0gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUJvb2xlYW5Qcm9wKCR0YXJnZXQsIG5hbWUpIHtcblx0JHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG5cdCR0YXJnZXRbbmFtZV0gPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcCgkdGFyZ2V0LCBuYW1lLCB2YWx1ZSkge1xuXHRpZiAobmFtZSA9PT0gJ2NsYXNzTmFtZScpXG5cdFx0JHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUoJ2NsYXNzJyk7XG5cdGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nKVxuXHRcdHJlbW92ZUJvb2xlYW5Qcm9wKCR0YXJnZXQsIG5hbWUpO1xuXHRlbHNlXG5cdFx0JHRhcmdldC5yZW1vdmVBdHRyaWJ1dGUobmFtZSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVByb3AoJHRhcmdldCwgbmFtZSwgbmV3VmFsLCBvbGRWYWwpIHtcblx0aWYgKCFuZXdWYWwpXG5cdFx0cmVtb3ZlUHJvcCgkdGFyZ2V0LCBuYW1lLCBvbGRWYWwpO1xuXHRlbHNlIGlmICghb2xkVmFsIHx8IG5ld1ZhbCAhPT0gb2xkVmFsKVxuXHRcdHNldFByb3AoJHRhcmdldCwgbmFtZSwgbmV3VmFsKTtcbn1cblxuLy8gT2JqZWN0LmFzc2lnbiBpbW1pdGF0aW9uIChvbmx5IGZvciAxIG9yIDIgYXJndW1lbnRzIGFzIG5lZWRlZCBoZXJlKVxuZnVuY3Rpb24gYXNzaWduKCRyb290LCBvYmosIG9iajIpIHtcblx0Zm9yICh2YXIgaSBpbiBvYmopXG5cdFx0JHJvb3RbaV0gPSBvYmpbaV07XG5cdGZvciAodmFyIGkgaW4gb2JqMilcblx0XHQkcm9vdFtpXSA9IG9iajJbaV07XG5cdHJldHVybiAkcm9vdDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZVZOb2RlOiBmdW5jdGlvbih0eXBlLCBwcm9wcywgY2hpbGRyZW4sIGV2ZW50cykge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0eXBlOiB0eXBlLFxuXHRcdFx0cHJvcHM6IHByb3BzIHx8IHt9LFxuXHRcdFx0Y2hpbGRyZW46IGNoaWxkcmVuIHx8IFtdLFxuXHRcdFx0b246IGV2ZW50cyB8fCBudWxsXG5cdFx0fTtcblx0fSxcblx0dXBkYXRlOiB1cGRhdGUsXG5cdGZpcnN0RWxlbWVudDogZmlyc3RFbGVtZW50XG59OyIsInZhciBkZWF0aG1vb2QgPSByZXF1aXJlKCcuL2RlYXRobW9vZC12ZG9tJyksXG5cdEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vbGliL2JhYmVsdXRlJyksXG5cdFN0YXRlID0gcmVxdWlyZSgnLi92aWV3LXN0YXRlJyk7XG5cbnJlcXVpcmUoJy4uL2xhbmd1YWdlcy9odG1sJyk7XG5cbkJhYmVsdXRlLnRvTGV4aWMoJ2h0bWwnLCAndmlldycpXG5cdC50b0FjdGlvbnMoJ2h0bWw6ZGVhdGhtb29kJywge1xuXHRcdHZpZXc6IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MgLyogb3B0cyAqLyApIHtcblx0XHRcdHZhciBzdGF0ZTtcblx0XHRcdGNvbnN0IG9wdHMgPSBhcmdzWzBdLFxuXHRcdFx0XHRmcmFnID0ge1xuXHRcdFx0XHRcdHR5cGU6ICdmcmFnbWVudCcsXG5cdFx0XHRcdFx0cHJvcHM6IHt9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcblx0XHRcdFx0fSxcblx0XHRcdFx0ZG9SZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgdm5vZGUgPSB7XG5cdFx0XHRcdFx0XHR0eXBlOiAnZnJhZ21lbnQnLFxuXHRcdFx0XHRcdFx0cHJvcHM6IHt9LFxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0b3B0cy5yZW5kZXIoc3RhdGUpLiRvdXRwdXQoZW52LCB2bm9kZSk7XG5cdFx0XHRcdFx0aWYgKGZyYWcucGFyZW50KVxuXHRcdFx0XHRcdFx0ZGVhdGhtb29kLnVwZGF0ZShmcmFnLnBhcmVudCwgdm5vZGUsIGZyYWcpO1xuXHRcdFx0XHRcdGZyYWcuY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvUmVuZGVyKTtcblx0XHRcdFx0fTtcblx0XHRcdHZub2RlLmNoaWxkcmVuLnB1c2goZnJhZyk7XG5cdFx0XHRzdGF0ZSA9IG5ldyBTdGF0ZShvcHRzLmdldEluaXRpYWxTdGF0ZSA/IG9wdHMuZ2V0SW5pdGlhbFN0YXRlKCkgOiB7fSwgcmVuZGVyKTtcblx0XHRcdGRvUmVuZGVyKCk7XG5cdFx0fSxcblx0XHR0YWc6IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MgLypuYW1lLCBiYWJlbHV0ZXMqLyApIHtcblx0XHRcdGNvbnN0IHRhZyA9IHtcblx0XHRcdFx0dHlwZTogYXJnc1swXSxcblx0XHRcdFx0cHJvcHM6IHt9LFxuXHRcdFx0XHRjaGlsZHJlbjogW11cblx0XHRcdH07XG5cdFx0XHR2bm9kZS5jaGlsZHJlbi5wdXNoKHRhZyk7XG5cdFx0XHRhcmdzWzFdLmZvckVhY2goZnVuY3Rpb24odGVtcGwpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiB0ZW1wbCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRpZiAodGVtcGwuX19iYWJlbHV0ZV9fKSB7XG5cdFx0XHRcdFx0dGVtcGwuJG91dHB1dChlbnYsIHRoaXMpO1xuXHRcdFx0XHR9IGVsc2Vcblx0XHRcdFx0XHR0aGlzLmNoaWxkcmVuLnB1c2goe1xuXHRcdFx0XHRcdFx0dGV4dDogdGVtcGwgKyAnJ1xuXHRcdFx0XHRcdH0pO1xuXHRcdFx0fSwgdGFnKTtcblx0XHR9LFxuXHRcdGF0dHI6IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MgLyogbmFtZSwgdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wc1thcmdzWzBdXSA9IGFyZ3NbMV07XG5cdFx0fSxcblx0XHRwcm9wOiBmdW5jdGlvbihlbnYsIHZub2RlLCBhcmdzIC8qIG5hbWUsIGZsYWcgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wc1thcmdzWzBdXSA9IGFyZ3NbMV07XG5cdFx0fSxcblx0XHRjbGFzczogZnVuY3Rpb24oZW52LCB2bm9kZSwgYXJncyAvKiBuYW1lICovICkge1xuXHRcdFx0dm5vZGUucHJvcHMuY2xhc3NOYW1lID0gKHZub2RlLnByb3BzLmNsYXNzTmFtZSB8fCAnJykgKyAnICcgKyBhcmdzWzBdO1xuXHRcdH0sXG5cdFx0aWQ6IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wcy5pZCA9IGFyZ3NbMF07XG5cdFx0fSxcblx0XHR0ZXh0OiBmdW5jdGlvbihlbnYsIHZub2RlLCBhcmdzIC8qIHZhbHVlICovICkge1xuXHRcdFx0dm5vZGUuY2hpbGRyZW4ucHVzaCh7XG5cdFx0XHRcdHRleHQ6IGFyZ3NbMF1cblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0b246IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MgLyogZXZlbnQsIGNhbGxiYWNrICovICkge1xuXHRcdFx0dm5vZGUub24gPSB2bm9kZS5vbiB8fCBbXTtcblx0XHRcdHZub2RlLm9uLnB1c2goe1xuXHRcdFx0XHRuYW1lOiBhcmdzWzBdLFxuXHRcdFx0XHRjYWxsYmFjazogYXJnc1sxXVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KTtcblxuQmFiZWx1dGUucHJvdG90eXBlLiRodG1sVG9EZWF0aG1vb2QgPSBmdW5jdGlvbihub2RlLCBvbGRGcmFnbWVudCkge1xuXHR2YXIgZnJhZyA9IHtcblx0XHR0eXBlOiAnZnJhZ21lbnQnLFxuXHRcdHByb3BzOiB7fSxcblx0XHRjaGlsZHJlbjogW11cblx0fTtcblx0dGhpcy4kb3V0cHV0KCdodG1sOmRlYXRobW9vZCcsIGZyYWcpO1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0ZGVhdGhtb29kLnVwZGF0ZShub2RlLCBmcmFnLCBvbGRGcmFnbWVudCk7XG5cdH0pO1xuXHRyZXR1cm4gZnJhZztcbn07XG5cbi8vIiwiY29uc3QgQmFiZWx1dGUgPSByZXF1aXJlKCcuLi9saWIvYmFiZWx1dGUnKSxcblx0U3RhdGUgPSByZXF1aXJlKCcuL3ZpZXctc3RhdGUnKSxcblx0dmggPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9oJyksXG5cdGRpZmYgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9kaWZmJyksXG5cdHBhdGNoID0gcmVxdWlyZSgndmlydHVhbC1kb20vcGF0Y2gnKSxcblx0Y3JlYXRlRWxlbWVudCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL2NyZWF0ZS1lbGVtZW50Jyk7XG5cbnJlcXVpcmUoJy4uL2xhbmd1YWdlcy9odG1sJyk7XG5jb25zdCBocCA9IEJhYmVsdXRlLmluaXRpYWxpemVyKCdodG1sJyk7XG5cbi8qKlxuICogRm9yIGV2LSogbWFuYWdlbWVudCBmcm9tIHZpcnR1YWxkb21cbiAqL1xuY29uc3QgRGVsZWdhdG9yID0gcmVxdWlyZShcImRvbS1kZWxlZ2F0b3JcIiksXG5cdGRlbCA9IERlbGVnYXRvcigpO1xuXG4vKipcbiAqIHZkb20gYWN0aW9uc1xuICovXG5CYWJlbHV0ZS50b0xleGljKCdodG1sJywgWyd2aWV3J10pXG5cdC50b0FjdGlvbnMoJ2h0bWw6dmRvbScsIHtcblx0XHRfX3Jlc3RyaWN0aW9uc19fOiB7XG5cdFx0XHRodG1sOiB0cnVlLFxuXHRcdFx0J2h0bWw6dmRvbSc6IHRydWVcblx0XHR9LFxuXHRcdHZpZXc6IGZ1bmN0aW9uKGVudiwgdm5vZGUsIGFyZ3MpIHtcblx0XHRcdHZhciBvcHRzID0gYXJnc1swXSxcblx0XHRcdFx0b2xkVHJlZSxcblx0XHRcdFx0cm9vdE5vZGUsXG5cdFx0XHRcdHN0YXRlLFxuXHRcdFx0XHRkb1JlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBkZXNjcmlwdG9yID0ge1xuXHRcdFx0XHRcdFx0XHRwcm9wZXJ0aWVzOiB7fSxcblx0XHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxuXHRcdFx0XHRcdFx0XHRzZWxlY3RvcjogJydcblx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRvdXRwdXRCYWJlbHV0ZSA9IG9wdHMucmVuZGVyKHN0YXRlKTtcblxuXHRcdFx0XHRcdC8vIHJlbmRlciBuZXcgbm9kZXNcblx0XHRcdFx0XHRvdXRwdXRCYWJlbHV0ZS4kb3V0cHV0KGVudiwgZGVzY3JpcHRvcik7XG5cdFx0XHRcdFx0dmFyIHRyZWUgPSB2aCgnZGl2JywgZGVzY3JpcHRvci5wcm9wZXJ0aWVzLCBkZXNjcmlwdG9yLmNoaWxkcmVuKTtcblxuXHRcdFx0XHRcdGlmICghcm9vdE5vZGUpIHsgLy8gZmlyc3QgcmVuZGVyXG5cdFx0XHRcdFx0XHRyb290Tm9kZSA9IGNyZWF0ZUVsZW1lbnQodHJlZSk7XG5cdFx0XHRcdFx0XHRub2RlLmFwcGVuZENoaWxkKHJvb3ROb2RlKTtcblx0XHRcdFx0XHR9IGVsc2UgeyAvLyByZXJlbmRlclxuXHRcdFx0XHRcdFx0dmFyIHBhdGNoZXMgPSBkaWZmKG9sZFRyZWUsIHRyZWUpO1xuXHRcdFx0XHRcdFx0cm9vdE5vZGUgPSBwYXRjaChyb290Tm9kZSwgcGF0Y2hlcyk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG9sZFRyZWUgPSB0cmVlO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9SZW5kZXIpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRzdGF0ZSA9IG5ldyBTdGF0ZShvcHRzLmdldEluaXRpYWxTdGF0ZSA/IG9wdHMuZ2V0SW5pdGlhbFN0YXRlKCkgOiB7fSwgcmVuZGVyKTtcblxuXHRcdFx0ZG9SZW5kZXIoKTtcblx0XHR9LFxuXHRcdHRhZzogZnVuY3Rpb24ob3B0cywgdm5vZGUsIGFyZ3MgLyogdGFnTmFtZSwgYmFiZWx1dGVzICovICkge1xuXHRcdFx0dmFyIGRlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdHByb3BlcnRpZXM6IHt9LFxuXHRcdFx0XHRjaGlsZHJlbjogW10sXG5cdFx0XHRcdHNlbGVjdG9yOiAnJ1xuXHRcdFx0fTtcblx0XHRcdGFyZ3NbMV0uZm9yRWFjaChmdW5jdGlvbih0ZW1wbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHRlbXBsID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGlmICh0ZW1wbC5fX2JhYmVsdXRlX18pXG5cdFx0XHRcdFx0dGVtcGwuJG91dHB1dChvcHRzLCBkZXNjcmlwdG9yKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGRlc2NyaXB0b3IuY2hpbGRyZW4ucHVzaCh0ZW1wbCk7IC8vIGF1dG8gZXNjYXBlZCB3aGVuIGFkZGVkIHRvIGRvbS5cblx0XHRcdH0pO1xuXHRcdFx0dmFyIHRhZyA9IHZoKGFyZ3NbMF0gKyBkZXNjcmlwdG9yLnNlbGVjdG9yLCBkZXNjcmlwdG9yLnByb3BlcnRpZXMsIGRlc2NyaXB0b3IuY2hpbGRyZW4pO1xuXHRcdFx0dm5vZGUuY2hpbGRyZW4ucHVzaCh0YWcpO1xuXHRcdH0sXG5cdFx0dGV4dDogZnVuY3Rpb24ob3B0cywgdm5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5jaGlsZHJlbi5wdXNoKGFyZ3NbMF0pO1xuXHRcdH0sXG5cdFx0Y2xhc3M6IGZ1bmN0aW9uKG9wdHMsIHZub2RlLCBhcmdzIC8qIGNsYXNzTmFtZSAqLyApIHtcblx0XHRcdHZub2RlLnByb3BlcnRpZXMuc2VsZWN0b3IgKz0gJy4nICsgYXJnc1swXTtcblx0XHR9LFxuXHRcdGF0dHI6IGZ1bmN0aW9uKG9wdHMsIHZub2RlLCBhcmdzIC8qIG5hbWUsIHZhbHVlICovICkge1xuXHRcdFx0dm5vZGUucHJvcGVydGllc1thcmdzWzBdXSA9IGFyZ3NbMV07XG5cdFx0fSxcblx0XHRpZDogZnVuY3Rpb24ob3B0cywgdm5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wZXJ0aWVzLnNlbGVjdG9yICs9ICcjJyArIGFyZ3NbMF07XG5cdFx0fSxcblx0XHRvbjogZnVuY3Rpb24ob3B0cywgdm5vZGUsIGFyZ3MgLyogZXZlbnROYW1lLCBjYWxsYmFjayAqLyApIHtcblx0XHRcdHZub2RlLnByb3BlcnRpZXNbJ2V2LScgKyBhcmdzWzBdXSA9IGFyZ3NbMV07XG5cdFx0fVxuXHR9KTtcblxuQmFiZWx1dGUucHJvdG90eXBlLiRodG1sVG9WRE9NID0gZnVuY3Rpb24ocGFyZW50LCBvbGRUcmVlKSB7XG5cdHZhciBkZXNjcmlwdG9yID0ge1xuXHRcdHByb3BlcnRpZXM6IHt9LFxuXHRcdGNoaWxkcmVuOiBbXSxcblx0XHRzZWxlY3RvcjogJydcblx0fTtcblx0dGhpcy4kb3V0cHV0KCdodG1sOnZkb20nLCBkZXNjcmlwdG9yKTtcblx0dmFyIHRyZWUgPSB2aCgnZGl2JywgZGVzY3JpcHRvci5wcm9wZXJ0aWVzLCBkZXNjcmlwdG9yLmNoaWxkcmVuKTtcblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdGlmICghb2xkVHJlZSkgeyAvLyBmaXJzdCByZW5kZXJcblx0XHRcdHRyZWUucm9vdE5vZGUgPSBjcmVhdGVFbGVtZW50KHRyZWUpO1xuXHRcdFx0cGFyZW50LmFwcGVuZENoaWxkKHRyZWUucm9vdE5vZGUpO1xuXHRcdH0gZWxzZSB7IC8vIHJlcmVuZGVyXG5cdFx0XHR0cmVlLnJvb3ROb2RlID0gb2xkVHJlZS5yb290Tm9kZTtcblx0XHRcdHZhciBwYXRjaGVzID0gZGlmZihvbGRUcmVlLCB0cmVlKTtcblx0XHRcdHRyZWUucm9vdE5vZGUgPSBwYXRjaCh0cmVlLnJvb3ROb2RlLCBwYXRjaGVzKTtcblx0XHR9XG5cdH0pO1xuXHRyZXR1cm4gdHJlZTtcbn07IiwiLyoqXG4gKiBAYXV0aG9yIEdpbGxlcyBDb29tYW5zXG4gKiBAbGljZW5jZSBNSVRcbiAqIEBjb3B5cmlnaHQgMjAxNiBHaWxsZXMgQ29vbWFuc1xuICovXG5cbnZhciBCYWJlbHV0ZSA9IHJlcXVpcmUoJy4uL2xpYi9iYWJlbHV0ZScpLFxuXHRTdGF0ZSA9IHJlcXVpcmUoJy4vdmlldy1zdGF0ZScpO1xuXG5yZXF1aXJlKCcuLi9sYW5ndWFnZXMvaHRtbCcpO1xuXG5CYWJlbHV0ZS50b0xleGljKCdodG1sJywgWyd2aWV3J10pXG5cdC50b0FjdGlvbnMoJ2h0bWw6ZG9tJywge1xuXHRcdHZpZXc6IGZ1bmN0aW9uKGVudiwgbm9kZSwgYXJncykge1xuXHRcdFx0dmFyIHJlbmRlcmVkLFxuXHRcdFx0XHRzdGF0ZTtcblx0XHRcdGNvbnN0IG9wdHMgPSBhcmdzWzBdLFxuXHRcdFx0XHRkb1JlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGNvbnN0IGZyYWcgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpLFxuXHRcdFx0XHRcdFx0b3V0cHV0QmFiZWx1dGUgPSBvcHRzLnJlbmRlcihzdGF0ZSk7XG5cdFx0XHRcdFx0dmFyIG5leHRTaWJsaW5nO1xuXG5cdFx0XHRcdFx0aWYgKHJlbmRlcmVkKSB7XG5cdFx0XHRcdFx0XHQvLyBrZWVwIHRyYWNrIG9mIG5leHRTaWJsaW5nXG5cdFx0XHRcdFx0XHRuZXh0U2libGluZyA9IHJlbmRlcmVkW3JlbmRlcmVkLmxlbmd0aCAtIDFdLm5leHRTaWJsaW5nO1xuXHRcdFx0XHRcdFx0Ly8gcmVtb3ZlIHByZXZpb3VzbHkgcmVuZGVyZWQgbm9kZXNcblx0XHRcdFx0XHRcdHJlbmRlcmVkLmZvckVhY2gobm9kZS5yZW1vdmVDaGlsZCwgbm9kZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdC8vIHJlbmRlciBuZXcgbm9kZXNcblx0XHRcdFx0XHRvdXRwdXRCYWJlbHV0ZS4kb3V0cHV0KGVudiwgZnJhZyk7XG5cblx0XHRcdFx0XHQvLyBjb3B5IGNoaWxkcmVuIGFuZCBpbnNlcnQgbmV3IG5vZGVzXG5cdFx0XHRcdFx0cmVuZGVyZWQgPSBbXS5zbGljZS5jYWxsKGZyYWcuY2hpbGRyZW4pO1xuXHRcdFx0XHRcdG5vZGUuaW5zZXJ0QmVmb3JlKGZyYWcsIG5leHRTaWJsaW5nKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvUmVuZGVyKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0c3RhdGUgPSBuZXcgU3RhdGUob3B0cy5nZXRJbml0aWFsU3RhdGUgPyBvcHRzLmdldEluaXRpYWxTdGF0ZSgpIDoge30sIHJlbmRlcik7XG5cdFx0XHRkb1JlbmRlcigpO1xuXHRcdH1cblx0fSlcblx0LnRvQWN0aW9ucygnaHRtbDpzdHJpbmcnLCB7XG5cdFx0dmlldzogZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yLCBhcmdzKSB7XG5cdFx0XHRjb25zdCBvcHRzID0gYXJnc1swXTtcblx0XHRcdG9wdHMucmVuZGVyKG5ldyBTdGF0ZShvcHRzLmdldEluaXRpYWxTdGF0ZSA/IG9wdHMuZ2V0SW5pdGlhbFN0YXRlKCkgOiB7fSkpLiRvdXRwdXQoZW52LCBkZXNjcmlwdG9yKTtcblx0XHR9XG5cdH0pOyIsIi8qKlxuICogVmlldyBzdGF0ZVxuICovXG5mdW5jdGlvbiBTdGF0ZShzdGF0ZSwgcmVuZGVyKSB7XG5cdHRoaXMucmVuZGVyID0gcmVuZGVyO1xuXHRmb3IgKHZhciBpIGluIHN0YXRlKVxuXHRcdHRoaXNbaV0gPSBzdGF0ZVtpXTtcbn1cblxuU3RhdGUucHJvdG90eXBlID0ge1xuXHRzZXQ6IGZ1bmN0aW9uKHBhdGgsIHZhbHVlKSB7XG5cdFx0dmFyIGNoYW5nZWQgPSBmYWxzZTtcblx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuXHRcdFx0Zm9yICh2YXIgaSBpbiBwYXRoKVxuXHRcdFx0XHRpZiAodGhpc1tpXSAhPT0gcGF0aFtpXSkge1xuXHRcdFx0XHRcdGNoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHRoaXNbaV0gPSBwYXRoW2ldO1xuXHRcdFx0XHR9XG5cdFx0fSBlbHNlIGlmICh0aGlzW3BhdGhdICE9PSB2YWx1ZSkge1xuXHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHR0aGlzW3BhdGhdID0gdmFsdWU7XG5cdFx0fVxuXHRcdGlmIChjaGFuZ2VkKVxuXHRcdFx0dGhpcy5yZW5kZXIoKTtcblx0fSxcblx0dG9nZ2xlOiBmdW5jdGlvbihwYXRoKSB7XG5cdFx0dGhpc1twYXRoXSA9ICF0aGlzW3BhdGhdO1xuXHRcdHRoaXMucmVuZGVyKCk7XG5cdH0sXG5cdHB1c2g6IGZ1bmN0aW9uKHBhdGgsIHZhbHVlKSB7fSxcblx0cG9wOiBmdW5jdGlvbihwYXRoLCB2YWx1ZSkge31cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU3RhdGU7IiwiLyoqXG4gKiBCYWJlbHV0ZS5cbiAqIEphdmFzY3JpcHQgSW50ZXJuYWwgRFNNTSBGcmFtZXdvcmsuXG4gKiBNZXRob2QgY2hhaW5pbmcgYXBwbGljYXRpb25zIHRvIFRlbXBsYXRpbmcgYW5kIEludGVybmFsIERvbWFpbiBTcGVjaWZpYyAoTXVsdGkpTW9kZWxpbmcuXG4gKiBBa2EgZGVtb25zdHJhdGlvbiB0aGF0IGV2ZXJ5dGhpbmcgaXMgYWJvdXQgbGFuZ3VhZ2VzLlxuICogXG4gKiBEb21haW4gTGFuZ3VhZ2UgKE11bHRpKU1vZGVsaW5nIHNvbHZlcyBtYW55IHNvZnR3YXJlIGRlc2lnbiBwcm9ibGVtcy5cbiAqIEZyb20gZGV2ZWxvcHBlbWVudCBwcm9jZXNzIChob3cgdG8gc3RhcnQsIHdoYXQgYW5kIGhvdyB0byBkZXNpZ24sIGhvdyB0byBpdGVyYXRlLCAuLi4pIFxuICogdG8gaG93IHRvIHVuZGVyc3RhbmQsIGRlc2lnbiBhbmQgYXJ0aWN1bGF0ZSBidXNpbmVzcyByZWxhdGVkIHByb2JsZW1zIGFuZC9vciBwdXJlIGNvZGUgbG9naWNzLlxuICogXG4gKiBJdCBwcm92aWRlcyBuYXR1cmFsIHdheXMgb2YgdGhpbmtpbmcgbW9kZWxzIGFuZCBjb2RlIHRoYXQgYXJlIHJlYWxseSBjbG9zZSB0byBob3cgaHVtYW4gbWluZCBcbiAqIHdvcmtzLiBNdWNoIG11Y2ggbW9yZSBjbG9zZSB0aGFuIE9PUCAoaW5jbHVkaW5nIEFPUCkgaXMuXG4gKlxuICogQmFiZWx1dGUgZ2l2ZXMgZWxlZ2FudCBhbmQgcmVhbGx5IHNpbXBsZSB3YXlzIHRvIGRlZmluZS9oYW5kbGUvdXNlL3RyYW5zZm9ybSBjaGFpbmFibGUgbWV0aG9kc1xuICogaW4gcHVyZSBqYXZhc2NyaXB0IG9yIHRocm91Z2ggaXQncyBvd24gc2ltcGxlIGV4dGVybmFsIERTTCAoYSBtaW5pbWFsaXN0IG9wdGltYWwgc3RyaW5nIHJlcHJlc2VudGF0aW9uIFxuICogb2YgY2FsbCBjaGFpbnMgZm9yIGJhYmVsdXRlIHNlbnRlbmNlcyBzZXJpYWxpc2F0aW9uKS5cbiAqIFxuICogSXQgcmVsYXlzIGVudGllcmx5IG9uIE1ldGhvZCBDaGFpbmluZyBwc2V1ZG8gZGVzaWduIHBhdHRlcm4uXG4gKiBJbiBjb25zZXF1ZW5jZSwgaXQncyBtYWRlIHdpdGggcmVhbGx5IGZldyBjb2RlLCBhbmQgaXMgcmVhbGx5IGxpZ2h0IChsZXNzIHRoYW4gMmtvIGd6aXAvbWluIHdpdGhvdXQgb3duIFxuICogZXh0ZXJuYWwgRFNMIHBhcnNlciAtIHdoaWNoIGlzIGFsc28gcmVhbGx5IGxpZ2h0ICgrLSAxa28gZ3ppcC9taW4pIGFuZCBtYWRlIHdpdGggaXRzIGRlZGljYXRlZCBGbHVlbnQgSW50ZXJmYWNlKVxuICpcbiAqIEJhYmVsdXRlJ3MgcGFyc2luZyBhbmQgb3V0cHV0IGFyZSBib3RoIHJlYWxseSBmYXN0LiBcbiAqXG4gKiBAYXV0aG9yIEdpbGxlcyBDb29tYW5zXG4gKiBAbGljZW5jZSBNSVRcbiAqIEBjb3B5cmlnaHQgMjAxNiBHaWxsZXMgQ29vbWFuc1xuICovXG5cblxuLyoqXG4gKiBUb2RvIDpcbiAqXG4gKiBcdFx0ZGVidWcgdHJhbnNsYXRpb24gXHRcdFx0XHRPS1xuICpcbiAqIFx0XHRfYXBwZW5kIDogc2hvdWxkIGFkZCBsZXhpY05hbWUgOiBcdFx0T0tcbiAqXG4gKiBcdFx0b24gYWRkIHRvIGxleGljKGxleGljTmFtZSkgOiAgICAgID09PiBcdE9LIFxuICogXHRcdGZpcnN0IHRpbWUgOiBjcmVhdGUgaW1tZWRpYXRseSBCYWJlbHV0ZSBjaGlsZHJlbiBjbGFzc1xuICogXHRcdGFmdGVyIDogbW9kaWZ5IGV4aXN0aW5nIHByb3RvdHlwZXMgKGJhYmVsdXRlLCBkb2NzLCBhbmQgZG90aGF0IGlmIGFueSkgaW4gcGxhY2Ugb2YgY2xlYXJpbmcgY2FjaGVcbiAqXG4gKiBcdFx0PT0+IHNhbWUgdGhpbmcgd2hlbiBleHRlbmRpbmcgbGV4aWMgOiB1c2UgaW5oZXJpdGFuY2UgdG8ga2VlcCB0cmFja2luZyBvZiBwYXJlbnQgcHJvdG90eXBlICAgIFx0PT0+IFx0T0tcbiAqXG4gKiBcdFx0c2NvcGVkIGxleGljcyBtYW5hZ2VtZW50IG9uIHN0cmluZ2lmeSAgXHRcdFx0XHRPS1xuICogXHRcdFxuICogXHRcdG1hbmFnZSByZXN0cmljdGlvbnMgd2l0aCBtaXhpbnMgd2hlbiBleHRlbmRpbmcgTGV4aWNzL0FjdGlvbnMvQVBJICBcdFx0XHRcdFx0T0tcbiAqXG4gKlx0XHRzY29wZSBtYW5hZ2VtZW50XG4gKlx0XHRcdHVzZSBlbnYuc2NvcGUoKSB0byBnZXQgY3VycmVudCBzY29wZSBvYmplY3Qgb3IgbWF5YmUgcGFzcyBpdCBhcyBmb3VydGggYXJndW1lbnQgaW4gYWN0aW9uc1xuICpcdFx0XHRlbnYucHVzaFNjb3BlKHsgbmFtZTppbnN0YW5jZSB9KVxuICpcdFx0XHRlbnYucG9wU2NvcGUobmFtZSlcbiAqXG4gKlx0XHQkb3V0cHV0KHtcbiAqXHRcdFx0YWN0aW9uczoneWFtdmlzaDpkb20nLFxuICpcdFx0XHRzY29wZTp7XG4gKlx0XHRcdFx0Y29udGV4dDogY29udGV4dCB8fCBuZXcgQ29udGV4dCguLi4pXG4gKlx0XHRcdH1cbiAqXHRcdH0pXG4gKiBcbiAqIFxuICogXHRcdGZpbmFsaXNlIHRpbWUgbWFuYWdlbWVudCBpbiBhY3Rpb25zXG4gKiBcdFx0XHRtYXliZSBhZGQgZmxhZyBpbiBhY3Rpb25zIG5hbWVzcGFjZSB0byBzYXkgJ2FsbG93QXN5bmMnXG4gKiBcdFx0bWFuYWdlIHJlc3VsdCBmb3J3YXJkaW5nIGFuZCBwcm9taXNlIGxpc3RlbmluZyBcbiAqICAgIFx0IFx0XHRcbiAqIFx0XHRkbyBzaW1wbGUgZXhhbXBsZSB3aXRoIGFzeW5jIG1hbmFnZXIgaW4gZW52XG4gKlxuICpcdFx0bWFuYWdlIGluLWxleGVtLWFjdGlvbnNcbiAqIFxuICpcdFx0dHJhbnNsYXRpb24vb3V0cHV0IHRhYmxlXG4gKiBcbiAqXG4gKiBcdFx0Ly9fX19fX19fX19fX19fIGFmdGVyXG4gKiBcbiAqIFxuICpcdFx0YWRkIEZpbHRlciBzdHlsZSB3aXRoIEBteUZ1bmNcbiAqXG4gKiBcdFx0YWRkIGRlZiBtZWNhbmlzbSAgd2l0aCBkZXJlZmVyZW5jZW1lbnQgKGFrYSAkbXlWYXIpXG4gKlxuICpcdFx0d29yayBvbiBiYWJlbHV0ZSBkb2MgcGlsb3QgOiBleHRlcm5hbCBxdWVyeSBEU0wgPyBhcGkgP1xuICogIFx0XHQuMCA9IGFyZ3NbMF1cbiAqICBcdFx0Lm5hbWUgPSBzZWxlY3QgbGV4ZW1zIHdpdGggbWF0Y2hpbmcgbmFtZVxuICogICAgXHRcdC4jbGV4aWMgPSBzZWxlY3QgbGV4ZW1zIHdpdGggbWF0Y2hpbmcgbGV4aWNcbiAqICAgIFx0XHQuI2xleGljOmxleGVtID0gc2VsZWN0IGxleGVtcyB3aXRoIG1hdGNoaW5nIGxleGljIGFuZCBsZXhlbSBuYW1lXG4gKiAgICBcdFx0LipcbiAqICAgIFx0XHQuKihmaWx0ZXIpXG4gKiAgICBcdFx0LioqKDA9aXM9YmFiZWx1dGUpXG4gKiAgICBcdCBcdC4qKihkaXZ8c3BhbnwjZm9vOmdvby4wPWlzPWJhYmVsdXRlKVxuICogXHRcdFxuICogXHRcdGV4dHJhY3QgeWFvbVxuICpcbiAqIFx0XHRleHRyYWN0IGRvdGhhdFxuICogXG4gKiBcdFx0YnJpZGdlIGJldHdlZW4gYmFiZWx1dGUgYWN0aW9ucyBhbmQgZG90aGF0IEFQSVxuICpcbiAqIFx0XHRhZGQgdGVzdHNcbiAqL1xuXG4vLyBjb3JlIGNsYXNzIGFuZCBzdGF0aWNzXG52YXIgQmFiZWx1dGUgPSByZXF1aXJlKCcuL2xpYi9iYWJlbHV0ZScpO1xuXG4vLyBCYWJlbHV0ZSBGaXJzdCBEZWdyZWVcbnJlcXVpcmUoJy4vbGliL2ZpcnN0LWxldmVsLWJhYmVsdXRlJyk7XG5cbi8vIHNlcmlhbGl6ZXIgdG8gQmFiZWx1dGUgRFNMXG5yZXF1aXJlKCcuL2xpYi9zdHJpbmdpZnknKTtcblxuLy8gQmFiZWx1dGUgRFNMIHBhcnNlclxuQmFiZWx1dGUucGFyc2VyID0gcmVxdWlyZSgnLi9saWIvcGFyc2VyJyk7XG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IEJhYmVsdXRlOyIsInZhciBCYWJlbHV0ZSA9IHJlcXVpcmUoJy4uLy4uL2xpYi9iYWJlbHV0ZScpO1xuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKiBIVE1MIHRvIERPTSBBY3Rpb25zICoqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuQmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIHtcblx0Ly8gb25seS1vbi1kb20tb3V0cHV0IGhhbmRsZXJcblx0b25IdG1sRG9tOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQoJ2h0bWw6ZG9tJywgJ29uSHRtbERvbScsIFtjYWxsYmFja10pO1xuXHR9XG59KTtcblxuLy8gd2Ugb25seSBuZWVkIHRvIHByb3ZpZGVzIGxhbmd1YWdlIGF0b21zIGltcGxlbWVudGF0aW9ucy5cbkJhYmVsdXRlLnRvQWN0aW9ucygnaHRtbDpkb20nLCB7XG5cdF9fcmVzdHJpY3Rpb25zX186IHtcblx0XHRodG1sOiB0cnVlLFxuXHRcdCdodG1sOmRvbSc6IHRydWVcblx0fSxcblx0dGFnOiBmdW5jdGlvbihlbnYsIG5vZGUsIGFyZ3MgLyogdGFnTmFtZSwgYmFiZWx1dGVzICovICkge1xuXHRcdHZhciBjaGlsZCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoYXJnc1swXSk7XG5cdFx0bm9kZS5hcHBlbmRDaGlsZChjaGlsZCk7XG5cdFx0YXJnc1sxXS5mb3JFYWNoKGZ1bmN0aW9uKHRlbXBsKSB7XG5cdFx0XHRpZiAodHlwZW9mIHRlbXBsID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0aWYgKHRlbXBsLl9fYmFiZWx1dGVfXylcblx0XHRcdFx0dGVtcGwuJG91dHB1dChlbnYsIHRoaXMpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHR0aGlzLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRlbXBsKSk7IC8vIGF1dG8gZXNjYXBlZCB3aGVuIGFkZGVkIHRvIGRvbS5cblx0XHR9LCBjaGlsZCk7XG5cdH0sXG5cdHRleHQ6IGZ1bmN0aW9uKGVudiwgbm9kZSwgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHRub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGFyZ3NbMF0pKTtcblx0fSxcblx0Y2xhc3M6IGZ1bmN0aW9uKGVudiwgbm9kZSwgYXJncyAvKiBjbGFzc05hbWUgKi8gKSB7XG5cdFx0bm9kZS5jbGFzc0xpc3QuYWRkKGFyZ3NbMF0pO1xuXHR9LFxuXHRhdHRyOiBmdW5jdGlvbihlbnYsIG5vZGUsIGFyZ3MgLyogbmFtZSwgdmFsdWUgKi8gKSB7XG5cdFx0bm9kZS5zZXRBdHRyaWJ1dGUoYXJnc1swXSwgYXJnc1sxXSk7XG5cdH0sXG5cdGlkOiBmdW5jdGlvbihlbnYsIG5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0bm9kZS5pZCA9IGFyZ3NbMF07XG5cdH0sXG5cdG9uOiBmdW5jdGlvbihlbnYsIG5vZGUsIGFyZ3MgLyogZXZlbnROYW1lLCBjYWxsYmFjayAqLyApIHtcblx0XHRub2RlLmFkZEV2ZW50TGlzdGVuZXIoYXJnc1swXSwgYXJnc1sxXSk7XG5cdH0sXG5cdG9uSHRtbERvbTogZnVuY3Rpb24oZW52LCBub2RlLCBhcmdzIC8qIGNhbGxiYWNrICovICkge1xuXHRcdGFyZ3NbMF0oZW52LCBub2RlKTtcblx0fVxufSk7XG5cbkJhYmVsdXRlLnByb3RvdHlwZS4kaHRtbFRvRE9NID0gZnVuY3Rpb24obm9kZSkge1xuXHRyZXR1cm4gdGhpcy4kb3V0cHV0KCdodG1sOmRvbScsIG5vZGUpO1xufTsiLCJ2YXIgQmFiZWx1dGUgPSByZXF1aXJlKCcuLi8uLi9saWIvYmFiZWx1dGUnKTtcblxuLy8gdXRpbHMgOlxudmFyIG1hcEVuY29kZSA9IHtcblx0XHRcIiZcIjogXCImYW1wO1wiLFxuXHRcdFwiPFwiOiBcIiZsdDtcIixcblx0XHRcIj5cIjogXCImZ3Q7XCIsXG5cdFx0XCJcXFwiXCI6IFwiJnF1b3Q7XCIsXG5cdFx0XCInXCI6IFwiJiMzOTtcIiAvLyAnIC0+ICZhcG9zOyBmb3IgWE1MIG9ubHlcblx0fSxcblx0bWFwRGVjb2RlID0ge1xuXHRcdFwiJmFtcDtcIjogXCImXCIsXG5cdFx0XCImbHQ7XCI6IFwiPFwiLFxuXHRcdFwiJmd0O1wiOiBcIj5cIixcblx0XHRcIiZxdW90O1wiOiBcIlxcXCJcIixcblx0XHRcIiYjMzk7XCI6IFwiJ1wiXG5cdH07XG5cbmZ1bmN0aW9uIGVuY29kZUh0bWxTcGVjaWFsQ2hhcnMoc3RyKSB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvWyY8PlwiJ10vZywgZnVuY3Rpb24obSkge1xuXHRcdHJldHVybiBtYXBFbmNvZGVbbV07XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVIdG1sU3BlY2lhbENoYXJzKHN0cikge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoLygmYW1wO3wmbHQ7fCZndDt8JnF1b3Q7fCYjMzk7KS9nLCBmdW5jdGlvbihtKSB7XG5cdFx0cmV0dXJuIG1hcERlY29kZVttXTtcblx0fSk7XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKioqKiBIVE1MLXRvLVN0cmluZyBBY3Rpb25zICoqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuXG5CYWJlbHV0ZS50b0xleGljKCdodG1sJywge1xuXHQvLyBvbmx5LW9uLXN0cmluZy1vdXRwdXQgaGFuZGxlclxuXHRvbkh0bWxTdHJpbmc6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCgnaHRtbDpzdHJpbmcnLCAnb25IdG1sU3RyaW5nJywgW2NhbGxiYWNrXSk7XG5cdH1cbn0pO1xuXG4vLyBhY3Rpb25zIDpcbi8vIHdlIG9ubHkgbmVlZCBsb2dpY2FsIGF0b21zIGRlZmluaXRpb25zLiAod2l0aG91dCB1c2VyIGludGVyYWN0aW9ucy4gYWthIGNsaWNrIGV0Yy4pXG5CYWJlbHV0ZS50b0FjdGlvbnMoJ2h0bWw6c3RyaW5nJywge1xuXHQvLyBPdXRwdXQgZW5naW5lcyByZWxhdGVkXG5cdF9fcmVzdHJpY3Rpb25zX186IHtcblx0XHRodG1sOiB0cnVlLFxuXHRcdCdodG1sOnN0cmluZyc6IHRydWVcblx0fSxcblx0Ly8gQWN0aW9uc1xuXHR0YWc6IGZ1bmN0aW9uKGVudiwgdGFnLCBhcmdzIC8qIHRhZ05hbWUsIGJhYmVsdXRlcyAqLyApIHtcblx0XHR2YXIgY2hpbGQgPSBuZXcgVGFnRGVzY3JpcHRvcigpLFxuXHRcdFx0YWN0aW9ucyA9IGVudi5hY3Rpb25zLFxuXHRcdFx0YmFiZWx1dGVzID0gYXJnc1sxXSxcblx0XHRcdHRlbXBsO1xuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBiYWJlbHV0ZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcblx0XHRcdHRlbXBsID0gYmFiZWx1dGVzW2ldO1xuXHRcdFx0aWYgKHR5cGVvZiB0ZW1wbCA9PT0gJ3VuZGVmaW5lZCcpXG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0aWYgKHRlbXBsLl9fYmFiZWx1dGVfXylcblx0XHRcdFx0dGVtcGwuJG91dHB1dChlbnYsIGNoaWxkKTtcblx0XHRcdGVsc2UgaWYgKHR5cGVvZiB0ZW1wbCA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdGNoaWxkLmNoaWxkcmVuICs9IGVuY29kZUh0bWxTcGVjaWFsQ2hhcnModGVtcGwpOyAvLy5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRjaGlsZC5jaGlsZHJlbiArPSB0ZW1wbDtcblx0XHR9XG5cdFx0dGFnT3V0cHV0KHRhZywgY2hpbGQsIGFyZ3NbMF0pO1xuXHR9LFxuXHR0ZXh0OiBmdW5jdGlvbihlbnYsIHRhZywgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHR0YWcuY2hpbGRyZW4gKz0gZW5jb2RlSHRtbFNwZWNpYWxDaGFycyhhcmdzWzBdKTtcblx0fSxcblx0Y2xhc3M6IGZ1bmN0aW9uKGVudiwgdGFnLCBhcmdzIC8qIGNsYXNzTmFtZSAqLyApIHtcblx0XHR0YWcuY2xhc3NlcyArPSAnICcgKyBhcmdzWzBdO1xuXHR9LFxuXHRhdHRyOiBmdW5jdGlvbihlbnYsIHRhZywgYXJncyAvKiBuYW1lLCB2YWx1ZSAqLyApIHtcblx0XHR2YXIgdmFsdWUgPSBhcmdzWzFdO1xuXHRcdC8vIHRhZy5hdHRyaWJ1dGVzICs9ICcgJyArIGFyZ3NbMF0gKyAnPVwiJyArICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gZW5jb2RlSHRtbFNwZWNpYWxDaGFycyh2YWx1ZSkgOiB2YWx1ZSkgKyAnXCInO1xuXHRcdHRhZy5hdHRyaWJ1dGVzICs9ICcgJyArIGFyZ3NbMF0gKyAnPVwiJyArICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnID8gdmFsdWUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC8+L2csICcmZ3Q7JykgOiB2YWx1ZSkgKyAnXCInO1xuXHR9LFxuXHRpZDogZnVuY3Rpb24oZW52LCB0YWcsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0dGFnLmF0dHJpYnV0ZXMgPSAnIGlkPVwiJyArIGFyZ3NbMF0gKyAnXCInICsgdGFnLmF0dHJpYnV0ZXM7XG5cdH0sXG5cdG9uSHRtbFN0cmluZzogZnVuY3Rpb24oZW52LCB0YWcsIGFyZ3MpIHtcblx0XHRhcmdzWzBdKGVudiwgdGFnKTtcblx0fVxufSk7XG5cbi8vIGZvciB0YWdzIHN0cmluZyBjb25zdHJ1Y3Rpb25cbnZhciBUYWdEZXNjcmlwdG9yID0gZnVuY3Rpb24odGFnTmFtZSkge1xuXHR0aGlzLmNoaWxkcmVuID0gJyc7XG5cdHRoaXMuY2xhc3NlcyA9ICcnO1xuXHR0aGlzLnN0eWxlID0gJyc7XG5cdHRoaXMuYXR0cmlidXRlcyA9ICcnO1xufTtcblxudmFyIG9wZW5UYWdzID0gL2JyLywgLy8gc2hvdWxkIGJlIGNvbXBsZXRlZFxuXHRzdHJpY3RUYWdzID0gL3NwYW58c2NyaXB0fG1ldGF8ZGl2fGkvO1xuXG5mdW5jdGlvbiB0YWdPdXRwdXQodGFnLCBjaGlsZCwgbmFtZSkge1xuXHR2YXIgb3V0ID0gJzwnICsgbmFtZSArIGNoaWxkLmF0dHJpYnV0ZXM7XG5cdGlmIChjaGlsZC5zdHlsZSlcblx0XHRvdXQgKz0gJyBzdHlsZT1cIicgKyBjaGlsZC5zdHlsZSArICdcIic7XG5cdGlmIChjaGlsZC5jbGFzc2VzKVxuXHRcdG91dCArPSAnIGNsYXNzPVwiJyArIGNoaWxkLmNsYXNzZXMgKyAnXCInO1xuXHRpZiAoY2hpbGQuY2hpbGRyZW4pXG5cdFx0dGFnLmNoaWxkcmVuICs9IG91dCArICc+JyArIGNoaWxkLmNoaWxkcmVuICsgJzwvJyArIG5hbWUgKyAnPic7XG5cdGVsc2UgaWYgKG9wZW5UYWdzLnRlc3QobmFtZSkpXG5cdFx0dGFnLmNoaWxkcmVuICs9IG91dCArICc+Jztcblx0ZWxzZSBpZiAoc3RyaWN0VGFncy50ZXN0KG5hbWUpKVxuXHRcdHRhZy5jaGlsZHJlbiArPSBvdXQgKyAnPjwvJyArIG5hbWUgKyAnPic7XG5cdGVsc2Vcblx0XHR0YWcuY2hpbGRyZW4gKz0gb3V0ICsgJy8+Jztcbn1cblxuQmFiZWx1dGUucHJvdG90eXBlLiRodG1sVG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuJG91dHB1dCgnaHRtbDpzdHJpbmcnLCBuZXcgVGFnRGVzY3JpcHRvcigpKS5jaGlsZHJlbjtcbn07IiwiLyoqXG4gKiBTaW1wbGUgYnV0IHBvd2VyZnVsIGFuZCB1bHRyYSBmYXN0IGlzb21vcnBoaWMgaHRtbCBvdXRwdXQgZW5naW5lLlxuICpcbiAqIE9uZSBzbWFsbCBleHRlbmRhYmxlIGxleGljLCB0d28gbWljcm8gJG91dHB1dCdzIHNlbWFudGljcyAob25lIHB1cmUgc3RyaW5nLCBvbmUgcHVyZSBkb20pLCBhbmQgdm9pbMOgICEgOylcbiAqL1xuXG52YXIgQmFiZWx1dGUgPSByZXF1aXJlKCcuLi9saWIvYmFiZWx1dGUnKTtcblxuLyoqKioqKipcbiAqKioqKioqXHRMQU5HVUFHRSBBVE9NUyAoc2ltcGx5IGVucXVldWVpbmcgbGV4ZW1zKVxuICoqKioqKiovXG5CYWJlbHV0ZVxuXHQudG9MZXhpYygnaHRtbCcsIFsndGFnJywgJ2F0dHInLCAncHJvcCcsICdjbGFzcycsICdpZCcsICd0ZXh0JywgJ29uJ10pOyAvLyBzaW1wbGUgYXRvbXNcblxuLyoqKioqKipcbiAqKioqKioqXHRDT01QT1VORFMgV09SRFMgKGJhc2VkIG9uIGxhbmd1YWdlIGF0b21zKVxuICoqKioqKiovXG4vLyBzaW1wbGUgdGFncyAobWFkZSB3aXRoIC50YWcpIChsaXN0IHNob3VsZCBiZSBjb21wbGV0ZWQpXG5bJ2RpdicsICdoMScsICdoMicsICdoMycsICdzZWN0aW9uJywgJ3NwYW4nLCAnYnV0dG9uJywgJ29wdGlvbicsICdhcnRpY2xlJ11cbi5mb3JFYWNoKGZ1bmN0aW9uKHRhZ05hbWUpIHtcblx0QmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIHRhZ05hbWUsIGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLnRhZyh0YWdOYW1lLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXHR9KTtcbn0pO1xuXG4vLyBldmVudHMgKG1hZGUgd2l0aCAub24pIChsaXN0IHNob3VsZCBiZSBjb21wbGV0ZWQpXG5bJ2NsaWNrJywgJ21vdXNlb3ZlcicsICdrZXl1cCddXG4uZm9yRWFjaChmdW5jdGlvbihldmVudE5hbWUpIHtcblx0QmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIGV2ZW50TmFtZSwgZnVuY3Rpb24oY2FsbGJhY2spIHtcblx0XHRyZXR1cm4gdGhpcy5vbihldmVudE5hbWUsIGNhbGxiYWNrKTtcblx0fSk7XG59KTtcblxuXG4vLyBjb21wb3VuZHMgdGFncyAobWFkZSB3aXRoIG90aGVyIHRhZ3MpXG52YXIgaCA9IEJhYmVsdXRlLmluaXRpYWxpemVyKCdodG1sJyk7XG5CYWJlbHV0ZS50b0xleGljKCdodG1sJywge1xuXHRhOiBmdW5jdGlvbihocmVmLCBjb250ZW50KSB7XG5cdFx0cmV0dXJuIHRoaXMudGFnKCdhJywgW2guYXR0cignaHJlZicsIGhyZWYpLCBjb250ZW50XSk7XG5cdH0sXG5cdHNlbGVjdDogZnVuY3Rpb24ob3B0aW9uc0xpc3QsIHNlbGVjdEJhYmVsdXRlKSB7XG5cdFx0cmV0dXJuIHRoaXMudGFnKCdzZWxlY3QnLCBbXG5cdFx0XHRoLl9lYWNoKG9wdGlvbnNMaXN0LCBmdW5jdGlvbihvcHQpIHtcblx0XHRcdFx0aWYgKG9wdC5fX2JhYmVsdXRlX18pXG5cdFx0XHRcdFx0dGhpcy5vcHRpb24ob3B0KTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHRoaXMub3B0aW9uKFxuXHRcdFx0XHRcdFx0aC5hdHRyKCd2YWx1ZScsIG9wdC52YWx1ZSksXG5cdFx0XHRcdFx0XHRvcHQuY29udGVudFxuXHRcdFx0XHRcdCk7XG5cdFx0XHR9KSxcblx0XHRcdHNlbGVjdEJhYmVsdXRlXG5cdFx0XSk7XG5cdH0sXG5cdGlucHV0OiBmdW5jdGlvbih0eXBlLCB2YWwsIGJhYmVsdXRlKSB7XG5cdFx0cmV0dXJuIHRoaXMudGFnKCdpbnB1dCcsIFtoLmF0dHIoJ3R5cGUnLCB0eXBlKS5hdHRyKCd2YWx1ZScsIHZhbCksIGJhYmVsdXRlXSk7XG5cdH0sXG5cdHRleHRJbnB1dDogZnVuY3Rpb24odmFsLCBiYWJlbHV0ZSkge1xuXHRcdHJldHVybiB0aGlzLmlucHV0KCd0ZXh0JywgdmFsLCBiYWJlbHV0ZSk7XG5cdH0sXG5cdHN0cm9uZzogZnVuY3Rpb24oY29udGVudCkge1xuXHRcdHJldHVybiB0aGlzLnNwYW4oaC5jbGFzcygnc3Ryb25nJyksIGNvbnRlbnQpO1xuXHR9XG59KTtcblxuLy8gPT4gc28gMjUgd29yZHMgZGVmaW5lZCBpbiB0aGUgbGV4aWMgZm9yIHRoZSBtb21lbnQuXG4vLyB0YWcsIGF0dHIsIHByb3AsIGNsYXNzLCBpZCwgdGV4dCwgb24sIGNsaWNrLCBtb3VzZW92ZXIsIGtleVVwLCBkaXYsIGgxLCBoMiwgaDMsIHNlY3Rpb24sIGFydGljbGUsIHNwYW4sIGJ1dHRvbiwgYSwgc2VsZWN0LCBvcHRpb24sIHN0cm9uZywgb25IdG1sU3RyaW5nLCBvbkh0bWxEb21cbi8vIiwiLyoqXG4gKiBCYWJlbHV0ZSBjb3JlIENsYXNzIGFuZCBzdGF0aWNzIGZ1bmN0aW9ucy5cbiAqXG4gKiBBIGJhYmVsdXRlIGlzIGp1c3QgYSBzZW50ZW5jZXMgKGEgY2hhaW4gb2YgbGV4ZW1zIHdpdGggYXJndW1lbnQocykpIFxuICogd3JpdHRlbiB3aXRoIG1ldGhvZCBjaGFpbmluZywgKGFrYSBmb28oMSwgdHJ1ZSkuYmFyKCd6b28nLCBnb28oKS5mb28oKSkgKVxuICogYW5kIHdoZXJlIGxleGVtcyAoZWFjaCBjYWxsIC0gYWthIC5teUxleGVtKGFyZzEsIC4uLikpIFxuICogYXJlIHNpbXBseSBrZXB0IGluIGFuIGFycmF5IGZvciBmdXJ0aGVyIGludGVycHJldGF0aW9ucywgXG4gKiBpbiBmb2xsb3dpbmcgb2JqZWN0IGZvcm1hdCA6IHsgbGV4aWM6Jy4uLicsIG5hbWU6Jy4uLicsIGFyZ3M6Wy4uLl0gfS5cbiAqXG4gKiBBYnNvbHV0bHkgbm90aGluZyBtb3JlLlxuICpcbiAqIFlvdSBjb3VsZCBzZWUgaXQgYXMgYW4gQWJzdHJhY3QgU3ludGF4IFRyZWUgb2YgYW5kIEFic3RyYWN0IFByb2dyYW0gdGhhdCBuZWVkcyBmdXJ0aGVyIGludGVycHJldGF0aW9ucy4gKERvbid0IGJlIGFmcmFpZCwgaXQncyBoaWdobHkgcHJhY3RpY2FsIGFuZCBzaW1wbGUuKSBcbiAqXG4gKiBZb3UgcHJvdmlkZSBsZXhpY3MgKGRpY3Rpb25hcmllcykgb2YgcmVsYXRlZCBsZXhlbXMgdGhhdCBmb3JtIGFuIEludGVybmFsIChBYnN0cmFjdCkgRFNMLCB5b3Ugd3JpdGUgc2VudGVuY2VzIHdpdGggdGhlbSwgYW5kIHByb3ZpZGUvdXNlXG4gKiBkaWZmZXJlbnQgZGljdGlvbmFyaWVzIG9mIFwiYWN0aW9uc1wiIChsZXhlbXMgaW1wbGVtZW50YXRpb25zKSB0byBvdXRwdXRpbmcgdGhlbSBpbiB2YXJpb3VzIHNpdHVhdGlvbnMgYW5kIGNvbnRleHQuXG4gKlxuICogWW91IGNvdWxkIG1hbmlwdWxhdGUgYW5kIHdyaXRlIHRob3NlIGJhYmVsdXRlcyBhcyB5b3Ugd2FudCwgdHJhbnNsYXRlIHRoZW0gaW4gYW5kIHRocm91Z2ggb3RoZXIgSW50ZXJuYWwgQWJzdHJhY3QgRFNMcywgXG4gKiBhbmQgcHJvZHVjZSBhbnkga2luZCBvZiBvdXRwdXQgb3Ugd2FudCBieSB1c2luZ3Mgc3BlY2lmaWNzIFwiYWN0aW9uc1wiIGRpY3Rpb25hcmllcy5cbiAqXG4gKiBJdCBsb29rcyBjb21wbGV4IChiZWNhdXNlIGFic3RyYWN0KSBidXQgYXQgdXNhZ2UgZXZlcnl0aGluZyBpcyBzbW9vdGgsIGNsZWFyIGFuZCBlYXN5LlxuICpcbiAqIFRoZSBCYWJlbHV0ZSBDbGFzcyBpcyBqdXN0IGEgaGVscGVyIGZvciB3cml0aW5nIGFuZCBob2xkaW5nIGJhYmVsdXRlIHNlbnRlbmNlcy4gXG4gKlxuICogXG4gKiBAYXV0aG9yIEdpbGxlcyBDb29tYW5zXG4gKiBAbGljZW5jZSBNSVRcbiAqIEBjb3B5cmlnaHQgMjAxNiBHaWxsZXMgQ29vbWFuc1xuICovXG5cbnZhciBCYWJlbHV0ZSA9IGZ1bmN0aW9uKGxleGVtcykge1xuXHRcdHRoaXMuX19iYWJlbHV0ZV9fID0gJ2RlZmF1bHQnOyAvLyBjdXJyZW50IGxleGljXG5cdFx0dGhpcy5fbGV4ZW1zID0gbGV4ZW1zIHx8IMKgW107XG5cdH0sXG5cdExleGVtID0gQmFiZWx1dGUuTGV4ZW0gPSBmdW5jdGlvbihsZXhpYywgbmFtZSwgYXJncywgaGFuZGxlcikge1xuXHRcdHRoaXMuX19iYWJlbHV0ZWxleGVtX18gPSB0cnVlO1xuXHRcdHRoaXMubGV4aWMgPSBsZXhpYztcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuYXJncyA9IGFyZ3M7XG5cdFx0aWYgKGhhbmRsZXIpXG5cdFx0XHR0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xuXHR9LFxuXHRsZXhpY3NEaWNvID0gQmFiZWx1dGUubGV4aWNzID0ge1xuXHRcdCdkZWZhdWx0Jzoge1xuXHRcdFx0Q2w6IEJhYmVsdXRlXG5cdFx0fVxuXHR9LFxuXHRhY3Rpb25zRGljbyA9IEJhYmVsdXRlLmFjdGlvbnMgPSB7XG5cdFx0J2RlZmF1bHQnOiB7XG5cdFx0XHRsb2c6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpO1xuXHRcdFx0fSxcblx0XHRcdGRlYnVnOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWydkZWJ1ZzonXS5jb25jYXQoYXJndW1lbnRzKSk7XG5cdFx0XHR9LFxuXHRcdFx0aWY6IGZ1bmN0aW9uKGVudiwgc3ViamVjdCwgYXJncyAvKiBzdWNjZXNzQmFiZWx1dGUsIGVsc2VCYWJlbHV0ZSAqLyApIHtcblx0XHRcdFx0aWYgKGFyZ3NbMF0pXG5cdFx0XHRcdFx0cmV0dXJuIGFyZ3NbMV0uJG91dHB1dChlbnYsIHN1YmplY3QpO1xuXHRcdFx0XHRlbHNlIGlmIChhcmdzWzJdKVxuXHRcdFx0XHRcdHJldHVybiBhcmdzWzJdLiRvdXRwdXQoZW52LCBzdWJqZWN0KTtcblx0XHRcdH0sXG5cdFx0XHRhbGw6IGZ1bmN0aW9uKGVudiwgc3ViamVjdCwgdGhlbmFibGVzKSB7XG5cdFx0XHRcdHJldHVybiBQcm9taXNlLmFsbCh0aGVuYWJsZXMpO1xuXHRcdFx0fSxcblx0XHRcdHRoZW46IGZ1bmN0aW9uKGVudiwgc3ViamVjdCwgY2FsbGJhY2tzKSB7XG5cdFx0XHRcdGlmIChsb2NhbHMuZXJyb3IpXG5cdFx0XHRcdFx0cmV0dXJuIGxvY2Fscy5yZXN1bHQgPSBhcmdzWzBdKGxvY2Fscy5lcnJvcik7XG5cdFx0XHRcdHJldHVybiBsb2NhbHMucmVzdWx0ID0gYXJnc1sxXShsb2NhbHMucmVzdWx0KTtcblx0XHRcdH0sXG5cdFx0XHRjYXRjaDogZnVuY3Rpb24oZW52LCBzdWJqZWN0LCBhcmdzKSB7XG5cdFx0XHRcdGlmIChsb2NhbHMuZXJyb3IpXG5cdFx0XHRcdFx0cmV0dXJuIGxvY2Fscy5yZXN1bHQgPSBhcmdzWzBdKGxvY2Fscy5lcnJvcik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5CYWJlbHV0ZS5wcm90b3R5cGUgPSB7XG5cdC8qKlxuXHQgKiBnZXQgbmV3IGRlZGljYXRlZCBiYWJlbHV0ZSBoYW5kbGVyIHRoYXQgYWN0IG9uIHNhbWUgYXJheSBvZiBsZXhlbXMgKGN1cnJlbnQgb25lKVxuXHQgKiByZXR1cm4gbmV3IGJhYmVsdXRlIHNwZWNpYWxpc2VkIHdpdGggbGV4aWNOYW1lXG5cdCAqL1xuXHRiYWJlbHV0ZTogZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdFx0dmFyIGxleGljID0gQmFiZWx1dGUuZ2V0TGV4aWMobGV4aWNOYW1lKSxcblx0XHRcdENsID0gbGV4aWMuQ2wsXG5cdFx0XHRiID0gbmV3IENsKCk7XG5cdFx0Yi5fbGV4ZW1zID0gdGhpcy5fbGV4ZW1zO1xuXHRcdHJldHVybiBiO1xuXHR9LFxuXHQvKipcblx0ICogZ2V0IGRlZGljYXRlZCBiYWJlbHV0ZSBoYW5kbGVyIChpbmRlcGVuZGFudCBvZiBjdXJyZW50IGFycmF5IG9mIGxleGVtcylcblx0ICogcmV0dXJuIG5ldyBiYWJlbHV0ZSBzcGVjaWFsaXNlZCB3aXRoIGxleGljTmFtZSBvciBjdXJyZW50IGxleGljXG5cdCAqL1xuXHRfbmV3OiBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0XHRyZXR1cm4gQmFiZWx1dGUuYihsZXhpY05hbWUgfHwgwqB0aGlzLl9fYmFiZWx1dGVfXyAhPT0gdHJ1ZSA/IHRoaXMuX19iYWJlbHV0ZV9fIDogbnVsbCk7XG5cdH0sXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHQgKiBCYWJlbHV0ZSBpbnN0YW5jZSBtb2RpZmljYXRpb24gKG1ldGEtbGFuZ3VhZ2UgQVBJKVxuXHQgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cdC8vIGFkZCBsZXhlbSB0byBiYWJlbHV0ZVxuXHRfYXBwZW5kOiBmdW5jdGlvbihsZXhpY05hbWUsIG5hbWUsIGFyZ3MpIHtcblx0XHR0aGlzLl9sZXhlbXMucHVzaChuZXcgTGV4ZW0obGV4aWNOYW1lIHx8IHRoaXMuX19iYWJlbHV0ZV9fLCBuYW1lLCBhcmdzKSk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdC8vIGNvbmRpdGlvbmFsIHNlbnRlbmNlcyBjb25jYXRlbmF0aW9uXG5cdF9pZjogZnVuY3Rpb24oY29uZGl0aW9uLCBiYWJlbHV0ZSkge1xuXHRcdGlmIChjb25kaXRpb24pXG5cdFx0XHR0aGlzLl9sZXhlbXMgPSB0aGlzLl9sZXhlbXMuY29uY2F0KGJhYmVsdXRlLl9sZXhlbXMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHQvLyB1c2UgYSBiYWJlbHV0ZSAoY29uY2F0IGl0cyBsZXhlbXMgdG8gbG9jYWwgb25lcylcblx0X3VzZTogZnVuY3Rpb24oYmFiZWx1dGUgLyogY291bGQgYmUgYSBzdHJpbmcgaW4gXCJsZXhpY05hbWU6bWV0aG9kTmFtZVwiIGZvcm1hdCAqLyAvKiwgLi4uYXJncyAqLyApIHtcblx0XHRpZiAoIWJhYmVsdXRlKVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0dmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG5cdFx0XHRtZXRob2QgPSB0eXBlb2YgYmFiZWx1dGUgPT09ICdzdHJpbmcnID8gZ2V0TWV0aG9kKGJhYmVsdXRlKSA6IGJhYmVsdXRlO1xuXHRcdGlmIChtZXRob2QuX19iYWJlbHV0ZV9fKVxuXHRcdFx0dGhpcy5fbGV4ZW1zID0gdGhpcy5fbGV4ZW1zLmNvbmNhdChtZXRob2QuX2xleGVtcyk7XG5cdFx0ZWxzZVxuXHRcdFx0bWV0aG9kKHRoaXMuX2xleGVtcywgYXJncyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdGZvckVhY2g6IGZ1bmN0aW9uKGZ1bmMsIHNlbGYpIHtcblx0XHR2YXIgbGV4ZW1zID0gdGhpcy5fbGV4ZW1zO1xuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsZXhlbXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpXG5cdFx0XHRmdW5jLmNhbGwoc2VsZiB8fCDCoHRoaXMsIGxleGVtc1tpXSwgaSk7XG5cdH0sXG5cdC8vIGV4ZWN1dGUgcHJvdmlkZWQgZnVuY3Rpb24gYmluZGVkIG9uIGN1cnJlbnQgYmFiZWx1dGUsIHRoYXQgd2lsbCByZWNlaXZlIGl0ZW0gYW5kIGluZGV4IGFzIGFyZ3VtZW50LlxuXHRfZWFjaDogZnVuY3Rpb24oYXJyLCBmdW5jLCBzZWxmKSB7XG5cdFx0YXJyLmZvckVhY2goZnVuYywgc2VsZiB8fCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0Ly8gZXhlY3V0ZSBwcm92aWRlZCBiYWJlbHV0ZXMgbGlzdCBvbiBjdXJyZW50IGJhYmVsdXRlLlxuXHRfdXNlRWFjaDogZnVuY3Rpb24oYXJyKSB7XG5cdFx0YXJyLmZvckVhY2goZnVuY3Rpb24oaSkge1xuXHRcdFx0dGhpcy5fdXNlKGkpO1xuXHRcdH0sIHRoaXMpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHQvKioqKioqKioqKioqKioqKioqKipcblx0ICogVFJBTlNMQVRJT05cblx0ICoqKioqKioqKioqKioqKioqKioqL1xuXHQvLyB0cmFuc2xhdGUgYmFiZWx1dGUgbGV4ZW0gdGhyb3VnaCBhIGxleGljLiByZXR1cm4gbmV3IGJhYmVsdXRlLlxuXHRfdHJhbnNsYXRpb246IGZ1bmN0aW9uKGxleGljTmFtZSkge1xuXHRcdC8vIHRvZG8gOiBvcHRpbWlzZWQgXCJyZWN1cnNpdmVcIiB0cmFuc2xhdGlvbiB3aXRoIGFycmF5IG9mIGxleGljc0RpY29cblx0XHR2YXIgbGV4aWMgPSBCYWJlbHV0ZS5nZXRMZXhpYyhsZXhpY05hbWUpLFxuXHRcdFx0Q2wgPSBsZXhpYy5DbCxcblx0XHRcdGIgPSBuZXcgQ2woKSxcblx0XHRcdGxleGVtO1xuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSB0aGlzLl9sZXhlbXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcblx0XHRcdGxleGVtID0gdGhpcy5fbGV4ZW1zW2ldO1xuXHRcdFx0dmFyIGFyZ3MgPSBsZXhlbS5hcmdzLm1hcChmdW5jdGlvbihhcmcpIHtcblx0XHRcdFx0aWYgKGFyZyAmJiBhcmcuX19iYWJlbHV0ZV9fKVxuXHRcdFx0XHRcdHJldHVybiBhcmcuX3RyYW5zbGF0aW9uKGxleGljTmFtZSk7XG5cdFx0XHRcdHJldHVybiBhcmc7XG5cdFx0XHR9KTtcblx0XHRcdGlmIChiW2xleGVtLm5hbWVdKVxuXHRcdFx0XHRiW2xleGVtLm5hbWVdLmFwcGx5KGIsIGFyZ3MpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRiLl9sZXhlbXMucHVzaChuZXcgTGV4ZW0obGV4ZW0ubGV4aWMsIGxleGVtLm5hbWUsIGFyZ3MpKTtcblx0XHR9XG5cdFx0cmV0dXJuIGI7XG5cdH0sXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdCAqKioqKioqKioqKioqKioqKiBPVVRQVVRTICoqKioqKioqKioqKioqKioqKioqXG5cdCAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXHQvLyBzcGVjaWFsaXNlZCBvdXB1dCA6IGludGVycHJldCBiYWJlbHV0ZSB3aXRoIHNwZWNpZmllZCBhY3Rpb25zXG5cdCckb3V0cHV0JzogZnVuY3Rpb24oZW52IC8qIG9yIGFjdGlvbnNOYW1lICovICwgc3ViamVjdCwgc2NvcGUsIHN0YXJ0SW5kZXgpIHtcblx0XHRpZiAodHlwZW9mIGVudiA9PT0gJ3N0cmluZycpXG5cdFx0XHRlbnYgPSBuZXcgRW52aXJvbm1lbnQoZW52LCBzY29wZSk7XG5cblx0XHR2YXIgYWN0aW9ucyA9IGVudi5hY3Rpb25zLFxuXHRcdFx0c2VsZiA9IHRoaXMsXG5cdFx0XHRpbmRleCA9IChzdGFydEluZGV4IHx8IDApLFxuXHRcdFx0bGV4ZW0sXG5cdFx0XHRyLFxuXHRcdFx0Zjtcblx0XHR3aGlsZSAobGV4ZW0gPSB0aGlzLl9sZXhlbXNbaW5kZXgrK10pIHtcblx0XHRcdGlmIChhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX18gJiYgIWFjdGlvbnMuX19yZXN0cmljdGlvbnNfX1tsZXhlbS5sZXhpY10pXG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0ZiA9IGFjdGlvbnNbbGV4ZW0ubmFtZV0gfHwgYWN0aW9uc0RpY28uZGVmYXVsdFtsZXhlbS5uYW1lXTtcblx0XHRcdGlmIChmKSB7XG5cdFx0XHRcdHIgPSBmKGVudiwgc3ViamVjdCwgbGV4ZW0uYXJncywgZW52LnNjb3BlKTtcblx0XHRcdFx0aWYgKHIgJiYgci50aGVuKSB7IC8vIHdhaXQgcHJvbWlzZSB0aGVuIGNvbnRpbnVlIG91dHB1dFxuXHRcdFx0XHRcdHJldHVybiByLnRoZW4oZnVuY3Rpb24ocykge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNlbGYuJG91dHB1dChlbnYsIHN1YmplY3QsIG51bGwsIGluZGV4KTtcblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gc3ViamVjdDtcblx0fSxcblx0LyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblx0ICoqKioqKioqKioqKioqKioqKioqKiogREVGQVVMVCBMRVhFTVMgKioqKioqKioqKioqKioqKioqKipcblx0ICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cdC8vIGNvbmRpdGlvbmFsIGV4ZWN1dGlvblxuXHRpZjogZnVuY3Rpb24oY29uZGl0aW9uLCBiYWJlbHV0ZSwgZWxzZUJhYmVsdXRlKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCh0aGlzLl9fYmFiZWx1dGVfXywgJ2lmJywgW2NvbmRpdGlvbiwgYmFiZWx1dGUsIGVsc2VCYWJlbHV0ZV0pO1xuXHR9LFxuXHQvLyBsb2cgYWN0aW9uIHN0YXRlXG5cdGxvZzogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCh0aGlzLl9fYmFiZWx1dGVfXywgJ2xvZycsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdH0sXG5cdC8vIGZvciBkZWJ1ZyA6IGxvZyBhY3Rpb24gc3RhdGVcblx0ZGVidWc6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQodGhpcy5fX2JhYmVsdXRlX18sICdkZWJ1ZycsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdH0sXG5cdC8vIGFzeW5jIG1hbmFnZW1lbnRcblx0YWxsOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYXBwZW5kKHRoaXMuX19iYWJlbHV0ZV9fLCAnYWxsJywgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblx0fSxcblx0dGhlbjogZnVuY3Rpb24oc3VjY2VzcywgZmFpbCkge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQodGhpcy5fX2JhYmVsdXRlX18sICd0aGVuJywgW3N1Y2Nlc3MsIGZhaWxdKTtcblx0fSxcblx0Y2F0Y2g6IGZ1bmN0aW9uKGZhaWwpIHtcblx0XHRyZXR1cm4gdGhpcy5fYXBwZW5kKHRoaXMuX19iYWJlbHV0ZV9fLCAnZmFpbCcsIFtmYWlsXSk7XG5cdH1cbn07XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKioqKioqIFNUQVRJQ1MgKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbi8vIEJhYmVsdXRlIG1haW4gaW5pdGlhbGl6ZXJcbkJhYmVsdXRlLmIgPSBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0cmV0dXJuIGxleGljTmFtZSA/IEJhYmVsdXRlLmluaXRpYWxpemVyKGxleGljTmFtZSkgOiBuZXcgQmFiZWx1dGUoKTtcbn07XG5cbi8vIGJhYmVsdXRlIGluaXRpYWxpemVyIG1hbmFnZW1lbnRcblxuZnVuY3Rpb24gYWRkVG9Jbml0aWFsaXplcihsZXhpYywgbWV0aG9kKSB7XG5cdHZhciBDbCA9IGxleGljLkNsO1xuXHRsZXhpYy5pbml0aWFsaXplciA9IGxleGljLmluaXRpYWxpemVyIHx8IMKge307XG5cdGxleGljLmluaXRpYWxpemVyW21ldGhvZF0gPSBmdW5jdGlvbigpIHtcblx0XHR2YXIgaW5zdGFuY2UgPSBuZXcgbGV4aWMuQ2woKTtcblx0XHRyZXR1cm4gaW5zdGFuY2VbbWV0aG9kXS5hcHBseShpbnN0YW5jZSwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblx0fVxufVxuXG5mdW5jdGlvbiBpbml0aWFsaXplcihsZXhpYykge1xuXHRsZXhpYy5pbml0aWFsaXplciA9IGxleGljLmluaXRpYWxpemVyIHx8IHt9O1xuXHRPYmplY3Qua2V5cyhsZXhpYy5DbC5wcm90b3R5cGUpXG5cdFx0LmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRpZiAoa2V5ID09PSAnX19iYWJlbHV0ZV9fJyB8fCBrZXkgPT09ICdfbGV4ZW1zJylcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0YWRkVG9Jbml0aWFsaXplcihsZXhpYywga2V5KTtcblx0XHR9KTtcblx0cmV0dXJuIGxleGljLmluaXRpYWxpemVyO1xufVxuXG4vLyBCYWJlbHV0ZSBpbml0aWFsaXplciBwcm92aWRlclxuQmFiZWx1dGUuaW5pdGlhbGl6ZXIgPSBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0dmFyIGxleGljID0gQmFiZWx1dGUuZ2V0TGV4aWMobGV4aWNOYW1lKTtcblx0cmV0dXJuIGxleGljLmluaXRpYWxpemVyIHx8IGluaXRpYWxpemVyKGxleGljKTtcbn07XG5cbi8vIHJldHVybiBzcGVjaWZpZWQgbGV4aWMuXG5CYWJlbHV0ZS5nZXRMZXhpYyA9IGZ1bmN0aW9uKGxleGljTmFtZSkge1xuXHR2YXIgbGV4aWMgPSBsZXhpY3NEaWNvW2xleGljTmFtZV07XG5cdGlmICghbGV4aWMpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdCYWJlbHV0ZSA6IGxleGljIG5vdCBmb3VuZCA6ICcgKyBsZXhpY05hbWUpO1xuXHRyZXR1cm4gbGV4aWM7XG59O1xuXG4vLyByZXR1cm4gc3BlY2lmaWVkIGFjdGlvbnMuXG5CYWJlbHV0ZS5nZXRBY3Rpb25zID0gZnVuY3Rpb24oYWN0aW9uc05hbWUpIHtcblx0dmFyIGFjdGlvbnMgPSBhY3Rpb25zRGljb1thY3Rpb25zTmFtZV07XG5cdGlmICghYWN0aW9ucylcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0JhYmVsdXRlIDogYWN0aW9ucyBub3QgZm91bmQgOiAnICsgYWN0aW9uc05hbWUpO1xuXHRyZXR1cm4gYWN0aW9ucztcbn07XG5cbi8qKlxuICogQWRkIG1ldGhvZChzKSB0byBzcGVjaWZpZWQgbGV4aWNcbiAqIEBwYXJhbSAge1N0cmluZ30gbGV4aWNOYW1lICBcdHRoZSBuYW1lIG9mIHRoZSBsZXhpYyB3aGVyZSBoYXBwZW5pbmcgbWV0aG9kKHMpXG4gKiBAcGFyYW0gIHtTdHJpbmcgfCBBcnJheSB8IE9iamVjdH0gXHRJZiBpcyBzdHJpbmcgOiBpdCdzIHRoZSBuYW1lIG9mIHRoZSBtZXRob2QuIElmIGlzIGFycmF5IG9mIHN0cmluZyA6IGVhY2ggc3RyaW5nIGlzIHRoZSBuYW1lIG9mIGEgbG9naWNhbCBhdG9tIG1ldGhvZC4gSWYgaXMgYW4gb2JqZWN0IDogaXQncyB1c2VkIGFzIGEgbWFwIG9mIG1ldGhvZHMuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gbWV0aG9kICAgIHRoZSBtZXRob2QgZnVuY3Rpb24uIHVzZWQgb25seSBpZiBtZXRob05hbWUgaXMgYSBzdHJpbmcuXG4gKiBAcmV0dXJuIHtCYWJlbHV0ZX0gICBcdFx0QmFiZWx1dGUgZm9yIGNoYWluaW5nXG4gKi9cbkJhYmVsdXRlLnRvTGV4aWMgPSBmdW5jdGlvbihsZXhpY05hbWUsIG1ldGhvZE5hbWUsIG1ldGhvZCkge1xuXHR2YXIgbGV4aWMgPSBsZXhpY3NEaWNvW2xleGljTmFtZV0gfHwgaW5pdExleGljKGxleGljTmFtZSk7XG5cdGlmICh0eXBlb2YgbWV0aG9kTmFtZSA9PT0gJ29iamVjdCcpIHtcblx0XHRpZiAobWV0aG9kTmFtZS5mb3JFYWNoKSB7IC8vIGxvZ2ljYWwgYXRvbXMuIHB1cmUgc2luZ2xlIF9hcHBlbmRcblx0XHRcdG1ldGhvZE5hbWUuZm9yRWFjaChmdW5jdGlvbihtZXRob2ROYW1lKSB7XG5cdFx0XHRcdGFkZExleGVtKGxleGljLCBsZXhpY05hbWUsIG1ldGhvZE5hbWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlXG5cdFx0XHRmb3IgKHZhciBpIGluIG1ldGhvZE5hbWUpIHtcblx0XHRcdFx0aWYgKGkgPT09ICdfX2JhYmVsdXRlX18nIHx8IGkgPT09ICdfbGV4ZW1zJylcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0YWRkTGV4ZW0obGV4aWMsIGxleGljTmFtZSwgaSwgbWV0aG9kTmFtZVtpXSk7XG5cdFx0XHR9XG5cdH0gZWxzZVxuXHRcdGFkZExleGVtKGxleGljLCBsZXhpY05hbWUsIG1ldGhvZE5hbWUsIG1ldGhvZCk7XG5cdHJldHVybiBCYWJlbHV0ZTtcbn07XG5cbmZ1bmN0aW9uIGFkZExleGVtKGxleGljLCBsZXhpY05hbWUsIG1ldGhvZE5hbWUsIG1ldGhvZCkge1xuXHR2YXIgZmlyc3RMZXZlbFByb3RvID0gbGV4aWMuRmlyc3RMZXZlbENsLnByb3RvdHlwZTtcblx0Zmlyc3RMZXZlbFByb3RvW21ldGhvZE5hbWVdID0gZ2V0Rmlyc3RMZXZlbE1ldGhvZChsZXhpY05hbWUsIG1ldGhvZE5hbWUpO1xuXHRsZXhpYy5DbC5wcm90b3R5cGVbbWV0aG9kTmFtZV0gPSBtZXRob2QgfHwgZmlyc3RMZXZlbFByb3RvW21ldGhvZE5hbWVdO1xuXHRhZGRUb0luaXRpYWxpemVyKGxleGljLCBtZXRob2ROYW1lKTtcbn1cblxuLyoqXG4gKiBBZGQgYWN0aW9uJ3MgbWV0aG9kIHRvIHNwZWNpZmllZCBhY3Rpb25zRGljbyBuYW1lc3BhY2VzXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGFjdGlvbnNOYW1lIFx0bmFtZXNwYWNlIG9mIGFjdGlvbnNEaWNvIHdoZXJlIHN0b3JlIG1ldGhvZChzKVxuICogQHBhcmFtICB7U3RyaW5nIHwgT2JqZWN0fSBcdFx0bWV0aG9kTmFtZSAgdGhlIG5hbWUgb2YgdGhlIG3DqXRob2Qgb3IgYSBtYXAgKG9iamVjdCkgb2YgbWV0aG9kc1xuICogQHBhcmFtICB7RnVuY3Rpb259IG1ldGhvZCAgICAgIFx0dGhlIG1ldGhvZCBmdW5jdGlvbi4gKHVzZWQgb25seSBpZiBtZXRob2ROYW1lIGlzIGEgc3RyaW5nKVxuICogQHJldHVybiB7QmFiZWx1dGV9ICAgICAgICAgICAgIFx0QmFiZWx1dGUgZm9yIGNoYWluaW5nLlxuICovXG5CYWJlbHV0ZS50b0FjdGlvbnMgPSBmdW5jdGlvbihhY3Rpb25zTmFtZSwgbWV0aG9kTmFtZSwgbWV0aG9kKSB7XG5cdHZhciBhY3Rpb25zID0gYWN0aW9uc0RpY29bYWN0aW9uc05hbWVdID0gYWN0aW9uc0RpY29bYWN0aW9uc05hbWVdIHx8IMKge307XG5cdGlmICh0eXBlb2YgbWV0aG9kTmFtZSA9PT0gJ29iamVjdCcpIHtcblx0XHRmb3IgKHZhciBpIGluIG1ldGhvZE5hbWUpIHtcblx0XHRcdGlmIChpID09PSAnX19yZXN0cmljdGlvbnNfXycpIHtcblx0XHRcdFx0YWN0aW9ucy5fX3Jlc3RyaWN0aW9uc19fID0gYWN0aW9ucy5fX3Jlc3RyaWN0aW9uc19fIHx8IHt9O1xuXHRcdFx0XHRmb3IgKHZhciBqIGluIG1ldGhvZE5hbWVbaV0pXG5cdFx0XHRcdFx0YWN0aW9uc1tpXVtqXSA9IG1ldGhvZE5hbWVbaV1bal07XG5cdFx0XHR9IGVsc2Vcblx0XHRcdFx0YWN0aW9uc1tpXSA9IG1ldGhvZE5hbWVbaV07XG5cdFx0fVxuXHR9IGVsc2UgaWYgKG1ldGhvZE5hbWUgPT09ICdfX3Jlc3RyaWN0aW9uc19fJykge1xuXHRcdGFjdGlvbnMuX19yZXN0cmljdGlvbnNfXyA9IGFjdGlvbnMuX19yZXN0cmljdGlvbnNfXyB8fCB7fTtcblx0XHRmb3IgKHZhciBqIGluIG1ldGhvZClcblx0XHRcdGFjdGlvbnMuX19yZXN0cmljdGlvbnNfX1tqXSA9IG1ldGhvZFtqXTtcblx0fSBlbHNlXG5cdFx0YWN0aW9uc1ttZXRob2ROYW1lXSA9IG1ldGhvZDtcblx0cmV0dXJuIEJhYmVsdXRlO1xufTtcblxuLy8gZHVwbGljYXRlIHNwZWNpZmllZCBsZXhpYyB0byBuZXdOYW1lIGFuZCBhZGQgcHJvdmlkZWQgbWV0aG9kcyB0byBpdC5cbkJhYmVsdXRlLmV4dGVuZExleGljID0gZnVuY3Rpb24obGV4aWNOYW1lLCBuZXdOYW1lLCBtZXRob2RzKSB7XG5cdHZhciBsZXhpYyA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSksXG5cdFx0bmV3TGV4aWMgPSBpbml0TGV4aWMobmV3TmFtZSwgbGV4aWMpO1xuXHRpZiAobWV0aG9kcylcblx0XHRCYWJlbHV0ZS50b0xleGljKG5ld05hbWUsIG1ldGhvZHMpO1xuXHRyZXR1cm4gQmFiZWx1dGU7XG59O1xuXG4vLyBkdXBsaWNhdGUgc3BlY2lmaWVkIGFjdGlvbnMgdG8gbmV3TmFtZSBhbmQgYWRkIHByb3ZpZGVkIG1ldGhvZHMgdG8gaXQuXG5CYWJlbHV0ZS5leHRlbmRBY3Rpb25zID0gZnVuY3Rpb24oYWN0aW9uc05hbWUsIG5ld05hbWUsIG1ldGhvZHMpIHtcblx0QmFiZWx1dGUudG9BY3Rpb25zKG5ld05hbWUsIEJhYmVsdXRlLmdldEFjdGlvbnMoYWN0aW9uc05hbWUpKTtcblx0aWYgKG1ldGhvZHMpXG5cdFx0QmFiZWx1dGUudG9BY3Rpb25zKG5ld05hbWUsIG1ldGhvZHMpO1xuXHR2YXIgYWN0aW9ucyA9IGFjdGlvbnNEaWNvW25ld05hbWVdO1xuXHRhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX18gPSBhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX18gfHwge307XG5cdGFjdGlvbnMuX19yZXN0cmljdGlvbnNfX1tuZXdOYW1lXSA9IHRydWU7XG5cdHJldHVybiBCYWJlbHV0ZTtcbn07XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKiBFbnZpcm9ubWVudCAqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cbmZ1bmN0aW9uIEVudmlyb25tZW50KGFjdGlvbnNOYW1lLCBzY29wZSkge1xuXHR0aGlzLl9fYmFiZWx1dGVfX2Vudl9fID0gdHJ1ZTtcblx0dGhpcy5hY3Rpb25zID0gQmFiZWx1dGUuZ2V0QWN0aW9ucyhhY3Rpb25zTmFtZSk7XG5cdHRoaXMuc2NvcGUgPSBzY29wZSB8fCDCoG51bGw7XG59XG5cbkVudmlyb25tZW50LnByb3RvdHlwZSA9IHtcblx0cHVzaFNjb3BlOiBmdW5jdGlvbihuYW1lLCBpbnN0YW5jZSkge1xuXHRcdHRoaXMuc2NvcGVzID0gdGhpcy5zY29wZXMgfHwgW107XG5cdFx0dmFyIHNjb3BlID0ge307XG5cdFx0Zm9yICh2YXIgaSBpbiB0aGlzLnNjb3BlKVxuXHRcdFx0c2NvcGVbaV0gPSB0aGlzLnNjb3BlW2ldO1xuXHRcdHNjb3BlW2ldID0gaW5zdGFuY2U7XG5cdFx0dGhpcy5zY29wZXMucHVzaChzY29wZSk7XG5cdFx0dGhpcy5zY29wZSA9IHNjb3BlO1xuXHR9LFxuXHRwb3BTY29wZTogZnVuY3Rpb24obmFtZSkge1xuXHRcdGlmICghdGhpcy5zY29wZXMpXG5cdFx0XHRyZXR1cm47XG5cdFx0aWYgKHRoaXMuc2NvcGVzLmxlbmd0aClcblx0XHRcdHRoaXMuc2NvcGVzLnBvcCgpO1xuXHRcdHRoaXMuc2NvcGUgPSB0aGlzLnNjb3Blc1t0aGlzLnNjb3Blcy5sZW5ndGggLSAxXSB8fCBudWxsO1xuXHR9XG59O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKiBVVElMUyAqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyBwYXJzZSBsZXhpY05hbWU6bWV0aG9kTmFtZSBzdHJpbmcgZm9ybWF0IGFuZCByZXR1cm4gbWV0aG9kIGZyb20gbGV4aWNcbi8vIGFic29sdXRseSBmb3IgaW50ZXJuYWwgdXNlIG9ubHkuXG5mdW5jdGlvbiBnZXRNZXRob2QocmVxKSB7XG5cdHZhciBzcGxpdHRlZCA9IHJlcS5zcGxpdCgnOicpLFxuXHRcdGxleGljTmFtZSA9IHNwbGl0dGVkWzBdLFxuXHRcdGxleGljID0gQmFiZWx1dGUuZ2V0TGV4aWMobGV4aWNOYW1lKSxcblx0XHRtZXRob2ROYW1lID0gc3BsaXR0ZWRbMV07XG5cdGlmICghbGV4aWMuQ2wucHJvdG90eXBlW21ldGhvZE5hbWVdKVxuXHRcdHRocm93IG5ldyBFcnJvcignQmFiZWx1dGUgOiBtZXRob2Qgbm90IGZvdW5kIDogJyArIHJlcSk7XG5cdHZhciBpbnN0YW5jZSA9IGdldEluc3RhbmNlKGxleGljTmFtZSwgbGV4aWMpO1xuXHRyZXR1cm4gZnVuY3Rpb24obGV4ZW1zLCBhcmdzKSB7XG5cdFx0aW5zdGFuY2UuX2xleGVtcyA9IGxleGVtcztcblx0XHRpbnN0YW5jZVttZXRob2ROYW1lXS5hcHBseShpbnN0YW5jZSwgYXJncyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gZ2V0SW5zdGFuY2UobGV4aWNOYW1lLCBsZXhpYykge1xuXHRpZiAobGV4aWMuSW5zdGFuY2UpXG5cdFx0cmV0dXJuIGxleGljLkluc3RhbmNlO1xuXHR2YXIgQ2wgPSBsZXhpYy5DbDtcblx0cmV0dXJuIGxleGljLkluc3RhbmNlID0gbmV3IENsKCk7XG59XG5cbmZ1bmN0aW9uIGluaXRMZXhpYyhsZXhpY05hbWUsIGJhc2VMZXhpYykge1xuXHR2YXIgQmFzZUNsYXNzID0gKGJhc2VMZXhpYyAmJiBiYXNlTGV4aWMuQ2wpIHx8IEJhYmVsdXRlLFxuXHRcdEJhc2VGTENsYXNzID0gKGJhc2VMZXhpYyAmJiBiYXNlTGV4aWMuRmlyc3RMZXZlbENsKSB8fCBCYWJlbHV0ZTtcblxuXHR2YXIgQ2wgPSBmdW5jdGlvbigpIHtcblx0XHRCYXNlQ2xhc3MuY2FsbCh0aGlzKTtcblx0XHR0aGlzLl9fYmFiZWx1dGVfXyA9IGxleGljTmFtZTtcblx0fTtcblx0Q2wucHJvdG90eXBlID0gbmV3IEJhc2VDbGFzcygpO1xuXG5cdHZhciBGaXJzdExldmVsQ2wgPSBmdW5jdGlvbigpIHtcblx0XHRCYXNlRkxDbGFzcy5jYWxsKHRoaXMpO1xuXHRcdHRoaXMuX19iYWJlbHV0ZV9fID0gbGV4aWNOYW1lO1xuXHR9O1xuXHRGaXJzdExldmVsQ2wucHJvdG90eXBlID0gbmV3IEJhc2VGTENsYXNzKCk7XG5cblx0bGV4aWMgPSBsZXhpY3NEaWNvW2xleGljTmFtZV0gPSB7XG5cdFx0Q2w6IENsLFxuXHRcdEZpcnN0TGV2ZWxDbDogRmlyc3RMZXZlbENsXG5cdH07XG5cdGlmIChiYXNlTGV4aWMpIHtcblx0XHR2YXIgb2xkSSA9IGJhc2VMZXhpYy5pbml0aWFsaXplcixcblx0XHRcdG5ld0kgPSBCYWJlbHV0ZS5pbml0aWFsaXplcihsZXhpY05hbWUpO1xuXHRcdGZvciAodmFyIGkgaW4gb2xkSSkge1xuXHRcdFx0aWYgKGkgPT09ICdfX2JhYmVsdXRlX18nIHx8IGkgPT09ICdfbGV4ZW1zJylcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRhZGRUb0luaXRpYWxpemVyKGxleGljLCBpKTtcblx0XHR9XG5cdH1cblx0cmV0dXJuIGxleGljO1xufVxuXG5mdW5jdGlvbiBnZXRGaXJzdExldmVsTWV0aG9kKGxleGljTmFtZSwgbWV0aG9kTmFtZSkge1xuXHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZChsZXhpY05hbWUsIG1ldGhvZE5hbWUsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdH07XG59XG5cbkJhYmVsdXRlLmluaXRMZXhpYyA9IGluaXRMZXhpYztcbkJhYmVsdXRlLkVudmlyb25tZW50ID0gRW52aXJvbm1lbnQ7XG5cbm1vZHVsZS5leHBvcnRzID0gQmFiZWx1dGU7XG5cbi8vIiwiLyoqXG4gKiBBIEZpcnN0TGV2ZWxOb2RlIGlzIGp1c3QgYSBCYWJsdXRlIHRoYXQga2VlcHMgYW55IGFwcGVuZGVkIGxleGVtIGF0IHRvcCBsb2dpY2FsIGxldmVsICh0aGF0IG1lYW5zIHRoYXQgYW55IGNvbXBvdW5kZWQgbGV4ZW0gKG1hZGUgd2l0aCBvdGhlciBsZXhlbXMpIGlzIGFkZGVkIGFzIGFuIGF0b21pYyBsZXhlbSkuXG4gKiBcbiAqIEEgQmFiZWx1dGUgRG9jdW1lbnQgaXMgYSBCYWJlbHV0ZSB0aGF0IHlvdSBjb3VsZCBlZGl0LiBUaGluayBhYm91dCBhIFhNTC9IVE1MIERvY3VtZW50LlxuICogVGhlIGFpbSBpcyB0byBhbGxvdyBmdWxsIGVkaXRpb24gYW5kIGNvbnN0cnVjdGlvbiBvZiBCYWJlbHV0ZSBzZW50ZW5jZXMuXG4gKiAoYmFiZWx1dGUgbm9kZSB3cmFwcGluZywgaW5zZXJ0QmVmb3JlLCBwcmVwZW5kLCBxdWVyeSBub2RlcywgZXRjKVxuICogXG4gKiBBIEZpcnN0TGV2ZWxOb2RlIGRvY3VtZW50LCB0aGF0IGhvbGRzIG90aGVycyBGaXJzdExldmVsTm9kZSBhcyBpbm5lciBsZXhlbXMsIGZvcm1zIGEgdmFsaWQgYmFiZWx1dGUuXG4gKiBFdmVyeSBjYWxsIG9uIGEgRmlyc3RMZXZlbE5vZGUgYXJlIGp1c3QgYXBwZW5kZWQgdG8gbGV4ZW1zIGluIG9iamVjdCBmb3JtIChha2EgeyBuYW1lOm15TGV4ZW1OYW1lLCBhcmdzOltteUFyZ3MuLi5dIH0pLlxuICpcbiAqIFNvIGl0IGtlZXBzIHRoaW5ncyB0aGUgbW9yZSBhYnN0cmFjdCBwb3NzaWJsZS4gXG4gKiBcbiAqIFRvIGJlY2FtZSAkb3V0cHV0YWJsZSA6IGl0IG5lZWRzIGFuIGFkZGl0aW9uYWwgdHJhbnNsYXRpb24gdG8gaXRzZWxmIChzZWUgZG9jcykuXG4gKi9cblxudmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi9iYWJlbHV0ZScpO1xuXG52YXIgRmlyc3RMZXZlbE5vZGUgPSBmdW5jdGlvbigpIHtcblx0QmFiZWx1dGUuY2FsbCh0aGlzKTtcbn07XG5cbkZpcnN0TGV2ZWxOb2RlLnByb3RvdHlwZSA9IG5ldyBCYWJlbHV0ZSgpO1xuRmlyc3RMZXZlbE5vZGUucHJvdG90eXBlLmJhYmVsdXRlID0gZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdHZhciBsZXhpYyA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSksXG5cdFx0Q2wgPSBsZXhpYy5GaXJzdExldmVsQ2wsXG5cdFx0YiA9IG5ldyBDbCgpO1xuXHRiLl9sZXhlbXMgPSB0aGlzLl9sZXhlbXM7XG5cdHJldHVybiBiO1xufTtcblxuQmFiZWx1dGUuZmlyc3RMZXZlbEluaXRpYWxpemVyID0gRmlyc3RMZXZlbE5vZGUuaW5pdGlhbGl6ZXIgPSBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0dmFyIENsID0gQmFiZWx1dGUuZ2V0TGV4aWMobGV4aWNOYW1lKS5GaXJzdExldmVsQ2w7XG5cdHJldHVybiBsZXhpYy5GaXJzdExldmVsSW5pdGlhbGl6ZXIgfHwgKGxleGljLkZpcnN0TGV2ZWxJbml0aWFsaXplciA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBuZXcgQ2woKTtcblx0fSk7XG59O1xuXG5CYWJlbHV0ZS5maXJzdExldmVsID0gZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdGlmIChsZXhpY05hbWUpXG5cdFx0cmV0dXJuIEZpcnN0TGV2ZWxOb2RlLmluaXRpYWxpemVyKGxleGljTmFtZSkoKTtcblx0cmV0dXJuIG5ldyBGaXJzdExldmVsTm9kZSgpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaXJzdExldmVsTm9kZTsiLCIvKiogIFxuICogQGF1dGhvciBHaWxsZXMgQ29vbWFucyA8Z2lsbGVzLmNvb21hbnNAZ21haWwuY29tPlxuICovXG5cbmZ1bmN0aW9uIGdldE1ldGhvZChwYXJlbnQsIG5hbWUpIHtcblx0dmFyIG1ldGhvZCA9IHBhcmVudFtuYW1lXTtcblx0aWYgKCFtZXRob2QpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdCYWJlbHV0ZSA6IG5vIGxleGVtIGZvdW5kIGluIGN1cnJlbnQgbGV4aWMgKCcgKyAocGFyZW50Ll9fYmFiZWx1dGVfXyB8fCAnZGVmYXVsdCcpICsgJykgd2l0aCA6JyArIG5hbWUpO1xuXHRyZXR1cm4gbWV0aG9kO1xufVxuXG52YXIgZWxlbnBpID0gcmVxdWlyZSgnZWxlbnBpL3YyJyksXG5cdHIgPSBlbGVucGkucixcblx0UGFyc2VyID0gZWxlbnBpLlBhcnNlcixcblx0QmFiZWx1dGUgPSByZXF1aXJlKCcuL2JhYmVsdXRlJyksXG5cdHJlcGxhY2VTaW5nbGVTdHJpbmcgPSAvXFxcXCcvZyxcblx0cmVwbGFjZURvdWJsZVN0cmluZyA9IC9cXFxcXCIvZyxcblx0Ly8gZ3JhbW1hciBzaG9ydGN1dCBtYXAgKDEgY2hhciBwcmV2aXN1KSBmb3IgdmFsdWVzXG5cdHZhbHVlUHJldmlzdU1hcCA9IHtcblx0XHQnMSc6ICdudW1iZXInLFxuXHRcdCcyJzogJ251bWJlcicsXG5cdFx0JzMnOiAnbnVtYmVyJyxcblx0XHQnNCc6ICdudW1iZXInLFxuXHRcdCc1JzogJ251bWJlcicsXG5cdFx0JzYnOiAnbnVtYmVyJyxcblx0XHQnNyc6ICdudW1iZXInLFxuXHRcdCc4JzogJ251bWJlcicsXG5cdFx0JzknOiAnbnVtYmVyJyxcblx0XHQnMCc6ICdudW1iZXInLFxuXHRcdFwiJ1wiOiAnc2luZ2xlc3RyaW5nJyxcblx0XHQnXCInOiAnZG91Ymxlc3RyaW5nJyxcblx0XHQneyc6ICdvYmplY3QnLFxuXHRcdCdbJzogJ2FycmF5J1xuXHR9LFxuXHRydWxlcyA9IHtcblx0XHQvL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19cblx0XHRiYWJlbHV0ZTogcigpXG5cdFx0XHQuc3BhY2UoKVxuXHRcdFx0Lm9uZU9yTW9yZSh7XG5cdFx0XHRcdHJ1bGU6ICdsZXhlbScsXG5cdFx0XHRcdHNlcGFyYXRvcjogcigpLnRlcm1pbmFsKC9eXFxzKi8pLFxuXHRcdFx0XHRwdXNoVG86IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50TGV4ZW0rKztcblx0XHRcdFx0XHRpZiAob2JqLmxleGljICYmIG9iai5sZXhpYyAhPT0gZW52LmN1cnJlbnRMZXhpYykgeyAvLyAnc2NvcGVkJyBsZXhpYyBtYW5hZ2VtZW50XG5cdFx0XHRcdFx0XHRpZiAocGFyZW50Ll9fc3dhcHBlZF9fKSAvLyB3ZSBoYXZlIGFscmVhZHkgcHVzaCBzb21ldGhpbmcgYmVmb3JlIChha2Egc2Vjb25kIChvciBtb3JlKSBsZXhpYyBjaGFuZ2Ugb24gc2FtZSBiYWJlbHV0ZSlcblx0XHRcdFx0XHRcdFx0ZW52LmxleGljc1tlbnYubGV4aWNzLmxlbmd0aCAtIDFdID0gZW52LmxleGljO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRlbnYubGV4aWNzLnB1c2gob2JqLmxleGljKTsgLy8gcHVzaCBsZXhpYyB0byBzY29wZVxuXHRcdFx0XHRcdFx0ZW52LmN1cnJlbnRMZXhpYyA9IG9iai5sZXhpYztcblx0XHRcdFx0XHRcdHZhciBuZXdQYXJlbnQgPSBCYWJlbHV0ZS5iKG9iai5sZXhpYyk7XG5cdFx0XHRcdFx0XHRuZXdQYXJlbnQuX2xleGVtcyA9IHBhcmVudC5fbGV4ZW1zO1xuXHRcdFx0XHRcdFx0cGFyZW50Ll9fc3dhcHBlZF9fID0gbmV3UGFyZW50O1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoZW52LmFzRG9jKSAvLyB0b3AgbGV2ZWwgbGV4ZW1cblx0XHRcdFx0XHRcdChwYXJlbnQuX19zd2FwcGVkX18gfHwgcGFyZW50KS5fYXBwZW5kKGVudi5jdXJyZW50TGV4aWMsIG9iai5uYW1lLCBvYmouYXJncyk7XG5cdFx0XHRcdFx0ZWxzZSB7IC8vIHVzZSBjdXJyZW50IGJhYmVsdXRlIGxleGljXG5cdFx0XHRcdFx0XHRwYXJlbnQgPSBwYXJlbnQuX19zd2FwcGVkX18gfHwgcGFyZW50O1xuXHRcdFx0XHRcdFx0Z2V0TWV0aG9kKHBhcmVudCwgb2JqLm5hbWUpLmFwcGx5KHBhcmVudCwgb2JqLmFyZ3MpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdC5kb25lKGZ1bmN0aW9uKGVudiwgYmFiZWx1dGUpIHtcblx0XHRcdFx0aWYgKGJhYmVsdXRlLl9fc3dhcHBlZF9fKSB7IC8vICdzY29wZWQnIGxleGljIG1hbmFnZW1lbnQgOlxuXHRcdFx0XHRcdC8vIG9uZSBsZXhpYyBoYXMgYmVlbiBwdXNoZWQgZnJvbSB0aGlzIGJhYmVsdXRlXG5cdFx0XHRcdFx0Ly8gc28gcG9wIHRvIHBhcmVudCBsZXhpY1xuXHRcdFx0XHRcdGVudi5sZXhpY3MucG9wKCk7XG5cdFx0XHRcdFx0ZW52LmN1cnJlbnRMZXhpYyA9IGVudi5sZXhpY3NbZW52LmxleGljcy5sZW5ndGggLSAxXTtcblx0XHRcdFx0XHRiYWJlbHV0ZS5fX3N3YXBwZWRfXyA9IG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuc3BhY2UoKSxcblxuXHRcdGxleGVtOiByKCkub25lT2YoXG5cdFx0XHQvLyBsZXhlbSAoYWthOiBuYW1lKGFyZzEsIGFyZzIsIC4uLikpXG5cdFx0XHRyKCkudGVybWluYWwoL14oW1xcdy1fXSspXFxzKlxcKFxccyovLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7IC8vIGxleGVtIG5hbWUgKyAnICggJ1xuXHRcdFx0XHRvYmoubmFtZSA9IGNhcFsxXTtcblx0XHRcdFx0b2JqLmFyZ3MgPSBbXTtcblx0XHRcdH0pXG5cdFx0XHQub25lT2YoXG5cdFx0XHRcdHIoKS50ZXJtaW5hbCgvXlxccypcXCkvKSwgLy8gZW5kIHBhcmVudGhlc2lzXG5cblx0XHRcdFx0cigpXG5cdFx0XHRcdC5vbmVPck1vcmUoeyAvLyBhcmd1bWVudHNcblx0XHRcdFx0XHRydWxlOiAndmFsdWUnLFxuXHRcdFx0XHRcdHNlcGFyYXRvcjogcigpLnRlcm1pbmFsKC9eXFxzKixcXHMqLyksXG5cdFx0XHRcdFx0cHVzaFRvOiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50TGV4ZW1WYWx1ZXMrKztcblx0XHRcdFx0XHRcdHBhcmVudC5hcmdzLnB1c2gob2JqLnZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50ZXJtaW5hbCgvXlxccypcXCkvKSAvLyBlbmQgcGFyZW50aGVzaXNcblx0XHRcdCksXG5cblx0XHRcdC8vIGxleGljIHNlbGVjdG9yIChha2EgQGxleGljOilcblx0XHRcdHIoKS50ZXJtaW5hbCgvXiMoW1xcdy1fXSspOi8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHsgLy8gJ0AnICsgbGV4aWMgbmFtZSArICc6J1xuXHRcdFx0XHRvYmoubGV4aWMgPSBjYXBbMV07XG5cdFx0XHR9KVxuXHRcdCksXG5cblxuXHRcdC8qKioqKioqKioqKlxuXHRcdCAqIFZBTFVFU1xuXHRcdCAqKioqKioqKioqKi9cblx0XHR2YWx1ZTogcigpXG5cdFx0XHQuZG9uZShmdW5jdGlvbihlbnYsIG9iaikge1xuXHRcdFx0XHRpZiAoIWVudi5zdHJpbmcubGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gc2hvcnRjdXQgd2l0aCBmaXJzdCBjaGFyIHByZXZpc3UgdGhyb3VnaCB2YWx1ZU1hcFxuXHRcdFx0XHRlbnYucGFyc2VyLmV4ZWModmFsdWVQcmV2aXN1TWFwW2Vudi5zdHJpbmdbMF1dIHx8ICd3b3JkVmFsdWUnLCBvYmosIGVudik7XG5cdFx0XHR9KSxcblxuXHRcdG51bWJlcjogcigpLnRlcm1pbmFsKC9eWzAtOV0rKFxcLlswLTldKyk/LywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0b2JqLnZhbHVlID0gY2FwWzFdID8gcGFyc2VGbG9hdChjYXBbMF0gKyBjYXBbMV0sIDEwKSA6IHBhcnNlSW50KGNhcFswXSwgMTApO1xuXHRcdH0pLFxuXHRcdHNpbmdsZXN0cmluZzogcigpLnRlcm1pbmFsKC9eJygoPzpcXFxcJ3xbXiddKSopJy8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdG9iai52YWx1ZSA9IGNhcFsxXS5yZXBsYWNlKHJlcGxhY2VTaW5nbGVTdHJpbmcsIFwiJ1wiKTtcblx0XHR9KSxcblx0XHRkb3VibGVzdHJpbmc6IHIoKS50ZXJtaW5hbCgvXlwiKCg/OlxcXFxcInxbXlwiXSkqKVwiLywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0b2JqLnZhbHVlID0gY2FwWzFdLnJlcGxhY2UocmVwbGFjZURvdWJsZVN0cmluZywgJ1wiJyk7XG5cdFx0fSksXG5cblx0XHR3b3JkVmFsdWU6IHIoKVxuXHRcdFx0Lm9uZU9mKFxuXHRcdFx0XHQvLyB0cnVlfGZhbHNlfG51bGx8dW5kZWZpbmVkfE5hTnxJbmZpbml0eVxuXHRcdFx0XHRyKCkudGVybWluYWwoL14oPzp0cnVlfGZhbHNlfG51bGx8dW5kZWZpbmVkfE5hTnxJbmZpbml0eSkvLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7XG5cdFx0XHRcdFx0c3dpdGNoIChjYXBbMF0pIHtcblx0XHRcdFx0XHRcdGNhc2UgJ3RydWUnOlxuXHRcdFx0XHRcdFx0XHRvYmoudmFsdWUgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgJ2ZhbHNlJzpcblx0XHRcdFx0XHRcdFx0b2JqLnZhbHVlID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSAnbnVsbCc6XG5cdFx0XHRcdFx0XHRcdG9iai52YWx1ZSA9IG51bGw7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSAndW5kZWZpbmVkJzpcblx0XHRcdFx0XHRcdFx0b2JqLnZhbHVlID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgJ05hTic6XG5cdFx0XHRcdFx0XHRcdG9iai52YWx1ZSA9IE5hTjtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlICdJbmZpbml0eSc6XG5cdFx0XHRcdFx0XHRcdG9iai52YWx1ZSA9IEluZmluaXR5O1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHQvLyBmdW5jdGlvblxuXHRcdFx0XHRyKCkub25lKHtcblx0XHRcdFx0XHRydWxlOiAnZnVuY3Rpb24nLFxuXHRcdFx0XHRcdC8vIHByZXZpc3U6ICdmJyxcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHRcdGlmIChlbnYuYWNjZXB0RnVuY3Rpb25zKSAvLyB0b2RvIDogYWRkIHdhcm5pbmcgd2hlbiBub3QgYWxsb3dlZCBidXQgcHJlc2VudFxuXHRcdFx0XHRcdFx0XHRwYXJlbnQudmFsdWUgPSBGdW5jdGlvbi5hcHBseShudWxsLCBvYmouYXJncy5jb25jYXQob2JqLmJsb2NrKSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0Ly8gYmFiZWx1dGVzXG5cdFx0XHRcdHIoKS5vbmUoe1xuXHRcdFx0XHRcdHJ1bGU6ICdiYWJlbHV0ZScsXG5cdFx0XHRcdFx0YXM6IGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGVudi5hc0RvYyA/IEJhYmVsdXRlLmRvYyhlbnYuY3VycmVudExleGljKSA6IEJhYmVsdXRlLmIoZW52LmN1cnJlbnRMZXhpYyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzZXQ6IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHRcdHBhcmVudC52YWx1ZSA9IG9iajtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHQpLFxuXG5cdFx0b2JqZWN0OiByKCkub25lKHtcblx0XHRcdHJ1bGU6IHIoKVxuXHRcdFx0XHQudGVybWluYWwoL15cXHtcXHMqLykgLy8gc3RhcnQgYnJhY2tldFxuXHRcdFx0XHQuemVyb09yTW9yZSh7IC8vIHByb3BlcnRpZXNcblx0XHRcdFx0XHRydWxlOiByKClcblx0XHRcdFx0XHRcdC8vIGtleVxuXHRcdFx0XHRcdFx0LnRlcm1pbmFsKC9eKFtcXHctX10rKXxcIihbXlwiXSopXCJ8JyhbXiddKiknLywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0XHRcdFx0XHRvYmoua2V5ID0gY2FwWzFdO1xuXHRcdFx0XHRcdFx0fSlcblx0XHRcdFx0XHRcdC50ZXJtaW5hbCgvXlxccyo6XFxzKi8pXG5cdFx0XHRcdFx0XHQvLyB2YWx1ZVxuXHRcdFx0XHRcdFx0Lm9uZSgndmFsdWUnKSxcblx0XHRcdFx0XHRzZXBhcmF0b3I6IHIoKS50ZXJtaW5hbCgvXlxccyosXFxzKi8pLFxuXHRcdFx0XHRcdHB1c2hUbzogZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iaikge1xuXHRcdFx0XHRcdFx0cGFyZW50W29iai5rZXldID0gb2JqLnZhbHVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblx0XHRcdFx0LnRlcm1pbmFsKC9eXFxzKlxcfS8pLCAvLyBlbmQgYnJhY2tldFxuXG5cdFx0XHRzZXQ6IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0cGFyZW50LnZhbHVlID0gb2JqO1xuXHRcdFx0fVxuXHRcdH0pLFxuXG5cdFx0YXJyYXk6IHIoKS5vbmUoe1xuXHRcdFx0cnVsZTogcigpXG5cdFx0XHRcdC50ZXJtaW5hbCgvXlxcW1xccyovKSAvLyBzdGFydCBzcXVhcmUgYnJhY2tldFxuXHRcdFx0XHQuemVyb09yTW9yZSh7IC8vIGl0ZW1zXG5cdFx0XHRcdFx0cnVsZTogJ3ZhbHVlJyxcblx0XHRcdFx0XHRzZXBhcmF0b3I6IHIoKS50ZXJtaW5hbCgvXlxccyosXFxzKi8pLFxuXHRcdFx0XHRcdHB1c2hUbzogZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iaikge1xuXHRcdFx0XHRcdFx0cGFyZW50LnB1c2gob2JqLnZhbHVlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50ZXJtaW5hbCgvXlxccypcXF0vKSwgLy8gZW5kIHNxdWFyZSBicmFja2V0XG5cblxuXHRcdFx0YXM6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4gW107XG5cdFx0XHR9LFxuXHRcdFx0c2V0OiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdHBhcmVudC52YWx1ZSA9IG9iajtcblx0XHRcdH1cblx0XHR9KSxcblxuXHRcdCdmdW5jdGlvbic6IHIoKVxuXHRcdFx0LnRlcm1pbmFsKC9eZnVuY3Rpb25cXHMqXFwoXFxzKi8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdFx0b2JqLmFyZ3MgPSBbXTtcblx0XHRcdFx0b2JqLmJsb2NrID0gJyc7XG5cdFx0XHR9KVxuXHRcdFx0Lnplcm9Pck1vcmUoeyAvLyBhcmd1bWVudHMga2V5XG5cdFx0XHRcdHJ1bGU6IHIoKS50ZXJtaW5hbCgvXltcXHctX10rLywgJ2tleScpLFxuXHRcdFx0XHRzZXBhcmF0b3I6IHIoKS50ZXJtaW5hbCgvXlxccyosXFxzKi8pLFxuXHRcdFx0XHRwdXNoVG86IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHRwYXJlbnQuYXJncy5wdXNoKG9iai5rZXkpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0LnRlcm1pbmFsKC9eXFxzKlxcKVxccypcXHsvKVxuXHRcdFx0Lm9uZSgnc2NvcGVCbG9jaycpXG5cdFx0XHQuZG9uZShmdW5jdGlvbihlbnYsIG9iaikge1xuXHRcdFx0XHQvLyByZW1vdmUgbGFzdCB1bmVlZGVkICd9JyBpbiBjYXRjaGVkIGJsb2NrIChpdCdzIHRoZXJlIGZvciBpbm5lci1ibG9ja3MgcmVjdXJzaW9uKVxuXHRcdFx0XHRvYmouYmxvY2sgPSBvYmouYmxvY2suc3Vic3RyaW5nKDAsIG9iai5ibG9jay5sZW5ndGggLSAxKTtcblx0XHRcdH0pLFxuXG5cdFx0c2NvcGVCbG9jazogcigpIC8vIGZ1bmN0aW9uIHNjb3BlIGJsb2NrIChhZnRlciBmaXJzdCAneycpXG5cdFx0XHQub25lT2YoXG5cdFx0XHRcdC8vIGlubmVyIGJsb2NrIHJlY3Vyc2lvblxuXHRcdFx0XHRyKCkudGVybWluYWwoL15bXlxce1xcfV0qXFx7LywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0XHRcdG9iai5ibG9jayArPSBjYXBbMF07XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbmVPck1vcmUoJ3Njb3BlQmxvY2snKSxcblxuXHRcdFx0XHQvLyBlbmQgYmxvY2sgXG5cdFx0XHRcdHIoKS50ZXJtaW5hbCgvXlteXFx9XSpcXH0vLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7XG5cdFx0XHRcdFx0b2JqLmJsb2NrICs9IGNhcFswXTtcblx0XHRcdFx0fSlcblx0XHRcdClcblx0fTtcblxuQmFiZWx1dGUuUGFyc2VyID0gUGFyc2VyO1xuXG52YXIgcGFyc2VyID0gbmV3IFBhcnNlcihydWxlcywgJ2JhYmVsdXRlJyksXG5cdHRlbXBsYXRlQ2FjaGUgPSB7fTtcblxuQmFiZWx1dGUucGFyc2UgPSBmdW5jdGlvbihzdHJpbmcsIG9wdCkge1xuXHRvcHQgPSBvcHQgfHwgwqB7fTtcblx0dmFyIGVudiA9IHt9O1xuXHRmb3IgKHZhciBpIGluIG9wdClcblx0XHRlbnZbaV0gPSBvcHRbaV07XG5cdGVudi5sZXhpY3MgPSBbb3B0Lm1haW5MZXhpY107XG5cdGVudi5jdXJyZW50TGV4aWMgPSBvcHQubWFpbkxleGljO1xuXHRyZXR1cm4gcGFyc2VyLnBhcnNlKHN0cmluZywgJ2JhYmVsdXRlJywgQmFiZWx1dGUuYihvcHQubWFpbkxleGljKSwgZW52KTtcbn1cblxuQmFiZWx1dGUuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG5cdHJldHVybiBKU09OLnBhcnNlKGpzb24sIGZ1bmN0aW9uKGssIHYpIHtcblx0XHRpZiAoIXYpXG5cdFx0XHRyZXR1cm4gdjtcblx0XHRpZiAodi5fX2JhYmVsdXRlbGV4ZW1fXylcblx0XHRcdHJldHVybiBuZXcgQmFiZWx1dGUuTGV4ZW0odi5sZXhpYywgdi5uYW1lLCB2LmFyZ3MpO1xuXHRcdGlmICh2Ll9fYmFiZWx1dGVfXykge1xuXHRcdFx0dmFyIGIgPSBuZXcgQmFiZWx1dGUoKTtcblx0XHRcdGIuX2xleGVtcyA9IHYuX2xleGVtcztcblx0XHRcdHJldHVybiBiO1xuXHRcdH1cblx0XHRyZXR1cm4gdjtcblx0fSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcGFyc2VyOyIsIi8qKlxuICogQGF1dGhvciBHaWxsZXMgQ29vbWFuc1xuICogQGxpY2VuY2UgTUlUXG4gKiBAY29weXJpZ2h0IDIwMTYgR2lsbGVzIENvb21hbnNcbiAqL1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICogU3RyaW5naWZ5IEJhYmVsdXRlIHRvIHNlcmlhbGlzZWQgZm9ybSAoYmVhdXRpZmllZCBvciBtaW5pZmllZClcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG52YXIgQmFiZWx1dGUgPSByZXF1aXJlKCcuL2JhYmVsdXRlJyk7XG5cbi8vIHV0aWxzXG5mdW5jdGlvbiBwdXNoTGV4aWNTY29wZShvcHQsIGxleGljLCBhbHJlYWR5UHVzaGVkKSB7XG5cdGlmIChhbHJlYWR5UHVzaGVkKVxuXHRcdG9wdC5sZXhpY1Njb3BlW29wdC5sZXhpY1Njb3BlLmxlbmd0aCAtIDFdID0gbGV4aWM7XG5cdGVsc2Vcblx0XHRvcHQubGV4aWNTY29wZS5wdXNoKGxleGljKTtcblx0b3B0LmN1cnJlbnRMZXhpYyA9IGxleGljO1xuXHRyZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcG9wTGV4aWNTY29wZShvcHQpIHtcblx0b3B0LmxleGljU2NvcGUucG9wKCk7XG5cdG9wdC5jdXJyZW50TGV4aWMgPSBvcHQubGV4aWNTY29wZVtvcHQubGV4aWNTY29wZS5sZW5ndGggLSAxXTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlTGFzdFVuZGVmaW5lZChhcnIpIHtcblx0dmFyIGluZGV4ID0gYXJyLmxlbmd0aCxcblx0XHRsZW4gPSBpbmRleDtcblx0d2hpbGUgKGluZGV4ICYmIGFycltpbmRleCAtIDFdID09PSB1bmRlZmluZWQpXG5cdFx0aW5kZXgtLTtcblx0aWYgKGluZGV4IDwgbGVuKVxuXHRcdGFyci5zcGxpY2UoaW5kZXgsIGxlbiAtIGluZGV4KTtcblx0cmV0dXJuIGFycjtcbn1cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKiBiZWF1dHlmeVxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5mdW5jdGlvbiBiZWF1dHlMZXhlbXMobGV4ZW1zLCBvcHQpIHtcblx0dmFyIGxleGVtc091dHB1dCA9IFtdLFxuXHRcdG91dGxlbmd0aCA9IDAsXG5cdFx0aXRlbSxcblx0XHRhcmdzLFxuXHRcdGxleGljUHVzaGVkID0gZmFsc2UsXG5cdFx0b3V0O1xuXHRmb3IgKHZhciBpID0gMCwgbGVuID0gbGV4ZW1zLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0aXRlbSA9IGxleGVtc1tpXTtcblx0XHQvLyBpZiAoaXRlbS50b1N0cmluZ2lmeSlcblx0XHQvLyBpdGVtID0gaXRlbS50b1N0cmluZ2lmeSgpO1xuXHRcdGlmIChpdGVtLmxleGljICE9PSBvcHQuY3VycmVudExleGljKSB7XG5cdFx0XHRvdXQgPSAnIycgKyBpdGVtLmxleGljICsgJzonO1xuXHRcdFx0bGV4ZW1zT3V0cHV0LnB1c2gob3V0KTtcblx0XHRcdGxleGljUHVzaGVkID0gcHVzaExleGljU2NvcGUob3B0LCBpdGVtLmxleGljLCBsZXhpY1B1c2hlZCk7XG5cdFx0fVxuXHRcdGlmIChpdGVtLmFyZ3MpIHtcblx0XHRcdGFyZ3MgPSBiZWF1dHlBcnJheVZhbHVlcyhyZW1vdmVMYXN0VW5kZWZpbmVkKGl0ZW0uYXJncyksIG9wdCk7XG5cdFx0XHQvLyBhZGQgcmV0dXJuc1xuXHRcdFx0aWYgKChpdGVtLmFyZ3MubGVuZ3RoID4gMSB8fCAoaXRlbS5hcmdzWzBdICYmIGl0ZW0uYXJnc1swXS5fX2JhYmVsdXRlX18pKSAmJiBhcmdzLmxlbmd0aCA+IG9wdC5tYXhMZW5ndGgpXG5cdFx0XHRcdG91dCA9IGl0ZW0ubmFtZSArICcoXFxuXFx0JyArIGFyZ3MucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uKHMpIHtcblx0XHRcdFx0XHRyZXR1cm4gcyArICdcXHQnO1xuXHRcdFx0XHR9KSArICdcXG4pJztcblx0XHRcdGVsc2Vcblx0XHRcdFx0b3V0ID0gaXRlbS5uYW1lICsgJygnICsgYXJncyArICcpJztcblx0XHR9IGVsc2Vcblx0XHRcdG91dCA9IGl0ZW0ubmFtZSArICcoKSc7XG5cblx0XHRsZXhlbXNPdXRwdXQucHVzaChvdXQpO1xuXHRcdG91dGxlbmd0aCArPSBvdXQubGVuZ3RoO1xuXHR9XG5cdGlmIChsZXhpY1B1c2hlZClcblx0XHRwb3BMZXhpY1Njb3BlKG9wdCk7XG5cdG91dGxlbmd0aCArPSBsZXhlbXMubGVuZ3RoIC0gMTtcblx0cmV0dXJuIGxleGVtc091dHB1dC5qb2luKChvdXRsZW5ndGggPiBvcHQubWF4TGVuZ3RoKSA/ICdcXG4nIDogJyAnKTtcbn1cblxuZnVuY3Rpb24gYmVhdXR5QXJyYXkoYXJyLCBvcHQpIHtcblx0dmFyIG91dCwgYWRkUmV0dXJuLCBsZW4gPSBhcnIubGVuZ3RoO1xuXHRpZiAoIWxlbilcblx0XHRyZXR1cm4gJ1tdJztcblx0b3V0ID0gYmVhdXR5QXJyYXlWYWx1ZXMoYXJyLCBvcHQpO1xuXHRhZGRSZXR1cm4gPSAobGVuID4gMSAmJiBvdXQubGVuZ3RoID4gb3B0Lm1heExlbmd0aCk7XG5cdGlmIChhZGRSZXR1cm4pXG5cdFx0cmV0dXJuICdbXFxuXFx0JyArIG91dC5yZXBsYWNlKC9cXG4vZywgZnVuY3Rpb24ocykge1xuXHRcdFx0cmV0dXJuIHMgKyAnXFx0Jztcblx0XHR9KSArICdcXG5dJztcblx0cmV0dXJuICdbJyArIG91dCArICddJztcbn1cblxuZnVuY3Rpb24gYmVhdXR5QXJyYXlWYWx1ZXMoYXJyLCBvcHQpIHtcblx0dmFyIGxlbiA9IGFyci5sZW5ndGg7XG5cdGlmICghbGVuKVxuXHRcdHJldHVybiAnJztcblx0dmFyIG91dCxcblx0XHR2YWx1ZXMgPSBbXSxcblx0XHRvdXRsZW5ndGggPSAwO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0b3V0ID0gdmFsdWVUb1N0cmluZyhhcnJbaV0sIG9wdCk7XG5cdFx0dmFsdWVzLnB1c2gob3V0KTtcblx0XHRvdXRsZW5ndGggKz0gb3V0Lmxlbmd0aDtcblx0fVxuXHRvdXRsZW5ndGggKz0gbGVuIC0gMTtcblx0cmV0dXJuIHZhbHVlcy5qb2luKChvdXRsZW5ndGggPiBvcHQubWF4TGVuZ3RoKSA/ICcsXFxuJyA6ICcsICcpO1xufVxuXG5mdW5jdGlvbiBiZWF1dHlPYmplY3Qob2JqLCBvcHQpIHtcblx0dmFyIG91dCwgYWRkUmV0dXJuO1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG5cdG91dCA9IGJlYXV0eVByb3BlcnRpZXMob2JqLCBrZXlzLCBvcHQpO1xuXHRpZiAoa2V5cy5sZW5ndGggPiAxICYmIG91dC5sZW5ndGggPiBvcHQubWF4TGVuZ3RoKSB7IC8vIGFkZCByZXR1cm5zXG5cdFx0cmV0dXJuICd7XFxuXFx0JyArIG91dC5yZXBsYWNlKC9cXG4vZywgZnVuY3Rpb24ocykge1xuXHRcdFx0cmV0dXJuIHMgKyAnXFx0Jztcblx0XHR9KSArICdcXG59Jztcblx0fVxuXHRyZXR1cm4gJ3sgJyArIG91dCArICcgfSc7XG59XG5cbmZ1bmN0aW9uIGJlYXV0eVByb3BlcnRpZXMob2JqLCBrZXlzLCBvcHQpIHtcblx0dmFyIG91dCxcblx0XHR2YWx1ZXMgPSBbXSxcblx0XHRvdXRsZW5ndGggPSAwLFxuXHRcdGtleTtcblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGtleXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcblx0XHRrZXkgPSBrZXlzW2ldO1xuXHRcdG91dCA9IHZhbHVlVG9TdHJpbmcob2JqW2tleV0sIG9wdCk7XG5cdFx0b3V0bGVuZ3RoICs9IG91dC5sZW5ndGg7XG5cdFx0dmFsdWVzLnB1c2goa2V5ICsgJzogJyArIG91dCk7XG5cdH1cblx0b3V0bGVuZ3RoICs9IGtleXMubGVuZ3RoIC0gMTtcblx0cmV0dXJuIChvdXRsZW5ndGggPiBvcHQubWF4TGVuZ3RoKSA/IHZhbHVlcy5qb2luKCcsXFxuJykgOiB2YWx1ZXMuam9pbignLCAnKTtcbn1cblxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqIG1pbmlmeVxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5mdW5jdGlvbiB2YWx1ZVRvU3RyaW5nKHZhbCwgb3B0KSB7XG5cdGlmICghdmFsKVxuXHRcdHJldHVybiB2YWwgKyAnJztcblx0c3dpdGNoICh0eXBlb2YgdmFsKSB7XG5cdFx0Y2FzZSAnb2JqZWN0Jzpcblx0XHRcdGlmICh2YWwuX19iYWJlbHV0ZV9fKVxuXHRcdFx0XHRyZXR1cm4gdmFsLl9zdHJpbmdpZnkob3B0KTtcblx0XHRcdGlmICh2YWwuZm9yRWFjaClcblx0XHRcdFx0cmV0dXJuIChvcHQuYmVhdXRpZnkpID8gYmVhdXR5QXJyYXkodmFsLCBvcHQpIDogJ1snICsgYXJyYXlUb1N0cmluZyh2YWwsIG9wdCkgKyAnXSc7XG5cdFx0XHRyZXR1cm4gKG9wdC5iZWF1dGlmeSkgPyBiZWF1dHlPYmplY3QodmFsLCBvcHQpIDogb2JqZWN0VG9TdHJpbmcodmFsLCBvcHQpO1xuXHRcdGNhc2UgJ3N0cmluZyc6XG5cdFx0XHQvLyByZXR1cm4gJ1wiJyArIHZhbC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykgKyAnXCInOyAvLyBhZGRzIHF1b3RlcyBhbmQgZXNjYXBlcyBjb250ZW50XG5cdFx0XHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodmFsKTsgLy8gYWRkcyBxdW90ZXMgYW5kIGVzY2FwZXMgY29udGVudFxuXHRcdGNhc2UgJ2Z1bmN0aW9uJzpcblx0XHRcdHZhciBvdXQgPSAodmFsICsgJycpLnJlcGxhY2UoL2Fub255bW91cy8sICcnKS5yZXBsYWNlKC9cXG5cXC9cXCpcXCpcXC8vLCAnJyk7XG5cdFx0XHRyZXR1cm4gb3B0LmJlYXV0aWZ5ID8gb3V0IDogb3V0LnJlcGxhY2UoL2BbXmBdKmB8XFxuXFxzKi9nLCBmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0cmV0dXJuIHZhbFswXSA9PT0gXCJgXCIgPyB2YWwgOiAnICc7XG5cdFx0XHR9KTtcblx0XHRkZWZhdWx0OlxuXHRcdFx0cmV0dXJuIHZhbCArICcnO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGFycmF5VG9TdHJpbmcoYXJyLCBvcHQpIHtcblx0aWYgKCFhcnIubGVuZ3RoKVxuXHRcdHJldHVybiAnJztcblx0Ly8gbWFwIG91dHB1dFxuXHR2YXIgb3V0ID0gJyc7XG5cdGZvciAodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyArK2kpXG5cdFx0b3V0ICs9IChpID8gJywnIDogJycpICsgdmFsdWVUb1N0cmluZyhhcnJbaV0sIG9wdCk7XG5cdHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG9iaiwgb3B0KSB7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMob2JqKSxcblx0XHRvdXQgPSAnJyxcblx0XHRrZXk7XG5cdGZvciAodmFyIGkgPSAwLCBsZW4gPSBrZXlzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHRvdXQgKz0gKGkgPyAnLCcgOiAnJykgKyBrZXkgKyAnOicgKyB2YWx1ZVRvU3RyaW5nKG9ialtrZXldLCBvcHQpO1xuXHR9XG5cdHJldHVybiAneycgKyBvdXQgKyAnfSc7XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKiogZW5kIG1pbmlmeVxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5CYWJlbHV0ZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcblx0cmV0dXJuIHRoaXMuX3N0cmluZ2lmeSgpO1xufTtcblxuQmFiZWx1dGUucHJvdG90eXBlLl9zdHJpbmdpZnkgPSBmdW5jdGlvbihvcHQpIHtcblxuXHRvcHQgPSBvcHQgfHwgwqB7fTtcblx0b3B0LmxleGljU2NvcGUgPSBvcHQubGV4aWNTY29wZSB8fCBbXTtcblxuXHRpZiAob3B0LmJlYXV0aWZ5KSB7XG5cdFx0b3B0Lm1heExlbmd0aCA9IG9wdC5tYXhMZW5ndGggfHwgMjA7XG5cdFx0cmV0dXJuIGJlYXV0eUxleGVtcyh0aGlzLl9sZXhlbXMsIG9wdCk7XG5cdH1cblxuXHQvLyBlbHNlIG1pbmlmaXkgbGV4ZW1zXG5cdHZhciBsZXhlbXMgPSB0aGlzLl9sZXhlbXMsXG5cdFx0b3V0ID0gJycsXG5cdFx0aXRlbSxcblx0XHRsZXhpY1B1c2hlZCA9IGZhbHNlO1xuXG5cdGZvciAodmFyIGkgPSAwLCBsZW4gPSBsZXhlbXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcblx0XHRpdGVtID0gbGV4ZW1zW2ldO1xuXHRcdGlmIChpdGVtLmxleGljICE9PSBvcHQuY3VycmVudExleGljKSB7XG5cdFx0XHRvdXQgKz0gJyMnICsgaXRlbS5sZXhpYyArICc6Jztcblx0XHRcdGxleGljUHVzaGVkID0gcHVzaExleGljU2NvcGUob3B0LCBpdGVtLmxleGljLCBsZXhpY1B1c2hlZCk7XG5cdFx0fVxuXHRcdG91dCArPSBpdGVtLm5hbWUgKyAnKCcgKyAoaXRlbS5hcmdzID8gYXJyYXlUb1N0cmluZyhyZW1vdmVMYXN0VW5kZWZpbmVkKGl0ZW0uYXJncyksIG9wdCkgOiAnJykgKyAnKSc7XG5cdH1cblxuXHRpZiAobGV4aWNQdXNoZWQpXG5cdFx0cG9wTGV4aWNTY29wZShvcHQpO1xuXG5cdHJldHVybiBvdXQ7XG59O1xuXG5CYWJlbHV0ZS5hcnJheVRvU3RyaW5nID0gYXJyYXlUb1N0cmluZztcbkJhYmVsdXRlLm9iamVjdFRvU3RyaW5nID0gb2JqZWN0VG9TdHJpbmc7XG5CYWJlbHV0ZS52YWx1ZVRvU3RyaW5nID0gdmFsdWVUb1N0cmluZzsiLCJ2YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZEV2ZW50XG5cbmZ1bmN0aW9uIGFkZEV2ZW50KHRhcmdldCwgdHlwZSwgaGFuZGxlcikge1xuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICB2YXIgZXZlbnQgPSBldmVudHNbdHlwZV1cblxuICAgIGlmICghZXZlbnQpIHtcbiAgICAgICAgZXZlbnRzW3R5cGVdID0gaGFuZGxlclxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgaWYgKGV2ZW50LmluZGV4T2YoaGFuZGxlcikgPT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5wdXNoKGhhbmRsZXIpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ICE9PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IFtldmVudCwgaGFuZGxlcl1cbiAgICB9XG59XG4iLCJ2YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgRXZTdG9yZSA9IHJlcXVpcmUoXCJldi1zdG9yZVwiKVxudmFyIGNyZWF0ZVN0b3JlID0gcmVxdWlyZShcIndlYWttYXAtc2hpbS9jcmVhdGUtc3RvcmVcIilcblxudmFyIGFkZEV2ZW50ID0gcmVxdWlyZShcIi4vYWRkLWV2ZW50LmpzXCIpXG52YXIgcmVtb3ZlRXZlbnQgPSByZXF1aXJlKFwiLi9yZW1vdmUtZXZlbnQuanNcIilcbnZhciBQcm94eUV2ZW50ID0gcmVxdWlyZShcIi4vcHJveHktZXZlbnQuanNcIilcblxudmFyIEhBTkRMRVJfU1RPUkUgPSBjcmVhdGVTdG9yZSgpXG5cbm1vZHVsZS5leHBvcnRzID0gRE9NRGVsZWdhdG9yXG5cbmZ1bmN0aW9uIERPTURlbGVnYXRvcihkb2N1bWVudCkge1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBET01EZWxlZ2F0b3IpKSB7XG4gICAgICAgIHJldHVybiBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KTtcbiAgICB9XG5cbiAgICBkb2N1bWVudCA9IGRvY3VtZW50IHx8IGdsb2JhbERvY3VtZW50XG5cbiAgICB0aGlzLnRhcmdldCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudFxuICAgIHRoaXMuZXZlbnRzID0ge31cbiAgICB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzID0ge31cbiAgICB0aGlzLmdsb2JhbExpc3RlbmVycyA9IHt9XG59XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGFkZEV2ZW50XG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSByZW1vdmVFdmVudFxuXG5ET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPVxuICAgIGZ1bmN0aW9uIGFsbG9jYXRlSGFuZGxlKGZ1bmMpIHtcbiAgICAgICAgdmFyIGhhbmRsZSA9IG5ldyBIYW5kbGUoKVxuXG4gICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlKS5mdW5jID0gZnVuYztcblxuICAgICAgICByZXR1cm4gaGFuZGxlXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID1cbiAgICBmdW5jdGlvbiB0cmFuc2Zvcm1IYW5kbGUoaGFuZGxlLCBicm9hZGNhc3QpIHtcbiAgICAgICAgdmFyIGZ1bmMgPSBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuY1xuXG4gICAgICAgIHJldHVybiB0aGlzLmFsbG9jYXRlSGFuZGxlKGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgYnJvYWRjYXN0KGV2LCBmdW5jKTtcbiAgICAgICAgfSlcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUuYWRkR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gYWRkR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuICAgICAgICBpZiAobGlzdGVuZXJzLmluZGV4T2YoZm4pID09PSAtMSkge1xuICAgICAgICAgICAgbGlzdGVuZXJzLnB1c2goZm4pXG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdID0gbGlzdGVuZXJzO1xuICAgIH1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyID1cbiAgICBmdW5jdGlvbiByZW1vdmVHbG9iYWxFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgZm4pIHtcbiAgICAgICAgdmFyIGxpc3RlbmVycyA9IHRoaXMuZ2xvYmFsTGlzdGVuZXJzW2V2ZW50TmFtZV0gfHwgW107XG5cbiAgICAgICAgdmFyIGluZGV4ID0gbGlzdGVuZXJzLmluZGV4T2YoZm4pXG4gICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUubGlzdGVuVG8gPSBmdW5jdGlvbiBsaXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0rKztcblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdICE9PSAxKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBsaXN0ZW5lciA9IHRoaXMucmF3RXZlbnRMaXN0ZW5lcnNbZXZlbnROYW1lXVxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV0gPVxuICAgICAgICAgICAgY3JlYXRlSGFuZGxlcihldmVudE5hbWUsIHRoaXMpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQuYWRkRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLnVubGlzdGVuVG8gPSBmdW5jdGlvbiB1bmxpc3RlblRvKGV2ZW50TmFtZSkge1xuICAgIGlmICghKGV2ZW50TmFtZSBpbiB0aGlzLmV2ZW50cykpIHtcbiAgICAgICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXSA9IDA7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiYWxyZWFkeSB1bmxpc3RlbmVkIHRvIGV2ZW50LlwiKTtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdLS07XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMCkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cblxuICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZG9tLWRlbGVnYXRvciN1bmxpc3RlblRvOiBjYW5ub3QgXCIgK1xuICAgICAgICAgICAgXCJ1bmxpc3RlbiB0byBcIiArIGV2ZW50TmFtZSlcbiAgICB9XG5cbiAgICB0aGlzLnRhcmdldC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50TmFtZSwgbGlzdGVuZXIsIHRydWUpXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCBkZWxlZ2F0b3IpIHtcbiAgICB2YXIgZ2xvYmFsTGlzdGVuZXJzID0gZGVsZWdhdG9yLmdsb2JhbExpc3RlbmVycztcbiAgICB2YXIgZGVsZWdhdG9yVGFyZ2V0ID0gZGVsZWdhdG9yLnRhcmdldDtcblxuICAgIHJldHVybiBoYW5kbGVyXG5cbiAgICBmdW5jdGlvbiBoYW5kbGVyKGV2KSB7XG4gICAgICAgIHZhciBnbG9iYWxIYW5kbGVycyA9IGdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdXG5cbiAgICAgICAgaWYgKGdsb2JhbEhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBnbG9iYWxFdmVudCA9IG5ldyBQcm94eUV2ZW50KGV2KTtcbiAgICAgICAgICAgIGdsb2JhbEV2ZW50LmN1cnJlbnRUYXJnZXQgPSBkZWxlZ2F0b3JUYXJnZXQ7XG4gICAgICAgICAgICBjYWxsTGlzdGVuZXJzKGdsb2JhbEhhbmRsZXJzLCBnbG9iYWxFdmVudClcbiAgICAgICAgfVxuXG4gICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZXYudGFyZ2V0LCBldiwgZXZlbnROYW1lKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmluZEFuZEludm9rZUxpc3RlbmVycyhlbGVtLCBldiwgZXZlbnROYW1lKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gZ2V0TGlzdGVuZXIoZWxlbSwgZXZlbnROYW1lKVxuXG4gICAgaWYgKGxpc3RlbmVyICYmIGxpc3RlbmVyLmhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdmFyIGxpc3RlbmVyRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgIGxpc3RlbmVyRXZlbnQuY3VycmVudFRhcmdldCA9IGxpc3RlbmVyLmN1cnJlbnRUYXJnZXRcbiAgICAgICAgY2FsbExpc3RlbmVycyhsaXN0ZW5lci5oYW5kbGVycywgbGlzdGVuZXJFdmVudClcblxuICAgICAgICBpZiAobGlzdGVuZXJFdmVudC5fYnViYmxlcykge1xuICAgICAgICAgICAgdmFyIG5leHRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0LnBhcmVudE5vZGVcbiAgICAgICAgICAgIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMobmV4dFRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0TGlzdGVuZXIodGFyZ2V0LCB0eXBlKSB7XG4gICAgLy8gdGVybWluYXRlIHJlY3Vyc2lvbiBpZiBwYXJlbnQgaXMgYG51bGxgXG4gICAgaWYgKHRhcmdldCA9PT0gbnVsbCB8fCB0eXBlb2YgdGFyZ2V0ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJldHVybiBudWxsXG4gICAgfVxuXG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIC8vIGZldGNoIGxpc3Qgb2YgaGFuZGxlciBmbnMgZm9yIHRoaXMgZXZlbnRcbiAgICB2YXIgaGFuZGxlciA9IGV2ZW50c1t0eXBlXVxuICAgIHZhciBhbGxIYW5kbGVyID0gZXZlbnRzLmV2ZW50XG5cbiAgICBpZiAoIWhhbmRsZXIgJiYgIWFsbEhhbmRsZXIpIHtcbiAgICAgICAgcmV0dXJuIGdldExpc3RlbmVyKHRhcmdldC5wYXJlbnROb2RlLCB0eXBlKVxuICAgIH1cblxuICAgIHZhciBoYW5kbGVycyA9IFtdLmNvbmNhdChoYW5kbGVyIHx8IFtdLCBhbGxIYW5kbGVyIHx8IFtdKVxuICAgIHJldHVybiBuZXcgTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycylcbn1cblxuZnVuY3Rpb24gY2FsbExpc3RlbmVycyhoYW5kbGVycywgZXYpIHtcbiAgICBoYW5kbGVycy5mb3JFYWNoKGZ1bmN0aW9uIChoYW5kbGVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyKGV2KVxuICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBoYW5kbGVyLmhhbmRsZUV2ZW50ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuaGFuZGxlRXZlbnQoZXYpXG4gICAgICAgIH0gZWxzZSBpZiAoaGFuZGxlci50eXBlID09PSBcImRvbS1kZWxlZ2F0b3ItaGFuZGxlXCIpIHtcbiAgICAgICAgICAgIEhBTkRMRVJfU1RPUkUoaGFuZGxlcikuZnVuYyhldilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3I6IHVua25vd24gaGFuZGxlciBcIiArXG4gICAgICAgICAgICAgICAgXCJmb3VuZDogXCIgKyBKU09OLnN0cmluZ2lmeShoYW5kbGVycykpO1xuICAgICAgICB9XG4gICAgfSlcbn1cblxuZnVuY3Rpb24gTGlzdGVuZXIodGFyZ2V0LCBoYW5kbGVycykge1xuICAgIHRoaXMuY3VycmVudFRhcmdldCA9IHRhcmdldFxuICAgIHRoaXMuaGFuZGxlcnMgPSBoYW5kbGVyc1xufVxuXG5mdW5jdGlvbiBIYW5kbGUoKSB7XG4gICAgdGhpcy50eXBlID0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiXG59XG4iLCJ2YXIgSW5kaXZpZHVhbCA9IHJlcXVpcmUoXCJpbmRpdmlkdWFsXCIpXG52YXIgY3VpZCA9IHJlcXVpcmUoXCJjdWlkXCIpXG52YXIgZ2xvYmFsRG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBET01EZWxlZ2F0b3IgPSByZXF1aXJlKFwiLi9kb20tZGVsZWdhdG9yLmpzXCIpXG5cbnZhciB2ZXJzaW9uS2V5ID0gXCIxM1wiXG52YXIgY2FjaGVLZXkgPSBcIl9fRE9NX0RFTEVHQVRPUl9DQUNIRUBcIiArIHZlcnNpb25LZXlcbnZhciBjYWNoZVRva2VuS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVfVE9LRU5AXCIgKyB2ZXJzaW9uS2V5XG52YXIgZGVsZWdhdG9yQ2FjaGUgPSBJbmRpdmlkdWFsKGNhY2hlS2V5LCB7XG4gICAgZGVsZWdhdG9yczoge31cbn0pXG52YXIgY29tbW9uRXZlbnRzID0gW1xuICAgIFwiYmx1clwiLCBcImNoYW5nZVwiLCBcImNsaWNrXCIsICBcImNvbnRleHRtZW51XCIsIFwiZGJsY2xpY2tcIixcbiAgICBcImVycm9yXCIsXCJmb2N1c1wiLCBcImZvY3VzaW5cIiwgXCJmb2N1c291dFwiLCBcImlucHV0XCIsIFwia2V5ZG93blwiLFxuICAgIFwia2V5cHJlc3NcIiwgXCJrZXl1cFwiLCBcImxvYWRcIiwgXCJtb3VzZWRvd25cIiwgXCJtb3VzZXVwXCIsXG4gICAgXCJyZXNpemVcIiwgXCJzZWxlY3RcIiwgXCJzdWJtaXRcIiwgXCJ0b3VjaGNhbmNlbFwiLFxuICAgIFwidG91Y2hlbmRcIiwgXCJ0b3VjaHN0YXJ0XCIsIFwidW5sb2FkXCJcbl1cblxuLyogIERlbGVnYXRvciBpcyBhIHRoaW4gd3JhcHBlciBhcm91bmQgYSBzaW5nbGV0b24gYERPTURlbGVnYXRvcmBcbiAgICAgICAgaW5zdGFuY2UuXG5cbiAgICBPbmx5IG9uZSBET01EZWxlZ2F0b3Igc2hvdWxkIGV4aXN0IGJlY2F1c2Ugd2UgZG8gbm90IHdhbnRcbiAgICAgICAgZHVwbGljYXRlIGV2ZW50IGxpc3RlbmVycyBib3VuZCB0byB0aGUgRE9NLlxuXG4gICAgYERlbGVnYXRvcmAgd2lsbCBhbHNvIGBsaXN0ZW5UbygpYCBhbGwgZXZlbnRzIHVubGVzc1xuICAgICAgICBldmVyeSBjYWxsZXIgb3B0cyBvdXQgb2YgaXRcbiovXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRvclxuXG5mdW5jdGlvbiBEZWxlZ2F0b3Iob3B0cykge1xuICAgIG9wdHMgPSBvcHRzIHx8IHt9XG4gICAgdmFyIGRvY3VtZW50ID0gb3B0cy5kb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdmFyIGNhY2hlS2V5ID0gZG9jdW1lbnRbY2FjaGVUb2tlbktleV1cblxuICAgIGlmICghY2FjaGVLZXkpIHtcbiAgICAgICAgY2FjaGVLZXkgPVxuICAgICAgICAgICAgZG9jdW1lbnRbY2FjaGVUb2tlbktleV0gPSBjdWlkKClcbiAgICB9XG5cbiAgICB2YXIgZGVsZWdhdG9yID0gZGVsZWdhdG9yQ2FjaGUuZGVsZWdhdG9yc1tjYWNoZUtleV1cblxuICAgIGlmICghZGVsZWdhdG9yKSB7XG4gICAgICAgIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldID1cbiAgICAgICAgICAgIG5ldyBET01EZWxlZ2F0b3IoZG9jdW1lbnQpXG4gICAgfVxuXG4gICAgaWYgKG9wdHMuZGVmYXVsdEV2ZW50cyAhPT0gZmFsc2UpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb21tb25FdmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGRlbGVnYXRvci5saXN0ZW5Ubyhjb21tb25FdmVudHNbaV0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVsZWdhdG9yXG59XG5cbkRlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZSA9IERPTURlbGVnYXRvci5hbGxvY2F0ZUhhbmRsZTtcbkRlbGVnYXRvci50cmFuc2Zvcm1IYW5kbGUgPSBET01EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlO1xuIiwiLyoqXG4gKiBjdWlkLmpzXG4gKiBDb2xsaXNpb24tcmVzaXN0YW50IFVJRCBnZW5lcmF0b3IgZm9yIGJyb3dzZXJzIGFuZCBub2RlLlxuICogU2VxdWVudGlhbCBmb3IgZmFzdCBkYiBsb29rdXBzIGFuZCByZWNlbmN5IHNvcnRpbmcuXG4gKiBTYWZlIGZvciBlbGVtZW50IElEcyBhbmQgc2VydmVyLXNpZGUgbG9va3Vwcy5cbiAqXG4gKiBFeHRyYWN0ZWQgZnJvbSBDTENUUlxuICpcbiAqIENvcHlyaWdodCAoYykgRXJpYyBFbGxpb3R0IDIwMTJcbiAqIE1JVCBMaWNlbnNlXG4gKi9cblxuLypnbG9iYWwgd2luZG93LCBuYXZpZ2F0b3IsIGRvY3VtZW50LCByZXF1aXJlLCBwcm9jZXNzLCBtb2R1bGUgKi9cbihmdW5jdGlvbiAoYXBwKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIG5hbWVzcGFjZSA9ICdjdWlkJyxcbiAgICBjID0gMCxcbiAgICBibG9ja1NpemUgPSA0LFxuICAgIGJhc2UgPSAzNixcbiAgICBkaXNjcmV0ZVZhbHVlcyA9IE1hdGgucG93KGJhc2UsIGJsb2NrU2l6ZSksXG5cbiAgICBwYWQgPSBmdW5jdGlvbiBwYWQobnVtLCBzaXplKSB7XG4gICAgICB2YXIgcyA9IFwiMDAwMDAwMDAwXCIgKyBudW07XG4gICAgICByZXR1cm4gcy5zdWJzdHIocy5sZW5ndGgtc2l6ZSk7XG4gICAgfSxcblxuICAgIHJhbmRvbUJsb2NrID0gZnVuY3Rpb24gcmFuZG9tQmxvY2soKSB7XG4gICAgICByZXR1cm4gcGFkKChNYXRoLnJhbmRvbSgpICpcbiAgICAgICAgICAgIGRpc2NyZXRlVmFsdWVzIDw8IDApXG4gICAgICAgICAgICAudG9TdHJpbmcoYmFzZSksIGJsb2NrU2l6ZSk7XG4gICAgfSxcblxuICAgIHNhZmVDb3VudGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgYyA9IChjIDwgZGlzY3JldGVWYWx1ZXMpID8gYyA6IDA7XG4gICAgICBjKys7IC8vIHRoaXMgaXMgbm90IHN1YmxpbWluYWxcbiAgICAgIHJldHVybiBjIC0gMTtcbiAgICB9LFxuXG4gICAgYXBpID0gZnVuY3Rpb24gY3VpZCgpIHtcbiAgICAgIC8vIFN0YXJ0aW5nIHdpdGggYSBsb3dlcmNhc2UgbGV0dGVyIG1ha2VzXG4gICAgICAvLyBpdCBIVE1MIGVsZW1lbnQgSUQgZnJpZW5kbHkuXG4gICAgICB2YXIgbGV0dGVyID0gJ2MnLCAvLyBoYXJkLWNvZGVkIGFsbG93cyBmb3Igc2VxdWVudGlhbCBhY2Nlc3NcblxuICAgICAgICAvLyB0aW1lc3RhbXBcbiAgICAgICAgLy8gd2FybmluZzogdGhpcyBleHBvc2VzIHRoZSBleGFjdCBkYXRlIGFuZCB0aW1lXG4gICAgICAgIC8vIHRoYXQgdGhlIHVpZCB3YXMgY3JlYXRlZC5cbiAgICAgICAgdGltZXN0YW1wID0gKG5ldyBEYXRlKCkuZ2V0VGltZSgpKS50b1N0cmluZyhiYXNlKSxcblxuICAgICAgICAvLyBQcmV2ZW50IHNhbWUtbWFjaGluZSBjb2xsaXNpb25zLlxuICAgICAgICBjb3VudGVyLFxuXG4gICAgICAgIC8vIEEgZmV3IGNoYXJzIHRvIGdlbmVyYXRlIGRpc3RpbmN0IGlkcyBmb3IgZGlmZmVyZW50XG4gICAgICAgIC8vIGNsaWVudHMgKHNvIGRpZmZlcmVudCBjb21wdXRlcnMgYXJlIGZhciBsZXNzXG4gICAgICAgIC8vIGxpa2VseSB0byBnZW5lcmF0ZSB0aGUgc2FtZSBpZClcbiAgICAgICAgZmluZ2VycHJpbnQgPSBhcGkuZmluZ2VycHJpbnQoKSxcblxuICAgICAgICAvLyBHcmFiIHNvbWUgbW9yZSBjaGFycyBmcm9tIE1hdGgucmFuZG9tKClcbiAgICAgICAgcmFuZG9tID0gcmFuZG9tQmxvY2soKSArIHJhbmRvbUJsb2NrKCk7XG5cbiAgICAgICAgY291bnRlciA9IHBhZChzYWZlQ291bnRlcigpLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuXG4gICAgICByZXR1cm4gIChsZXR0ZXIgKyB0aW1lc3RhbXAgKyBjb3VudGVyICsgZmluZ2VycHJpbnQgKyByYW5kb20pO1xuICAgIH07XG5cbiAgYXBpLnNsdWcgPSBmdW5jdGlvbiBzbHVnKCkge1xuICAgIHZhciBkYXRlID0gbmV3IERhdGUoKS5nZXRUaW1lKCkudG9TdHJpbmcoMzYpLFxuICAgICAgY291bnRlcixcbiAgICAgIHByaW50ID0gYXBpLmZpbmdlcnByaW50KCkuc2xpY2UoMCwxKSArXG4gICAgICAgIGFwaS5maW5nZXJwcmludCgpLnNsaWNlKC0xKSxcbiAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkuc2xpY2UoLTIpO1xuXG4gICAgICBjb3VudGVyID0gc2FmZUNvdW50ZXIoKS50b1N0cmluZygzNikuc2xpY2UoLTQpO1xuXG4gICAgcmV0dXJuIGRhdGUuc2xpY2UoLTIpICtcbiAgICAgIGNvdW50ZXIgKyBwcmludCArIHJhbmRvbTtcbiAgfTtcblxuICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiBnbG9iYWxDb3VudCgpIHtcbiAgICAvLyBXZSB3YW50IHRvIGNhY2hlIHRoZSByZXN1bHRzIG9mIHRoaXNcbiAgICB2YXIgY2FjaGUgPSAoZnVuY3Rpb24gY2FsYygpIHtcbiAgICAgICAgdmFyIGksXG4gICAgICAgICAgY291bnQgPSAwO1xuXG4gICAgICAgIGZvciAoaSBpbiB3aW5kb3cpIHtcbiAgICAgICAgICBjb3VudCsrO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNvdW50O1xuICAgICAgfSgpKTtcblxuICAgIGFwaS5nbG9iYWxDb3VudCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGNhY2hlOyB9O1xuICAgIHJldHVybiBjYWNoZTtcbiAgfTtcblxuICBhcGkuZmluZ2VycHJpbnQgPSBmdW5jdGlvbiBicm93c2VyUHJpbnQoKSB7XG4gICAgcmV0dXJuIHBhZCgobmF2aWdhdG9yLm1pbWVUeXBlcy5sZW5ndGggK1xuICAgICAgbmF2aWdhdG9yLnVzZXJBZ2VudC5sZW5ndGgpLnRvU3RyaW5nKDM2KSArXG4gICAgICBhcGkuZ2xvYmFsQ291bnQoKS50b1N0cmluZygzNiksIDQpO1xuICB9O1xuXG4gIC8vIGRvbid0IGNoYW5nZSBhbnl0aGluZyBmcm9tIGhlcmUgZG93bi5cbiAgaWYgKGFwcC5yZWdpc3Rlcikge1xuICAgIGFwcC5yZWdpc3RlcihuYW1lc3BhY2UsIGFwaSk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGFwaTtcbiAgfSBlbHNlIHtcbiAgICBhcHBbbmFtZXNwYWNlXSA9IGFwaTtcbiAgfVxuXG59KHRoaXMuYXBwbGl0dWRlIHx8IHRoaXMpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIE9uZVZlcnNpb25Db25zdHJhaW50ID0gcmVxdWlyZSgnaW5kaXZpZHVhbC9vbmUtdmVyc2lvbicpO1xuXG52YXIgTVlfVkVSU0lPTiA9ICc3Jztcbk9uZVZlcnNpb25Db25zdHJhaW50KCdldi1zdG9yZScsIE1ZX1ZFUlNJT04pO1xuXG52YXIgaGFzaEtleSA9ICdfX0VWX1NUT1JFX0tFWUAnICsgTVlfVkVSU0lPTjtcblxubW9kdWxlLmV4cG9ydHMgPSBFdlN0b3JlO1xuXG5mdW5jdGlvbiBFdlN0b3JlKGVsZW0pIHtcbiAgICB2YXIgaGFzaCA9IGVsZW1baGFzaEtleV07XG5cbiAgICBpZiAoIWhhc2gpIHtcbiAgICAgICAgaGFzaCA9IGVsZW1baGFzaEtleV0gPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGFzaDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLypnbG9iYWwgd2luZG93LCBnbG9iYWwqL1xuXG52YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbDtcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGtleSBpbiByb290KSB7XG4gICAgICAgIHJldHVybiByb290W2tleV07XG4gICAgfVxuXG4gICAgcm9vdFtrZXldID0gdmFsdWU7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBJbmRpdmlkdWFsID0gcmVxdWlyZSgnLi9pbmRleC5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9uZVZlcnNpb247XG5cbmZ1bmN0aW9uIE9uZVZlcnNpb24obW9kdWxlTmFtZSwgdmVyc2lvbiwgZGVmYXVsdFZhbHVlKSB7XG4gICAgdmFyIGtleSA9ICdfX0lORElWSURVQUxfT05FX1ZFUlNJT05fJyArIG1vZHVsZU5hbWU7XG4gICAgdmFyIGVuZm9yY2VLZXkgPSBrZXkgKyAnX0VORk9SQ0VfU0lOR0xFVE9OJztcblxuICAgIHZhciB2ZXJzaW9uVmFsdWUgPSBJbmRpdmlkdWFsKGVuZm9yY2VLZXksIHZlcnNpb24pO1xuXG4gICAgaWYgKHZlcnNpb25WYWx1ZSAhPT0gdmVyc2lvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBvbmx5IGhhdmUgb25lIGNvcHkgb2YgJyArXG4gICAgICAgICAgICBtb2R1bGVOYW1lICsgJy5cXG4nICtcbiAgICAgICAgICAgICdZb3UgYWxyZWFkeSBoYXZlIHZlcnNpb24gJyArIHZlcnNpb25WYWx1ZSArXG4gICAgICAgICAgICAnIGluc3RhbGxlZC5cXG4nICtcbiAgICAgICAgICAgICdUaGlzIG1lYW5zIHlvdSBjYW5ub3QgaW5zdGFsbCB2ZXJzaW9uICcgKyB2ZXJzaW9uKTtcbiAgICB9XG5cbiAgICByZXR1cm4gSW5kaXZpZHVhbChrZXksIGRlZmF1bHRWYWx1ZSk7XG59XG4iLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwidmFyIHJvb3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/XG4gICAgd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIGdsb2JhbCA6IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGl2aWR1YWxcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKHJvb3Rba2V5XSkge1xuICAgICAgICByZXR1cm4gcm9vdFtrZXldXG4gICAgfVxuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJvb3QsIGtleSwge1xuICAgICAgICB2YWx1ZTogdmFsdWVcbiAgICAgICAgLCBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KVxuXG4gICAgcmV0dXJuIHZhbHVlXG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsInZhciBoaWRkZW5TdG9yZSA9IHJlcXVpcmUoJy4vaGlkZGVuLXN0b3JlLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlU3RvcmU7XG5cbmZ1bmN0aW9uIGNyZWF0ZVN0b3JlKCkge1xuICAgIHZhciBrZXkgPSB7fTtcblxuICAgIHJldHVybiBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIGlmICgodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSAmJlxuICAgICAgICAgICAgdHlwZW9mIG9iaiAhPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignV2Vha21hcC1zaGltOiBLZXkgbXVzdCBiZSBvYmplY3QnKVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHN0b3JlID0gb2JqLnZhbHVlT2Yoa2V5KTtcbiAgICAgICAgcmV0dXJuIHN0b3JlICYmIHN0b3JlLmlkZW50aXR5ID09PSBrZXkgP1xuICAgICAgICAgICAgc3RvcmUgOiBoaWRkZW5TdG9yZShvYmosIGtleSk7XG4gICAgfTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaGlkZGVuU3RvcmU7XG5cbmZ1bmN0aW9uIGhpZGRlblN0b3JlKG9iaiwga2V5KSB7XG4gICAgdmFyIHN0b3JlID0geyBpZGVudGl0eToga2V5IH07XG4gICAgdmFyIHZhbHVlT2YgPSBvYmoudmFsdWVPZjtcblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmosIFwidmFsdWVPZlwiLCB7XG4gICAgICAgIHZhbHVlOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSAhPT0ga2V5ID9cbiAgICAgICAgICAgICAgICB2YWx1ZU9mLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykgOiBzdG9yZTtcbiAgICAgICAgfSxcbiAgICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcblxuICAgIHJldHVybiBzdG9yZTtcbn1cbiIsInZhciBpbmhlcml0cyA9IHJlcXVpcmUoXCJpbmhlcml0c1wiKVxuXG52YXIgQUxMX1BST1BTID0gW1xuICAgIFwiYWx0S2V5XCIsIFwiYnViYmxlc1wiLCBcImNhbmNlbGFibGVcIiwgXCJjdHJsS2V5XCIsXG4gICAgXCJldmVudFBoYXNlXCIsIFwibWV0YUtleVwiLCBcInJlbGF0ZWRUYXJnZXRcIiwgXCJzaGlmdEtleVwiLFxuICAgIFwidGFyZ2V0XCIsIFwidGltZVN0YW1wXCIsIFwidHlwZVwiLCBcInZpZXdcIiwgXCJ3aGljaFwiXG5dXG52YXIgS0VZX1BST1BTID0gW1wiY2hhclwiLCBcImNoYXJDb2RlXCIsIFwia2V5XCIsIFwia2V5Q29kZVwiXVxudmFyIE1PVVNFX1BST1BTID0gW1xuICAgIFwiYnV0dG9uXCIsIFwiYnV0dG9uc1wiLCBcImNsaWVudFhcIiwgXCJjbGllbnRZXCIsIFwibGF5ZXJYXCIsXG4gICAgXCJsYXllcllcIiwgXCJvZmZzZXRYXCIsIFwib2Zmc2V0WVwiLCBcInBhZ2VYXCIsIFwicGFnZVlcIixcbiAgICBcInNjcmVlblhcIiwgXCJzY3JlZW5ZXCIsIFwidG9FbGVtZW50XCJcbl1cblxudmFyIHJrZXlFdmVudCA9IC9ea2V5fGlucHV0L1xudmFyIHJtb3VzZUV2ZW50ID0gL14oPzptb3VzZXxwb2ludGVyfGNvbnRleHRtZW51KXxjbGljay9cblxubW9kdWxlLmV4cG9ydHMgPSBQcm94eUV2ZW50XG5cbmZ1bmN0aW9uIFByb3h5RXZlbnQoZXYpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUHJveHlFdmVudCkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm94eUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGlmIChya2V5RXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IEtleUV2ZW50KGV2KVxuICAgIH0gZWxzZSBpZiAocm1vdXNlRXZlbnQudGVzdChldi50eXBlKSkge1xuICAgICAgICByZXR1cm4gbmV3IE1vdXNlRXZlbnQoZXYpXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxuICAgIHRoaXMuX2J1YmJsZXMgPSBmYWxzZTtcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUucHJldmVudERlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5fcmF3RXZlbnQucHJldmVudERlZmF1bHQoKVxufVxuXG5Qcm94eUV2ZW50LnByb3RvdHlwZS5zdGFydFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX2J1YmJsZXMgPSB0cnVlO1xufVxuXG5mdW5jdGlvbiBNb3VzZUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBNT1VTRV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbW91c2VQcm9wS2V5ID0gTU9VU0VfUFJPUFNbal1cbiAgICAgICAgdGhpc1ttb3VzZVByb3BLZXldID0gZXZbbW91c2VQcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbn1cblxuaW5oZXJpdHMoTW91c2VFdmVudCwgUHJveHlFdmVudClcblxuZnVuY3Rpb24gS2V5RXZlbnQoZXYpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IEFMTF9QUk9QUy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgcHJvcEtleSA9IEFMTF9QUk9QU1tpXVxuICAgICAgICB0aGlzW3Byb3BLZXldID0gZXZbcHJvcEtleV1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IEtFWV9QUk9QUy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIga2V5UHJvcEtleSA9IEtFWV9QUk9QU1tqXVxuICAgICAgICB0aGlzW2tleVByb3BLZXldID0gZXZba2V5UHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKEtleUV2ZW50LCBQcm94eUV2ZW50KVxuIiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSByZW1vdmVFdmVudFxuXG5mdW5jdGlvbiByZW1vdmVFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIHJldHVyblxuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShldmVudCkpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gZXZlbnQuaW5kZXhPZihoYW5kbGVyKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBldmVudC5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGV2ZW50ID09PSBoYW5kbGVyKSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IG51bGxcbiAgICB9XG59XG4iLCIvKipcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnMgPGdpbGxlcy5jb29tYW5zQGdtYWlsLmNvbT5cbiAqIGVsZW5waSB2MlxuXG5cdC8vX19fX19fX18gbmV3IGFwaVxuXG5cdGRvbmUoZnVuY3Rpb24oZW52LCBvYmosIHN0cmluZyl7XG5cdFx0Ly8uLi5cblx0XHRyZXR1cm4gc3RyaW5nIHx8IGZhbHNlO1xuXHR9KVxuXHR0ZXJtaW5hbChyZWdFeHAsIG5hbWUgfHwgZnVuY3Rpb24oZW52LCBvYmosIHN0cmluZywgY2FwdHVyZWQpe1xuXHRcdC8vLi4uXG5cdFx0cmV0dXJuIHN0cmluZyB8fCBmYWxzZTtcblx0fSlcblx0Y2hhcih0ZXN0KVxuXHRvcHRpb25hbChydWxlKVxuXHRlbmQoKVxuXG5cdG9uZShydWxlIHx8IHsgXG5cdFx0cnVsZTpydWxlLCBcblx0XHQ/YXM6ZnVuY3Rpb24oKXsgcmV0dXJuIEluc3RhbmNlIH0sIFxuXHRcdD9zZXQ6J25hbWUnIHx8IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopeyAuLi4gfSBcblx0fSlcblx0emVyb09yT25lKHJ1bGUgfHwgeyBcblx0XHRydWxlOnJ1bGUsIFxuXHRcdD9hczpmdW5jdGlvbigpeyByZXR1cm4gSW5zdGFuY2UgfSwgXG5cdFx0P3NldDonbmFtZScgfHwgZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iail7IC4uLiB9IFxuXHR9KVxuXHRvbmVPZihbcnVsZXNdIHx8IHsgXG5cdFx0cnVsZXM6W3J1bGVzXSwgXG5cdFx0P2FzOmZ1bmN0aW9uKCl7IHJldHVybiBJbnN0YW5jZSB9LCBcblx0XHQ/c2V0OiduYW1lJyB8fCBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKXsgLi4uIH0gXG5cdH0pXG5cdHhPck1vcmUoeyBcblx0XHRydWxlOnJ1bGUsXG5cdFx0bWluaW11bTppbnQsXG5cdFx0P2FzOmZ1bmN0aW9uKCl7IHJldHVybiBJbnN0YW5jZSB9LCBcblx0XHQ/cHVzaFRvOiduYW1lJyB8fCBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKXsgLi4uIH0sXG5cdFx0P3NlcGFyYXRvcjpydWxlLFxuXHRcdD9tYXhpbXVtOmludCBcblx0fSlcblxuXG5cdFYzIHdpbGwgYmUgYSBCYWJlbHV0ZSB3aXRoIHNhbWUgYXBpXG5cbiAqXG4gKiBcbiAqL1xuXG4oZnVuY3Rpb24oKSB7XG5cdHZhciBkZWZhdWx0U3BhY2VSZWdFeHAgPSAvXltcXHNcXG5cXHJdKy87XG5cblx0ZnVuY3Rpb24gZXhlYyhydWxlLCBkZXNjcmlwdG9yLCBlbnYpIHtcblx0XHRpZiAoZW52LnN0b3AgfHwgZW52LmVycm9yKVxuXHRcdFx0cmV0dXJuO1xuXHRcdGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycpXG5cdFx0XHRydWxlID0gZ2V0UnVsZShlbnYucGFyc2VyLCBydWxlKTtcblx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50RXhlYysrO1xuXHRcdHZhciBydWxlcyA9IHJ1bGUuX3F1ZXVlLFxuXHRcdFx0Y3VycmVudDtcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gcnVsZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcblx0XHRcdGN1cnJlbnQgPSBydWxlc1tpXTtcblx0XHRcdGlmIChjdXJyZW50Ll9fZWxlbnBpX18pXG5cdFx0XHRcdGV4ZWMoY3VycmVudCwgZGVzY3JpcHRvciwgZW52KTtcblx0XHRcdGVsc2UgLy8gaXMgZnVuY3Rpb25cblx0XHRcdFx0Y3VycmVudChlbnYsIGRlc2NyaXB0b3IpO1xuXHRcdFx0aWYgKGVudi5lcnJvcilcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0aWYgKGVudi5zb0ZhciA+IGVudi5zdHJpbmcubGVuZ3RoKVxuXHRcdFx0XHRlbnYuc29GYXIgPSBlbnYuc3RyaW5nLmxlbmd0aDtcblx0XHRcdGlmIChlbnYuc3RvcClcblx0XHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiBnZXRSdWxlKHBhcnNlciwgbmFtZSkge1xuXHRcdHZhciByID0gcGFyc2VyLnJ1bGVzW25hbWVdO1xuXHRcdGlmICghcilcblx0XHRcdHRocm93IG5ldyBFcnJvcignZWxlbnBpIDogcnVsZXMgbm90IGZvdW5kIDogJyArIHJ1bGUpO1xuXHRcdHJldHVybiByO1xuXHR9XG5cblx0ZnVuY3Rpb24gUnVsZSgpIHtcblx0XHR0aGlzLl9xdWV1ZSA9IFtdO1xuXHRcdHRoaXMuX19lbGVucGlfXyA9IHRydWU7XG5cdH07XG5cblx0UnVsZS5wcm90b3R5cGUgPSB7XG5cdFx0Ly8gYmFzZSBmb3IgYWxsIHJ1bGUncyBoYW5kbGVyc1xuXHRcdGRvbmU6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0XHR0aGlzLl9xdWV1ZS5wdXNoKGNhbGxiYWNrKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0Ly8gZm9yIGRlYnVnIHB1cnBvc2Vcblx0XHRsb2c6IGZ1bmN0aW9uKHRpdGxlKSB7XG5cdFx0XHR0aXRsZSA9IHRpdGxlIHx8ICcnO1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJlbGVucGkgbG9nIDogXCIsIHRpdGxlLCBlbnYsIGRlc2NyaXB0b3IpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR1c2U6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRydWxlID0gZ2V0UnVsZShlbnYucGFyc2VyLCBydWxlKTtcblx0XHRcdFx0aWYgKHJ1bGUuX19lbGVucGlfXykge1xuXHRcdFx0XHRcdGV4ZWMocnVsZSwgZGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHIgPSBuZXcgUnVsZSgpO1xuXHRcdFx0XHRydWxlLmFwcGx5KHIsIGFyZ3MpO1xuXHRcdFx0XHRleGVjKHIsIGRlc2NyaXB0b3IsIGVudik7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdG9wdGlvbmFsOiBmdW5jdGlvbihydWxlKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHR2YXIgc3RyaW5nID0gZW52LnN0cmluZztcblx0XHRcdFx0ZXhlYyhydWxlLCBkZXNjcmlwdG9yLCBlbnYpO1xuXHRcdFx0XHRpZiAoZW52LmVycm9yKSB7XG5cdFx0XHRcdFx0ZW52LnN0cmluZyA9IHN0cmluZztcblx0XHRcdFx0XHRlbnYuZXJyb3IgPSBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHR0ZXJtaW5hbDogZnVuY3Rpb24ocmVnLCBzZXQpIHtcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKCd0ZXJtaW5hbCB0ZXN0IDogJywgcmVnKTtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFBhcnNlci5jb3VudHMuY291bnRUZXJtaW5hbFRlc3QrKztcblx0XHRcdFx0dmFyIGNhcCA9IHJlZy5leGVjKGVudi5zdHJpbmcpO1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygndGVybWluYWwgOiAnLCByZWcsIGNhcCk7XG5cdFx0XHRcdGlmIChjYXApIHtcblx0XHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50VGVybWluYWxNYXRjaGVkKys7XG5cdFx0XHRcdFx0ZW52LnN0cmluZyA9IGVudi5zdHJpbmcuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXHRcdFx0XHRcdC8vIGNvbnNvbGUubG9nKCd0ZXJtaW5hbCBjYXAgMCBsZW5ndGggOiAnLCBjYXBbMF0ubGVuZ3RoKTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygndGVybWluYWwgc3RyaW5nIGxlbmd0aCA6ICcsIHN0cmluZy5sZW5ndGgsIGNhcFswXSk7XG5cdFx0XHRcdFx0aWYgKHNldCkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBzZXQgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdG9yW3NldF0gPSBjYXBbMF07XG5cdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdHNldChlbnYsIGRlc2NyaXB0b3IsIGNhcCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbnYuZXJyb3IgPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRjaGFyOiBmdW5jdGlvbih0ZXN0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRpZiAoIWVudi5zdHJpbmcubGVuZ3RoIHx8IGVudi5zdHJpbmdbMF0gIT09IHRlc3QpXG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBlbnYuc3RyaW5nLnN1YnN0cmluZygxKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0eE9yTW9yZTogZnVuY3Rpb24ocnVsZSkge1xuXHRcdFx0dmFyIG9wdCA9ICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgfHwgwqBydWxlLl9fZWxlbnBpX18pID8ge1xuXHRcdFx0XHRydWxlOiBydWxlXG5cdFx0XHR9IDogcnVsZTtcblx0XHRcdG9wdC5taW5pbXVtID0gb3B0Lm1pbmltdW0gfHwgMDtcblx0XHRcdG9wdC5tYXhpbXVtID0gb3B0Lm1heGltdW0gfHwgSW5maW5pdHk7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHR2YXIgb3B0aW9ucyA9IG9wdDtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCAmJiBvcHRpb25zLm1pbmltdW0gPiAwKSB7XG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIHN0cmluZyA9IGVudi5zdHJpbmcsXG5cdFx0XHRcdFx0Y291bnQgPSAwLFxuXHRcdFx0XHRcdHJ1bGUgPSBvcHRpb25zLnJ1bGUsXG5cdFx0XHRcdFx0cHVzaFRvID0gb3B0aW9ucy5wdXNoVG8sXG5cdFx0XHRcdFx0cHVzaFRvU3RyaW5nID0gdHlwZW9mIHB1c2hUbyA9PT0gJ3N0cmluZycsXG5cdFx0XHRcdFx0QXMgPSBvcHRpb25zLmFzLFxuXHRcdFx0XHRcdHNlcGFyYXRvciA9IG9wdGlvbnMuc2VwYXJhdG9yLFxuXHRcdFx0XHRcdG5ld0Rlc2NyaXB0b3I7XG5cdFx0XHRcdC8vIFBhcnNlci5jb3VudHMuY291bnRYb3JNb3JlKys7XG5cdFx0XHRcdHdoaWxlICghZW52LmVycm9yICYmIGVudi5zdHJpbmcubGVuZ3RoICYmIGNvdW50IDwgb3B0aW9ucy5tYXhpbXVtKSB7XG5cblx0XHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50WG9yTW9yZXMrKztcblxuXHRcdFx0XHRcdG5ld0Rlc2NyaXB0b3IgPSBBcyA/IEFzKGVudiwgZGVzY3JpcHRvcikgOiAocHVzaFRvID8ge30gOiBkZXNjcmlwdG9yKTtcblx0XHRcdFx0XHRleGVjKHJ1bGUsIG5ld0Rlc2NyaXB0b3IsIGVudik7XG5cblx0XHRcdFx0XHRpZiAoZW52LmVycm9yKVxuXHRcdFx0XHRcdFx0YnJlYWs7XG5cblx0XHRcdFx0XHRjb3VudCsrO1xuXG5cdFx0XHRcdFx0aWYgKCFuZXdEZXNjcmlwdG9yLnNraXAgJiYgcHVzaFRvKVxuXHRcdFx0XHRcdFx0aWYgKHB1c2hUb1N0cmluZykge1xuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdG9yW3B1c2hUb10gPSBkZXNjcmlwdG9yW3B1c2hUb10gfHwgW107XG5cdFx0XHRcdFx0XHRcdGRlc2NyaXB0b3JbcHVzaFRvXS5wdXNoKG5ld0Rlc2NyaXB0b3IpO1xuXHRcdFx0XHRcdFx0fSBlbHNlXG5cdFx0XHRcdFx0XHRcdHB1c2hUbyhlbnYsIGRlc2NyaXB0b3IsIG5ld0Rlc2NyaXB0b3IpO1xuXG5cdFx0XHRcdFx0aWYgKHNlcGFyYXRvciAmJiBlbnYuc3RyaW5nLmxlbmd0aClcblx0XHRcdFx0XHRcdGV4ZWMoc2VwYXJhdG9yLCBuZXdEZXNjcmlwdG9yLCBlbnYpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVudi5lcnJvciA9IChjb3VudCA8IG9wdGlvbnMubWluaW11bSk7XG5cdFx0XHRcdGlmICghY291bnQpXG5cdFx0XHRcdFx0ZW52LnN0cmluZyA9IHN0cmluZztcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0emVyb09yTW9yZTogZnVuY3Rpb24ocnVsZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMueE9yTW9yZShydWxlKTtcblx0XHR9LFxuXHRcdG9uZU9yTW9yZTogZnVuY3Rpb24ocnVsZSkge1xuXHRcdFx0aWYgKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyB8fCBydWxlLl9fZWxlbnBpX18pXG5cdFx0XHRcdHJ1bGUgPSB7XG5cdFx0XHRcdFx0cnVsZTogcnVsZSxcblx0XHRcdFx0XHRtaW5pbXVtOiAxXG5cdFx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLnhPck1vcmUocnVsZSk7XG5cdFx0fSxcblx0XHR6ZXJvT3JPbmU6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdHZhciBvcHRpb25zID0gKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyB8fCDCoHJ1bGUuX19lbGVucGlfXykgPyB7XG5cdFx0XHRcdHJ1bGU6IHJ1bGVcblx0XHRcdH0gOiBydWxlO1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aClcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdC8vIFBhcnNlci5jb3VudHMuY291bnRaZXJvT3JPbmUrKztcblx0XHRcdFx0dmFyIG5ld0Rlc2NyaXB0b3IgPSBvcHRpb25zLmFzID8gb3B0aW9ucy5hcyhlbnYsIGRlc2NyaXB0b3IpIDogKG9wdGlvbnMuc2V0ID8ge30gOiBkZXNjcmlwdG9yKTtcblx0XHRcdFx0dmFyIHN0cmluZyA9IGVudi5zdHJpbmc7XG5cdFx0XHRcdGV4ZWMob3B0aW9ucy5ydWxlLCBuZXdEZXNjcmlwdG9yLCBlbnYpO1xuXHRcdFx0XHRpZiAoIWVudi5lcnJvcikge1xuXHRcdFx0XHRcdGlmICghbmV3RGVzY3JpcHRvci5za2lwICYmIG9wdGlvbnMuc2V0KSB7XG5cdFx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuc2V0ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRvcltvcHRpb25zLnNldF0gPSBuZXdEZXNjcmlwdG9yO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRvcHRpb25zLnNldChlbnYsIGRlc2NyaXB0b3IsIG5ld0Rlc2NyaXB0b3IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0ZW52LnN0cmluZyA9IHN0cmluZztcblx0XHRcdFx0ZW52LmVycm9yID0gZmFsc2U7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdG9uZU9mOiBmdW5jdGlvbihydWxlcykge1xuXHRcdFx0dmFyIG9wdCA9ICh0eXBlb2YgcnVsZXMgPT09ICdzdHJpbmcnIHx8IHJ1bGVzLl9fZWxlbnBpX18pID8ge1xuXHRcdFx0XHRydWxlczogW10uc2xpY2UuY2FsbChhcmd1bWVudHMpXG5cdFx0XHR9IDogcnVsZXM7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRpZiAoIWVudi5zdHJpbmcubGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgb3B0aW9ucyA9IG9wdCxcblx0XHRcdFx0XHRjb3VudCA9IDAsXG5cdFx0XHRcdFx0bGVuID0gb3B0aW9ucy5ydWxlcy5sZW5ndGgsXG5cdFx0XHRcdFx0cnVsZSxcblx0XHRcdFx0XHRuZXdEZXNjcmlwdG9yLFxuXHRcdFx0XHRcdHN0cmluZyA9IGVudi5zdHJpbmc7XG5cdFx0XHRcdC8vIFBhcnNlci5jb3VudHMuY291bnRPbmVPZisrO1xuXHRcdFx0XHR3aGlsZSAoY291bnQgPCBsZW4pIHtcblx0XHRcdFx0XHRydWxlID0gb3B0aW9ucy5ydWxlc1tjb3VudF07XG5cdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50T25lT2ZzKys7XG5cdFx0XHRcdFx0bmV3RGVzY3JpcHRvciA9IG9wdGlvbnMuYXMgPyBvcHRpb25zLmFzKGVudiwgZGVzY3JpcHRvcikgOiAob3B0aW9ucy5zZXQgPyB7fSA6IGRlc2NyaXB0b3IpO1xuXHRcdFx0XHRcdGV4ZWMocnVsZSwgbmV3RGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0XHRpZiAoIWVudi5lcnJvcikge1xuXHRcdFx0XHRcdFx0aWYgKCFuZXdEZXNjcmlwdG9yLnNraXAgJiYgb3B0aW9ucy5zZXQpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLnNldCA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRvcltvcHRpb25zLnNldF0gPSBuZXdEZXNjcmlwdG9yO1xuXHRcdFx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zZXQoZW52LCBkZXNjcmlwdG9yLCBuZXdEZXNjcmlwdG9yKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZW52LmVycm9yID0gZmFsc2U7XG5cdFx0XHRcdFx0ZW52LnN0cmluZyA9IHN0cmluZztcblx0XHRcdFx0fVxuXHRcdFx0XHRlbnYuZXJyb3IgPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRvbmU6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdHZhciBvcHQgPSAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnIHx8IMKgKHJ1bGUgJiYgcnVsZS5fX2VsZW5waV9fKSkgPyB7XG5cdFx0XHRcdHJ1bGU6IHJ1bGVcblx0XHRcdH0gOiBydWxlO1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFBhcnNlci5jb3VudHMuY291bnRPbmUrKztcblx0XHRcdFx0dmFyIG9wdGlvbnMgPSBvcHQsXG5cdFx0XHRcdFx0bmV3RGVzY3JpcHRvciA9IG9wdGlvbnMuYXMgPyBvcHRpb25zLmFzKGVudiwgZGVzY3JpcHRvcikgOiAob3B0aW9ucy5zZXQgPyB7fSA6IGRlc2NyaXB0b3IpO1xuXHRcdFx0XHRleGVjKG9wdGlvbnMucnVsZSwgbmV3RGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0aWYgKCFlbnYuZXJyb3IgJiYgIW5ld0Rlc2NyaXB0b3Iuc2tpcCAmJiBvcHRpb25zLnNldCkge1xuXHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5zZXQgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRvcltvcHRpb25zLnNldF0gPSBuZXdEZXNjcmlwdG9yO1xuXHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdG9wdGlvbnMuc2V0KGVudiwgZGVzY3JpcHRvciwgbmV3RGVzY3JpcHRvcik7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0c2tpcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRkZXNjcmlwdG9yLnNraXAgPSB0cnVlO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRzcGFjZTogZnVuY3Rpb24obmVlZGVkKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRpZiAoIWVudi5zdHJpbmcubGVuZ3RoKSB7XG5cdFx0XHRcdFx0aWYgKG5lZWRlZClcblx0XHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjYXAgPSAoZW52LnBhcnNlci5ydWxlcy5zcGFjZSB8fCBkZWZhdWx0U3BhY2VSZWdFeHApLmV4ZWMoZW52LnN0cmluZyk7XG5cdFx0XHRcdGlmIChjYXApXG5cdFx0XHRcdFx0ZW52LnN0cmluZyA9IGVudi5zdHJpbmcuc3Vic3RyaW5nKGNhcFswXS5sZW5ndGgpO1xuXHRcdFx0XHRlbHNlIGlmIChuZWVkZWQpXG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0ZW5kOiBmdW5jdGlvbihuZWVkZWQpIHtcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdGlmICghZW52LnN0cmluZy5sZW5ndGgpXG5cdFx0XHRcdFx0ZW52LnN0b3AgPSB0cnVlO1xuXHRcdFx0XHRlbHNlIGlmIChuZWVkZWQpXG5cdFx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fTtcblxuXHR2YXIgUGFyc2VyID0gZnVuY3Rpb24ocnVsZXMsIGRlZmF1bHRSdWxlKSB7XG5cdFx0dGhpcy5ydWxlcyA9IHJ1bGVzO1xuXHRcdHRoaXMuZGVmYXVsdFJ1bGUgPSBkZWZhdWx0UnVsZTtcblx0fTtcblx0UGFyc2VyLnByb3RvdHlwZSA9IHtcblx0XHRleGVjOiBmdW5jdGlvbihydWxlLCBkZXNjcmlwdG9yLCBlbnYpIHtcblx0XHRcdGV4ZWMocnVsZSwgZGVzY3JpcHRvciwgZW52KTtcblx0XHR9LFxuXHRcdHBhcnNlOiBmdW5jdGlvbihzdHJpbmcsIHJ1bGUsIGRlc2NyaXB0b3IsIGVudikge1xuXHRcdFx0ZW52ID0gZW52IHx8IHt9O1xuXHRcdFx0ZGVzY3JpcHRvciA9IGRlc2NyaXB0b3IgfHwge307XG5cdFx0XHRlbnYucGFyc2VyID0gdGhpcztcblx0XHRcdGVudi5zb0ZhciA9IEluZmluaXR5O1xuXHRcdFx0ZW52LnN0cmluZyA9IHN0cmluZztcblx0XHRcdGlmICghcnVsZSlcblx0XHRcdFx0cnVsZSA9IHRoaXMucnVsZXNbdGhpcy5kZWZhdWx0UnVsZV07XG5cdFx0XHRleGVjKHJ1bGUsIGRlc2NyaXB0b3IsIGVudik7XG5cdFx0XHRpZiAoZW52LmVycm9yIHx8IGVudi5zdHJpbmcubGVuZ3RoKSB7XG5cdFx0XHRcdHZhciBwb3MgPSBzdHJpbmcubGVuZ3RoIC0gZW52LnNvRmFyO1xuXHRcdFx0XHQvLyB0b2RvIDogY2F0Y2ggbGluZSBudW1iZXJcblx0XHRcdFx0Y29uc29sZS5lcnJvcignZWxlbnBpIHBhcnNpbmcgZmFpbGVkIDogKHBvczonICsgcG9zICsgJykgbmVhciA6XFxuJywgc3RyaW5nLnN1YnN0cmluZyhNYXRoLm1heChwb3MgLSAxLCAwKSwgcG9zICsgNTApKTtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGRlc2NyaXB0b3I7XG5cdFx0fVxuXHR9O1xuXG5cdC8vIFx0UGFyc2VyLmNvdW50cyA9IHtcblx0Ly8gXHRjb3VudFRlcm1pbmFsVGVzdDogMCxcblx0Ly8gXHRjb3VudFRlcm1pbmFsTWF0Y2hlZDogMCxcblx0Ly8gXHRjb3VudE9uZU9mOiAwLFxuXHQvLyBcdGNvdW50T25lT2ZzOiAwLFxuXHQvLyBcdGNvdW50RXhlYzogMCxcblx0Ly8gXHRjb3VudFhvck1vcmU6IDAsXG5cdC8vIFx0Y291bnRYb3JNb3JlczogMCxcblx0Ly8gXHRjb3VudFplcm9Pck9uZTogMCxcblx0Ly8gXHRjb3VudE9uZTogMFxuXHQvLyB9O1xuXG5cdHZhciBlbGVucGkgPSB7XG5cdFx0cjogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gbmV3IFJ1bGUoKTtcblx0XHR9LFxuXHRcdFJ1bGU6IFJ1bGUsXG5cdFx0UGFyc2VyOiBQYXJzZXJcblx0fTtcblxuXHRpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpXG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBlbGVucGk7IC8vIHVzZSBjb21tb24ganMgaWYgYXZhaWFibGVcblx0ZWxzZSB0aGlzLmVsZW5waSA9IGVsZW5waTsgLy8gYXNzaWduIHRvIGdsb2JhbCB3aW5kb3dcbn0pKCk7XG4vL19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXyIsInZhciBjcmVhdGVFbGVtZW50ID0gcmVxdWlyZShcIi4vdmRvbS9jcmVhdGUtZWxlbWVudC5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcbiIsInZhciBkaWZmID0gcmVxdWlyZShcIi4vdnRyZWUvZGlmZi5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcbiIsInZhciBoID0gcmVxdWlyZShcIi4vdmlydHVhbC1oeXBlcnNjcmlwdC9pbmRleC5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhcbiIsIi8qIVxuICogQ3Jvc3MtQnJvd3NlciBTcGxpdCAxLjEuMVxuICogQ29weXJpZ2h0IDIwMDctMjAxMiBTdGV2ZW4gTGV2aXRoYW4gPHN0ZXZlbmxldml0aGFuLmNvbT5cbiAqIEF2YWlsYWJsZSB1bmRlciB0aGUgTUlUIExpY2Vuc2VcbiAqIEVDTUFTY3JpcHQgY29tcGxpYW50LCB1bmlmb3JtIGNyb3NzLWJyb3dzZXIgc3BsaXQgbWV0aG9kXG4gKi9cblxuLyoqXG4gKiBTcGxpdHMgYSBzdHJpbmcgaW50byBhbiBhcnJheSBvZiBzdHJpbmdzIHVzaW5nIGEgcmVnZXggb3Igc3RyaW5nIHNlcGFyYXRvci4gTWF0Y2hlcyBvZiB0aGVcbiAqIHNlcGFyYXRvciBhcmUgbm90IGluY2x1ZGVkIGluIHRoZSByZXN1bHQgYXJyYXkuIEhvd2V2ZXIsIGlmIGBzZXBhcmF0b3JgIGlzIGEgcmVnZXggdGhhdCBjb250YWluc1xuICogY2FwdHVyaW5nIGdyb3VwcywgYmFja3JlZmVyZW5jZXMgYXJlIHNwbGljZWQgaW50byB0aGUgcmVzdWx0IGVhY2ggdGltZSBgc2VwYXJhdG9yYCBpcyBtYXRjaGVkLlxuICogRml4ZXMgYnJvd3NlciBidWdzIGNvbXBhcmVkIHRvIHRoZSBuYXRpdmUgYFN0cmluZy5wcm90b3R5cGUuc3BsaXRgIGFuZCBjYW4gYmUgdXNlZCByZWxpYWJseVxuICogY3Jvc3MtYnJvd3Nlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgU3RyaW5nIHRvIHNwbGl0LlxuICogQHBhcmFtIHtSZWdFeHB8U3RyaW5nfSBzZXBhcmF0b3IgUmVnZXggb3Igc3RyaW5nIHRvIHVzZSBmb3Igc2VwYXJhdGluZyB0aGUgc3RyaW5nLlxuICogQHBhcmFtIHtOdW1iZXJ9IFtsaW1pdF0gTWF4aW11bSBudW1iZXIgb2YgaXRlbXMgdG8gaW5jbHVkZSBpbiB0aGUgcmVzdWx0IGFycmF5LlxuICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBzdWJzdHJpbmdzLlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBCYXNpYyB1c2VcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnKTtcbiAqIC8vIC0+IFsnYScsICdiJywgJ2MnLCAnZCddXG4gKlxuICogLy8gV2l0aCBsaW1pdFxuICogc3BsaXQoJ2EgYiBjIGQnLCAnICcsIDIpO1xuICogLy8gLT4gWydhJywgJ2InXVxuICpcbiAqIC8vIEJhY2tyZWZlcmVuY2VzIGluIHJlc3VsdCBhcnJheVxuICogc3BsaXQoJy4ud29yZDEgd29yZDIuLicsIC8oW2Etel0rKShcXGQrKS9pKTtcbiAqIC8vIC0+IFsnLi4nLCAnd29yZCcsICcxJywgJyAnLCAnd29yZCcsICcyJywgJy4uJ11cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSAoZnVuY3Rpb24gc3BsaXQodW5kZWYpIHtcblxuICB2YXIgbmF0aXZlU3BsaXQgPSBTdHJpbmcucHJvdG90eXBlLnNwbGl0LFxuICAgIGNvbXBsaWFudEV4ZWNOcGNnID0gLygpPz8vLmV4ZWMoXCJcIilbMV0gPT09IHVuZGVmLFxuICAgIC8vIE5QQ0c6IG5vbnBhcnRpY2lwYXRpbmcgY2FwdHVyaW5nIGdyb3VwXG4gICAgc2VsZjtcblxuICBzZWxmID0gZnVuY3Rpb24oc3RyLCBzZXBhcmF0b3IsIGxpbWl0KSB7XG4gICAgLy8gSWYgYHNlcGFyYXRvcmAgaXMgbm90IGEgcmVnZXgsIHVzZSBgbmF0aXZlU3BsaXRgXG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzZXBhcmF0b3IpICE9PSBcIltvYmplY3QgUmVnRXhwXVwiKSB7XG4gICAgICByZXR1cm4gbmF0aXZlU3BsaXQuY2FsbChzdHIsIHNlcGFyYXRvciwgbGltaXQpO1xuICAgIH1cbiAgICB2YXIgb3V0cHV0ID0gW10sXG4gICAgICBmbGFncyA9IChzZXBhcmF0b3IuaWdub3JlQ2FzZSA/IFwiaVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLm11bHRpbGluZSA/IFwibVwiIDogXCJcIikgKyAoc2VwYXJhdG9yLmV4dGVuZGVkID8gXCJ4XCIgOiBcIlwiKSArIC8vIFByb3Bvc2VkIGZvciBFUzZcbiAgICAgIChzZXBhcmF0b3Iuc3RpY2t5ID8gXCJ5XCIgOiBcIlwiKSxcbiAgICAgIC8vIEZpcmVmb3ggMytcbiAgICAgIGxhc3RMYXN0SW5kZXggPSAwLFxuICAgICAgLy8gTWFrZSBgZ2xvYmFsYCBhbmQgYXZvaWQgYGxhc3RJbmRleGAgaXNzdWVzIGJ5IHdvcmtpbmcgd2l0aCBhIGNvcHlcbiAgICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoc2VwYXJhdG9yLnNvdXJjZSwgZmxhZ3MgKyBcImdcIiksXG4gICAgICBzZXBhcmF0b3IyLCBtYXRjaCwgbGFzdEluZGV4LCBsYXN0TGVuZ3RoO1xuICAgIHN0ciArPSBcIlwiOyAvLyBUeXBlLWNvbnZlcnRcbiAgICBpZiAoIWNvbXBsaWFudEV4ZWNOcGNnKSB7XG4gICAgICAvLyBEb2Vzbid0IG5lZWQgZmxhZ3MgZ3ksIGJ1dCB0aGV5IGRvbid0IGh1cnRcbiAgICAgIHNlcGFyYXRvcjIgPSBuZXcgUmVnRXhwKFwiXlwiICsgc2VwYXJhdG9yLnNvdXJjZSArIFwiJCg/IVxcXFxzKVwiLCBmbGFncyk7XG4gICAgfVxuICAgIC8qIFZhbHVlcyBmb3IgYGxpbWl0YCwgcGVyIHRoZSBzcGVjOlxuICAgICAqIElmIHVuZGVmaW5lZDogNDI5NDk2NzI5NSAvLyBNYXRoLnBvdygyLCAzMikgLSAxXG4gICAgICogSWYgMCwgSW5maW5pdHksIG9yIE5hTjogMFxuICAgICAqIElmIHBvc2l0aXZlIG51bWJlcjogbGltaXQgPSBNYXRoLmZsb29yKGxpbWl0KTsgaWYgKGxpbWl0ID4gNDI5NDk2NzI5NSkgbGltaXQgLT0gNDI5NDk2NzI5NjtcbiAgICAgKiBJZiBuZWdhdGl2ZSBudW1iZXI6IDQyOTQ5NjcyOTYgLSBNYXRoLmZsb29yKE1hdGguYWJzKGxpbWl0KSlcbiAgICAgKiBJZiBvdGhlcjogVHlwZS1jb252ZXJ0LCB0aGVuIHVzZSB0aGUgYWJvdmUgcnVsZXNcbiAgICAgKi9cbiAgICBsaW1pdCA9IGxpbWl0ID09PSB1bmRlZiA/IC0xID4+PiAwIDogLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgIGxpbWl0ID4+PiAwOyAvLyBUb1VpbnQzMihsaW1pdClcbiAgICB3aGlsZSAobWF0Y2ggPSBzZXBhcmF0b3IuZXhlYyhzdHIpKSB7XG4gICAgICAvLyBgc2VwYXJhdG9yLmxhc3RJbmRleGAgaXMgbm90IHJlbGlhYmxlIGNyb3NzLWJyb3dzZXJcbiAgICAgIGxhc3RJbmRleCA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgaWYgKGxhc3RJbmRleCA+IGxhc3RMYXN0SW5kZXgpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goc3RyLnNsaWNlKGxhc3RMYXN0SW5kZXgsIG1hdGNoLmluZGV4KSk7XG4gICAgICAgIC8vIEZpeCBicm93c2VycyB3aG9zZSBgZXhlY2AgbWV0aG9kcyBkb24ndCBjb25zaXN0ZW50bHkgcmV0dXJuIGB1bmRlZmluZWRgIGZvclxuICAgICAgICAvLyBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cHNcbiAgICAgICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZyAmJiBtYXRjaC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgbWF0Y2hbMF0ucmVwbGFjZShzZXBhcmF0b3IyLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aCAtIDI7IGkrKykge1xuICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzW2ldID09PSB1bmRlZikge1xuICAgICAgICAgICAgICAgIG1hdGNoW2ldID0gdW5kZWY7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobWF0Y2gubGVuZ3RoID4gMSAmJiBtYXRjaC5pbmRleCA8IHN0ci5sZW5ndGgpIHtcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShvdXRwdXQsIG1hdGNoLnNsaWNlKDEpKTtcbiAgICAgICAgfVxuICAgICAgICBsYXN0TGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICBsYXN0TGFzdEluZGV4ID0gbGFzdEluZGV4O1xuICAgICAgICBpZiAob3V0cHV0Lmxlbmd0aCA+PSBsaW1pdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc2VwYXJhdG9yLmxhc3RJbmRleCA9PT0gbWF0Y2guaW5kZXgpIHtcbiAgICAgICAgc2VwYXJhdG9yLmxhc3RJbmRleCsrOyAvLyBBdm9pZCBhbiBpbmZpbml0ZSBsb29wXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChsYXN0TGFzdEluZGV4ID09PSBzdHIubGVuZ3RoKSB7XG4gICAgICBpZiAobGFzdExlbmd0aCB8fCAhc2VwYXJhdG9yLnRlc3QoXCJcIikpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goXCJcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4KSk7XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQubGVuZ3RoID4gbGltaXQgPyBvdXRwdXQuc2xpY2UoMCwgbGltaXQpIDogb3V0cHV0O1xuICB9O1xuXG4gIHJldHVybiBzZWxmO1xufSkoKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLypnbG9iYWwgd2luZG93LCBnbG9iYWwqL1xuXG52YXIgcm9vdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID9cbiAgICB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/XG4gICAgZ2xvYmFsIDoge307XG5cbm1vZHVsZS5leHBvcnRzID0gSW5kaXZpZHVhbDtcblxuZnVuY3Rpb24gSW5kaXZpZHVhbChrZXksIHZhbHVlKSB7XG4gICAgaWYgKGtleSBpbiByb290KSB7XG4gICAgICAgIHJldHVybiByb290W2tleV07XG4gICAgfVxuXG4gICAgcm9vdFtrZXldID0gdmFsdWU7XG5cbiAgICByZXR1cm4gdmFsdWU7XG59XG4iLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIHZhciBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xufVxuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuXHRyZXR1cm4gdHlwZW9mIHggPT09IFwib2JqZWN0XCIgJiYgeCAhPT0gbnVsbDtcbn07XG4iLCJ2YXIgbmF0aXZlSXNBcnJheSA9IEFycmF5LmlzQXJyYXlcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcblxubW9kdWxlLmV4cG9ydHMgPSBuYXRpdmVJc0FycmF5IHx8IGlzQXJyYXlcblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09PSBcIltvYmplY3QgQXJyYXldXCJcbn1cbiIsInZhciBwYXRjaCA9IHJlcXVpcmUoXCIuL3Zkb20vcGF0Y2guanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuIiwidmFyIGlzT2JqZWN0ID0gcmVxdWlyZShcImlzLW9iamVjdFwiKVxudmFyIGlzSG9vayA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12aG9vay5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFwcGx5UHJvcGVydGllc1xuXG5mdW5jdGlvbiBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMsIHByZXZpb3VzKSB7XG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcHMpIHtcbiAgICAgICAgdmFyIHByb3BWYWx1ZSA9IHByb3BzW3Byb3BOYW1lXVxuXG4gICAgICAgIGlmIChwcm9wVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzSG9vayhwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICByZW1vdmVQcm9wZXJ0eShub2RlLCBwcm9wTmFtZSwgcHJvcFZhbHVlLCBwcmV2aW91cylcbiAgICAgICAgICAgIGlmIChwcm9wVmFsdWUuaG9vaykge1xuICAgICAgICAgICAgICAgIHByb3BWYWx1ZS5ob29rKG5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHByb3BOYW1lLFxuICAgICAgICAgICAgICAgICAgICBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChpc09iamVjdChwcm9wVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpIHtcbiAgICBpZiAocHJldmlvdXMpIHtcbiAgICAgICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91c1twcm9wTmFtZV1cblxuICAgICAgICBpZiAoIWlzSG9vayhwcmV2aW91c1ZhbHVlKSkge1xuICAgICAgICAgICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByZXZpb3VzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wTmFtZSA9PT0gXCJzdHlsZVwiKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc3R5bGVbaV0gPSBcIlwiXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcHJldmlvdXNWYWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gXCJcIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IG51bGxcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChwcmV2aW91c1ZhbHVlLnVuaG9vaykge1xuICAgICAgICAgICAgcHJldmlvdXNWYWx1ZS51bmhvb2sobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcGF0Y2hPYmplY3Qobm9kZSwgcHJvcHMsIHByZXZpb3VzLCBwcm9wTmFtZSwgcHJvcFZhbHVlKSB7XG4gICAgdmFyIHByZXZpb3VzVmFsdWUgPSBwcmV2aW91cyA/IHByZXZpb3VzW3Byb3BOYW1lXSA6IHVuZGVmaW5lZFxuXG4gICAgLy8gU2V0IGF0dHJpYnV0ZXNcbiAgICBpZiAocHJvcE5hbWUgPT09IFwiYXR0cmlidXRlc1wiKSB7XG4gICAgICAgIGZvciAodmFyIGF0dHJOYW1lIGluIHByb3BWYWx1ZSkge1xuICAgICAgICAgICAgdmFyIGF0dHJWYWx1ZSA9IHByb3BWYWx1ZVthdHRyTmFtZV1cblxuICAgICAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBpZihwcmV2aW91c1ZhbHVlICYmIGlzT2JqZWN0KHByZXZpb3VzVmFsdWUpICYmXG4gICAgICAgIGdldFByb3RvdHlwZShwcmV2aW91c1ZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKHByb3BWYWx1ZSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBwcm9wVmFsdWVcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYgKCFpc09iamVjdChub2RlW3Byb3BOYW1lXSkpIHtcbiAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSB7fVxuICAgIH1cblxuICAgIHZhciByZXBsYWNlciA9IHByb3BOYW1lID09PSBcInN0eWxlXCIgPyBcIlwiIDogdW5kZWZpbmVkXG5cbiAgICBmb3IgKHZhciBrIGluIHByb3BWYWx1ZSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBwcm9wVmFsdWVba11cbiAgICAgICAgbm9kZVtwcm9wTmFtZV1ba10gPSAodmFsdWUgPT09IHVuZGVmaW5lZCkgPyByZXBsYWNlciA6IHZhbHVlXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgICBpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKSB7XG4gICAgICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gICAgfSBlbHNlIGlmICh2YWx1ZS5fX3Byb3RvX18pIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICAgIH0gZWxzZSBpZiAodmFsdWUuY29uc3RydWN0b3IpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICAgIH1cbn1cbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoXCJnbG9iYWwvZG9jdW1lbnRcIilcblxudmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdm5vZGUuanNcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZ0ZXh0LmpzXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0LmpzXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi4vdm5vZGUvaGFuZGxlLXRodW5rLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRWxlbWVudFxuXG5mdW5jdGlvbiBjcmVhdGVFbGVtZW50KHZub2RlLCBvcHRzKSB7XG4gICAgdmFyIGRvYyA9IG9wdHMgPyBvcHRzLmRvY3VtZW50IHx8IGRvY3VtZW50IDogZG9jdW1lbnRcbiAgICB2YXIgd2FybiA9IG9wdHMgPyBvcHRzLndhcm4gOiBudWxsXG5cbiAgICB2bm9kZSA9IGhhbmRsZVRodW5rKHZub2RlKS5hXG5cbiAgICBpZiAoaXNXaWRnZXQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiB2bm9kZS5pbml0KClcbiAgICB9IGVsc2UgaWYgKGlzVlRleHQodm5vZGUpKSB7XG4gICAgICAgIHJldHVybiBkb2MuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dClcbiAgICB9IGVsc2UgaWYgKCFpc1ZOb2RlKHZub2RlKSkge1xuICAgICAgICBpZiAod2Fybikge1xuICAgICAgICAgICAgd2FybihcIkl0ZW0gaXMgbm90IGEgdmFsaWQgdmlydHVhbCBkb20gbm9kZVwiLCB2bm9kZSlcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBub2RlID0gKHZub2RlLm5hbWVzcGFjZSA9PT0gbnVsbCkgP1xuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudCh2bm9kZS50YWdOYW1lKSA6XG4gICAgICAgIGRvYy5jcmVhdGVFbGVtZW50TlModm5vZGUubmFtZXNwYWNlLCB2bm9kZS50YWdOYW1lKVxuXG4gICAgdmFyIHByb3BzID0gdm5vZGUucHJvcGVydGllc1xuICAgIGFwcGx5UHJvcGVydGllcyhub2RlLCBwcm9wcylcblxuICAgIHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZE5vZGUgPSBjcmVhdGVFbGVtZW50KGNoaWxkcmVuW2ldLCBvcHRzKVxuICAgICAgICBpZiAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKGNoaWxkTm9kZSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2RlXG59XG4iLCIvLyBNYXBzIGEgdmlydHVhbCBET00gdHJlZSBvbnRvIGEgcmVhbCBET00gdHJlZSBpbiBhbiBlZmZpY2llbnQgbWFubmVyLlxuLy8gV2UgZG9uJ3Qgd2FudCB0byByZWFkIGFsbCBvZiB0aGUgRE9NIG5vZGVzIGluIHRoZSB0cmVlIHNvIHdlIHVzZVxuLy8gdGhlIGluLW9yZGVyIHRyZWUgaW5kZXhpbmcgdG8gZWxpbWluYXRlIHJlY3Vyc2lvbiBkb3duIGNlcnRhaW4gYnJhbmNoZXMuXG4vLyBXZSBvbmx5IHJlY3Vyc2UgaW50byBhIERPTSBub2RlIGlmIHdlIGtub3cgdGhhdCBpdCBjb250YWlucyBhIGNoaWxkIG9mXG4vLyBpbnRlcmVzdC5cblxudmFyIG5vQ2hpbGQgPSB7fVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUluZGV4XG5cbmZ1bmN0aW9uIGRvbUluZGV4KHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcykge1xuICAgIGlmICghaW5kaWNlcyB8fCBpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4ge31cbiAgICB9IGVsc2Uge1xuICAgICAgICBpbmRpY2VzLnNvcnQoYXNjZW5kaW5nKVxuICAgICAgICByZXR1cm4gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIDApXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZWN1cnNlKHJvb3ROb2RlLCB0cmVlLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KSB7XG4gICAgbm9kZXMgPSBub2RlcyB8fCB7fVxuXG5cbiAgICBpZiAocm9vdE5vZGUpIHtcbiAgICAgICAgaWYgKGluZGV4SW5SYW5nZShpbmRpY2VzLCByb290SW5kZXgsIHJvb3RJbmRleCkpIHtcbiAgICAgICAgICAgIG5vZGVzW3Jvb3RJbmRleF0gPSByb290Tm9kZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHZDaGlsZHJlbiA9IHRyZWUuY2hpbGRyZW5cblxuICAgICAgICBpZiAodkNoaWxkcmVuKSB7XG5cbiAgICAgICAgICAgIHZhciBjaGlsZE5vZGVzID0gcm9vdE5vZGUuY2hpbGROb2Rlc1xuXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRyZWUuY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICByb290SW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgdmFyIHZDaGlsZCA9IHZDaGlsZHJlbltpXSB8fCBub0NoaWxkXG4gICAgICAgICAgICAgICAgdmFyIG5leHRJbmRleCA9IHJvb3RJbmRleCArICh2Q2hpbGQuY291bnQgfHwgMClcblxuICAgICAgICAgICAgICAgIC8vIHNraXAgcmVjdXJzaW9uIGRvd24gdGhlIHRyZWUgaWYgdGhlcmUgYXJlIG5vIG5vZGVzIGRvd24gaGVyZVxuICAgICAgICAgICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCBuZXh0SW5kZXgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlY3Vyc2UoY2hpbGROb2Rlc1tpXSwgdkNoaWxkLCBpbmRpY2VzLCBub2Rlcywgcm9vdEluZGV4KVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJvb3RJbmRleCA9IG5leHRJbmRleFxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vZGVzXG59XG5cbi8vIEJpbmFyeSBzZWFyY2ggZm9yIGFuIGluZGV4IGluIHRoZSBpbnRlcnZhbCBbbGVmdCwgcmlnaHRdXG5mdW5jdGlvbiBpbmRleEluUmFuZ2UoaW5kaWNlcywgbGVmdCwgcmlnaHQpIHtcbiAgICBpZiAoaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfVxuXG4gICAgdmFyIG1pbkluZGV4ID0gMFxuICAgIHZhciBtYXhJbmRleCA9IGluZGljZXMubGVuZ3RoIC0gMVxuICAgIHZhciBjdXJyZW50SW5kZXhcbiAgICB2YXIgY3VycmVudEl0ZW1cblxuICAgIHdoaWxlIChtaW5JbmRleCA8PSBtYXhJbmRleCkge1xuICAgICAgICBjdXJyZW50SW5kZXggPSAoKG1heEluZGV4ICsgbWluSW5kZXgpIC8gMikgPj4gMFxuICAgICAgICBjdXJyZW50SXRlbSA9IGluZGljZXNbY3VycmVudEluZGV4XVxuXG4gICAgICAgIGlmIChtaW5JbmRleCA9PT0gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHJldHVybiBjdXJyZW50SXRlbSA+PSBsZWZ0ICYmIGN1cnJlbnRJdGVtIDw9IHJpZ2h0XG4gICAgICAgIH0gZWxzZSBpZiAoY3VycmVudEl0ZW0gPCBsZWZ0KSB7XG4gICAgICAgICAgICBtaW5JbmRleCA9IGN1cnJlbnRJbmRleCArIDFcbiAgICAgICAgfSBlbHNlICBpZiAoY3VycmVudEl0ZW0gPiByaWdodCkge1xuICAgICAgICAgICAgbWF4SW5kZXggPSBjdXJyZW50SW5kZXggLSAxXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBhc2NlbmRpbmcoYSwgYikge1xuICAgIHJldHVybiBhID4gYiA/IDEgOiAtMVxufVxuIiwidmFyIGFwcGx5UHJvcGVydGllcyA9IHJlcXVpcmUoXCIuL2FwcGx5LXByb3BlcnRpZXNcIilcblxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldC5qc1wiKVxudmFyIFZQYXRjaCA9IHJlcXVpcmUoXCIuLi92bm9kZS92cGF0Y2guanNcIilcblxudmFyIHVwZGF0ZVdpZGdldCA9IHJlcXVpcmUoXCIuL3VwZGF0ZS13aWRnZXRcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVBhdGNoXG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2godnBhdGNoLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIHR5cGUgPSB2cGF0Y2gudHlwZVxuICAgIHZhciB2Tm9kZSA9IHZwYXRjaC52Tm9kZVxuICAgIHZhciBwYXRjaCA9IHZwYXRjaC5wYXRjaFxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgVlBhdGNoLlJFTU9WRTpcbiAgICAgICAgICAgIHJldHVybiByZW1vdmVOb2RlKGRvbU5vZGUsIHZOb2RlKVxuICAgICAgICBjYXNlIFZQYXRjaC5JTlNFUlQ6XG4gICAgICAgICAgICByZXR1cm4gaW5zZXJ0Tm9kZShkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVlRFWFQ6XG4gICAgICAgICAgICByZXR1cm4gc3RyaW5nUGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5XSURHRVQ6XG4gICAgICAgICAgICByZXR1cm4gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgdk5vZGUsIHBhdGNoLCByZW5kZXJPcHRpb25zKVxuICAgICAgICBjYXNlIFZQYXRjaC5WTk9ERTpcbiAgICAgICAgICAgIHJldHVybiB2Tm9kZVBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guT1JERVI6XG4gICAgICAgICAgICByZW9yZGVyQ2hpbGRyZW4oZG9tTm9kZSwgcGF0Y2gpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5QUk9QUzpcbiAgICAgICAgICAgIGFwcGx5UHJvcGVydGllcyhkb21Ob2RlLCBwYXRjaCwgdk5vZGUucHJvcGVydGllcylcbiAgICAgICAgICAgIHJldHVybiBkb21Ob2RlXG4gICAgICAgIGNhc2UgVlBhdGNoLlRIVU5LOlxuICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VSb290KGRvbU5vZGUsXG4gICAgICAgICAgICAgICAgcmVuZGVyT3B0aW9ucy5wYXRjaChkb21Ob2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucykpXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSkge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLnJlbW92ZUNoaWxkKGRvbU5vZGUpXG4gICAgfVxuXG4gICAgZGVzdHJveVdpZGdldChkb21Ob2RlLCB2Tm9kZSk7XG5cbiAgICByZXR1cm4gbnVsbFxufVxuXG5mdW5jdGlvbiBpbnNlcnROb2RlKHBhcmVudE5vZGUsIHZOb2RlLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXJPcHRpb25zLnJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUuYXBwZW5kQ2hpbGQobmV3Tm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gcGFyZW50Tm9kZVxufVxuXG5mdW5jdGlvbiBzdHJpbmdQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHZUZXh0LCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChkb21Ob2RlLm5vZGVUeXBlID09PSAzKSB7XG4gICAgICAgIGRvbU5vZGUucmVwbGFjZURhdGEoMCwgZG9tTm9kZS5sZW5ndGgsIHZUZXh0LnRleHQpXG4gICAgICAgIG5ld05vZGUgPSBkb21Ob2RlXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcbiAgICAgICAgbmV3Tm9kZSA9IHJlbmRlck9wdGlvbnMucmVuZGVyKHZUZXh0LCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgIGlmIChwYXJlbnROb2RlICYmIG5ld05vZGUgIT09IGRvbU5vZGUpIHtcbiAgICAgICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB3aWRnZXRQYXRjaChkb21Ob2RlLCBsZWZ0Vk5vZGUsIHdpZGdldCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciB1cGRhdGluZyA9IHVwZGF0ZVdpZGdldChsZWZ0Vk5vZGUsIHdpZGdldClcbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKHVwZGF0aW5nKSB7XG4gICAgICAgIG5ld05vZGUgPSB3aWRnZXQudXBkYXRlKGxlZnRWTm9kZSwgZG9tTm9kZSkgfHwgZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSByZW5kZXJPcHRpb25zLnJlbmRlcih3aWRnZXQsIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgdmFyIHBhcmVudE5vZGUgPSBkb21Ob2RlLnBhcmVudE5vZGVcblxuICAgIGlmIChwYXJlbnROb2RlICYmIG5ld05vZGUgIT09IGRvbU5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICBpZiAoIXVwZGF0aW5nKSB7XG4gICAgICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgbGVmdFZOb2RlKVxuICAgIH1cblxuICAgIHJldHVybiBuZXdOb2RlXG59XG5cbmZ1bmN0aW9uIHZOb2RlUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgdmFyIG5ld05vZGUgPSByZW5kZXJPcHRpb25zLnJlbmRlcih2Tm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgIGlmIChwYXJlbnROb2RlICYmIG5ld05vZGUgIT09IGRvbU5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQobmV3Tm9kZSwgZG9tTm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIHcpIHtcbiAgICBpZiAodHlwZW9mIHcuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiICYmIGlzV2lkZ2V0KHcpKSB7XG4gICAgICAgIHcuZGVzdHJveShkb21Ob2RlKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIG1vdmVzKSB7XG4gICAgdmFyIGNoaWxkTm9kZXMgPSBkb21Ob2RlLmNoaWxkTm9kZXNcbiAgICB2YXIga2V5TWFwID0ge31cbiAgICB2YXIgbm9kZVxuICAgIHZhciByZW1vdmVcbiAgICB2YXIgaW5zZXJ0XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vdmVzLnJlbW92ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVtb3ZlID0gbW92ZXMucmVtb3Zlc1tpXVxuICAgICAgICBub2RlID0gY2hpbGROb2Rlc1tyZW1vdmUuZnJvbV1cbiAgICAgICAgaWYgKHJlbW92ZS5rZXkpIHtcbiAgICAgICAgICAgIGtleU1hcFtyZW1vdmUua2V5XSA9IG5vZGVcbiAgICAgICAgfVxuICAgICAgICBkb21Ob2RlLnJlbW92ZUNoaWxkKG5vZGUpXG4gICAgfVxuXG4gICAgdmFyIGxlbmd0aCA9IGNoaWxkTm9kZXMubGVuZ3RoXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBtb3Zlcy5pbnNlcnRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGluc2VydCA9IG1vdmVzLmluc2VydHNbal1cbiAgICAgICAgbm9kZSA9IGtleU1hcFtpbnNlcnQua2V5XVxuICAgICAgICAvLyB0aGlzIGlzIHRoZSB3ZWlyZGVzdCBidWcgaSd2ZSBldmVyIHNlZW4gaW4gd2Via2l0XG4gICAgICAgIGRvbU5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGluc2VydC50byA+PSBsZW5ndGgrKyA/IG51bGwgOiBjaGlsZE5vZGVzW2luc2VydC50b10pXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZXBsYWNlUm9vdChvbGRSb290LCBuZXdSb290KSB7XG4gICAgaWYgKG9sZFJvb3QgJiYgbmV3Um9vdCAmJiBvbGRSb290ICE9PSBuZXdSb290ICYmIG9sZFJvb3QucGFyZW50Tm9kZSkge1xuICAgICAgICBvbGRSb290LnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld1Jvb3QsIG9sZFJvb3QpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld1Jvb3Q7XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG5cbnZhciByZW5kZXIgPSByZXF1aXJlKFwiLi9jcmVhdGUtZWxlbWVudFwiKVxudmFyIGRvbUluZGV4ID0gcmVxdWlyZShcIi4vZG9tLWluZGV4XCIpXG52YXIgcGF0Y2hPcCA9IHJlcXVpcmUoXCIuL3BhdGNoLW9wXCIpXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGNoXG5cbmZ1bmN0aW9uIHBhdGNoKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKSB7XG4gICAgcmVuZGVyT3B0aW9ucyA9IHJlbmRlck9wdGlvbnMgfHwge31cbiAgICByZW5kZXJPcHRpb25zLnBhdGNoID0gcmVuZGVyT3B0aW9ucy5wYXRjaCAmJiByZW5kZXJPcHRpb25zLnBhdGNoICE9PSBwYXRjaFxuICAgICAgICA/IHJlbmRlck9wdGlvbnMucGF0Y2hcbiAgICAgICAgOiBwYXRjaFJlY3Vyc2l2ZVxuICAgIHJlbmRlck9wdGlvbnMucmVuZGVyID0gcmVuZGVyT3B0aW9ucy5yZW5kZXIgfHwgcmVuZGVyXG5cbiAgICByZXR1cm4gcmVuZGVyT3B0aW9ucy5wYXRjaChyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucylcbn1cblxuZnVuY3Rpb24gcGF0Y2hSZWN1cnNpdmUocm9vdE5vZGUsIHBhdGNoZXMsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgaW5kaWNlcyA9IHBhdGNoSW5kaWNlcyhwYXRjaGVzKVxuXG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiByb290Tm9kZVxuICAgIH1cblxuICAgIHZhciBpbmRleCA9IGRvbUluZGV4KHJvb3ROb2RlLCBwYXRjaGVzLmEsIGluZGljZXMpXG4gICAgdmFyIG93bmVyRG9jdW1lbnQgPSByb290Tm9kZS5vd25lckRvY3VtZW50XG5cbiAgICBpZiAoIXJlbmRlck9wdGlvbnMuZG9jdW1lbnQgJiYgb3duZXJEb2N1bWVudCAhPT0gZG9jdW1lbnQpIHtcbiAgICAgICAgcmVuZGVyT3B0aW9ucy5kb2N1bWVudCA9IG93bmVyRG9jdW1lbnRcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluZGljZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIG5vZGVJbmRleCA9IGluZGljZXNbaV1cbiAgICAgICAgcm9vdE5vZGUgPSBhcHBseVBhdGNoKHJvb3ROb2RlLFxuICAgICAgICAgICAgaW5kZXhbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHBhdGNoZXNbbm9kZUluZGV4XSxcbiAgICAgICAgICAgIHJlbmRlck9wdGlvbnMpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIGFwcGx5UGF0Y2gocm9vdE5vZGUsIGRvbU5vZGUsIHBhdGNoTGlzdCwgcmVuZGVyT3B0aW9ucykge1xuICAgIGlmICghZG9tTm9kZSkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgbmV3Tm9kZVxuXG4gICAgaWYgKGlzQXJyYXkocGF0Y2hMaXN0KSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGNoTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgbmV3Tm9kZSA9IHBhdGNoT3AocGF0Y2hMaXN0W2ldLCBkb21Ob2RlLCByZW5kZXJPcHRpb25zKVxuXG4gICAgICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAoZG9tTm9kZSA9PT0gcm9vdE5vZGUpIHtcbiAgICAgICAgICAgIHJvb3ROb2RlID0gbmV3Tm9kZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJvb3ROb2RlXG59XG5cbmZ1bmN0aW9uIHBhdGNoSW5kaWNlcyhwYXRjaGVzKSB7XG4gICAgdmFyIGluZGljZXMgPSBbXVxuXG4gICAgZm9yICh2YXIga2V5IGluIHBhdGNoZXMpIHtcbiAgICAgICAgaWYgKGtleSAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIGluZGljZXMucHVzaChOdW1iZXIoa2V5KSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBpbmRpY2VzXG59XG4iLCJ2YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0LmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gdXBkYXRlV2lkZ2V0XG5cbmZ1bmN0aW9uIHVwZGF0ZVdpZGdldChhLCBiKSB7XG4gICAgaWYgKGlzV2lkZ2V0KGEpICYmIGlzV2lkZ2V0KGIpKSB7XG4gICAgICAgIGlmIChcIm5hbWVcIiBpbiBhICYmIFwibmFtZVwiIGluIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmlkID09PSBiLmlkXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pbml0ID09PSBiLmluaXRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZTdG9yZSA9IHJlcXVpcmUoJ2V2LXN0b3JlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gRXZIb29rO1xuXG5mdW5jdGlvbiBFdkhvb2sodmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRXZIb29rKSkge1xuICAgICAgICByZXR1cm4gbmV3IEV2SG9vayh2YWx1ZSk7XG4gICAgfVxuXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xufVxuXG5Fdkhvb2sucHJvdG90eXBlLmhvb2sgPSBmdW5jdGlvbiAobm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgdmFyIGVzID0gRXZTdG9yZShub2RlKTtcbiAgICB2YXIgcHJvcE5hbWUgPSBwcm9wZXJ0eU5hbWUuc3Vic3RyKDMpO1xuXG4gICAgZXNbcHJvcE5hbWVdID0gdGhpcy52YWx1ZTtcbn07XG5cbkV2SG9vay5wcm90b3R5cGUudW5ob29rID0gZnVuY3Rpb24obm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgdmFyIGVzID0gRXZTdG9yZShub2RlKTtcbiAgICB2YXIgcHJvcE5hbWUgPSBwcm9wZXJ0eU5hbWUuc3Vic3RyKDMpO1xuXG4gICAgZXNbcHJvcE5hbWVdID0gdW5kZWZpbmVkO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBTb2Z0U2V0SG9vaztcblxuZnVuY3Rpb24gU29mdFNldEhvb2sodmFsdWUpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU29mdFNldEhvb2spKSB7XG4gICAgICAgIHJldHVybiBuZXcgU29mdFNldEhvb2sodmFsdWUpO1xuICAgIH1cblxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuU29mdFNldEhvb2sucHJvdG90eXBlLmhvb2sgPSBmdW5jdGlvbiAobm9kZSwgcHJvcGVydHlOYW1lKSB7XG4gICAgaWYgKG5vZGVbcHJvcGVydHlOYW1lXSAhPT0gdGhpcy52YWx1ZSkge1xuICAgICAgICBub2RlW3Byb3BlcnR5TmFtZV0gPSB0aGlzLnZhbHVlO1xuICAgIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBpc0FycmF5ID0gcmVxdWlyZSgneC1pcy1hcnJheScpO1xuXG52YXIgVk5vZGUgPSByZXF1aXJlKCcuLi92bm9kZS92bm9kZS5qcycpO1xudmFyIFZUZXh0ID0gcmVxdWlyZSgnLi4vdm5vZGUvdnRleHQuanMnKTtcbnZhciBpc1ZOb2RlID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdm5vZGUnKTtcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdnRleHQnKTtcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXdpZGdldCcpO1xudmFyIGlzSG9vayA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXZob29rJyk7XG52YXIgaXNWVGh1bmsgPSByZXF1aXJlKCcuLi92bm9kZS9pcy10aHVuaycpO1xuXG52YXIgcGFyc2VUYWcgPSByZXF1aXJlKCcuL3BhcnNlLXRhZy5qcycpO1xudmFyIHNvZnRTZXRIb29rID0gcmVxdWlyZSgnLi9ob29rcy9zb2Z0LXNldC1ob29rLmpzJyk7XG52YXIgZXZIb29rID0gcmVxdWlyZSgnLi9ob29rcy9ldi1ob29rLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gaDtcblxuZnVuY3Rpb24gaCh0YWdOYW1lLCBwcm9wZXJ0aWVzLCBjaGlsZHJlbikge1xuICAgIHZhciBjaGlsZE5vZGVzID0gW107XG4gICAgdmFyIHRhZywgcHJvcHMsIGtleSwgbmFtZXNwYWNlO1xuXG4gICAgaWYgKCFjaGlsZHJlbiAmJiBpc0NoaWxkcmVuKHByb3BlcnRpZXMpKSB7XG4gICAgICAgIGNoaWxkcmVuID0gcHJvcGVydGllcztcbiAgICAgICAgcHJvcHMgPSB7fTtcbiAgICB9XG5cbiAgICBwcm9wcyA9IHByb3BzIHx8IHByb3BlcnRpZXMgfHwge307XG4gICAgdGFnID0gcGFyc2VUYWcodGFnTmFtZSwgcHJvcHMpO1xuXG4gICAgLy8gc3VwcG9ydCBrZXlzXG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KCdrZXknKSkge1xuICAgICAgICBrZXkgPSBwcm9wcy5rZXk7XG4gICAgICAgIHByb3BzLmtleSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBzdXBwb3J0IG5hbWVzcGFjZVxuICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eSgnbmFtZXNwYWNlJykpIHtcbiAgICAgICAgbmFtZXNwYWNlID0gcHJvcHMubmFtZXNwYWNlO1xuICAgICAgICBwcm9wcy5uYW1lc3BhY2UgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gZml4IGN1cnNvciBidWdcbiAgICBpZiAodGFnID09PSAnSU5QVVQnICYmXG4gICAgICAgICFuYW1lc3BhY2UgJiZcbiAgICAgICAgcHJvcHMuaGFzT3duUHJvcGVydHkoJ3ZhbHVlJykgJiZcbiAgICAgICAgcHJvcHMudmFsdWUgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAhaXNIb29rKHByb3BzLnZhbHVlKVxuICAgICkge1xuICAgICAgICBwcm9wcy52YWx1ZSA9IHNvZnRTZXRIb29rKHByb3BzLnZhbHVlKTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm1Qcm9wZXJ0aWVzKHByb3BzKTtcblxuICAgIGlmIChjaGlsZHJlbiAhPT0gdW5kZWZpbmVkICYmIGNoaWxkcmVuICE9PSBudWxsKSB7XG4gICAgICAgIGFkZENoaWxkKGNoaWxkcmVuLCBjaGlsZE5vZGVzLCB0YWcsIHByb3BzKTtcbiAgICB9XG5cblxuICAgIHJldHVybiBuZXcgVk5vZGUodGFnLCBwcm9wcywgY2hpbGROb2Rlcywga2V5LCBuYW1lc3BhY2UpO1xufVxuXG5mdW5jdGlvbiBhZGRDaGlsZChjLCBjaGlsZE5vZGVzLCB0YWcsIHByb3BzKSB7XG4gICAgaWYgKHR5cGVvZiBjID09PSAnc3RyaW5nJykge1xuICAgICAgICBjaGlsZE5vZGVzLnB1c2gobmV3IFZUZXh0KGMpKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBjID09PSAnbnVtYmVyJykge1xuICAgICAgICBjaGlsZE5vZGVzLnB1c2gobmV3IFZUZXh0KFN0cmluZyhjKSkpO1xuICAgIH0gZWxzZSBpZiAoaXNDaGlsZChjKSkge1xuICAgICAgICBjaGlsZE5vZGVzLnB1c2goYyk7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KGMpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYWRkQ2hpbGQoY1tpXSwgY2hpbGROb2RlcywgdGFnLCBwcm9wcyk7XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGMgPT09IG51bGwgfHwgYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBVbmV4cGVjdGVkVmlydHVhbEVsZW1lbnQoe1xuICAgICAgICAgICAgZm9yZWlnbk9iamVjdDogYyxcbiAgICAgICAgICAgIHBhcmVudFZub2RlOiB7XG4gICAgICAgICAgICAgICAgdGFnTmFtZTogdGFnLFxuICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHByb3BzXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtUHJvcGVydGllcyhwcm9wcykge1xuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHByb3BzW3Byb3BOYW1lXTtcblxuICAgICAgICAgICAgaWYgKGlzSG9vayh2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHByb3BOYW1lLnN1YnN0cigwLCAzKSA9PT0gJ2V2LScpIHtcbiAgICAgICAgICAgICAgICAvLyBhZGQgZXYtZm9vIHN1cHBvcnRcbiAgICAgICAgICAgICAgICBwcm9wc1twcm9wTmFtZV0gPSBldkhvb2sodmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufVxuXG5mdW5jdGlvbiBpc0NoaWxkKHgpIHtcbiAgICByZXR1cm4gaXNWTm9kZSh4KSB8fCBpc1ZUZXh0KHgpIHx8IGlzV2lkZ2V0KHgpIHx8IGlzVlRodW5rKHgpO1xufVxuXG5mdW5jdGlvbiBpc0NoaWxkcmVuKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdzdHJpbmcnIHx8IGlzQXJyYXkoeCkgfHwgaXNDaGlsZCh4KTtcbn1cblxuZnVuY3Rpb24gVW5leHBlY3RlZFZpcnR1YWxFbGVtZW50KGRhdGEpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG5cbiAgICBlcnIudHlwZSA9ICd2aXJ0dWFsLWh5cGVyc2NyaXB0LnVuZXhwZWN0ZWQudmlydHVhbC1lbGVtZW50JztcbiAgICBlcnIubWVzc2FnZSA9ICdVbmV4cGVjdGVkIHZpcnR1YWwgY2hpbGQgcGFzc2VkIHRvIGgoKS5cXG4nICtcbiAgICAgICAgJ0V4cGVjdGVkIGEgVk5vZGUgLyBWdGh1bmsgLyBWV2lkZ2V0IC8gc3RyaW5nIGJ1dDpcXG4nICtcbiAgICAgICAgJ2dvdDpcXG4nICtcbiAgICAgICAgZXJyb3JTdHJpbmcoZGF0YS5mb3JlaWduT2JqZWN0KSArXG4gICAgICAgICcuXFxuJyArXG4gICAgICAgICdUaGUgcGFyZW50IHZub2RlIGlzOlxcbicgK1xuICAgICAgICBlcnJvclN0cmluZyhkYXRhLnBhcmVudFZub2RlKVxuICAgICAgICAnXFxuJyArXG4gICAgICAgICdTdWdnZXN0ZWQgZml4OiBjaGFuZ2UgeW91ciBgaCguLi4sIFsgLi4uIF0pYCBjYWxsc2l0ZS4nO1xuICAgIGVyci5mb3JlaWduT2JqZWN0ID0gZGF0YS5mb3JlaWduT2JqZWN0O1xuICAgIGVyci5wYXJlbnRWbm9kZSA9IGRhdGEucGFyZW50Vm5vZGU7XG5cbiAgICByZXR1cm4gZXJyO1xufVxuXG5mdW5jdGlvbiBlcnJvclN0cmluZyhvYmopIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkob2JqLCBudWxsLCAnICAgICcpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhvYmopO1xuICAgIH1cbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNwbGl0ID0gcmVxdWlyZSgnYnJvd3Nlci1zcGxpdCcpO1xuXG52YXIgY2xhc3NJZFNwbGl0ID0gLyhbXFwuI10/W2EtekEtWjAtOVxcdTAwN0YtXFx1RkZGRl86LV0rKS87XG52YXIgbm90Q2xhc3NJZCA9IC9eXFwufCMvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlVGFnO1xuXG5mdW5jdGlvbiBwYXJzZVRhZyh0YWcsIHByb3BzKSB7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgICAgcmV0dXJuICdESVYnO1xuICAgIH1cblxuICAgIHZhciBub0lkID0gIShwcm9wcy5oYXNPd25Qcm9wZXJ0eSgnaWQnKSk7XG5cbiAgICB2YXIgdGFnUGFydHMgPSBzcGxpdCh0YWcsIGNsYXNzSWRTcGxpdCk7XG4gICAgdmFyIHRhZ05hbWUgPSBudWxsO1xuXG4gICAgaWYgKG5vdENsYXNzSWQudGVzdCh0YWdQYXJ0c1sxXSkpIHtcbiAgICAgICAgdGFnTmFtZSA9ICdESVYnO1xuICAgIH1cblxuICAgIHZhciBjbGFzc2VzLCBwYXJ0LCB0eXBlLCBpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRhZ1BhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhcnQgPSB0YWdQYXJ0c1tpXTtcblxuICAgICAgICBpZiAoIXBhcnQpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdHlwZSA9IHBhcnQuY2hhckF0KDApO1xuXG4gICAgICAgIGlmICghdGFnTmFtZSkge1xuICAgICAgICAgICAgdGFnTmFtZSA9IHBhcnQ7XG4gICAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJy4nKSB7XG4gICAgICAgICAgICBjbGFzc2VzID0gY2xhc3NlcyB8fCBbXTtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCkpO1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcjJyAmJiBub0lkKSB7XG4gICAgICAgICAgICBwcm9wcy5pZCA9IHBhcnQuc3Vic3RyaW5nKDEsIHBhcnQubGVuZ3RoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjbGFzc2VzKSB7XG4gICAgICAgIGlmIChwcm9wcy5jbGFzc05hbWUpIHtcbiAgICAgICAgICAgIGNsYXNzZXMucHVzaChwcm9wcy5jbGFzc05hbWUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcHJvcHMuY2xhc3NOYW1lID0gY2xhc3Nlcy5qb2luKCcgJyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb3BzLm5hbWVzcGFjZSA/IHRhZ05hbWUgOiB0YWdOYW1lLnRvVXBwZXJDYXNlKCk7XG59XG4iLCJ2YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGVUaHVua1xuXG5mdW5jdGlvbiBoYW5kbGVUaHVuayhhLCBiKSB7XG4gICAgdmFyIHJlbmRlcmVkQSA9IGFcbiAgICB2YXIgcmVuZGVyZWRCID0gYlxuXG4gICAgaWYgKGlzVGh1bmsoYikpIHtcbiAgICAgICAgcmVuZGVyZWRCID0gcmVuZGVyVGh1bmsoYiwgYSlcbiAgICB9XG5cbiAgICBpZiAoaXNUaHVuayhhKSkge1xuICAgICAgICByZW5kZXJlZEEgPSByZW5kZXJUaHVuayhhLCBudWxsKVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGE6IHJlbmRlcmVkQSxcbiAgICAgICAgYjogcmVuZGVyZWRCXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXJUaHVuayh0aHVuaywgcHJldmlvdXMpIHtcbiAgICB2YXIgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlXG5cbiAgICBpZiAoIXJlbmRlcmVkVGh1bmspIHtcbiAgICAgICAgcmVuZGVyZWRUaHVuayA9IHRodW5rLnZub2RlID0gdGh1bmsucmVuZGVyKHByZXZpb3VzKVxuICAgIH1cblxuICAgIGlmICghKGlzVk5vZGUocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzVlRleHQocmVuZGVyZWRUaHVuaykgfHxcbiAgICAgICAgICAgIGlzV2lkZ2V0KHJlbmRlcmVkVGh1bmspKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0aHVuayBkaWQgbm90IHJldHVybiBhIHZhbGlkIG5vZGVcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbmRlcmVkVGh1bmtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNUaHVua1xyXG5cclxuZnVuY3Rpb24gaXNUaHVuayh0KSB7XHJcbiAgICByZXR1cm4gdCAmJiB0LnR5cGUgPT09IFwiVGh1bmtcIlxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gaXNIb29rXG5cbmZ1bmN0aW9uIGlzSG9vayhob29rKSB7XG4gICAgcmV0dXJuIGhvb2sgJiZcbiAgICAgICh0eXBlb2YgaG9vay5ob29rID09PSBcImZ1bmN0aW9uXCIgJiYgIWhvb2suaGFzT3duUHJvcGVydHkoXCJob29rXCIpIHx8XG4gICAgICAgdHlwZW9mIGhvb2sudW5ob29rID09PSBcImZ1bmN0aW9uXCIgJiYgIWhvb2suaGFzT3duUHJvcGVydHkoXCJ1bmhvb2tcIikpXG59XG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBpc1ZpcnR1YWxOb2RlXG5cbmZ1bmN0aW9uIGlzVmlydHVhbE5vZGUoeCkge1xuICAgIHJldHVybiB4ICYmIHgudHlwZSA9PT0gXCJWaXJ0dWFsTm9kZVwiICYmIHgudmVyc2lvbiA9PT0gdmVyc2lvblxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxUZXh0KHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbFRleHRcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNXaWRnZXRcblxuZnVuY3Rpb24gaXNXaWRnZXQodykge1xuICAgIHJldHVybiB3ICYmIHcudHlwZSA9PT0gXCJXaWRnZXRcIlxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBcIjJcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuL2lzLXZub2RlXCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4vaXMtdGh1bmtcIilcbnZhciBpc1ZIb29rID0gcmVxdWlyZShcIi4vaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsTm9kZVxuXG52YXIgbm9Qcm9wZXJ0aWVzID0ge31cbnZhciBub0NoaWxkcmVuID0gW11cblxuZnVuY3Rpb24gVmlydHVhbE5vZGUodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4sIGtleSwgbmFtZXNwYWNlKSB7XG4gICAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXMgfHwgbm9Qcm9wZXJ0aWVzXG4gICAgdGhpcy5jaGlsZHJlbiA9IGNoaWxkcmVuIHx8IG5vQ2hpbGRyZW5cbiAgICB0aGlzLmtleSA9IGtleSAhPSBudWxsID8gU3RyaW5nKGtleSkgOiB1bmRlZmluZWRcbiAgICB0aGlzLm5hbWVzcGFjZSA9ICh0eXBlb2YgbmFtZXNwYWNlID09PSBcInN0cmluZ1wiKSA/IG5hbWVzcGFjZSA6IG51bGxcblxuICAgIHZhciBjb3VudCA9IChjaGlsZHJlbiAmJiBjaGlsZHJlbi5sZW5ndGgpIHx8IDBcbiAgICB2YXIgZGVzY2VuZGFudHMgPSAwXG4gICAgdmFyIGhhc1dpZGdldHMgPSBmYWxzZVxuICAgIHZhciBoYXNUaHVua3MgPSBmYWxzZVxuICAgIHZhciBkZXNjZW5kYW50SG9va3MgPSBmYWxzZVxuICAgIHZhciBob29rc1xuXG4gICAgZm9yICh2YXIgcHJvcE5hbWUgaW4gcHJvcGVydGllcykge1xuICAgICAgICBpZiAocHJvcGVydGllcy5oYXNPd25Qcm9wZXJ0eShwcm9wTmFtZSkpIHtcbiAgICAgICAgICAgIHZhciBwcm9wZXJ0eSA9IHByb3BlcnRpZXNbcHJvcE5hbWVdXG4gICAgICAgICAgICBpZiAoaXNWSG9vayhwcm9wZXJ0eSkgJiYgcHJvcGVydHkudW5ob29rKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFob29rcykge1xuICAgICAgICAgICAgICAgICAgICBob29rcyA9IHt9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaG9va3NbcHJvcE5hbWVdID0gcHJvcGVydHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkpIHtcbiAgICAgICAgICAgIGRlc2NlbmRhbnRzICs9IGNoaWxkLmNvdW50IHx8IDBcblxuICAgICAgICAgICAgaWYgKCFoYXNXaWRnZXRzICYmIGNoaWxkLmhhc1dpZGdldHMpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWhhc1RodW5rcyAmJiBjaGlsZC5oYXNUaHVua3MpIHtcbiAgICAgICAgICAgICAgICBoYXNUaHVua3MgPSB0cnVlXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZGVzY2VuZGFudEhvb2tzICYmIChjaGlsZC5ob29rcyB8fCBjaGlsZC5kZXNjZW5kYW50SG9va3MpKSB7XG4gICAgICAgICAgICAgICAgZGVzY2VuZGFudEhvb2tzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNXaWRnZXRzICYmIGlzV2lkZ2V0KGNoaWxkKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjaGlsZC5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICBoYXNXaWRnZXRzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCFoYXNUaHVua3MgJiYgaXNUaHVuayhjaGlsZCkpIHtcbiAgICAgICAgICAgIGhhc1RodW5rcyA9IHRydWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmNvdW50ID0gY291bnQgKyBkZXNjZW5kYW50c1xuICAgIHRoaXMuaGFzV2lkZ2V0cyA9IGhhc1dpZGdldHNcbiAgICB0aGlzLmhhc1RodW5rcyA9IGhhc1RodW5rc1xuICAgIHRoaXMuaG9va3MgPSBob29rc1xuICAgIHRoaXMuZGVzY2VuZGFudEhvb2tzID0gZGVzY2VuZGFudEhvb2tzXG59XG5cblZpcnR1YWxOb2RlLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbE5vZGUucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxOb2RlXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5WaXJ0dWFsUGF0Y2guTk9ORSA9IDBcblZpcnR1YWxQYXRjaC5WVEVYVCA9IDFcblZpcnR1YWxQYXRjaC5WTk9ERSA9IDJcblZpcnR1YWxQYXRjaC5XSURHRVQgPSAzXG5WaXJ0dWFsUGF0Y2guUFJPUFMgPSA0XG5WaXJ0dWFsUGF0Y2guT1JERVIgPSA1XG5WaXJ0dWFsUGF0Y2guSU5TRVJUID0gNlxuVmlydHVhbFBhdGNoLlJFTU9WRSA9IDdcblZpcnR1YWxQYXRjaC5USFVOSyA9IDhcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsUGF0Y2hcblxuZnVuY3Rpb24gVmlydHVhbFBhdGNoKHR5cGUsIHZOb2RlLCBwYXRjaCkge1xuICAgIHRoaXMudHlwZSA9IE51bWJlcih0eXBlKVxuICAgIHRoaXMudk5vZGUgPSB2Tm9kZVxuICAgIHRoaXMucGF0Y2ggPSBwYXRjaFxufVxuXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnZlcnNpb24gPSB2ZXJzaW9uXG5WaXJ0dWFsUGF0Y2gucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxQYXRjaFwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxubW9kdWxlLmV4cG9ydHMgPSBWaXJ0dWFsVGV4dFxuXG5mdW5jdGlvbiBWaXJ0dWFsVGV4dCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0ID0gU3RyaW5nKHRleHQpXG59XG5cblZpcnR1YWxUZXh0LnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFRleHQucHJvdG90eXBlLnR5cGUgPSBcIlZpcnR1YWxUZXh0XCJcbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcbnZhciBpc0hvb2sgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdmhvb2tcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmUHJvcHNcblxuZnVuY3Rpb24gZGlmZlByb3BzKGEsIGIpIHtcbiAgICB2YXIgZGlmZlxuXG4gICAgZm9yICh2YXIgYUtleSBpbiBhKSB7XG4gICAgICAgIGlmICghKGFLZXkgaW4gYikpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gdW5kZWZpbmVkXG4gICAgICAgIH1cblxuICAgICAgICB2YXIgYVZhbHVlID0gYVthS2V5XVxuICAgICAgICB2YXIgYlZhbHVlID0gYlthS2V5XVxuXG4gICAgICAgIGlmIChhVmFsdWUgPT09IGJWYWx1ZSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfSBlbHNlIGlmIChpc09iamVjdChhVmFsdWUpICYmIGlzT2JqZWN0KGJWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChnZXRQcm90b3R5cGUoYlZhbHVlKSAhPT0gZ2V0UHJvdG90eXBlKGFWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNIb29rKGJWYWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgb2JqZWN0RGlmZiA9IGRpZmZQcm9wcyhhVmFsdWUsIGJWYWx1ZSlcbiAgICAgICAgICAgICAgICBpZiAob2JqZWN0RGlmZikge1xuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gb2JqZWN0RGlmZlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBiS2V5IGluIGIpIHtcbiAgICAgICAgaWYgKCEoYktleSBpbiBhKSkge1xuICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgIGRpZmZbYktleV0gPSBiW2JLZXldXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGlmZlxufVxuXG5mdW5jdGlvbiBnZXRQcm90b3R5cGUodmFsdWUpIHtcbiAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpXG4gIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgcmV0dXJuIHZhbHVlLl9fcHJvdG9fX1xuICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgcmV0dXJuIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZVxuICB9XG59XG4iLCJ2YXIgaXNBcnJheSA9IHJlcXVpcmUoXCJ4LWlzLWFycmF5XCIpXG5cbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi4vdm5vZGUvdnBhdGNoXCIpXG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdnRleHRcIilcbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXRcIilcbnZhciBpc1RodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXRodW5rXCIpXG52YXIgaGFuZGxlVGh1bmsgPSByZXF1aXJlKFwiLi4vdm5vZGUvaGFuZGxlLXRodW5rXCIpXG5cbnZhciBkaWZmUHJvcHMgPSByZXF1aXJlKFwiLi9kaWZmLXByb3BzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlxuXG5mdW5jdGlvbiBkaWZmKGEsIGIpIHtcbiAgICB2YXIgcGF0Y2ggPSB7IGE6IGEgfVxuICAgIHdhbGsoYSwgYiwgcGF0Y2gsIDApXG4gICAgcmV0dXJuIHBhdGNoXG59XG5cbmZ1bmN0aW9uIHdhbGsoYSwgYiwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG4gICAgdmFyIGFwcGx5Q2xlYXIgPSBmYWxzZVxuXG4gICAgaWYgKGlzVGh1bmsoYSkgfHwgaXNUaHVuayhiKSkge1xuICAgICAgICB0aHVua3MoYSwgYiwgcGF0Y2gsIGluZGV4KVxuICAgIH0gZWxzZSBpZiAoYiA9PSBudWxsKSB7XG5cbiAgICAgICAgLy8gSWYgYSBpcyBhIHdpZGdldCB3ZSB3aWxsIGFkZCBhIHJlbW92ZSBwYXRjaCBmb3IgaXRcbiAgICAgICAgLy8gT3RoZXJ3aXNlIGFueSBjaGlsZCB3aWRnZXRzL2hvb2tzIG11c3QgYmUgZGVzdHJveWVkLlxuICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGFkZGluZyB0d28gcmVtb3ZlIHBhdGNoZXMgZm9yIGEgd2lkZ2V0LlxuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBjbGVhclN0YXRlKGEsIHBhdGNoLCBpbmRleClcbiAgICAgICAgICAgIGFwcGx5ID0gcGF0Y2hbaW5kZXhdXG4gICAgICAgIH1cblxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIGEsIGIpKVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZShiKSkge1xuICAgICAgICBpZiAoaXNWTm9kZShhKSkge1xuICAgICAgICAgICAgaWYgKGEudGFnTmFtZSA9PT0gYi50YWdOYW1lICYmXG4gICAgICAgICAgICAgICAgYS5uYW1lc3BhY2UgPT09IGIubmFtZXNwYWNlICYmXG4gICAgICAgICAgICAgICAgYS5rZXkgPT09IGIua2V5KSB7XG4gICAgICAgICAgICAgICAgdmFyIHByb3BzUGF0Y2ggPSBkaWZmUHJvcHMoYS5wcm9wZXJ0aWVzLCBiLnByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgaWYgKHByb3BzUGF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goVlBhdGNoLlBST1BTLCBhLCBwcm9wc1BhdGNoKSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleClcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFZQYXRjaC5WTk9ERSwgYSwgYikpXG4gICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KGIpKSB7XG4gICAgICAgIGlmICghaXNWVGV4dChhKSkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgfSBlbHNlIGlmIChhLnRleHQgIT09IGIudGV4dCkge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVlRFWFQsIGEsIGIpKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1dpZGdldChiKSkge1xuICAgICAgICBpZiAoIWlzV2lkZ2V0KGEpKSB7XG4gICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guV0lER0VULCBhLCBiKSlcbiAgICB9XG5cbiAgICBpZiAoYXBwbHkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwbHlcbiAgICB9XG5cbiAgICBpZiAoYXBwbHlDbGVhcikge1xuICAgICAgICBjbGVhclN0YXRlKGEsIHBhdGNoLCBpbmRleClcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRpZmZDaGlsZHJlbihhLCBiLCBwYXRjaCwgYXBwbHksIGluZGV4KSB7XG4gICAgdmFyIGFDaGlsZHJlbiA9IGEuY2hpbGRyZW5cbiAgICB2YXIgb3JkZXJlZFNldCA9IHJlb3JkZXIoYUNoaWxkcmVuLCBiLmNoaWxkcmVuKVxuICAgIHZhciBiQ2hpbGRyZW4gPSBvcmRlcmVkU2V0LmNoaWxkcmVuXG5cbiAgICB2YXIgYUxlbiA9IGFDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgYkxlbiA9IGJDaGlsZHJlbi5sZW5ndGhcbiAgICB2YXIgbGVuID0gYUxlbiA+IGJMZW4gPyBhTGVuIDogYkxlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICB2YXIgbGVmdE5vZGUgPSBhQ2hpbGRyZW5baV1cbiAgICAgICAgdmFyIHJpZ2h0Tm9kZSA9IGJDaGlsZHJlbltpXVxuICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgaWYgKCFsZWZ0Tm9kZSkge1xuICAgICAgICAgICAgaWYgKHJpZ2h0Tm9kZSkge1xuICAgICAgICAgICAgICAgIC8vIEV4Y2VzcyBub2RlcyBpbiBiIG5lZWQgdG8gYmUgYWRkZWRcbiAgICAgICAgICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LFxuICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5JTlNFUlQsIG51bGwsIHJpZ2h0Tm9kZSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3YWxrKGxlZnROb2RlLCByaWdodE5vZGUsIHBhdGNoLCBpbmRleClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpc1ZOb2RlKGxlZnROb2RlKSAmJiBsZWZ0Tm9kZS5jb3VudCkge1xuICAgICAgICAgICAgaW5kZXggKz0gbGVmdE5vZGUuY291bnRcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvcmRlcmVkU2V0Lm1vdmVzKSB7XG4gICAgICAgIC8vIFJlb3JkZXIgbm9kZXMgbGFzdFxuICAgICAgICBhcHBseSA9IGFwcGVuZFBhdGNoKGFwcGx5LCBuZXcgVlBhdGNoKFxuICAgICAgICAgICAgVlBhdGNoLk9SREVSLFxuICAgICAgICAgICAgYSxcbiAgICAgICAgICAgIG9yZGVyZWRTZXQubW92ZXNcbiAgICAgICAgKSlcbiAgICB9XG5cbiAgICByZXR1cm4gYXBwbHlcbn1cblxuZnVuY3Rpb24gY2xlYXJTdGF0ZSh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgLy8gVE9ETzogTWFrZSB0aGlzIGEgc2luZ2xlIHdhbGssIG5vdCB0d29cbiAgICB1bmhvb2sodk5vZGUsIHBhdGNoLCBpbmRleClcbiAgICBkZXN0cm95V2lkZ2V0cyh2Tm9kZSwgcGF0Y2gsIGluZGV4KVxufVxuXG4vLyBQYXRjaCByZWNvcmRzIGZvciBhbGwgZGVzdHJveWVkIHdpZGdldHMgbXVzdCBiZSBhZGRlZCBiZWNhdXNlIHdlIG5lZWRcbi8vIGEgRE9NIG5vZGUgcmVmZXJlbmNlIGZvciB0aGUgZGVzdHJveSBmdW5jdGlvblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1dpZGdldCh2Tm9kZSkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiB2Tm9kZS5kZXN0cm95ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGVuZFBhdGNoKFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSxcbiAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5SRU1PVkUsIHZOb2RlLCBudWxsKVxuICAgICAgICAgICAgKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChpc1ZOb2RlKHZOb2RlKSAmJiAodk5vZGUuaGFzV2lkZ2V0cyB8fCB2Tm9kZS5oYXNUaHVua3MpKSB7XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgIHZhciBsZW4gPSBjaGlsZHJlbi5sZW5ndGhcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgIGluZGV4ICs9IDFcblxuICAgICAgICAgICAgZGVzdHJveVdpZGdldHMoY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpICYmIGNoaWxkLmNvdW50KSB7XG4gICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayh2Tm9kZSkpIHtcbiAgICAgICAgdGh1bmtzKHZOb2RlLCBudWxsLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG4vLyBDcmVhdGUgYSBzdWItcGF0Y2ggZm9yIHRodW5rc1xuZnVuY3Rpb24gdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIHZhciBub2RlcyA9IGhhbmRsZVRodW5rKGEsIGIpXG4gICAgdmFyIHRodW5rUGF0Y2ggPSBkaWZmKG5vZGVzLmEsIG5vZGVzLmIpXG4gICAgaWYgKGhhc1BhdGNoZXModGh1bmtQYXRjaCkpIHtcbiAgICAgICAgcGF0Y2hbaW5kZXhdID0gbmV3IFZQYXRjaChWUGF0Y2guVEhVTkssIG51bGwsIHRodW5rUGF0Y2gpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBoYXNQYXRjaGVzKHBhdGNoKSB7XG4gICAgZm9yICh2YXIgaW5kZXggaW4gcGF0Y2gpIHtcbiAgICAgICAgaWYgKGluZGV4ICE9PSBcImFcIikge1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZVxufVxuXG4vLyBFeGVjdXRlIGhvb2tzIHdoZW4gdHdvIG5vZGVzIGFyZSBpZGVudGljYWxcbmZ1bmN0aW9uIHVuaG9vayh2Tm9kZSwgcGF0Y2gsIGluZGV4KSB7XG4gICAgaWYgKGlzVk5vZGUodk5vZGUpKSB7XG4gICAgICAgIGlmICh2Tm9kZS5ob29rcykge1xuICAgICAgICAgICAgcGF0Y2hbaW5kZXhdID0gYXBwZW5kUGF0Y2goXG4gICAgICAgICAgICAgICAgcGF0Y2hbaW5kZXhdLFxuICAgICAgICAgICAgICAgIG5ldyBWUGF0Y2goXG4gICAgICAgICAgICAgICAgICAgIFZQYXRjaC5QUk9QUyxcbiAgICAgICAgICAgICAgICAgICAgdk5vZGUsXG4gICAgICAgICAgICAgICAgICAgIHVuZGVmaW5lZEtleXModk5vZGUuaG9va3MpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHZOb2RlLmRlc2NlbmRhbnRIb29rcyB8fCB2Tm9kZS5oYXNUaHVua3MpIHtcbiAgICAgICAgICAgIHZhciBjaGlsZHJlbiA9IHZOb2RlLmNoaWxkcmVuXG4gICAgICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgICAgICB1bmhvb2soY2hpbGQsIHBhdGNoLCBpbmRleClcblxuICAgICAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgICAgICBpbmRleCArPSBjaGlsZC5jb3VudFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNUaHVuayh2Tm9kZSkpIHtcbiAgICAgICAgdGh1bmtzKHZOb2RlLCBudWxsLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG5mdW5jdGlvbiB1bmRlZmluZWRLZXlzKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fVxuXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgICByZXN1bHRba2V5XSA9IHVuZGVmaW5lZFxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHRcbn1cblxuLy8gTGlzdCBkaWZmLCBuYWl2ZSBsZWZ0IHRvIHJpZ2h0IHJlb3JkZXJpbmdcbmZ1bmN0aW9uIHJlb3JkZXIoYUNoaWxkcmVuLCBiQ2hpbGRyZW4pIHtcbiAgICAvLyBPKE0pIHRpbWUsIE8oTSkgbWVtb3J5XG4gICAgdmFyIGJDaGlsZEluZGV4ID0ga2V5SW5kZXgoYkNoaWxkcmVuKVxuICAgIHZhciBiS2V5cyA9IGJDaGlsZEluZGV4LmtleXNcbiAgICB2YXIgYkZyZWUgPSBiQ2hpbGRJbmRleC5mcmVlXG5cbiAgICBpZiAoYkZyZWUubGVuZ3RoID09PSBiQ2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGlsZHJlbjogYkNoaWxkcmVuLFxuICAgICAgICAgICAgbW92ZXM6IG51bGxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE8oTikgdGltZSwgTyhOKSBtZW1vcnlcbiAgICB2YXIgYUNoaWxkSW5kZXggPSBrZXlJbmRleChhQ2hpbGRyZW4pXG4gICAgdmFyIGFLZXlzID0gYUNoaWxkSW5kZXgua2V5c1xuICAgIHZhciBhRnJlZSA9IGFDaGlsZEluZGV4LmZyZWVcblxuICAgIGlmIChhRnJlZS5sZW5ndGggPT09IGFDaGlsZHJlbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGNoaWxkcmVuOiBiQ2hpbGRyZW4sXG4gICAgICAgICAgICBtb3ZlczogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gTyhNQVgoTiwgTSkpIG1lbW9yeVxuICAgIHZhciBuZXdDaGlsZHJlbiA9IFtdXG5cbiAgICB2YXIgZnJlZUluZGV4ID0gMFxuICAgIHZhciBmcmVlQ291bnQgPSBiRnJlZS5sZW5ndGhcbiAgICB2YXIgZGVsZXRlZEl0ZW1zID0gMFxuXG4gICAgLy8gSXRlcmF0ZSB0aHJvdWdoIGEgYW5kIG1hdGNoIGEgbm9kZSBpbiBiXG4gICAgLy8gTyhOKSB0aW1lLFxuICAgIGZvciAodmFyIGkgPSAwIDsgaSA8IGFDaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYUl0ZW0gPSBhQ2hpbGRyZW5baV1cbiAgICAgICAgdmFyIGl0ZW1JbmRleFxuXG4gICAgICAgIGlmIChhSXRlbS5rZXkpIHtcbiAgICAgICAgICAgIGlmIChiS2V5cy5oYXNPd25Qcm9wZXJ0eShhSXRlbS5rZXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gTWF0Y2ggdXAgdGhlIG9sZCBrZXlzXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gYktleXNbYUl0ZW0ua2V5XVxuICAgICAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2goYkNoaWxkcmVuW2l0ZW1JbmRleF0pXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVtb3ZlIG9sZCBrZXllZCBpdGVtc1xuICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGkgLSBkZWxldGVkSXRlbXMrK1xuICAgICAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2gobnVsbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIE1hdGNoIHRoZSBpdGVtIGluIGEgd2l0aCB0aGUgbmV4dCBmcmVlIGl0ZW0gaW4gYlxuICAgICAgICAgICAgaWYgKGZyZWVJbmRleCA8IGZyZWVDb3VudCkge1xuICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGJGcmVlW2ZyZWVJbmRleCsrXVxuICAgICAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2goYkNoaWxkcmVuW2l0ZW1JbmRleF0pXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFRoZXJlIGFyZSBubyBmcmVlIGl0ZW1zIGluIGIgdG8gbWF0Y2ggd2l0aFxuICAgICAgICAgICAgICAgIC8vIHRoZSBmcmVlIGl0ZW1zIGluIGEsIHNvIHRoZSBleHRyYSBmcmVlIG5vZGVzXG4gICAgICAgICAgICAgICAgLy8gYXJlIGRlbGV0ZWQuXG4gICAgICAgICAgICAgICAgaXRlbUluZGV4ID0gaSAtIGRlbGV0ZWRJdGVtcysrXG4gICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChudWxsKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGxhc3RGcmVlSW5kZXggPSBmcmVlSW5kZXggPj0gYkZyZWUubGVuZ3RoID9cbiAgICAgICAgYkNoaWxkcmVuLmxlbmd0aCA6XG4gICAgICAgIGJGcmVlW2ZyZWVJbmRleF1cblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBiIGFuZCBhcHBlbmQgYW55IG5ldyBrZXlzXG4gICAgLy8gTyhNKSB0aW1lXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBiQ2hpbGRyZW4ubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIG5ld0l0ZW0gPSBiQ2hpbGRyZW5bal1cblxuICAgICAgICBpZiAobmV3SXRlbS5rZXkpIHtcbiAgICAgICAgICAgIGlmICghYUtleXMuaGFzT3duUHJvcGVydHkobmV3SXRlbS5rZXkpKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGFueSBuZXcga2V5ZWQgaXRlbXNcbiAgICAgICAgICAgICAgICAvLyBXZSBhcmUgYWRkaW5nIG5ldyBpdGVtcyB0byB0aGUgZW5kIGFuZCB0aGVuIHNvcnRpbmcgdGhlbVxuICAgICAgICAgICAgICAgIC8vIGluIHBsYWNlLiBJbiBmdXR1cmUgd2Ugc2hvdWxkIGluc2VydCBuZXcgaXRlbXMgaW4gcGxhY2UuXG4gICAgICAgICAgICAgICAgbmV3Q2hpbGRyZW4ucHVzaChuZXdJdGVtKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKGogPj0gbGFzdEZyZWVJbmRleCkge1xuICAgICAgICAgICAgLy8gQWRkIGFueSBsZWZ0b3ZlciBub24ta2V5ZWQgaXRlbXNcbiAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2gobmV3SXRlbSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzaW11bGF0ZSA9IG5ld0NoaWxkcmVuLnNsaWNlKClcbiAgICB2YXIgc2ltdWxhdGVJbmRleCA9IDBcbiAgICB2YXIgcmVtb3ZlcyA9IFtdXG4gICAgdmFyIGluc2VydHMgPSBbXVxuICAgIHZhciBzaW11bGF0ZUl0ZW1cblxuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgYkNoaWxkcmVuLmxlbmd0aDspIHtcbiAgICAgICAgdmFyIHdhbnRlZEl0ZW0gPSBiQ2hpbGRyZW5ba11cbiAgICAgICAgc2ltdWxhdGVJdGVtID0gc2ltdWxhdGVbc2ltdWxhdGVJbmRleF1cblxuICAgICAgICAvLyByZW1vdmUgaXRlbXNcbiAgICAgICAgd2hpbGUgKHNpbXVsYXRlSXRlbSA9PT0gbnVsbCAmJiBzaW11bGF0ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlbW92ZXMucHVzaChyZW1vdmUoc2ltdWxhdGUsIHNpbXVsYXRlSW5kZXgsIG51bGwpKVxuICAgICAgICAgICAgc2ltdWxhdGVJdGVtID0gc2ltdWxhdGVbc2ltdWxhdGVJbmRleF1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghc2ltdWxhdGVJdGVtIHx8IHNpbXVsYXRlSXRlbS5rZXkgIT09IHdhbnRlZEl0ZW0ua2V5KSB7XG4gICAgICAgICAgICAvLyBpZiB3ZSBuZWVkIGEga2V5IGluIHRoaXMgcG9zaXRpb24uLi5cbiAgICAgICAgICAgIGlmICh3YW50ZWRJdGVtLmtleSkge1xuICAgICAgICAgICAgICAgIGlmIChzaW11bGF0ZUl0ZW0gJiYgc2ltdWxhdGVJdGVtLmtleSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBpZiBhbiBpbnNlcnQgZG9lc24ndCBwdXQgdGhpcyBrZXkgaW4gcGxhY2UsIGl0IG5lZWRzIHRvIG1vdmVcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJLZXlzW3NpbXVsYXRlSXRlbS5rZXldICE9PSBrICsgMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3Zlcy5wdXNoKHJlbW92ZShzaW11bGF0ZSwgc2ltdWxhdGVJbmRleCwgc2ltdWxhdGVJdGVtLmtleSkpXG4gICAgICAgICAgICAgICAgICAgICAgICBzaW11bGF0ZUl0ZW0gPSBzaW11bGF0ZVtzaW11bGF0ZUluZGV4XVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgdGhlIHJlbW92ZSBkaWRuJ3QgcHV0IHRoZSB3YW50ZWQgaXRlbSBpbiBwbGFjZSwgd2UgbmVlZCB0byBpbnNlcnQgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghc2ltdWxhdGVJdGVtIHx8IHNpbXVsYXRlSXRlbS5rZXkgIT09IHdhbnRlZEl0ZW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0cy5wdXNoKHtrZXk6IHdhbnRlZEl0ZW0ua2V5LCB0bzoga30pXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdGVtcyBhcmUgbWF0Y2hpbmcsIHNvIHNraXAgYWhlYWRcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNpbXVsYXRlSW5kZXgrK1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0cy5wdXNoKHtrZXk6IHdhbnRlZEl0ZW0ua2V5LCB0bzoga30pXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGluc2VydHMucHVzaCh7a2V5OiB3YW50ZWRJdGVtLmtleSwgdG86IGt9KVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBrKytcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGEga2V5IGluIHNpbXVsYXRlIGhhcyBubyBtYXRjaGluZyB3YW50ZWQga2V5LCByZW1vdmUgaXRcbiAgICAgICAgICAgIGVsc2UgaWYgKHNpbXVsYXRlSXRlbSAmJiBzaW11bGF0ZUl0ZW0ua2V5KSB7XG4gICAgICAgICAgICAgICAgcmVtb3Zlcy5wdXNoKHJlbW92ZShzaW11bGF0ZSwgc2ltdWxhdGVJbmRleCwgc2ltdWxhdGVJdGVtLmtleSkpXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzaW11bGF0ZUluZGV4KytcbiAgICAgICAgICAgIGsrK1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGFsbCB0aGUgcmVtYWluaW5nIG5vZGVzIGZyb20gc2ltdWxhdGVcbiAgICB3aGlsZShzaW11bGF0ZUluZGV4IDwgc2ltdWxhdGUubGVuZ3RoKSB7XG4gICAgICAgIHNpbXVsYXRlSXRlbSA9IHNpbXVsYXRlW3NpbXVsYXRlSW5kZXhdXG4gICAgICAgIHJlbW92ZXMucHVzaChyZW1vdmUoc2ltdWxhdGUsIHNpbXVsYXRlSW5kZXgsIHNpbXVsYXRlSXRlbSAmJiBzaW11bGF0ZUl0ZW0ua2V5KSlcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgb25seSBtb3ZlcyB3ZSBoYXZlIGFyZSBkZWxldGVzIHRoZW4gd2UgY2FuIGp1c3RcbiAgICAvLyBsZXQgdGhlIGRlbGV0ZSBwYXRjaCByZW1vdmUgdGhlc2UgaXRlbXMuXG4gICAgaWYgKHJlbW92ZXMubGVuZ3RoID09PSBkZWxldGVkSXRlbXMgJiYgIWluc2VydHMubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGlsZHJlbjogbmV3Q2hpbGRyZW4sXG4gICAgICAgICAgICBtb3ZlczogbnVsbFxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgY2hpbGRyZW46IG5ld0NoaWxkcmVuLFxuICAgICAgICBtb3Zlczoge1xuICAgICAgICAgICAgcmVtb3ZlczogcmVtb3ZlcyxcbiAgICAgICAgICAgIGluc2VydHM6IGluc2VydHNcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVtb3ZlKGFyciwgaW5kZXgsIGtleSkge1xuICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpXG5cbiAgICByZXR1cm4ge1xuICAgICAgICBmcm9tOiBpbmRleCxcbiAgICAgICAga2V5OiBrZXlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGtleUluZGV4KGNoaWxkcmVuKSB7XG4gICAgdmFyIGtleXMgPSB7fVxuICAgIHZhciBmcmVlID0gW11cbiAgICB2YXIgbGVuZ3RoID0gY2hpbGRyZW4ubGVuZ3RoXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG5cbiAgICAgICAgaWYgKGNoaWxkLmtleSkge1xuICAgICAgICAgICAga2V5c1tjaGlsZC5rZXldID0gaVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJlZS5wdXNoKGkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBrZXlzOiBrZXlzLCAgICAgLy8gQSBoYXNoIG9mIGtleSBuYW1lIHRvIGluZGV4XG4gICAgICAgIGZyZWU6IGZyZWUgICAgICAvLyBBbiBhcnJheSBvZiB1bmtleWVkIGl0ZW0gaW5kaWNlc1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYXBwZW5kUGF0Y2goYXBwbHksIHBhdGNoKSB7XG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIGlmIChpc0FycmF5KGFwcGx5KSkge1xuICAgICAgICAgICAgYXBwbHkucHVzaChwYXRjaClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFwcGx5ID0gW2FwcGx5LCBwYXRjaF1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBhcHBseVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwYXRjaFxuICAgIH1cbn1cbiIsIkJhYmVsdXRlID0gcmVxdWlyZSgnLi4vaW5kZXgnKTtcbnJlcXVpcmUoJy4uL2xhbmd1YWdlcy9odG1sJyk7XG5yZXF1aXJlKCcuLi9iYWJlbHV0ZS1odG1sL2h0bWwtdmlldycpO1xuQmFiZWx1dGUuZXh0ZW5kTGV4aWMoJ2h0bWwnLCAnbXlodG1sJyk7XG5cbnZhciBoID0gQmFiZWx1dGUuaW5pdGlhbGl6ZXIoJ215aHRtbCcpO1xuXG5CYWJlbHV0ZS50b0xleGljKCdteWh0bWwnLCB7XG5cdGZpbHRlcmFibGVQcm9kdWN0c1RhYmxlOiBmdW5jdGlvbihwcm9kdWN0cykge1xuXHRcdHJldHVybiB0aGlzLnZpZXcoe1xuXHRcdFx0ZmlsdGVyUHJvZHVjdHM6IGZ1bmN0aW9uKGZpbHRlciwgcHJvZHVjdHMpIHtcblx0XHRcdFx0cmV0dXJuIHByb2R1Y3RzLmZpbHRlcihmdW5jdGlvbihwcm9kKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHByb2QudGl0bGUuaW5kZXhPZihmaWx0ZXIpID4gLTE7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSxcblx0XHRcdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0ZmlsdGVyOiAnJ1xuXHRcdFx0XHR9O1xuXHRcdFx0fSxcblx0XHRcdHJlbmRlcjogZnVuY3Rpb24oc3RhdGUpIHtcblx0XHRcdFx0cmV0dXJuIGguZGl2KFxuXHRcdFx0XHRcdGguY2xhc3MoJ2ZpbHRlcmFibGUtcHJvZHVjdHMtdGFibGUnKVxuXHRcdFx0XHRcdC5zZWFyY2hCYXIoc3RhdGUuZmlsdGVyLCBmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0XHRzdGF0ZS5zZXQoe1xuXHRcdFx0XHRcdFx0XHRmaWx0ZXI6IGUudGFyZ2V0LnZhbHVlXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5wcm9kdWN0c1RhYmxlKHRoaXMuZmlsdGVyUHJvZHVjdHMoc3RhdGUuZmlsdGVyLCBwcm9kdWN0cykpXG5cdFx0XHRcdFx0LmJ1dHRvbignYWRkIG9uZScsIGguY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdFx0cHJvZHVjdHMudW5zaGlmdCh7XG5cdFx0XHRcdFx0XHRcdHRpdGxlOiAnaGFhYWlpdScgKyBNYXRoLnJhbmRvbSgpLFxuXHRcdFx0XHRcdFx0XHRsYWJlbDogJ3lvdWhvdSdcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0c3RhdGUucmVuZGVyKCk7XG5cdFx0XHRcdFx0fSkpXG5cdFx0XHRcdCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH0sXG5cdHByb2R1Y3RzVGFibGU6IGZ1bmN0aW9uKHByb2R1Y3RzKSB7XG5cdFx0cmV0dXJuIHRoaXMuZGl2KFxuXHRcdFx0aC5jbGFzcygncHJvZHVjdHMtdGFibGUnKVxuXHRcdFx0Ll9lYWNoKHByb2R1Y3RzLCB0aGlzLnByb2R1Y3QpXG5cdFx0KTtcblx0fSxcblx0cHJvZHVjdDogZnVuY3Rpb24ocHJvZHVjdCkge1xuXHRcdHJldHVybiB0aGlzLmRpdihcblx0XHRcdGguY2xhc3MoJ3Byb2R1Y3Qtcm93Jylcblx0XHRcdC5oMyhwcm9kdWN0LnRpdGxlKVxuXHRcdFx0LmRpdihwcm9kdWN0LmxhYmVsKVxuXHRcdCk7XG5cdH0sXG5cdHNlYXJjaEJhcjogZnVuY3Rpb24oZmlsdGVyLCB1cGRhdGVGaWx0ZXIpIHtcblx0XHRyZXR1cm4gdGhpcy5kaXYoXG5cdFx0XHRoLmNsYXNzKCdzZWFyY2gtYmFyJylcblx0XHRcdC50ZXh0SW5wdXQoZmlsdGVyLFxuXHRcdFx0XHRoLmF0dHIoJ3BsYWNlSG9sZGVyJywgJ3NlYXJjaCB0ZXJtJylcblx0XHRcdFx0Lm9uKCdpbnB1dCcsIHVwZGF0ZUZpbHRlcilcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTtcblxuLyoqXG4gKiB1c2FnZVxuICovXG5cblxuXG5mdW5jdGlvbiByZW5kZXIzKCkge1xuXHR2YXIgdCA9IGguZGl2KCd3b3JsZCcgKyBNYXRoLnJhbmRvbSgpLFxuXHRcdGguYXR0cignYmxvdXBpJywgJ2ZvbycpXG5cdFx0LmgzKCdob29vb29vbycgKyBNYXRoLnJhbmRvbSgpKVxuXHRcdC5zZWN0aW9uKCdoZWxsbycsXG5cdFx0XHRoLmRpdignaG9vb29vb2pqampqam8nKVxuXHRcdClcblx0KVxuXHRmb3IgKHZhciBpID0gMDsgaSA8IDUwMDsgKytpKVxuXHRcdHQuZGl2KCd3b3JsZCcgKyBNYXRoLnJhbmRvbSgpLFxuXHRcdFx0aC5hdHRyKCdibG91cGknLCAnZm9vJylcblx0XHRcdC5oMygnaG9vb29vb28nICsgTWF0aC5yYW5kb20oKSlcblx0XHRcdC5zZWN0aW9uKCdoZWxsbycsXG5cdFx0XHRcdGguZGl2KCdob29vb29vampqampqbycpXG5cdFx0XHQpXG5cdFx0XHQuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnaGV1Jylcblx0XHRcdH0pXG5cdFx0KTtcblx0cmV0dXJuIHQ7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcjIoKSB7XG5cdHJldHVybiBoXG5cdFx0LnRleHQoJ2Jsb3VwaWlpaScpXG5cdFx0LmRpdihoLnNwYW4oJ2hpaWknKSlcblx0XHQuZmlsdGVyYWJsZVByb2R1Y3RzVGFibGUoW3tcblx0XHRcdHRpdGxlOiAnaG9vb28nICsgTWF0aC5yYW5kb20oKSxcblx0XHRcdGxhYmVsOiAnaGlzc3NzJ1xuXHRcdH0sIHtcblx0XHRcdHRpdGxlOiAnaGFhYScgKyBNYXRoLnJhbmRvbSgpLFxuXHRcdFx0bGFiZWw6ICdodXVzc3NzJ1xuXHRcdH0sIHtcblx0XHRcdHRpdGxlOiAnaGlpaW8nICsgTWF0aC5yYW5kb20oKSxcblx0XHRcdGxhYmVsOiAnaGVlZXNzc3MnXG5cdFx0fV0pXG5cdFx0LmRpdigneWVlZWVlZWhhYWFhYScpO1xufVxuXG52YXIgdCA9IHJlbmRlcjIoKTtcblxuZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRyZXR1cm4gdDtcbn1cblxuXG4vKipcbiAqIG91dHB1dHNcbiAqL1xuXG5yZXF1aXJlKCcuLi9sYW5ndWFnZXMvYWN0aW9ucy9odG1sLXRvLXN0cmluZycpO1xucmVxdWlyZSgnLi4vbGFuZ3VhZ2VzL2FjdGlvbnMvaHRtbC10by1kb20nKTtcbnJlcXVpcmUoJy4uL2JhYmVsdXRlLWh0bWwvaHRtbC10by12ZG9tJyk7XG5yZXF1aXJlKCcuLi9iYWJlbHV0ZS1odG1sL2h0bWwtdG8tZGVhdGhtb29kJyk7XG5cbi8vIGNvbnNvbGUubG9nKCdqIDogJXMnLCBKU09OLnN0cmluZ2lmeSh0KSlcbi8vIGNvbnNvbGUubG9nKCd0IDogJXMnLCB0Ll9zdHJpbmdpZnkoKSlcbi8vIGNvbnNvbGUubG9nKCdyIDogJXMnLCB0LiRodG1sVG9TdHJpbmcoKSk7XG5cbi8vIFxuXG5mdW5jdGlvbiB0ZXN0SlNPTihtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0SlNPTi5zdHJpbmdpZnkocmVuZGVyKCkpO1xuXHR9XG5cdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdGNvbnNvbGUubG9nKCdKU09OJywgdGltZSlcbn1cblxuZnVuY3Rpb24gdGVzdFN0cmluZ2lmeShtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0cmVuZGVyKCkuX3N0cmluZ2lmeSgpO1xuXHR9XG5cdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdGNvbnNvbGUubG9nKCdTZXJpYWxpemUnLCB0aW1lKVxufVxuXG5mdW5jdGlvbiB0ZXN0U3RyaW5nKG1heCwgcmVuZGVyKSB7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpIHtcblx0XHRyZW5kZXIoKS4kaHRtbFRvU3RyaW5nKCk7XG5cdH1cblx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0Y29uc29sZS5sb2coJ2h0bWw6c3RyaW5nJywgdGltZSlcbn1cblxuZnVuY3Rpb24gdGVzdERvbShtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0JHJvb3QuaW5uZXJIVE1MID0gJyc7XG5cdFx0cmVuZGVyKCkuJGh0bWxUb0RPTSgkcm9vdClcblx0fVxuXHR0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCkgLSB0aW1lO1xuXHQkcm9vdC5pbm5lckhUTUwgPSAnJztcblx0Y29uc29sZS5sb2coJ2h0bWw6ZG9tJywgdGltZSlcbn1cblxuZnVuY3Rpb24gdGVzdFZkb20obWF4LCByZW5kZXIpIHtcblx0JHJvb3QuaW5uZXJIVE1MID0gJyc7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCksXG5cdFx0bnQ7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpIHtcblx0XHRudCA9IHJlbmRlcigpLiRodG1sVG9WRE9NKCRyb290LCBudClcblx0fVxuXHR0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCkgLSB0aW1lO1xuXHRjb25zb2xlLmxvZygnaHRtbDp2ZG9tJywgdGltZSlcbn1cblxuZnVuY3Rpb24gdGVzdERlYXRobW9vZChtYXgsIHJlbmRlcikge1xuXHQkcm9vdC5pbm5lckhUTUwgPSAnJztcblx0dmFyIHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSxcblx0XHRudDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBtYXg7ICsraSkge1xuXHRcdG50ID0gcmVuZGVyKCkuJGh0bWxUb0RlYXRobW9vZCgkcm9vdCwgbnQpO1xuXHR9XG5cdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdGNvbnNvbGUubG9nKCdkZWF0aG1vb2QxJywgdGltZSlcbn1cblxuXG5mdW5jdGlvbiBydW5BbGwobWF4LCByZW5kZXIpIHtcblx0Y29uc29sZS5sb2coJ19fX19fX19fX19fX19fX18nKTtcblx0Ly8gdGVzdEpTT04obWF4LCByZW5kZXIpO1xuXHQvLyB0ZXN0U3RyaW5naWZ5KG1heCwgcmVuZGVyKTtcblx0Ly8gdGVzdFN0cmluZyhtYXgsIHJlbmRlcik7XG5cdHRlc3REZWF0aG1vb2QobWF4LCByZW5kZXIpO1xuXHQvLyB0ZXN0RG9tKG1heCwgcmVuZGVyKTtcblx0Ly8gdGVzdFZkb20obWF4LCByZW5kZXIpO1xufVxuXG5cbnZhciAkcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JyksXG5cdCRyZWxvYWQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVzdC1idXR0b24nKTtcblxuJHJlbG9hZC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xuXHRydW5BbGwoMSwgcmVuZGVyMyk7XG59KTtcblxuXG5ydW5BbGwoMSwgcmVuZGVyMyk7XG5cbi8vIl19
