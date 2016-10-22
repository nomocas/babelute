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

	else { // is a text node
		newNode.node = oldNode.node; // forward dom node to new vnode
		oldNode.node = null; // help GC
	}
}

function updateElement(newNode, oldNode) {
	var subParent;
	if (newNode.type !== 'fragment') { // is a tag
		// update props and listeners
		updateLocals(oldNode.node, newNode, oldNode);
		// forward node to new vdom, set subparent as tag's node (so normal recursion)
		subParent = newNode.node = oldNode.node;
		oldNode.node = null; // help GC
	} else { // is fragment : forward parent in new vnode, set subParent as $parent (transparent recursion)
		subParent = newNode.parent = oldNode.parent;
		// oldNode.parent = null; // help GC
	}
	const len = Math.max(newNode.children.length, oldNode.children.length);
	for (var i = 0; i < len; i++)
		update(subParent, newNode.children[i], oldNode.children[i]);
	oldNode.children = null; // help GC
	oldNode.props = null;
	oldNode.on = null;
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
		for (var i = 0, len = node.on.length; i < len; ++i)
			$target.addEventListener(node.on[i].name, node.on[i].callback);
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
		view: function(vnode, args /* opts */ , env) {
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
		tag: function(vnode, args /*name, babelutes*/ , env) {
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
		attr: function(vnode, args /* name, value */ ) {
			vnode.props[args[0]] = args[1];
		},
		prop: function(vnode, args /* name, flag */ ) {
			vnode.props[args[0]] = args[1];
		},
		class: function(vnode, args /* name */ ) {
			vnode.props.className = (vnode.props.className || '') + ' ' + args[0];
		},
		id: function(vnode, args /* value */ ) {
			vnode.props.id = args[0];
		},
		text: function(vnode, args /* value */ ) {
			vnode.children.push({
				text: args[0]
			});
		},
		on: function(vnode, args /* event, callback */ ) {
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
		},
		self = this;
	self.$output('html:deathmood', frag);
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
		view: function(vnode, args, env) {
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
		tag: function(vnode, args /* tagName, babelutes */ , env) {
			var descriptor = {
				properties: {},
				children: [],
				selector: ''
			};
			args[1].forEach(function(templ) {
				if (typeof templ === 'undefined')
					return;
				if (templ.__babelute__)
					templ.$output(env, descriptor);
				else
					descriptor.children.push(templ); // auto escaped when added to dom.
			});
			var tag = vh(args[0] + descriptor.selector, descriptor.properties, descriptor.children);
			vnode.children.push(tag);
		},
		text: function(vnode, args /* value */ ) {
			vnode.children.push(args[0]);
		},
		class: function(vnode, args /* className */ ) {
			vnode.properties.selector += '.' + args[0];
		},
		attr: function(vnode, args /* name, value */ ) {
			vnode.properties[args[0]] = args[1];
		},
		id: function(vnode, args /* value */ ) {
			vnode.properties.selector += '#' + args[0];
		},
		on: function(vnode, args /* eventName, callback */ ) {
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
		view: function(node, args, env) {
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
		view: function(descriptor, args, env) {
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
	tag: function(node, args /* tagName, babelutes */ , env) {
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
	text: function(node, args /* value */ ) {
		node.appendChild(document.createTextNode(args[0]));
	},
	class: function(node, args /* className */ ) {
		node.classList.add(args[0]);
	},
	attr: function(node, args /* name, value */ ) {
		node.setAttribute(args[0], args[1]);
	},
	id: function(node, args /* value */ ) {
		node.id = args[0];
	},
	on: function(node, args /* eventName, callback */ ) {
		node.addEventListener(args[0], args[1]);
	},
	onHtmlDom: function(node, args /* callback */ ) {
		args[0](node);
	}
});

Babelute.prototype.$htmlToDOM = function(node) {
	var self = this;
	requestAnimationFrame(function() {
		self.$output('html:dom', node);
	});
	return node;
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
	tag: function(tag, args /* tagName, babelutes */ , env) {
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
	text: function(tag, args /* value */ ) {
		tag.children += encodeHtmlSpecialChars(args[0]);
	},
	class: function(tag, args /* className */ ) {
		tag.classes += ' ' + args[0];
	},
	attr: function(tag, args /* name, value */ ) {
		var value = args[1];
		// tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? encodeHtmlSpecialChars(value) : value) + '"';
		tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? value.replace(/"/g, '\\"').replace(/</g, '&lt;').replace(/>/g, '&gt;') : value) + '"';
	},
	id: function(tag, args /* value */ ) {
		tag.attributes = ' id="' + args[0] + '"' + tag.attributes;
	},
	onHtmlString: function(tag, args) {
		args[0](tag);
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
			if: function(subject, args, env /* successBabelute, elseBabelute */ ) {
				if (args[0])
					return args[1].$output(env, subject);
				else if (args[2])
					return args[2].$output(env, subject);
			},
			all: function(subject, thenables, env) {
				return Promise.all(thenables);
			},
			then: function(subject, callbacks, env) {
				if (locals.error)
					return locals.result = args[0](locals.error);
				return locals.result = args[1](locals.result);
			},
			catch: function(subject, args, env) {
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
				r = f(subject, lexem.args, env, env.scope);
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
			.text('floupi doupi')
			.div('second text')
			.click(function(e) {
				console.log('heu')
			})
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
				h.attr('bloupi', 'foo').div('hoooooojjjjjjo')
			)
			.click(function(e) {
				console.log('heu')
			})
		);
	return t;
}

function getProducts() {
	var products = [];
	for (var i = 0; i < 100; ++i)
		products.push({
			title: 'hoooo' + Math.random(),
			label: 'hissss'
		}, {
			title: 'haaa',
			label: 'huussss'
		}, {
			title: 'hiiio',
			label: 'heeessss'
		});
	return products;
}



function render2() {
	return h
		.text('bloupiiii')
		.div(h.span('hiii'))
		.filterableProductsTable(getProducts())
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
	console.log('JSON : %s - %s', time, time / max);
}

function testStringify(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render()._stringify();
	}
	time = new Date().valueOf() - time;
	console.log('Serialize : %s - %s', time, time / max);
}

function testString(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		render().$htmlToString();
	}
	time = new Date().valueOf() - time;
	console.log('html:string : %s - %s', time, time / max);
}

function testDom(max, render) {
	var time = new Date().valueOf();
	for (var i = 0; i < max; ++i) {
		$root.innerHTML = '';
		render().$htmlToDOM($root)
	}
	time = new Date().valueOf() - time;
	console.log('html:dom : %s - %s', time, time / max);
}

function testVdom(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToVDOM($root, nt)
	}
	time = new Date().valueOf() - time;
	// console.log('html:vdom', time)
}

function testDeathmood(max, render) {
	$root.innerHTML = '';
	var time = new Date().valueOf(),
		nt;
	for (var i = 0; i < max; ++i) {
		nt = render().$htmlToDeathmood($root, nt);
	}
	time = new Date().valueOf() - time;
	console.log('html:deathmood : %s - %s', time, time / max);
	return nt;
}


function runAll(max, render) {
	console.log('________________ %sx', max);
	testJSON(max, render);
	testStringify(max, render);
	testString(max, render);
	testDeathmood(max, render); // 152, 148, 100 - 320, 800, 275 -   400, 1400, 426 ---   544, 2033, 618  --- 258, 337, 111
	testDom(max, render); // 178, 219, 161  -  496, 1001, 320 --  535, 1650, 476 - 587, 2127, 651  --- 684, 872, 166
	// testVdom(max, render);
}

var currentRender = render2;

var $root = document.getElementById('root'),
	$singleDOMTest = document.getElementById('single-dom-test-button'),
	$singleDeathMoodTest = document.getElementById('single-deathmood-test-button'),
	$domTest = document.getElementById('test-dom-button'),
	$deathmoodTest = document.getElementById('test-deathmood-button'),
	$all = document.getElementById('test-all-button'),
	$clear = document.getElementById('clear-button');


var maxTest = 200,
	testDelay = 50;

$domTest.addEventListener('click', function() {
	$root.innerHTML = '';
	var count = 0,
		totalTime = 0,
		intervalID = setInterval(function() {
			var time = new Date().valueOf();
			$root.innerHTML = '';
			currentRender().$htmlToDOM($root);
			time = new Date().valueOf() - time;
			totalTime += time;
			count++;
			if (count === maxTest) {
				console.log('dom 100x : %s - %s', totalTime, totalTime / maxTest)
				clearInterval(intervalID);
			}
		}, testDelay);
});
$deathmoodTest.addEventListener('click', function() {
	$root.innerHTML = '';
	var count = 0,
		totalTime = 0,
		nt,
		intervalID = setInterval(function() {
			var time = new Date().valueOf();
			nt = currentRender().$htmlToDeathmood($root, nt);
			time = new Date().valueOf() - time;
			totalTime += time;
			count++;
			if (count === maxTest) {
				console.log('deathmood 100x : %s - %s', totalTime, totalTime / maxTest)
				clearInterval(intervalID);
			}
		}, testDelay);
});

$all.addEventListener('click', function() {
	$root.innerHTML = '';
	runAll(100, currentRender);
});

var nt;
$singleDeathMoodTest.addEventListener('click', function() {
	var time = new Date().valueOf();
	nt = currentRender().$htmlToDeathmood($root, nt);
	time = new Date().valueOf() - time;
	console.log('single deathmood test', time)
});
$singleDOMTest.addEventListener('click', function() {
	var time = new Date().valueOf();
	$root.innerHTML = '';
	currentRender().$htmlToDOM($root)
	time = new Date().valueOf() - time;
	console.log('single dom test', time)
});

$clear.addEventListener('click', function() {
	$root.innerHTML = '';
	nt = null;
});

// runAll(1, currentRender);

//
},{"../babelute-html/html-to-deathmood":3,"../babelute-html/html-to-vdom":4,"../babelute-html/html-view":5,"../index":7,"../languages/actions/html-to-dom":8,"../languages/actions/html-to-string":9,"../languages/html":10}]},{},[63])(63)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy5udm0vdmVyc2lvbnMvbm9kZS92NC40LjQvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8ubnZtL3ZlcnNpb25zL25vZGUvdjQuNC40L2xpYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiYmFiZWx1dGUtaHRtbC9kZWF0aG1vb2QtdmRvbS5qcyIsImJhYmVsdXRlLWh0bWwvaHRtbC10by1kZWF0aG1vb2QuanMiLCJiYWJlbHV0ZS1odG1sL2h0bWwtdG8tdmRvbS5qcyIsImJhYmVsdXRlLWh0bWwvaHRtbC12aWV3LmpzIiwiYmFiZWx1dGUtaHRtbC92aWV3LXN0YXRlLmpzIiwiaW5kZXguanMiLCJsYW5ndWFnZXMvYWN0aW9ucy9odG1sLXRvLWRvbS5qcyIsImxhbmd1YWdlcy9hY3Rpb25zL2h0bWwtdG8tc3RyaW5nLmpzIiwibGFuZ3VhZ2VzL2h0bWwuanMiLCJsaWIvYmFiZWx1dGUuanMiLCJsaWIvZmlyc3QtbGV2ZWwtYmFiZWx1dGUuanMiLCJsaWIvcGFyc2VyLmpzIiwibGliL3N0cmluZ2lmeS5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2FkZC1ldmVudC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL2RvbS1kZWxlZ2F0b3IuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9jdWlkL2Rpc3QvYnJvd3Nlci1jdWlkLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2V2LXN0b3JlL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL29uZS12ZXJzaW9uLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy9pbmRpdmlkdWFsL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3Ivbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9ub2RlX21vZHVsZXMvd2Vha21hcC1zaGltL2NyZWF0ZS1zdG9yZS5qcyIsIm5vZGVfbW9kdWxlcy9kb20tZGVsZWdhdG9yL25vZGVfbW9kdWxlcy93ZWFrbWFwLXNoaW0vaGlkZGVuLXN0b3JlLmpzIiwibm9kZV9tb2R1bGVzL2RvbS1kZWxlZ2F0b3IvcHJveHktZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZG9tLWRlbGVnYXRvci9yZW1vdmUtZXZlbnQuanMiLCJub2RlX21vZHVsZXMvZWxlbnBpL3YyLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL2RpZmYuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvYnJvd3Nlci1zcGxpdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvZXYtc3RvcmUvbm9kZV9tb2R1bGVzL2luZGl2aWR1YWwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vbm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS9ub2RlX21vZHVsZXMvaXMtb2JqZWN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL25vZGVfbW9kdWxlcy94LWlzLWFycmF5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3BhdGNoLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vYXBwbHktcHJvcGVydGllcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL2NyZWF0ZS1lbGVtZW50LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vZG9tLWluZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zkb20vcGF0Y2gtb3AuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmRvbS9wYXRjaC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92ZG9tL3VwZGF0ZS13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdmlydHVhbC1oeXBlcnNjcmlwdC9ob29rcy9ldi1ob29rLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaG9va3Mvc29mdC1zZXQtaG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92aXJ0dWFsLWh5cGVyc2NyaXB0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3ZpcnR1YWwtaHlwZXJzY3JpcHQvcGFyc2UtdGFnLmpzIiwibm9kZV9tb2R1bGVzL3ZpcnR1YWwtZG9tL3Zub2RlL2hhbmRsZS10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy10aHVuay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12aG9vay5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy12dGV4dC5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS9pcy13aWRnZXQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdmVyc2lvbi5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92bm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92bm9kZS92cGF0Y2guanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdm5vZGUvdnRleHQuanMiLCJub2RlX21vZHVsZXMvdmlydHVhbC1kb20vdnRyZWUvZGlmZi1wcm9wcy5qcyIsIm5vZGVfbW9kdWxlcy92aXJ0dWFsLWRvbS92dHJlZS9kaWZmLmpzIiwicGxheWdyb3VuZC9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoY0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1WEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7OztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzYUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIiIsIi8qKlxuICogQGF1dGhvciBHaWxsZXMgQ29vbWFuc1xuICogQGxpY2VuY2UgTUlUXG4gKiBAY29weXJpZ2h0IDIwMTYgR2lsbGVzIENvb21hbnNcbiAqIFxuICogU2ltcGxlIHZpcnR1YWwgZG9tIGRpZmZpbmcgKGZpbmFsbHkgcXVpdGUgZmFzdCkgOiBCYXNlZCBvbiA6XG4gKiBodHRwczovL21lZGl1bS5jb20vQGRlYXRobW9vZC9ob3ctdG8td3JpdGUteW91ci1vd24tdmlydHVhbC1kb20tZWU3NGFjYzEzMDYwIy5iYWt1OHZidzhcbiAqIGFuZFxuICogaHR0cHM6Ly9tZWRpdW0uY29tL0BkZWF0aG1vb2Qvd3JpdGUteW91ci12aXJ0dWFsLWRvbS0yLXByb3BzLWV2ZW50cy1hOTU3NjA4ZjVjNzYjLjZzcW1kanV2elxuICpcbiAqIEFkZGVkIDogXG4gKiA9PiBEb2NGcmFnbWVudCBtYW5hZ2VtZW50IChha2Egdm5vZGUgPSB7IHR5cGU6J2ZyYWdtZW50JywgY2hpbGRyZW46Wy4uLl0sIHByb3BzOnt9IH0pIChlLmcgdXNlZnVsIGZvciBjb21wb25lbnQpXG4gKlxuICogTWFpbiBjb2RlIGNoYW5nZSA6IFxuICogPT4gc3RvcmUgZG9tIG5vZGUncyByZWYgaW4gYXNzb2NpYXRlZCB2bm9kZSwgbm8gbW9yZSB1c2Ugb2YgY2hpbGQgaW5kZXhcbiAqID0+IGJldHRlciBldmVudHMgbGlzdGVuZXIgbWFuYWdlbWVudCAoYWx3YXlzIHJlbW92ZSBvbGRzICsgYWRkIG5ld3MpXG4gKlxuICogQHVzYWdlXG4gKiBcdFx0Y29uc3QgZGVhdGhtb29kID0gcmVxdWlyZSgnZGVhdGhtb29kLXZkb20nKSxcbiAqIFx0XHRcdGggPSBkZWF0aG1vb2QuY3JlYXRlVk5vZGU7XG4gKlxuICogXHRcdGZ1bmN0aW9uIHJlbmRlcigpe1xuICogXHRcdFx0cmV0dXJuIGgoJ2ZyYWdtZW50JywgbnVsbCwgW1xuICogXHRcdFx0XHRcdGgoJ2RpdicsIFxuICogXHRcdFx0XHRcdFx0eyBjbGFzc05hbWU6J2ZvbycsIGlkOidiYXInLCBteUF0dHI6J3pvbycgfSwgLy8gYXR0cmlidXRlc1xuICogXHRcdFx0XHRcdFx0WyAvLyBjaGlsZHJlblxuICogXHRcdFx0XHRcdFx0XHRoKCdzcGFuJywgbnVsbCwgWydoZWxsbyB3b3JsZCddKVxuICogXHRcdFx0XHRcdFx0XSxcbiAqIFx0XHRcdFx0XHRcdFsgLy8gZXZlbnRzXG4gKiBcdFx0XHRcdFx0XHRcdHsgXG4gKiBcdFx0XHRcdFx0XHRcdFx0bmFtZTonY2xpY2snLCBcbiAqIFx0XHRcdFx0XHRcdFx0XHRjYWxsYmFjazpmdW5jdGlvbihlKXsgLi4uIH1cbiAqIFx0XHRcdFx0XHRcdFx0fVxuICogXHRcdFx0XHRcdFx0XVxuICogXHRcdFx0XHRcdCksXG4gKiBcdFx0XHRcdFx0aCgnc2VjdGlvbicsIC4uLilcbiAqIFx0XHRcdFx0XHQuLi5cbiAqIFx0XHRcdFx0XSk7XG4gKiBcdFx0fVxuICogXHRcdFxuICogIFx0Ly8gLi4uXG4gKiAgXHR2YXIgb2xkVk5vZGU7XG4gKlx0ICBcdC8vLi4uXG4gKlx0ICBcdHZhciBuZXdWTm9kZSA9IHJlbmRlcigpO1xuICpcdCAgXHRkZWF0aG1vb2QudXBkYXRlKGRvY3VtZW50LmJvZHksIG5ld1ZOb2RlLCBvbGRWTm9kZSk7XG4gKlx0ICBcdG9sZFZOb2RlID0gbmV3Vk5vZGU7XG4gKi9cblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCgkcGFyZW50LCB2bm9kZSkge1xuXHRpZiAodHlwZW9mIHZub2RlLnRleHQgIT09ICd1bmRlZmluZWQnKVxuXHRcdHJldHVybiB2bm9kZS5ub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodm5vZGUudGV4dCk7IC8vIHN0b3JlIHRleHQtbm9kZSBpbiB2bm9kZVxuXHR2YXIgJGVsO1xuXHRpZiAodm5vZGUudHlwZSA9PT0gJ2ZyYWdtZW50Jykge1xuXHRcdHZub2RlLnBhcmVudCA9ICRwYXJlbnQ7IC8vIHN0b3JlIHBhcmVudCBpbiB2bm9kZSwga2VlcCAkcGFyZW50IGFzIHJlY3Vyc2lvbiBwYXJlbnRcblx0XHQkZWwgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XG5cdH0gZWxzZSB7IC8vIGlzIGEgdGFnXG5cdFx0JHBhcmVudCA9IHZub2RlLm5vZGUgPSAkZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHZub2RlLnR5cGUpOyAvLyBzdG9yZSBkb20tbm9kZSBpbiB2bm9kZSwgc2V0IHJlY3Vyc2lvbiBwYXJlbnQgYXMgcHJvZHVjZWQgbm9kZVxuXHRcdHNldExvY2FscygkZWwsIHZub2RlKTsgLy8gc2V0IHByb3BzIGFuZCBsaXN0ZW5lcnNcblx0fVxuXHRmb3IgKHZhciBpID0gMCwgbGVuID0gdm5vZGUuY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbGVuOyArK2kpIC8vIHJlY3Vyc2lvbiBvbiB2bm9kZSBjaGlsZHJlblxuXHRcdCRlbC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KCRwYXJlbnQsIHZub2RlLmNoaWxkcmVuW2ldKSk7XG5cdHJldHVybiAkZWw7IC8vIERvY3VtZW50RnJhZ21lbnQgb3IgRG9tTm9kZVxufVxuXG5mdW5jdGlvbiB1cGRhdGUoJHBhcmVudCwgbmV3Tm9kZSwgb2xkTm9kZSkge1xuXHRpZiAoIW9sZE5vZGUpXG5cdFx0JHBhcmVudC5hcHBlbmRDaGlsZChjcmVhdGVFbGVtZW50KCRwYXJlbnQsIG5ld05vZGUpKTtcblxuXHRlbHNlIGlmICghbmV3Tm9kZSlcblx0XHRyZW1vdmVFbGVtZW50KG9sZE5vZGUpOyAvLyByZW1vdmUgZnJhZ21lbnQgb3Igbm9kZVxuXG5cdGVsc2UgaWYgKGNoYW5nZWQobmV3Tm9kZSwgb2xkTm9kZSkpIHtcblx0XHQvLyAodm5vZGUgdHlwZSBvciB0ZXh0IHZhbHVlKSBoYXMgY2hhbmdlZFxuXHRcdCRwYXJlbnQuaW5zZXJ0QmVmb3JlKGNyZWF0ZUVsZW1lbnQoJHBhcmVudCwgbmV3Tm9kZSksIGZpcnN0RWxlbWVudChvbGROb2RlKSk7XG5cdFx0cmVtb3ZlRWxlbWVudChvbGROb2RlKTsgLy8gcmVtb3ZlIGZyYWdtZW50IG9yIG5vZGVcblxuXHR9IGVsc2UgaWYgKG5ld05vZGUudHlwZSkgLy8gaXMgbm90IGEgdGV4dCBub2RlLCBubyB0eXBlIGNoYW5nZVxuXHRcdHVwZGF0ZUVsZW1lbnQobmV3Tm9kZSwgb2xkTm9kZSk7XG5cblx0ZWxzZSB7IC8vIGlzIGEgdGV4dCBub2RlXG5cdFx0bmV3Tm9kZS5ub2RlID0gb2xkTm9kZS5ub2RlOyAvLyBmb3J3YXJkIGRvbSBub2RlIHRvIG5ldyB2bm9kZVxuXHRcdG9sZE5vZGUubm9kZSA9IG51bGw7IC8vIGhlbHAgR0Ncblx0fVxufVxuXG5mdW5jdGlvbiB1cGRhdGVFbGVtZW50KG5ld05vZGUsIG9sZE5vZGUpIHtcblx0dmFyIHN1YlBhcmVudDtcblx0aWYgKG5ld05vZGUudHlwZSAhPT0gJ2ZyYWdtZW50JykgeyAvLyBpcyBhIHRhZ1xuXHRcdC8vIHVwZGF0ZSBwcm9wcyBhbmQgbGlzdGVuZXJzXG5cdFx0dXBkYXRlTG9jYWxzKG9sZE5vZGUubm9kZSwgbmV3Tm9kZSwgb2xkTm9kZSk7XG5cdFx0Ly8gZm9yd2FyZCBub2RlIHRvIG5ldyB2ZG9tLCBzZXQgc3VicGFyZW50IGFzIHRhZydzIG5vZGUgKHNvIG5vcm1hbCByZWN1cnNpb24pXG5cdFx0c3ViUGFyZW50ID0gbmV3Tm9kZS5ub2RlID0gb2xkTm9kZS5ub2RlO1xuXHRcdG9sZE5vZGUubm9kZSA9IG51bGw7IC8vIGhlbHAgR0Ncblx0fSBlbHNlIHsgLy8gaXMgZnJhZ21lbnQgOiBmb3J3YXJkIHBhcmVudCBpbiBuZXcgdm5vZGUsIHNldCBzdWJQYXJlbnQgYXMgJHBhcmVudCAodHJhbnNwYXJlbnQgcmVjdXJzaW9uKVxuXHRcdHN1YlBhcmVudCA9IG5ld05vZGUucGFyZW50ID0gb2xkTm9kZS5wYXJlbnQ7XG5cdFx0Ly8gb2xkTm9kZS5wYXJlbnQgPSBudWxsOyAvLyBoZWxwIEdDXG5cdH1cblx0Y29uc3QgbGVuID0gTWF0aC5tYXgobmV3Tm9kZS5jaGlsZHJlbi5sZW5ndGgsIG9sZE5vZGUuY2hpbGRyZW4ubGVuZ3RoKTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcblx0XHR1cGRhdGUoc3ViUGFyZW50LCBuZXdOb2RlLmNoaWxkcmVuW2ldLCBvbGROb2RlLmNoaWxkcmVuW2ldKTtcblx0b2xkTm9kZS5jaGlsZHJlbiA9IG51bGw7IC8vIGhlbHAgR0Ncblx0b2xkTm9kZS5wcm9wcyA9IG51bGw7XG5cdG9sZE5vZGUub24gPSBudWxsO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVMb2NhbHMoJHRhcmdldCwgbmV3Tm9kZSwgb2xkTm9kZSkge1xuXHR2YXIgcHJvcHMgPSBhc3NpZ24oe30sIG5ld05vZGUucHJvcHMsIG9sZE5vZGUucHJvcHMpO1xuXHRmb3IgKHZhciBpIGluIHByb3BzKVxuXHRcdHVwZGF0ZVByb3AoJHRhcmdldCwgaSwgbmV3Tm9kZS5wcm9wc1tpXSwgb2xkTm9kZS5wcm9wc1tpXSk7XG5cdC8vIHJlbW92ZSBhbGwgb2xkcyBhbmQgYWRkIGFsbCBuZXdzIGV2ZW50cyBsaXN0ZW5lciA6IG5vdCByZWFsbHkgcGVyZm9ybWFuY2Ugb3JpZW50ZWQgXG5cdC8vIGJ1dCBkbyB0aGUgam9iIGZvciBtdWx0aXBsZSBldmVudHMgaGFuZGxlciB3aXRoIHNhbWUgbmFtZSAoYWthIGNsaWNrKVxuXHRpZiAob2xkTm9kZS5vbilcblx0XHRvbGROb2RlLm9uLmZvckVhY2goZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdCR0YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudC5uYW1lLCBldmVudC5jYWxsYmFjayk7XG5cdFx0fSk7XG5cdGlmIChuZXdOb2RlLm9uKVxuXHRcdG5ld05vZGUub24uZm9yRWFjaChmdW5jdGlvbihldmVudCkge1xuXHRcdFx0JHRhcmdldC5hZGRFdmVudExpc3RlbmVyKGV2ZW50Lm5hbWUsIGV2ZW50LmNhbGxiYWNrKTtcblx0XHR9KTtcbn1cblxuZnVuY3Rpb24gc2V0TG9jYWxzKCR0YXJnZXQsIG5vZGUpIHtcblx0Zm9yICh2YXIgaSBpbiBub2RlLnByb3BzKVxuXHRcdHNldFByb3AoJHRhcmdldCwgaSwgbm9kZS5wcm9wc1tpXSk7XG5cdGlmIChub2RlLm9uKVxuXHRcdGZvciAodmFyIGkgPSAwLCBsZW4gPSBub2RlLm9uLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxuXHRcdFx0JHRhcmdldC5hZGRFdmVudExpc3RlbmVyKG5vZGUub25baV0ubmFtZSwgbm9kZS5vbltpXS5jYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUVsZW1lbnQodm5vZGUpIHtcblx0aWYgKHZub2RlLnR5cGUgIT09ICdmcmFnbWVudCcpXG5cdFx0dm5vZGUubm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHZub2RlLm5vZGUpO1xuXHRlbHNlXG5cdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHZub2RlLmNoaWxkcmVuLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxuXHRcdFx0cmVtb3ZlRWxlbWVudCh2bm9kZS5jaGlsZHJlbltpXSk7XG59XG5cbmZ1bmN0aW9uIGZpcnN0RWxlbWVudCh2bm9kZSkge1xuXHRpZiAodm5vZGUudHlwZSAhPT0gJ2ZyYWdtZW50Jylcblx0XHRyZXR1cm4gdm5vZGUubm9kZTtcblx0cmV0dXJuIGZpcnN0RWxlbWVudCh2bm9kZS5jaGlsZHJlblswXSk7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZWQobm9kZTEsIG5vZGUyKSB7XG5cdHJldHVybiBub2RlMS50eXBlICE9PSBub2RlMi50eXBlIHx8IG5vZGUxLnRleHQgIT09IG5vZGUyLnRleHQ7XG59XG5cbmZ1bmN0aW9uIHNldFByb3AoJHRhcmdldCwgbmFtZSwgdmFsdWUpIHtcblx0aWYgKG5hbWUgPT09ICdjbGFzc05hbWUnKVxuXHRcdCR0YXJnZXQuc2V0QXR0cmlidXRlKCdjbGFzcycsIHZhbHVlKTtcblx0ZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpXG5cdFx0c2V0Qm9vbGVhblByb3AoJHRhcmdldCwgbmFtZSwgdmFsdWUpO1xuXHRlbHNlXG5cdFx0JHRhcmdldC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xufVxuXG5mdW5jdGlvbiBzZXRCb29sZWFuUHJvcCgkdGFyZ2V0LCBuYW1lLCB2YWx1ZSkge1xuXHRpZiAodmFsdWUpIHtcblx0XHQkdGFyZ2V0LnNldEF0dHJpYnV0ZShuYW1lLCB2YWx1ZSk7XG5cdFx0JHRhcmdldFtuYW1lXSA9IHRydWU7XG5cdH0gZWxzZVxuXHRcdCR0YXJnZXRbbmFtZV0gPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlQm9vbGVhblByb3AoJHRhcmdldCwgbmFtZSkge1xuXHQkdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcblx0JHRhcmdldFtuYW1lXSA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVQcm9wKCR0YXJnZXQsIG5hbWUsIHZhbHVlKSB7XG5cdGlmIChuYW1lID09PSAnY2xhc3NOYW1lJylcblx0XHQkdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZSgnY2xhc3MnKTtcblx0ZWxzZSBpZiAodHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbicpXG5cdFx0cmVtb3ZlQm9vbGVhblByb3AoJHRhcmdldCwgbmFtZSk7XG5cdGVsc2Vcblx0XHQkdGFyZ2V0LnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlUHJvcCgkdGFyZ2V0LCBuYW1lLCBuZXdWYWwsIG9sZFZhbCkge1xuXHRpZiAoIW5ld1ZhbClcblx0XHRyZW1vdmVQcm9wKCR0YXJnZXQsIG5hbWUsIG9sZFZhbCk7XG5cdGVsc2UgaWYgKCFvbGRWYWwgfHwgbmV3VmFsICE9PSBvbGRWYWwpXG5cdFx0c2V0UHJvcCgkdGFyZ2V0LCBuYW1lLCBuZXdWYWwpO1xufVxuXG4vLyBPYmplY3QuYXNzaWduIGltbWl0YXRpb24gKG9ubHkgZm9yIDEgb3IgMiBhcmd1bWVudHMgYXMgbmVlZGVkIGhlcmUpXG5mdW5jdGlvbiBhc3NpZ24oJHJvb3QsIG9iaiwgb2JqMikge1xuXHRmb3IgKHZhciBpIGluIG9iailcblx0XHQkcm9vdFtpXSA9IG9ialtpXTtcblx0Zm9yICh2YXIgaSBpbiBvYmoyKVxuXHRcdCRyb290W2ldID0gb2JqMltpXTtcblx0cmV0dXJuICRyb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0Y3JlYXRlVk5vZGU6IGZ1bmN0aW9uKHR5cGUsIHByb3BzLCBjaGlsZHJlbiwgZXZlbnRzKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHR5cGU6IHR5cGUsXG5cdFx0XHRwcm9wczogcHJvcHMgfHwge30sXG5cdFx0XHRjaGlsZHJlbjogY2hpbGRyZW4gfHwgW10sXG5cdFx0XHRvbjogZXZlbnRzIHx8IG51bGxcblx0XHR9O1xuXHR9LFxuXHR1cGRhdGU6IHVwZGF0ZSxcblx0Zmlyc3RFbGVtZW50OiBmaXJzdEVsZW1lbnRcbn07IiwidmFyIGRlYXRobW9vZCA9IHJlcXVpcmUoJy4vZGVhdGhtb29kLXZkb20nKSxcblx0QmFiZWx1dGUgPSByZXF1aXJlKCcuLi9saWIvYmFiZWx1dGUnKSxcblx0U3RhdGUgPSByZXF1aXJlKCcuL3ZpZXctc3RhdGUnKTtcblxucmVxdWlyZSgnLi4vbGFuZ3VhZ2VzL2h0bWwnKTtcblxuQmFiZWx1dGUudG9MZXhpYygnaHRtbCcsICd2aWV3Jylcblx0LnRvQWN0aW9ucygnaHRtbDpkZWF0aG1vb2QnLCB7XG5cdFx0dmlldzogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLyogb3B0cyAqLyAsIGVudikge1xuXHRcdFx0dmFyIHN0YXRlO1xuXHRcdFx0Y29uc3Qgb3B0cyA9IGFyZ3NbMF0sXG5cdFx0XHRcdGZyYWcgPSB7XG5cdFx0XHRcdFx0dHlwZTogJ2ZyYWdtZW50Jyxcblx0XHRcdFx0XHRwcm9wczoge30sXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRkb1JlbmRlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciB2bm9kZSA9IHtcblx0XHRcdFx0XHRcdHR5cGU6ICdmcmFnbWVudCcsXG5cdFx0XHRcdFx0XHRwcm9wczoge30sXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRvcHRzLnJlbmRlcihzdGF0ZSkuJG91dHB1dChlbnYsIHZub2RlKTtcblx0XHRcdFx0XHRpZiAoZnJhZy5wYXJlbnQpXG5cdFx0XHRcdFx0XHRkZWF0aG1vb2QudXBkYXRlKGZyYWcucGFyZW50LCB2bm9kZSwgZnJhZyk7XG5cdFx0XHRcdFx0ZnJhZy5jaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9SZW5kZXIpO1xuXHRcdFx0XHR9O1xuXHRcdFx0dm5vZGUuY2hpbGRyZW4ucHVzaChmcmFnKTtcblx0XHRcdHN0YXRlID0gbmV3IFN0YXRlKG9wdHMuZ2V0SW5pdGlhbFN0YXRlID8gb3B0cy5nZXRJbml0aWFsU3RhdGUoKSA6IHt9LCByZW5kZXIpO1xuXHRcdFx0ZG9SZW5kZXIoKTtcblx0XHR9LFxuXHRcdHRhZzogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLypuYW1lLCBiYWJlbHV0ZXMqLyAsIGVudikge1xuXHRcdFx0Y29uc3QgdGFnID0ge1xuXHRcdFx0XHR0eXBlOiBhcmdzWzBdLFxuXHRcdFx0XHRwcm9wczoge30sXG5cdFx0XHRcdGNoaWxkcmVuOiBbXVxuXHRcdFx0fTtcblx0XHRcdHZub2RlLmNoaWxkcmVuLnB1c2godGFnKTtcblx0XHRcdGFyZ3NbMV0uZm9yRWFjaChmdW5jdGlvbih0ZW1wbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHRlbXBsID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGlmICh0ZW1wbC5fX2JhYmVsdXRlX18pIHtcblx0XHRcdFx0XHR0ZW1wbC4kb3V0cHV0KGVudiwgdGhpcyk7XG5cdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdHRoaXMuY2hpbGRyZW4ucHVzaCh7XG5cdFx0XHRcdFx0XHR0ZXh0OiB0ZW1wbCArICcnXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHR9LCB0YWcpO1xuXHRcdH0sXG5cdFx0YXR0cjogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLyogbmFtZSwgdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wc1thcmdzWzBdXSA9IGFyZ3NbMV07XG5cdFx0fSxcblx0XHRwcm9wOiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiBuYW1lLCBmbGFnICovICkge1xuXHRcdFx0dm5vZGUucHJvcHNbYXJnc1swXV0gPSBhcmdzWzFdO1xuXHRcdH0sXG5cdFx0Y2xhc3M6IGZ1bmN0aW9uKHZub2RlLCBhcmdzIC8qIG5hbWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wcy5jbGFzc05hbWUgPSAodm5vZGUucHJvcHMuY2xhc3NOYW1lIHx8ICcnKSArICcgJyArIGFyZ3NbMF07XG5cdFx0fSxcblx0XHRpZDogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wcy5pZCA9IGFyZ3NbMF07XG5cdFx0fSxcblx0XHR0ZXh0OiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHRcdHZub2RlLmNoaWxkcmVuLnB1c2goe1xuXHRcdFx0XHR0ZXh0OiBhcmdzWzBdXG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdG9uOiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiBldmVudCwgY2FsbGJhY2sgKi8gKSB7XG5cdFx0XHR2bm9kZS5vbiA9IHZub2RlLm9uIHx8IFtdO1xuXHRcdFx0dm5vZGUub24ucHVzaCh7XG5cdFx0XHRcdG5hbWU6IGFyZ3NbMF0sXG5cdFx0XHRcdGNhbGxiYWNrOiBhcmdzWzFdXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0pO1xuXG5CYWJlbHV0ZS5wcm90b3R5cGUuJGh0bWxUb0RlYXRobW9vZCA9IGZ1bmN0aW9uKG5vZGUsIG9sZEZyYWdtZW50KSB7XG5cdHZhciBmcmFnID0ge1xuXHRcdFx0dHlwZTogJ2ZyYWdtZW50Jyxcblx0XHRcdHByb3BzOiB7fSxcblx0XHRcdGNoaWxkcmVuOiBbXVxuXHRcdH0sXG5cdFx0c2VsZiA9IHRoaXM7XG5cdHNlbGYuJG91dHB1dCgnaHRtbDpkZWF0aG1vb2QnLCBmcmFnKTtcblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZ1bmN0aW9uKCkge1xuXHRcdGRlYXRobW9vZC51cGRhdGUobm9kZSwgZnJhZywgb2xkRnJhZ21lbnQpO1xuXHR9KTtcblx0cmV0dXJuIGZyYWc7XG59O1xuXG4vLyIsImNvbnN0IEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vbGliL2JhYmVsdXRlJyksXG5cdFN0YXRlID0gcmVxdWlyZSgnLi92aWV3LXN0YXRlJyksXG5cdHZoID0gcmVxdWlyZSgndmlydHVhbC1kb20vaCcpLFxuXHRkaWZmID0gcmVxdWlyZSgndmlydHVhbC1kb20vZGlmZicpLFxuXHRwYXRjaCA9IHJlcXVpcmUoJ3ZpcnR1YWwtZG9tL3BhdGNoJyksXG5cdGNyZWF0ZUVsZW1lbnQgPSByZXF1aXJlKCd2aXJ0dWFsLWRvbS9jcmVhdGUtZWxlbWVudCcpO1xuXG5yZXF1aXJlKCcuLi9sYW5ndWFnZXMvaHRtbCcpO1xuY29uc3QgaHAgPSBCYWJlbHV0ZS5pbml0aWFsaXplcignaHRtbCcpO1xuXG4vKipcbiAqIEZvciBldi0qIG1hbmFnZW1lbnQgZnJvbSB2aXJ0dWFsZG9tXG4gKi9cbmNvbnN0IERlbGVnYXRvciA9IHJlcXVpcmUoXCJkb20tZGVsZWdhdG9yXCIpLFxuXHRkZWwgPSBEZWxlZ2F0b3IoKTtcblxuLyoqXG4gKiB2ZG9tIGFjdGlvbnNcbiAqL1xuQmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIFsndmlldyddKVxuXHQudG9BY3Rpb25zKCdodG1sOnZkb20nLCB7XG5cdFx0X19yZXN0cmljdGlvbnNfXzoge1xuXHRcdFx0aHRtbDogdHJ1ZSxcblx0XHRcdCdodG1sOnZkb20nOiB0cnVlXG5cdFx0fSxcblx0XHR2aWV3OiBmdW5jdGlvbih2bm9kZSwgYXJncywgZW52KSB7XG5cdFx0XHR2YXIgb3B0cyA9IGFyZ3NbMF0sXG5cdFx0XHRcdG9sZFRyZWUsXG5cdFx0XHRcdHJvb3ROb2RlLFxuXHRcdFx0XHRzdGF0ZSxcblx0XHRcdFx0ZG9SZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgZGVzY3JpcHRvciA9IHtcblx0XHRcdFx0XHRcdFx0cHJvcGVydGllczoge30sXG5cdFx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcblx0XHRcdFx0XHRcdFx0c2VsZWN0b3I6ICcnXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0b3V0cHV0QmFiZWx1dGUgPSBvcHRzLnJlbmRlcihzdGF0ZSk7XG5cblx0XHRcdFx0XHQvLyByZW5kZXIgbmV3IG5vZGVzXG5cdFx0XHRcdFx0b3V0cHV0QmFiZWx1dGUuJG91dHB1dChlbnYsIGRlc2NyaXB0b3IpO1xuXHRcdFx0XHRcdHZhciB0cmVlID0gdmgoJ2RpdicsIGRlc2NyaXB0b3IucHJvcGVydGllcywgZGVzY3JpcHRvci5jaGlsZHJlbik7XG5cblx0XHRcdFx0XHRpZiAoIXJvb3ROb2RlKSB7IC8vIGZpcnN0IHJlbmRlclxuXHRcdFx0XHRcdFx0cm9vdE5vZGUgPSBjcmVhdGVFbGVtZW50KHRyZWUpO1xuXHRcdFx0XHRcdFx0bm9kZS5hcHBlbmRDaGlsZChyb290Tm9kZSk7XG5cdFx0XHRcdFx0fSBlbHNlIHsgLy8gcmVyZW5kZXJcblx0XHRcdFx0XHRcdHZhciBwYXRjaGVzID0gZGlmZihvbGRUcmVlLCB0cmVlKTtcblx0XHRcdFx0XHRcdHJvb3ROb2RlID0gcGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRvbGRUcmVlID0gdHJlZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0cmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKGRvUmVuZGVyKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0c3RhdGUgPSBuZXcgU3RhdGUob3B0cy5nZXRJbml0aWFsU3RhdGUgPyBvcHRzLmdldEluaXRpYWxTdGF0ZSgpIDoge30sIHJlbmRlcik7XG5cblx0XHRcdGRvUmVuZGVyKCk7XG5cdFx0fSxcblx0XHR0YWc6IGZ1bmN0aW9uKHZub2RlLCBhcmdzIC8qIHRhZ05hbWUsIGJhYmVsdXRlcyAqLyAsIGVudikge1xuXHRcdFx0dmFyIGRlc2NyaXB0b3IgPSB7XG5cdFx0XHRcdHByb3BlcnRpZXM6IHt9LFxuXHRcdFx0XHRjaGlsZHJlbjogW10sXG5cdFx0XHRcdHNlbGVjdG9yOiAnJ1xuXHRcdFx0fTtcblx0XHRcdGFyZ3NbMV0uZm9yRWFjaChmdW5jdGlvbih0ZW1wbCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIHRlbXBsID09PSAndW5kZWZpbmVkJylcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdGlmICh0ZW1wbC5fX2JhYmVsdXRlX18pXG5cdFx0XHRcdFx0dGVtcGwuJG91dHB1dChlbnYsIGRlc2NyaXB0b3IpO1xuXHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0ZGVzY3JpcHRvci5jaGlsZHJlbi5wdXNoKHRlbXBsKTsgLy8gYXV0byBlc2NhcGVkIHdoZW4gYWRkZWQgdG8gZG9tLlxuXHRcdFx0fSk7XG5cdFx0XHR2YXIgdGFnID0gdmgoYXJnc1swXSArIGRlc2NyaXB0b3Iuc2VsZWN0b3IsIGRlc2NyaXB0b3IucHJvcGVydGllcywgZGVzY3JpcHRvci5jaGlsZHJlbik7XG5cdFx0XHR2bm9kZS5jaGlsZHJlbi5wdXNoKHRhZyk7XG5cdFx0fSxcblx0XHR0ZXh0OiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHRcdHZub2RlLmNoaWxkcmVuLnB1c2goYXJnc1swXSk7XG5cdFx0fSxcblx0XHRjbGFzczogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLyogY2xhc3NOYW1lICovICkge1xuXHRcdFx0dm5vZGUucHJvcGVydGllcy5zZWxlY3RvciArPSAnLicgKyBhcmdzWzBdO1xuXHRcdH0sXG5cdFx0YXR0cjogZnVuY3Rpb24odm5vZGUsIGFyZ3MgLyogbmFtZSwgdmFsdWUgKi8gKSB7XG5cdFx0XHR2bm9kZS5wcm9wZXJ0aWVzW2FyZ3NbMF1dID0gYXJnc1sxXTtcblx0XHR9LFxuXHRcdGlkOiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHRcdHZub2RlLnByb3BlcnRpZXMuc2VsZWN0b3IgKz0gJyMnICsgYXJnc1swXTtcblx0XHR9LFxuXHRcdG9uOiBmdW5jdGlvbih2bm9kZSwgYXJncyAvKiBldmVudE5hbWUsIGNhbGxiYWNrICovICkge1xuXHRcdFx0dm5vZGUucHJvcGVydGllc1snZXYtJyArIGFyZ3NbMF1dID0gYXJnc1sxXTtcblx0XHR9XG5cdH0pO1xuXG5CYWJlbHV0ZS5wcm90b3R5cGUuJGh0bWxUb1ZET00gPSBmdW5jdGlvbihwYXJlbnQsIG9sZFRyZWUpIHtcblx0dmFyIGRlc2NyaXB0b3IgPSB7XG5cdFx0cHJvcGVydGllczoge30sXG5cdFx0Y2hpbGRyZW46IFtdLFxuXHRcdHNlbGVjdG9yOiAnJ1xuXHR9O1xuXHR0aGlzLiRvdXRwdXQoJ2h0bWw6dmRvbScsIGRlc2NyaXB0b3IpO1xuXHR2YXIgdHJlZSA9IHZoKCdkaXYnLCBkZXNjcmlwdG9yLnByb3BlcnRpZXMsIGRlc2NyaXB0b3IuY2hpbGRyZW4pO1xuXHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFvbGRUcmVlKSB7IC8vIGZpcnN0IHJlbmRlclxuXHRcdFx0dHJlZS5yb290Tm9kZSA9IGNyZWF0ZUVsZW1lbnQodHJlZSk7XG5cdFx0XHRwYXJlbnQuYXBwZW5kQ2hpbGQodHJlZS5yb290Tm9kZSk7XG5cdFx0fSBlbHNlIHsgLy8gcmVyZW5kZXJcblx0XHRcdHRyZWUucm9vdE5vZGUgPSBvbGRUcmVlLnJvb3ROb2RlO1xuXHRcdFx0dmFyIHBhdGNoZXMgPSBkaWZmKG9sZFRyZWUsIHRyZWUpO1xuXHRcdFx0dHJlZS5yb290Tm9kZSA9IHBhdGNoKHRyZWUucm9vdE5vZGUsIHBhdGNoZXMpO1xuXHRcdH1cblx0fSk7XG5cdHJldHVybiB0cmVlO1xufTsiLCIvKipcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnNcbiAqIEBsaWNlbmNlIE1JVFxuICogQGNvcHlyaWdodCAyMDE2IEdpbGxlcyBDb29tYW5zXG4gKi9cblxudmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vbGliL2JhYmVsdXRlJyksXG5cdFN0YXRlID0gcmVxdWlyZSgnLi92aWV3LXN0YXRlJyk7XG5cbnJlcXVpcmUoJy4uL2xhbmd1YWdlcy9odG1sJyk7XG5cbkJhYmVsdXRlLnRvTGV4aWMoJ2h0bWwnLCBbJ3ZpZXcnXSlcblx0LnRvQWN0aW9ucygnaHRtbDpkb20nLCB7XG5cdFx0dmlldzogZnVuY3Rpb24obm9kZSwgYXJncywgZW52KSB7XG5cdFx0XHR2YXIgcmVuZGVyZWQsXG5cdFx0XHRcdHN0YXRlO1xuXHRcdFx0Y29uc3Qgb3B0cyA9IGFyZ3NbMF0sXG5cdFx0XHRcdGRvUmVuZGVyID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y29uc3QgZnJhZyA9IG5ldyBEb2N1bWVudEZyYWdtZW50KCksXG5cdFx0XHRcdFx0XHRvdXRwdXRCYWJlbHV0ZSA9IG9wdHMucmVuZGVyKHN0YXRlKTtcblx0XHRcdFx0XHR2YXIgbmV4dFNpYmxpbmc7XG5cblx0XHRcdFx0XHRpZiAocmVuZGVyZWQpIHtcblx0XHRcdFx0XHRcdC8vIGtlZXAgdHJhY2sgb2YgbmV4dFNpYmxpbmdcblx0XHRcdFx0XHRcdG5leHRTaWJsaW5nID0gcmVuZGVyZWRbcmVuZGVyZWQubGVuZ3RoIC0gMV0ubmV4dFNpYmxpbmc7XG5cdFx0XHRcdFx0XHQvLyByZW1vdmUgcHJldmlvdXNseSByZW5kZXJlZCBub2Rlc1xuXHRcdFx0XHRcdFx0cmVuZGVyZWQuZm9yRWFjaChub2RlLnJlbW92ZUNoaWxkLCBub2RlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gcmVuZGVyIG5ldyBub2Rlc1xuXHRcdFx0XHRcdG91dHB1dEJhYmVsdXRlLiRvdXRwdXQoZW52LCBmcmFnKTtcblxuXHRcdFx0XHRcdC8vIGNvcHkgY2hpbGRyZW4gYW5kIGluc2VydCBuZXcgbm9kZXNcblx0XHRcdFx0XHRyZW5kZXJlZCA9IFtdLnNsaWNlLmNhbGwoZnJhZy5jaGlsZHJlbik7XG5cdFx0XHRcdFx0bm9kZS5pbnNlcnRCZWZvcmUoZnJhZywgbmV4dFNpYmxpbmcpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRyZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZG9SZW5kZXIpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRzdGF0ZSA9IG5ldyBTdGF0ZShvcHRzLmdldEluaXRpYWxTdGF0ZSA/IG9wdHMuZ2V0SW5pdGlhbFN0YXRlKCkgOiB7fSwgcmVuZGVyKTtcblx0XHRcdGRvUmVuZGVyKCk7XG5cdFx0fVxuXHR9KVxuXHQudG9BY3Rpb25zKCdodG1sOnN0cmluZycsIHtcblx0XHR2aWV3OiBmdW5jdGlvbihkZXNjcmlwdG9yLCBhcmdzLCBlbnYpIHtcblx0XHRcdGNvbnN0IG9wdHMgPSBhcmdzWzBdO1xuXHRcdFx0b3B0cy5yZW5kZXIobmV3IFN0YXRlKG9wdHMuZ2V0SW5pdGlhbFN0YXRlID8gb3B0cy5nZXRJbml0aWFsU3RhdGUoKSA6IHt9KSkuJG91dHB1dChlbnYsIGRlc2NyaXB0b3IpO1xuXHRcdH1cblx0fSk7IiwiLyoqXG4gKiBWaWV3IHN0YXRlXG4gKi9cbmZ1bmN0aW9uIFN0YXRlKHN0YXRlLCByZW5kZXIpIHtcblx0dGhpcy5yZW5kZXIgPSByZW5kZXI7XG5cdGZvciAodmFyIGkgaW4gc3RhdGUpXG5cdFx0dGhpc1tpXSA9IHN0YXRlW2ldO1xufVxuXG5TdGF0ZS5wcm90b3R5cGUgPSB7XG5cdHNldDogZnVuY3Rpb24ocGF0aCwgdmFsdWUpIHtcblx0XHR2YXIgY2hhbmdlZCA9IGZhbHNlO1xuXHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG5cdFx0XHRmb3IgKHZhciBpIGluIHBhdGgpXG5cdFx0XHRcdGlmICh0aGlzW2ldICE9PSBwYXRoW2ldKSB7XG5cdFx0XHRcdFx0Y2hhbmdlZCA9IHRydWU7XG5cdFx0XHRcdFx0dGhpc1tpXSA9IHBhdGhbaV07XG5cdFx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHRoaXNbcGF0aF0gIT09IHZhbHVlKSB7XG5cdFx0XHRjaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdHRoaXNbcGF0aF0gPSB2YWx1ZTtcblx0XHR9XG5cdFx0aWYgKGNoYW5nZWQpXG5cdFx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHR0b2dnbGU6IGZ1bmN0aW9uKHBhdGgpIHtcblx0XHR0aGlzW3BhdGhdID0gIXRoaXNbcGF0aF07XG5cdFx0dGhpcy5yZW5kZXIoKTtcblx0fSxcblx0cHVzaDogZnVuY3Rpb24ocGF0aCwgdmFsdWUpIHt9LFxuXHRwb3A6IGZ1bmN0aW9uKHBhdGgsIHZhbHVlKSB7fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdGF0ZTsiLCIvKipcbiAqIEJhYmVsdXRlLlxuICogSmF2YXNjcmlwdCBJbnRlcm5hbCBEU01NIEZyYW1ld29yay5cbiAqIE1ldGhvZCBjaGFpbmluZyBhcHBsaWNhdGlvbnMgdG8gVGVtcGxhdGluZyBhbmQgSW50ZXJuYWwgRG9tYWluIFNwZWNpZmljIChNdWx0aSlNb2RlbGluZy5cbiAqIEFrYSBkZW1vbnN0cmF0aW9uIHRoYXQgZXZlcnl0aGluZyBpcyBhYm91dCBsYW5ndWFnZXMuXG4gKiBcbiAqIERvbWFpbiBMYW5ndWFnZSAoTXVsdGkpTW9kZWxpbmcgc29sdmVzIG1hbnkgc29mdHdhcmUgZGVzaWduIHByb2JsZW1zLlxuICogRnJvbSBkZXZlbG9wcGVtZW50IHByb2Nlc3MgKGhvdyB0byBzdGFydCwgd2hhdCBhbmQgaG93IHRvIGRlc2lnbiwgaG93IHRvIGl0ZXJhdGUsIC4uLikgXG4gKiB0byBob3cgdG8gdW5kZXJzdGFuZCwgZGVzaWduIGFuZCBhcnRpY3VsYXRlIGJ1c2luZXNzIHJlbGF0ZWQgcHJvYmxlbXMgYW5kL29yIHB1cmUgY29kZSBsb2dpY3MuXG4gKiBcbiAqIEl0IHByb3ZpZGVzIG5hdHVyYWwgd2F5cyBvZiB0aGlua2luZyBtb2RlbHMgYW5kIGNvZGUgdGhhdCBhcmUgcmVhbGx5IGNsb3NlIHRvIGhvdyBodW1hbiBtaW5kIFxuICogd29ya3MuIE11Y2ggbXVjaCBtb3JlIGNsb3NlIHRoYW4gT09QIChpbmNsdWRpbmcgQU9QKSBpcy5cbiAqXG4gKiBCYWJlbHV0ZSBnaXZlcyBlbGVnYW50IGFuZCByZWFsbHkgc2ltcGxlIHdheXMgdG8gZGVmaW5lL2hhbmRsZS91c2UvdHJhbnNmb3JtIGNoYWluYWJsZSBtZXRob2RzXG4gKiBpbiBwdXJlIGphdmFzY3JpcHQgb3IgdGhyb3VnaCBpdCdzIG93biBzaW1wbGUgZXh0ZXJuYWwgRFNMIChhIG1pbmltYWxpc3Qgb3B0aW1hbCBzdHJpbmcgcmVwcmVzZW50YXRpb24gXG4gKiBvZiBjYWxsIGNoYWlucyBmb3IgYmFiZWx1dGUgc2VudGVuY2VzIHNlcmlhbGlzYXRpb24pLlxuICogXG4gKiBJdCByZWxheXMgZW50aWVybHkgb24gTWV0aG9kIENoYWluaW5nIHBzZXVkbyBkZXNpZ24gcGF0dGVybi5cbiAqIEluIGNvbnNlcXVlbmNlLCBpdCdzIG1hZGUgd2l0aCByZWFsbHkgZmV3IGNvZGUsIGFuZCBpcyByZWFsbHkgbGlnaHQgKGxlc3MgdGhhbiAya28gZ3ppcC9taW4gd2l0aG91dCBvd24gXG4gKiBleHRlcm5hbCBEU0wgcGFyc2VyIC0gd2hpY2ggaXMgYWxzbyByZWFsbHkgbGlnaHQgKCstIDFrbyBnemlwL21pbikgYW5kIG1hZGUgd2l0aCBpdHMgZGVkaWNhdGVkIEZsdWVudCBJbnRlcmZhY2UpXG4gKlxuICogQmFiZWx1dGUncyBwYXJzaW5nIGFuZCBvdXRwdXQgYXJlIGJvdGggcmVhbGx5IGZhc3QuIFxuICpcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnNcbiAqIEBsaWNlbmNlIE1JVFxuICogQGNvcHlyaWdodCAyMDE2IEdpbGxlcyBDb29tYW5zXG4gKi9cblxuXG4vKipcbiAqIFRvZG8gOlxuICpcbiAqIFx0XHRkZWJ1ZyB0cmFuc2xhdGlvbiBcdFx0XHRcdE9LXG4gKlxuICogXHRcdF9hcHBlbmQgOiBzaG91bGQgYWRkIGxleGljTmFtZSA6IFx0XHRPS1xuICpcbiAqIFx0XHRvbiBhZGQgdG8gbGV4aWMobGV4aWNOYW1lKSA6ICAgICAgPT0+IFx0T0sgXG4gKiBcdFx0Zmlyc3QgdGltZSA6IGNyZWF0ZSBpbW1lZGlhdGx5IEJhYmVsdXRlIGNoaWxkcmVuIGNsYXNzXG4gKiBcdFx0YWZ0ZXIgOiBtb2RpZnkgZXhpc3RpbmcgcHJvdG90eXBlcyAoYmFiZWx1dGUsIGRvY3MsIGFuZCBkb3RoYXQgaWYgYW55KSBpbiBwbGFjZSBvZiBjbGVhcmluZyBjYWNoZVxuICpcbiAqIFx0XHQ9PT4gc2FtZSB0aGluZyB3aGVuIGV4dGVuZGluZyBsZXhpYyA6IHVzZSBpbmhlcml0YW5jZSB0byBrZWVwIHRyYWNraW5nIG9mIHBhcmVudCBwcm90b3R5cGUgICAgXHQ9PT4gXHRPS1xuICpcbiAqIFx0XHRzY29wZWQgbGV4aWNzIG1hbmFnZW1lbnQgb24gc3RyaW5naWZ5ICBcdFx0XHRcdE9LXG4gKiBcdFx0XG4gKiBcdFx0bWFuYWdlIHJlc3RyaWN0aW9ucyB3aXRoIG1peGlucyB3aGVuIGV4dGVuZGluZyBMZXhpY3MvQWN0aW9ucy9BUEkgIFx0XHRcdFx0XHRPS1xuICpcbiAqXHRcdHNjb3BlIG1hbmFnZW1lbnRcbiAqXHRcdFx0dXNlIGVudi5zY29wZSgpIHRvIGdldCBjdXJyZW50IHNjb3BlIG9iamVjdCBvciBtYXliZSBwYXNzIGl0IGFzIGZvdXJ0aCBhcmd1bWVudCBpbiBhY3Rpb25zXG4gKlx0XHRcdGVudi5wdXNoU2NvcGUoeyBuYW1lOmluc3RhbmNlIH0pXG4gKlx0XHRcdGVudi5wb3BTY29wZShuYW1lKVxuICpcbiAqXHRcdCRvdXRwdXQoe1xuICpcdFx0XHRhY3Rpb25zOid5YW12aXNoOmRvbScsXG4gKlx0XHRcdHNjb3BlOntcbiAqXHRcdFx0XHRjb250ZXh0OiBjb250ZXh0IHx8IG5ldyBDb250ZXh0KC4uLilcbiAqXHRcdFx0fVxuICpcdFx0fSlcbiAqIFxuICogXG4gKiBcdFx0ZmluYWxpc2UgdGltZSBtYW5hZ2VtZW50IGluIGFjdGlvbnNcbiAqIFx0XHRcdG1heWJlIGFkZCBmbGFnIGluIGFjdGlvbnMgbmFtZXNwYWNlIHRvIHNheSAnYWxsb3dBc3luYydcbiAqIFx0XHRtYW5hZ2UgcmVzdWx0IGZvcndhcmRpbmcgYW5kIHByb21pc2UgbGlzdGVuaW5nIFxuICogICAgXHQgXHRcdFxuICogXHRcdGRvIHNpbXBsZSBleGFtcGxlIHdpdGggYXN5bmMgbWFuYWdlciBpbiBlbnZcbiAqXG4gKlx0XHRtYW5hZ2UgaW4tbGV4ZW0tYWN0aW9uc1xuICogXG4gKlx0XHR0cmFuc2xhdGlvbi9vdXRwdXQgdGFibGVcbiAqIFxuICpcbiAqIFx0XHQvL19fX19fX19fX19fX18gYWZ0ZXJcbiAqIFxuICogXG4gKlx0XHRhZGQgRmlsdGVyIHN0eWxlIHdpdGggQG15RnVuY1xuICpcbiAqIFx0XHRhZGQgZGVmIG1lY2FuaXNtICB3aXRoIGRlcmVmZXJlbmNlbWVudCAoYWthICRteVZhcilcbiAqXG4gKlx0XHR3b3JrIG9uIGJhYmVsdXRlIGRvYyBwaWxvdCA6IGV4dGVybmFsIHF1ZXJ5IERTTCA/IGFwaSA/XG4gKiAgXHRcdC4wID0gYXJnc1swXVxuICogIFx0XHQubmFtZSA9IHNlbGVjdCBsZXhlbXMgd2l0aCBtYXRjaGluZyBuYW1lXG4gKiAgICBcdFx0LiNsZXhpYyA9IHNlbGVjdCBsZXhlbXMgd2l0aCBtYXRjaGluZyBsZXhpY1xuICogICAgXHRcdC4jbGV4aWM6bGV4ZW0gPSBzZWxlY3QgbGV4ZW1zIHdpdGggbWF0Y2hpbmcgbGV4aWMgYW5kIGxleGVtIG5hbWVcbiAqICAgIFx0XHQuKlxuICogICAgXHRcdC4qKGZpbHRlcilcbiAqICAgIFx0XHQuKiooMD1pcz1iYWJlbHV0ZSlcbiAqICAgIFx0IFx0LioqKGRpdnxzcGFufCNmb286Z29vLjA9aXM9YmFiZWx1dGUpXG4gKiBcdFx0XG4gKiBcdFx0ZXh0cmFjdCB5YW9tXG4gKlxuICogXHRcdGV4dHJhY3QgZG90aGF0XG4gKiBcbiAqIFx0XHRicmlkZ2UgYmV0d2VlbiBiYWJlbHV0ZSBhY3Rpb25zIGFuZCBkb3RoYXQgQVBJXG4gKlxuICogXHRcdGFkZCB0ZXN0c1xuICovXG5cbi8vIGNvcmUgY2xhc3MgYW5kIHN0YXRpY3NcbnZhciBCYWJlbHV0ZSA9IHJlcXVpcmUoJy4vbGliL2JhYmVsdXRlJyk7XG5cbi8vIEJhYmVsdXRlIEZpcnN0IERlZ3JlZVxucmVxdWlyZSgnLi9saWIvZmlyc3QtbGV2ZWwtYmFiZWx1dGUnKTtcblxuLy8gc2VyaWFsaXplciB0byBCYWJlbHV0ZSBEU0xcbnJlcXVpcmUoJy4vbGliL3N0cmluZ2lmeScpO1xuXG4vLyBCYWJlbHV0ZSBEU0wgcGFyc2VyXG5CYWJlbHV0ZS5wYXJzZXIgPSByZXF1aXJlKCcuL2xpYi9wYXJzZXInKTtcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gQmFiZWx1dGU7IiwidmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vLi4vbGliL2JhYmVsdXRlJyk7XG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKioqIEhUTUwgdG8gRE9NIEFjdGlvbnMgKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5CYWJlbHV0ZS50b0xleGljKCdodG1sJywge1xuXHQvLyBvbmx5LW9uLWRvbS1vdXRwdXQgaGFuZGxlclxuXHRvbkh0bWxEb206IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCgnaHRtbDpkb20nLCAnb25IdG1sRG9tJywgW2NhbGxiYWNrXSk7XG5cdH1cbn0pO1xuXG4vLyB3ZSBvbmx5IG5lZWQgdG8gcHJvdmlkZXMgbGFuZ3VhZ2UgYXRvbXMgaW1wbGVtZW50YXRpb25zLlxuQmFiZWx1dGUudG9BY3Rpb25zKCdodG1sOmRvbScsIHtcblx0X19yZXN0cmljdGlvbnNfXzoge1xuXHRcdGh0bWw6IHRydWUsXG5cdFx0J2h0bWw6ZG9tJzogdHJ1ZVxuXHR9LFxuXHR0YWc6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MgLyogdGFnTmFtZSwgYmFiZWx1dGVzICovICwgZW52KSB7XG5cdFx0dmFyIGNoaWxkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChhcmdzWzBdKTtcblx0XHRub2RlLmFwcGVuZENoaWxkKGNoaWxkKTtcblx0XHRhcmdzWzFdLmZvckVhY2goZnVuY3Rpb24odGVtcGwpIHtcblx0XHRcdGlmICh0eXBlb2YgdGVtcGwgPT09ICd1bmRlZmluZWQnKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRpZiAodGVtcGwuX19iYWJlbHV0ZV9fKVxuXHRcdFx0XHR0ZW1wbC4kb3V0cHV0KGVudiwgdGhpcyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHRoaXMuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGVtcGwpKTsgLy8gYXV0byBlc2NhcGVkIHdoZW4gYWRkZWQgdG8gZG9tLlxuXHRcdH0sIGNoaWxkKTtcblx0fSxcblx0dGV4dDogZnVuY3Rpb24obm9kZSwgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHRub2RlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGFyZ3NbMF0pKTtcblx0fSxcblx0Y2xhc3M6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MgLyogY2xhc3NOYW1lICovICkge1xuXHRcdG5vZGUuY2xhc3NMaXN0LmFkZChhcmdzWzBdKTtcblx0fSxcblx0YXR0cjogZnVuY3Rpb24obm9kZSwgYXJncyAvKiBuYW1lLCB2YWx1ZSAqLyApIHtcblx0XHRub2RlLnNldEF0dHJpYnV0ZShhcmdzWzBdLCBhcmdzWzFdKTtcblx0fSxcblx0aWQ6IGZ1bmN0aW9uKG5vZGUsIGFyZ3MgLyogdmFsdWUgKi8gKSB7XG5cdFx0bm9kZS5pZCA9IGFyZ3NbMF07XG5cdH0sXG5cdG9uOiBmdW5jdGlvbihub2RlLCBhcmdzIC8qIGV2ZW50TmFtZSwgY2FsbGJhY2sgKi8gKSB7XG5cdFx0bm9kZS5hZGRFdmVudExpc3RlbmVyKGFyZ3NbMF0sIGFyZ3NbMV0pO1xuXHR9LFxuXHRvbkh0bWxEb206IGZ1bmN0aW9uKG5vZGUsIGFyZ3MgLyogY2FsbGJhY2sgKi8gKSB7XG5cdFx0YXJnc1swXShub2RlKTtcblx0fVxufSk7XG5cbkJhYmVsdXRlLnByb3RvdHlwZS4kaHRtbFRvRE9NID0gZnVuY3Rpb24obm9kZSkge1xuXHR2YXIgc2VsZiA9IHRoaXM7XG5cdHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbigpIHtcblx0XHRzZWxmLiRvdXRwdXQoJ2h0bWw6ZG9tJywgbm9kZSk7XG5cdH0pO1xuXHRyZXR1cm4gbm9kZTtcbn07IiwidmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vLi4vbGliL2JhYmVsdXRlJyk7XG5cbi8vIHV0aWxzIDpcbnZhciBtYXBFbmNvZGUgPSB7XG5cdFx0XCImXCI6IFwiJmFtcDtcIixcblx0XHRcIjxcIjogXCImbHQ7XCIsXG5cdFx0XCI+XCI6IFwiJmd0O1wiLFxuXHRcdFwiXFxcIlwiOiBcIiZxdW90O1wiLFxuXHRcdFwiJ1wiOiBcIiYjMzk7XCIgLy8gJyAtPiAmYXBvczsgZm9yIFhNTCBvbmx5XG5cdH0sXG5cdG1hcERlY29kZSA9IHtcblx0XHRcIiZhbXA7XCI6IFwiJlwiLFxuXHRcdFwiJmx0O1wiOiBcIjxcIixcblx0XHRcIiZndDtcIjogXCI+XCIsXG5cdFx0XCImcXVvdDtcIjogXCJcXFwiXCIsXG5cdFx0XCImIzM5O1wiOiBcIidcIlxuXHR9O1xuXG5mdW5jdGlvbiBlbmNvZGVIdG1sU3BlY2lhbENoYXJzKHN0cikge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1smPD5cIiddL2csIGZ1bmN0aW9uKG0pIHtcblx0XHRyZXR1cm4gbWFwRW5jb2RlW21dO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gZGVjb2RlSHRtbFNwZWNpYWxDaGFycyhzdHIpIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC8oJmFtcDt8Jmx0O3wmZ3Q7fCZxdW90O3wmIzM5OykvZywgZnVuY3Rpb24obSkge1xuXHRcdHJldHVybiBtYXBEZWNvZGVbbV07XG5cdH0pO1xufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKiogSFRNTC10by1TdHJpbmcgQWN0aW9ucyAqKioqKioqKioqKlxuICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiovXG5cblxuQmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIHtcblx0Ly8gb25seS1vbi1zdHJpbmctb3V0cHV0IGhhbmRsZXJcblx0b25IdG1sU3RyaW5nOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQoJ2h0bWw6c3RyaW5nJywgJ29uSHRtbFN0cmluZycsIFtjYWxsYmFja10pO1xuXHR9XG59KTtcblxuLy8gYWN0aW9ucyA6XG4vLyB3ZSBvbmx5IG5lZWQgbG9naWNhbCBhdG9tcyBkZWZpbml0aW9ucy4gKHdpdGhvdXQgdXNlciBpbnRlcmFjdGlvbnMuIGFrYSBjbGljayBldGMuKVxuQmFiZWx1dGUudG9BY3Rpb25zKCdodG1sOnN0cmluZycsIHtcblx0Ly8gT3V0cHV0IGVuZ2luZXMgcmVsYXRlZFxuXHRfX3Jlc3RyaWN0aW9uc19fOiB7XG5cdFx0aHRtbDogdHJ1ZSxcblx0XHQnaHRtbDpzdHJpbmcnOiB0cnVlXG5cdH0sXG5cdC8vIEFjdGlvbnNcblx0dGFnOiBmdW5jdGlvbih0YWcsIGFyZ3MgLyogdGFnTmFtZSwgYmFiZWx1dGVzICovICwgZW52KSB7XG5cdFx0dmFyIGNoaWxkID0gbmV3IFRhZ0Rlc2NyaXB0b3IoKSxcblx0XHRcdGFjdGlvbnMgPSBlbnYuYWN0aW9ucyxcblx0XHRcdGJhYmVsdXRlcyA9IGFyZ3NbMV0sXG5cdFx0XHR0ZW1wbDtcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gYmFiZWx1dGVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0XHR0ZW1wbCA9IGJhYmVsdXRlc1tpXTtcblx0XHRcdGlmICh0eXBlb2YgdGVtcGwgPT09ICd1bmRlZmluZWQnKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGlmICh0ZW1wbC5fX2JhYmVsdXRlX18pXG5cdFx0XHRcdHRlbXBsLiRvdXRwdXQoZW52LCBjaGlsZCk7XG5cdFx0XHRlbHNlIGlmICh0eXBlb2YgdGVtcGwgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRjaGlsZC5jaGlsZHJlbiArPSBlbmNvZGVIdG1sU3BlY2lhbENoYXJzKHRlbXBsKTsgLy8ucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoLz4vZywgJyZndDsnKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0Y2hpbGQuY2hpbGRyZW4gKz0gdGVtcGw7XG5cdFx0fVxuXHRcdHRhZ091dHB1dCh0YWcsIGNoaWxkLCBhcmdzWzBdKTtcblx0fSxcblx0dGV4dDogZnVuY3Rpb24odGFnLCBhcmdzIC8qIHZhbHVlICovICkge1xuXHRcdHRhZy5jaGlsZHJlbiArPSBlbmNvZGVIdG1sU3BlY2lhbENoYXJzKGFyZ3NbMF0pO1xuXHR9LFxuXHRjbGFzczogZnVuY3Rpb24odGFnLCBhcmdzIC8qIGNsYXNzTmFtZSAqLyApIHtcblx0XHR0YWcuY2xhc3NlcyArPSAnICcgKyBhcmdzWzBdO1xuXHR9LFxuXHRhdHRyOiBmdW5jdGlvbih0YWcsIGFyZ3MgLyogbmFtZSwgdmFsdWUgKi8gKSB7XG5cdFx0dmFyIHZhbHVlID0gYXJnc1sxXTtcblx0XHQvLyB0YWcuYXR0cmlidXRlcyArPSAnICcgKyBhcmdzWzBdICsgJz1cIicgKyAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IGVuY29kZUh0bWxTcGVjaWFsQ2hhcnModmFsdWUpIDogdmFsdWUpICsgJ1wiJztcblx0XHR0YWcuYXR0cmlidXRlcyArPSAnICcgKyBhcmdzWzBdICsgJz1cIicgKyAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyA/IHZhbHVlLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpIDogdmFsdWUpICsgJ1wiJztcblx0fSxcblx0aWQ6IGZ1bmN0aW9uKHRhZywgYXJncyAvKiB2YWx1ZSAqLyApIHtcblx0XHR0YWcuYXR0cmlidXRlcyA9ICcgaWQ9XCInICsgYXJnc1swXSArICdcIicgKyB0YWcuYXR0cmlidXRlcztcblx0fSxcblx0b25IdG1sU3RyaW5nOiBmdW5jdGlvbih0YWcsIGFyZ3MpIHtcblx0XHRhcmdzWzBdKHRhZyk7XG5cdH1cbn0pO1xuXG4vLyBmb3IgdGFncyBzdHJpbmcgY29uc3RydWN0aW9uXG52YXIgVGFnRGVzY3JpcHRvciA9IGZ1bmN0aW9uKHRhZ05hbWUpIHtcblx0dGhpcy5jaGlsZHJlbiA9ICcnO1xuXHR0aGlzLmNsYXNzZXMgPSAnJztcblx0dGhpcy5zdHlsZSA9ICcnO1xuXHR0aGlzLmF0dHJpYnV0ZXMgPSAnJztcbn07XG5cbnZhciBvcGVuVGFncyA9IC9ici8sIC8vIHNob3VsZCBiZSBjb21wbGV0ZWRcblx0c3RyaWN0VGFncyA9IC9zcGFufHNjcmlwdHxtZXRhfGRpdnxpLztcblxuZnVuY3Rpb24gdGFnT3V0cHV0KHRhZywgY2hpbGQsIG5hbWUpIHtcblx0dmFyIG91dCA9ICc8JyArIG5hbWUgKyBjaGlsZC5hdHRyaWJ1dGVzO1xuXHRpZiAoY2hpbGQuc3R5bGUpXG5cdFx0b3V0ICs9ICcgc3R5bGU9XCInICsgY2hpbGQuc3R5bGUgKyAnXCInO1xuXHRpZiAoY2hpbGQuY2xhc3Nlcylcblx0XHRvdXQgKz0gJyBjbGFzcz1cIicgKyBjaGlsZC5jbGFzc2VzICsgJ1wiJztcblx0aWYgKGNoaWxkLmNoaWxkcmVuKVxuXHRcdHRhZy5jaGlsZHJlbiArPSBvdXQgKyAnPicgKyBjaGlsZC5jaGlsZHJlbiArICc8LycgKyBuYW1lICsgJz4nO1xuXHRlbHNlIGlmIChvcGVuVGFncy50ZXN0KG5hbWUpKVxuXHRcdHRhZy5jaGlsZHJlbiArPSBvdXQgKyAnPic7XG5cdGVsc2UgaWYgKHN0cmljdFRhZ3MudGVzdChuYW1lKSlcblx0XHR0YWcuY2hpbGRyZW4gKz0gb3V0ICsgJz48LycgKyBuYW1lICsgJz4nO1xuXHRlbHNlXG5cdFx0dGFnLmNoaWxkcmVuICs9IG91dCArICcvPic7XG59XG5cbkJhYmVsdXRlLnByb3RvdHlwZS4kaHRtbFRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLiRvdXRwdXQoJ2h0bWw6c3RyaW5nJywgbmV3IFRhZ0Rlc2NyaXB0b3IoKSkuY2hpbGRyZW47XG59OyIsIi8qKlxuICogU2ltcGxlIGJ1dCBwb3dlcmZ1bCBhbmQgdWx0cmEgZmFzdCBpc29tb3JwaGljIGh0bWwgb3V0cHV0IGVuZ2luZS5cbiAqXG4gKiBPbmUgc21hbGwgZXh0ZW5kYWJsZSBsZXhpYywgdHdvIG1pY3JvICRvdXRwdXQncyBzZW1hbnRpY3MgKG9uZSBwdXJlIHN0cmluZywgb25lIHB1cmUgZG9tKSwgYW5kIHZvaWzDoCAhIDspXG4gKi9cblxudmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi4vbGliL2JhYmVsdXRlJyk7XG5cbi8qKioqKioqXG4gKioqKioqKlx0TEFOR1VBR0UgQVRPTVMgKHNpbXBseSBlbnF1ZXVlaW5nIGxleGVtcylcbiAqKioqKioqL1xuQmFiZWx1dGVcblx0LnRvTGV4aWMoJ2h0bWwnLCBbJ3RhZycsICdhdHRyJywgJ3Byb3AnLCAnY2xhc3MnLCAnaWQnLCAndGV4dCcsICdvbiddKTsgLy8gc2ltcGxlIGF0b21zXG5cbi8qKioqKioqXG4gKioqKioqKlx0Q09NUE9VTkRTIFdPUkRTIChiYXNlZCBvbiBsYW5ndWFnZSBhdG9tcylcbiAqKioqKioqL1xuLy8gc2ltcGxlIHRhZ3MgKG1hZGUgd2l0aCAudGFnKSAobGlzdCBzaG91bGQgYmUgY29tcGxldGVkKVxuWydkaXYnLCAnaDEnLCAnaDInLCAnaDMnLCAnc2VjdGlvbicsICdzcGFuJywgJ2J1dHRvbicsICdvcHRpb24nLCAnYXJ0aWNsZSddXG4uZm9yRWFjaChmdW5jdGlvbih0YWdOYW1lKSB7XG5cdEJhYmVsdXRlLnRvTGV4aWMoJ2h0bWwnLCB0YWdOYW1lLCBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy50YWcodGFnTmFtZSwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblx0fSk7XG59KTtcblxuLy8gZXZlbnRzIChtYWRlIHdpdGggLm9uKSAobGlzdCBzaG91bGQgYmUgY29tcGxldGVkKVxuWydjbGljaycsICdtb3VzZW92ZXInLCAna2V5dXAnXVxuLmZvckVhY2goZnVuY3Rpb24oZXZlbnROYW1lKSB7XG5cdEJhYmVsdXRlLnRvTGV4aWMoJ2h0bWwnLCBldmVudE5hbWUsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG5cdFx0cmV0dXJuIHRoaXMub24oZXZlbnROYW1lLCBjYWxsYmFjayk7XG5cdH0pO1xufSk7XG5cblxuLy8gY29tcG91bmRzIHRhZ3MgKG1hZGUgd2l0aCBvdGhlciB0YWdzKVxudmFyIGggPSBCYWJlbHV0ZS5pbml0aWFsaXplcignaHRtbCcpO1xuQmFiZWx1dGUudG9MZXhpYygnaHRtbCcsIHtcblx0YTogZnVuY3Rpb24oaHJlZiwgY29udGVudCkge1xuXHRcdHJldHVybiB0aGlzLnRhZygnYScsIFtoLmF0dHIoJ2hyZWYnLCBocmVmKSwgY29udGVudF0pO1xuXHR9LFxuXHRzZWxlY3Q6IGZ1bmN0aW9uKG9wdGlvbnNMaXN0LCBzZWxlY3RCYWJlbHV0ZSkge1xuXHRcdHJldHVybiB0aGlzLnRhZygnc2VsZWN0JywgW1xuXHRcdFx0aC5fZWFjaChvcHRpb25zTGlzdCwgZnVuY3Rpb24ob3B0KSB7XG5cdFx0XHRcdGlmIChvcHQuX19iYWJlbHV0ZV9fKVxuXHRcdFx0XHRcdHRoaXMub3B0aW9uKG9wdCk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHR0aGlzLm9wdGlvbihcblx0XHRcdFx0XHRcdGguYXR0cigndmFsdWUnLCBvcHQudmFsdWUpLFxuXHRcdFx0XHRcdFx0b3B0LmNvbnRlbnRcblx0XHRcdFx0XHQpO1xuXHRcdFx0fSksXG5cdFx0XHRzZWxlY3RCYWJlbHV0ZVxuXHRcdF0pO1xuXHR9LFxuXHRpbnB1dDogZnVuY3Rpb24odHlwZSwgdmFsLCBiYWJlbHV0ZSkge1xuXHRcdHJldHVybiB0aGlzLnRhZygnaW5wdXQnLCBbaC5hdHRyKCd0eXBlJywgdHlwZSkuYXR0cigndmFsdWUnLCB2YWwpLCBiYWJlbHV0ZV0pO1xuXHR9LFxuXHR0ZXh0SW5wdXQ6IGZ1bmN0aW9uKHZhbCwgYmFiZWx1dGUpIHtcblx0XHRyZXR1cm4gdGhpcy5pbnB1dCgndGV4dCcsIHZhbCwgYmFiZWx1dGUpO1xuXHR9LFxuXHRzdHJvbmc6IGZ1bmN0aW9uKGNvbnRlbnQpIHtcblx0XHRyZXR1cm4gdGhpcy5zcGFuKGguY2xhc3MoJ3N0cm9uZycpLCBjb250ZW50KTtcblx0fVxufSk7XG5cbi8vID0+IHNvIDI1IHdvcmRzIGRlZmluZWQgaW4gdGhlIGxleGljIGZvciB0aGUgbW9tZW50LlxuLy8gdGFnLCBhdHRyLCBwcm9wLCBjbGFzcywgaWQsIHRleHQsIG9uLCBjbGljaywgbW91c2VvdmVyLCBrZXlVcCwgZGl2LCBoMSwgaDIsIGgzLCBzZWN0aW9uLCBhcnRpY2xlLCBzcGFuLCBidXR0b24sIGEsIHNlbGVjdCwgb3B0aW9uLCBzdHJvbmcsIG9uSHRtbFN0cmluZywgb25IdG1sRG9tXG4vLyIsIi8qKlxuICogQmFiZWx1dGUgY29yZSBDbGFzcyBhbmQgc3RhdGljcyBmdW5jdGlvbnMuXG4gKlxuICogQSBiYWJlbHV0ZSBpcyBqdXN0IGEgc2VudGVuY2VzIChhIGNoYWluIG9mIGxleGVtcyB3aXRoIGFyZ3VtZW50KHMpKSBcbiAqIHdyaXR0ZW4gd2l0aCBtZXRob2QgY2hhaW5pbmcsIChha2EgZm9vKDEsIHRydWUpLmJhcignem9vJywgZ29vKCkuZm9vKCkpIClcbiAqIGFuZCB3aGVyZSBsZXhlbXMgKGVhY2ggY2FsbCAtIGFrYSAubXlMZXhlbShhcmcxLCAuLi4pKSBcbiAqIGFyZSBzaW1wbHkga2VwdCBpbiBhbiBhcnJheSBmb3IgZnVydGhlciBpbnRlcnByZXRhdGlvbnMsIFxuICogaW4gZm9sbG93aW5nIG9iamVjdCBmb3JtYXQgOiB7IGxleGljOicuLi4nLCBuYW1lOicuLi4nLCBhcmdzOlsuLi5dIH0uXG4gKlxuICogQWJzb2x1dGx5IG5vdGhpbmcgbW9yZS5cbiAqXG4gKiBZb3UgY291bGQgc2VlIGl0IGFzIGFuIEFic3RyYWN0IFN5bnRheCBUcmVlIG9mIGFuZCBBYnN0cmFjdCBQcm9ncmFtIHRoYXQgbmVlZHMgZnVydGhlciBpbnRlcnByZXRhdGlvbnMuIChEb24ndCBiZSBhZnJhaWQsIGl0J3MgaGlnaGx5IHByYWN0aWNhbCBhbmQgc2ltcGxlLikgXG4gKlxuICogWW91IHByb3ZpZGUgbGV4aWNzIChkaWN0aW9uYXJpZXMpIG9mIHJlbGF0ZWQgbGV4ZW1zIHRoYXQgZm9ybSBhbiBJbnRlcm5hbCAoQWJzdHJhY3QpIERTTCwgeW91IHdyaXRlIHNlbnRlbmNlcyB3aXRoIHRoZW0sIGFuZCBwcm92aWRlL3VzZVxuICogZGlmZmVyZW50IGRpY3Rpb25hcmllcyBvZiBcImFjdGlvbnNcIiAobGV4ZW1zIGltcGxlbWVudGF0aW9ucykgdG8gb3V0cHV0aW5nIHRoZW0gaW4gdmFyaW91cyBzaXR1YXRpb25zIGFuZCBjb250ZXh0LlxuICpcbiAqIFlvdSBjb3VsZCBtYW5pcHVsYXRlIGFuZCB3cml0ZSB0aG9zZSBiYWJlbHV0ZXMgYXMgeW91IHdhbnQsIHRyYW5zbGF0ZSB0aGVtIGluIGFuZCB0aHJvdWdoIG90aGVyIEludGVybmFsIEFic3RyYWN0IERTTHMsIFxuICogYW5kIHByb2R1Y2UgYW55IGtpbmQgb2Ygb3V0cHV0IG91IHdhbnQgYnkgdXNpbmdzIHNwZWNpZmljcyBcImFjdGlvbnNcIiBkaWN0aW9uYXJpZXMuXG4gKlxuICogSXQgbG9va3MgY29tcGxleCAoYmVjYXVzZSBhYnN0cmFjdCkgYnV0IGF0IHVzYWdlIGV2ZXJ5dGhpbmcgaXMgc21vb3RoLCBjbGVhciBhbmQgZWFzeS5cbiAqXG4gKiBUaGUgQmFiZWx1dGUgQ2xhc3MgaXMganVzdCBhIGhlbHBlciBmb3Igd3JpdGluZyBhbmQgaG9sZGluZyBiYWJlbHV0ZSBzZW50ZW5jZXMuIFxuICpcbiAqIFxuICogQGF1dGhvciBHaWxsZXMgQ29vbWFuc1xuICogQGxpY2VuY2UgTUlUXG4gKiBAY29weXJpZ2h0IDIwMTYgR2lsbGVzIENvb21hbnNcbiAqL1xuXG52YXIgQmFiZWx1dGUgPSBmdW5jdGlvbihsZXhlbXMpIHtcblx0XHR0aGlzLl9fYmFiZWx1dGVfXyA9ICdkZWZhdWx0JzsgLy8gY3VycmVudCBsZXhpY1xuXHRcdHRoaXMuX2xleGVtcyA9IGxleGVtcyB8fCDCoFtdO1xuXHR9LFxuXHRMZXhlbSA9IEJhYmVsdXRlLkxleGVtID0gZnVuY3Rpb24obGV4aWMsIG5hbWUsIGFyZ3MsIGhhbmRsZXIpIHtcblx0XHR0aGlzLl9fYmFiZWx1dGVsZXhlbV9fID0gdHJ1ZTtcblx0XHR0aGlzLmxleGljID0gbGV4aWM7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLmFyZ3MgPSBhcmdzO1xuXHRcdGlmIChoYW5kbGVyKVxuXHRcdFx0dGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcblx0fSxcblx0bGV4aWNzRGljbyA9IEJhYmVsdXRlLmxleGljcyA9IHtcblx0XHQnZGVmYXVsdCc6IHtcblx0XHRcdENsOiBCYWJlbHV0ZVxuXHRcdH1cblx0fSxcblx0YWN0aW9uc0RpY28gPSBCYWJlbHV0ZS5hY3Rpb25zID0ge1xuXHRcdCdkZWZhdWx0Jzoge1xuXHRcdFx0bG9nOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgYXJndW1lbnRzKTtcblx0XHRcdH0sXG5cdFx0XHRkZWJ1ZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIFsnZGVidWc6J10uY29uY2F0KGFyZ3VtZW50cykpO1xuXHRcdFx0fSxcblx0XHRcdGlmOiBmdW5jdGlvbihzdWJqZWN0LCBhcmdzLCBlbnYgLyogc3VjY2Vzc0JhYmVsdXRlLCBlbHNlQmFiZWx1dGUgKi8gKSB7XG5cdFx0XHRcdGlmIChhcmdzWzBdKVxuXHRcdFx0XHRcdHJldHVybiBhcmdzWzFdLiRvdXRwdXQoZW52LCBzdWJqZWN0KTtcblx0XHRcdFx0ZWxzZSBpZiAoYXJnc1syXSlcblx0XHRcdFx0XHRyZXR1cm4gYXJnc1syXS4kb3V0cHV0KGVudiwgc3ViamVjdCk7XG5cdFx0XHR9LFxuXHRcdFx0YWxsOiBmdW5jdGlvbihzdWJqZWN0LCB0aGVuYWJsZXMsIGVudikge1xuXHRcdFx0XHRyZXR1cm4gUHJvbWlzZS5hbGwodGhlbmFibGVzKTtcblx0XHRcdH0sXG5cdFx0XHR0aGVuOiBmdW5jdGlvbihzdWJqZWN0LCBjYWxsYmFja3MsIGVudikge1xuXHRcdFx0XHRpZiAobG9jYWxzLmVycm9yKVxuXHRcdFx0XHRcdHJldHVybiBsb2NhbHMucmVzdWx0ID0gYXJnc1swXShsb2NhbHMuZXJyb3IpO1xuXHRcdFx0XHRyZXR1cm4gbG9jYWxzLnJlc3VsdCA9IGFyZ3NbMV0obG9jYWxzLnJlc3VsdCk7XG5cdFx0XHR9LFxuXHRcdFx0Y2F0Y2g6IGZ1bmN0aW9uKHN1YmplY3QsIGFyZ3MsIGVudikge1xuXHRcdFx0XHRpZiAobG9jYWxzLmVycm9yKVxuXHRcdFx0XHRcdHJldHVybiBsb2NhbHMucmVzdWx0ID0gYXJnc1swXShsb2NhbHMuZXJyb3IpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuQmFiZWx1dGUucHJvdG90eXBlID0ge1xuXHQvKipcblx0ICogZ2V0IG5ldyBkZWRpY2F0ZWQgYmFiZWx1dGUgaGFuZGxlciB0aGF0IGFjdCBvbiBzYW1lIGFyYXkgb2YgbGV4ZW1zIChjdXJyZW50IG9uZSlcblx0ICogcmV0dXJuIG5ldyBiYWJlbHV0ZSBzcGVjaWFsaXNlZCB3aXRoIGxleGljTmFtZVxuXHQgKi9cblx0YmFiZWx1dGU6IGZ1bmN0aW9uKGxleGljTmFtZSkge1xuXHRcdHZhciBsZXhpYyA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSksXG5cdFx0XHRDbCA9IGxleGljLkNsLFxuXHRcdFx0YiA9IG5ldyBDbCgpO1xuXHRcdGIuX2xleGVtcyA9IHRoaXMuX2xleGVtcztcblx0XHRyZXR1cm4gYjtcblx0fSxcblx0LyoqXG5cdCAqIGdldCBkZWRpY2F0ZWQgYmFiZWx1dGUgaGFuZGxlciAoaW5kZXBlbmRhbnQgb2YgY3VycmVudCBhcnJheSBvZiBsZXhlbXMpXG5cdCAqIHJldHVybiBuZXcgYmFiZWx1dGUgc3BlY2lhbGlzZWQgd2l0aCBsZXhpY05hbWUgb3IgY3VycmVudCBsZXhpY1xuXHQgKi9cblx0X25ldzogZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdFx0cmV0dXJuIEJhYmVsdXRlLmIobGV4aWNOYW1lIHx8IMKgdGhpcy5fX2JhYmVsdXRlX18gIT09IHRydWUgPyB0aGlzLl9fYmFiZWx1dGVfXyA6IG51bGwpO1xuXHR9LFxuXHQvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblx0ICogQmFiZWx1dGUgaW5zdGFuY2UgbW9kaWZpY2F0aW9uIChtZXRhLWxhbmd1YWdlIEFQSSlcblx0ICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXHQvLyBhZGQgbGV4ZW0gdG8gYmFiZWx1dGVcblx0X2FwcGVuZDogZnVuY3Rpb24obGV4aWNOYW1lLCBuYW1lLCBhcmdzKSB7XG5cdFx0dGhpcy5fbGV4ZW1zLnB1c2gobmV3IExleGVtKGxleGljTmFtZSB8fCB0aGlzLl9fYmFiZWx1dGVfXywgbmFtZSwgYXJncykpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHQvLyBjb25kaXRpb25hbCBzZW50ZW5jZXMgY29uY2F0ZW5hdGlvblxuXHRfaWY6IGZ1bmN0aW9uKGNvbmRpdGlvbiwgYmFiZWx1dGUpIHtcblx0XHRpZiAoY29uZGl0aW9uKVxuXHRcdFx0dGhpcy5fbGV4ZW1zID0gdGhpcy5fbGV4ZW1zLmNvbmNhdChiYWJlbHV0ZS5fbGV4ZW1zKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0Ly8gdXNlIGEgYmFiZWx1dGUgKGNvbmNhdCBpdHMgbGV4ZW1zIHRvIGxvY2FsIG9uZXMpXG5cdF91c2U6IGZ1bmN0aW9uKGJhYmVsdXRlIC8qIGNvdWxkIGJlIGEgc3RyaW5nIGluIFwibGV4aWNOYW1lOm1ldGhvZE5hbWVcIiBmb3JtYXQgKi8gLyosIC4uLmFyZ3MgKi8gKSB7XG5cdFx0aWYgKCFiYWJlbHV0ZSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuXHRcdFx0bWV0aG9kID0gdHlwZW9mIGJhYmVsdXRlID09PSAnc3RyaW5nJyA/IGdldE1ldGhvZChiYWJlbHV0ZSkgOiBiYWJlbHV0ZTtcblx0XHRpZiAobWV0aG9kLl9fYmFiZWx1dGVfXylcblx0XHRcdHRoaXMuX2xleGVtcyA9IHRoaXMuX2xleGVtcy5jb25jYXQobWV0aG9kLl9sZXhlbXMpO1xuXHRcdGVsc2Vcblx0XHRcdG1ldGhvZCh0aGlzLl9sZXhlbXMsIGFyZ3MpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9LFxuXHRmb3JFYWNoOiBmdW5jdGlvbihmdW5jLCBzZWxmKSB7XG5cdFx0dmFyIGxleGVtcyA9IHRoaXMuX2xleGVtcztcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gbGV4ZW1zLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxuXHRcdFx0ZnVuYy5jYWxsKHNlbGYgfHwgwqB0aGlzLCBsZXhlbXNbaV0sIGkpO1xuXHR9LFxuXHQvLyBleGVjdXRlIHByb3ZpZGVkIGZ1bmN0aW9uIGJpbmRlZCBvbiBjdXJyZW50IGJhYmVsdXRlLCB0aGF0IHdpbGwgcmVjZWl2ZSBpdGVtIGFuZCBpbmRleCBhcyBhcmd1bWVudC5cblx0X2VhY2g6IGZ1bmN0aW9uKGFyciwgZnVuYywgc2VsZikge1xuXHRcdGFyci5mb3JFYWNoKGZ1bmMsIHNlbGYgfHwgdGhpcyk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH0sXG5cdC8vIGV4ZWN1dGUgcHJvdmlkZWQgYmFiZWx1dGVzIGxpc3Qgb24gY3VycmVudCBiYWJlbHV0ZS5cblx0X3VzZUVhY2g6IGZ1bmN0aW9uKGFycikge1xuXHRcdGFyci5mb3JFYWNoKGZ1bmN0aW9uKGkpIHtcblx0XHRcdHRoaXMuX3VzZShpKTtcblx0XHR9LCB0aGlzKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fSxcblx0LyoqKioqKioqKioqKioqKioqKioqXG5cdCAqIFRSQU5TTEFUSU9OXG5cdCAqKioqKioqKioqKioqKioqKioqKi9cblx0Ly8gdHJhbnNsYXRlIGJhYmVsdXRlIGxleGVtIHRocm91Z2ggYSBsZXhpYy4gcmV0dXJuIG5ldyBiYWJlbHV0ZS5cblx0X3RyYW5zbGF0aW9uOiBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0XHQvLyB0b2RvIDogb3B0aW1pc2VkIFwicmVjdXJzaXZlXCIgdHJhbnNsYXRpb24gd2l0aCBhcnJheSBvZiBsZXhpY3NEaWNvXG5cdFx0dmFyIGxleGljID0gQmFiZWx1dGUuZ2V0TGV4aWMobGV4aWNOYW1lKSxcblx0XHRcdENsID0gbGV4aWMuQ2wsXG5cdFx0XHRiID0gbmV3IENsKCksXG5cdFx0XHRsZXhlbTtcblx0XHRmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fbGV4ZW1zLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0XHRsZXhlbSA9IHRoaXMuX2xleGVtc1tpXTtcblx0XHRcdHZhciBhcmdzID0gbGV4ZW0uYXJncy5tYXAoZnVuY3Rpb24oYXJnKSB7XG5cdFx0XHRcdGlmIChhcmcgJiYgYXJnLl9fYmFiZWx1dGVfXylcblx0XHRcdFx0XHRyZXR1cm4gYXJnLl90cmFuc2xhdGlvbihsZXhpY05hbWUpO1xuXHRcdFx0XHRyZXR1cm4gYXJnO1xuXHRcdFx0fSk7XG5cdFx0XHRpZiAoYltsZXhlbS5uYW1lXSlcblx0XHRcdFx0YltsZXhlbS5uYW1lXS5hcHBseShiLCBhcmdzKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0Yi5fbGV4ZW1zLnB1c2gobmV3IExleGVtKGxleGVtLmxleGljLCBsZXhlbS5uYW1lLCBhcmdzKSk7XG5cdFx0fVxuXHRcdHJldHVybiBiO1xuXHR9LFxuXHQvKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHQgKioqKioqKioqKioqKioqKiogT1VUUFVUUyAqKioqKioqKioqKioqKioqKioqKlxuXHQgKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblx0Ly8gc3BlY2lhbGlzZWQgb3VwdXQgOiBpbnRlcnByZXQgYmFiZWx1dGUgd2l0aCBzcGVjaWZpZWQgYWN0aW9uc1xuXHQnJG91dHB1dCc6IGZ1bmN0aW9uKGVudiAvKiBvciBhY3Rpb25zTmFtZSAqLyAsIHN1YmplY3QsIHNjb3BlLCBzdGFydEluZGV4KSB7XG5cdFx0aWYgKHR5cGVvZiBlbnYgPT09ICdzdHJpbmcnKVxuXHRcdFx0ZW52ID0gbmV3IEVudmlyb25tZW50KGVudiwgc2NvcGUpO1xuXG5cdFx0dmFyIGFjdGlvbnMgPSBlbnYuYWN0aW9ucyxcblx0XHRcdHNlbGYgPSB0aGlzLFxuXHRcdFx0aW5kZXggPSAoc3RhcnRJbmRleCB8fCAwKSxcblx0XHRcdGxleGVtLFxuXHRcdFx0cixcblx0XHRcdGY7XG5cdFx0d2hpbGUgKGxleGVtID0gdGhpcy5fbGV4ZW1zW2luZGV4KytdKSB7XG5cdFx0XHRpZiAoYWN0aW9ucy5fX3Jlc3RyaWN0aW9uc19fICYmICFhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX19bbGV4ZW0ubGV4aWNdKVxuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdGYgPSBhY3Rpb25zW2xleGVtLm5hbWVdIHx8IGFjdGlvbnNEaWNvLmRlZmF1bHRbbGV4ZW0ubmFtZV07XG5cdFx0XHRpZiAoZikge1xuXHRcdFx0XHRyID0gZihzdWJqZWN0LCBsZXhlbS5hcmdzLCBlbnYsIGVudi5zY29wZSk7XG5cdFx0XHRcdGlmIChyICYmIHIudGhlbikgeyAvLyB3YWl0IHByb21pc2UgdGhlbiBjb250aW51ZSBvdXRwdXRcblx0XHRcdFx0XHRyZXR1cm4gci50aGVuKGZ1bmN0aW9uKHMpIHtcblx0XHRcdFx0XHRcdHJldHVybiBzZWxmLiRvdXRwdXQoZW52LCBzdWJqZWN0LCBudWxsLCBpbmRleCk7XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHN1YmplY3Q7XG5cdH0sXG5cdC8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdCAqKioqKioqKioqKioqKioqKioqKioqIERFRkFVTFQgTEVYRU1TICoqKioqKioqKioqKioqKioqKioqXG5cdCAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXHQvLyBjb25kaXRpb25hbCBleGVjdXRpb25cblx0aWY6IGZ1bmN0aW9uKGNvbmRpdGlvbiwgYmFiZWx1dGUsIGVsc2VCYWJlbHV0ZSkge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQodGhpcy5fX2JhYmVsdXRlX18sICdpZicsIFtjb25kaXRpb24sIGJhYmVsdXRlLCBlbHNlQmFiZWx1dGVdKTtcblx0fSxcblx0Ly8gbG9nIGFjdGlvbiBzdGF0ZVxuXHRsb2c6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQodGhpcy5fX2JhYmVsdXRlX18sICdsb2cnLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXHR9LFxuXHQvLyBmb3IgZGVidWcgOiBsb2cgYWN0aW9uIHN0YXRlXG5cdGRlYnVnOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5fYXBwZW5kKHRoaXMuX19iYWJlbHV0ZV9fLCAnZGVidWcnLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXHR9LFxuXHQvLyBhc3luYyBtYW5hZ2VtZW50XG5cdGFsbDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCh0aGlzLl9fYmFiZWx1dGVfXywgJ2FsbCcsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdH0sXG5cdHRoZW46IGZ1bmN0aW9uKHN1Y2Nlc3MsIGZhaWwpIHtcblx0XHRyZXR1cm4gdGhpcy5fYXBwZW5kKHRoaXMuX19iYWJlbHV0ZV9fLCAndGhlbicsIFtzdWNjZXNzLCBmYWlsXSk7XG5cdH0sXG5cdGNhdGNoOiBmdW5jdGlvbihmYWlsKSB7XG5cdFx0cmV0dXJuIHRoaXMuX2FwcGVuZCh0aGlzLl9fYmFiZWx1dGVfXywgJ2ZhaWwnLCBbZmFpbF0pO1xuXHR9XG59O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKioqKioqKioqKioqKiBTVEFUSUNTICoqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG4vLyBCYWJlbHV0ZSBtYWluIGluaXRpYWxpemVyXG5CYWJlbHV0ZS5iID0gZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdHJldHVybiBsZXhpY05hbWUgPyBCYWJlbHV0ZS5pbml0aWFsaXplcihsZXhpY05hbWUpIDogbmV3IEJhYmVsdXRlKCk7XG59O1xuXG4vLyBiYWJlbHV0ZSBpbml0aWFsaXplciBtYW5hZ2VtZW50XG5cbmZ1bmN0aW9uIGFkZFRvSW5pdGlhbGl6ZXIobGV4aWMsIG1ldGhvZCkge1xuXHR2YXIgQ2wgPSBsZXhpYy5DbDtcblx0bGV4aWMuaW5pdGlhbGl6ZXIgPSBsZXhpYy5pbml0aWFsaXplciB8fCDCoHt9O1xuXHRsZXhpYy5pbml0aWFsaXplclttZXRob2RdID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGluc3RhbmNlID0gbmV3IGxleGljLkNsKCk7XG5cdFx0cmV0dXJuIGluc3RhbmNlW21ldGhvZF0uYXBwbHkoaW5zdGFuY2UsIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdH1cbn1cblxuZnVuY3Rpb24gaW5pdGlhbGl6ZXIobGV4aWMpIHtcblx0bGV4aWMuaW5pdGlhbGl6ZXIgPSBsZXhpYy5pbml0aWFsaXplciB8fCB7fTtcblx0T2JqZWN0LmtleXMobGV4aWMuQ2wucHJvdG90eXBlKVxuXHRcdC5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0aWYgKGtleSA9PT0gJ19fYmFiZWx1dGVfXycgfHwga2V5ID09PSAnX2xleGVtcycpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGFkZFRvSW5pdGlhbGl6ZXIobGV4aWMsIGtleSk7XG5cdFx0fSk7XG5cdHJldHVybiBsZXhpYy5pbml0aWFsaXplcjtcbn1cblxuLy8gQmFiZWx1dGUgaW5pdGlhbGl6ZXIgcHJvdmlkZXJcbkJhYmVsdXRlLmluaXRpYWxpemVyID0gZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdHZhciBsZXhpYyA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSk7XG5cdHJldHVybiBsZXhpYy5pbml0aWFsaXplciB8fCBpbml0aWFsaXplcihsZXhpYyk7XG59O1xuXG4vLyByZXR1cm4gc3BlY2lmaWVkIGxleGljLlxuQmFiZWx1dGUuZ2V0TGV4aWMgPSBmdW5jdGlvbihsZXhpY05hbWUpIHtcblx0dmFyIGxleGljID0gbGV4aWNzRGljb1tsZXhpY05hbWVdO1xuXHRpZiAoIWxleGljKVxuXHRcdHRocm93IG5ldyBFcnJvcignQmFiZWx1dGUgOiBsZXhpYyBub3QgZm91bmQgOiAnICsgbGV4aWNOYW1lKTtcblx0cmV0dXJuIGxleGljO1xufTtcblxuLy8gcmV0dXJuIHNwZWNpZmllZCBhY3Rpb25zLlxuQmFiZWx1dGUuZ2V0QWN0aW9ucyA9IGZ1bmN0aW9uKGFjdGlvbnNOYW1lKSB7XG5cdHZhciBhY3Rpb25zID0gYWN0aW9uc0RpY29bYWN0aW9uc05hbWVdO1xuXHRpZiAoIWFjdGlvbnMpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdCYWJlbHV0ZSA6IGFjdGlvbnMgbm90IGZvdW5kIDogJyArIGFjdGlvbnNOYW1lKTtcblx0cmV0dXJuIGFjdGlvbnM7XG59O1xuXG4vKipcbiAqIEFkZCBtZXRob2QocykgdG8gc3BlY2lmaWVkIGxleGljXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGxleGljTmFtZSAgXHR0aGUgbmFtZSBvZiB0aGUgbGV4aWMgd2hlcmUgaGFwcGVuaW5nIG1ldGhvZChzKVxuICogQHBhcmFtICB7U3RyaW5nIHwgQXJyYXkgfCBPYmplY3R9IFx0SWYgaXMgc3RyaW5nIDogaXQncyB0aGUgbmFtZSBvZiB0aGUgbWV0aG9kLiBJZiBpcyBhcnJheSBvZiBzdHJpbmcgOiBlYWNoIHN0cmluZyBpcyB0aGUgbmFtZSBvZiBhIGxvZ2ljYWwgYXRvbSBtZXRob2QuIElmIGlzIGFuIG9iamVjdCA6IGl0J3MgdXNlZCBhcyBhIG1hcCBvZiBtZXRob2RzLlxuICogQHBhcmFtICB7RnVuY3Rpb259IG1ldGhvZCAgICB0aGUgbWV0aG9kIGZ1bmN0aW9uLiB1c2VkIG9ubHkgaWYgbWV0aG9OYW1lIGlzIGEgc3RyaW5nLlxuICogQHJldHVybiB7QmFiZWx1dGV9ICAgXHRcdEJhYmVsdXRlIGZvciBjaGFpbmluZ1xuICovXG5CYWJlbHV0ZS50b0xleGljID0gZnVuY3Rpb24obGV4aWNOYW1lLCBtZXRob2ROYW1lLCBtZXRob2QpIHtcblx0dmFyIGxleGljID0gbGV4aWNzRGljb1tsZXhpY05hbWVdIHx8IGluaXRMZXhpYyhsZXhpY05hbWUpO1xuXHRpZiAodHlwZW9mIG1ldGhvZE5hbWUgPT09ICdvYmplY3QnKSB7XG5cdFx0aWYgKG1ldGhvZE5hbWUuZm9yRWFjaCkgeyAvLyBsb2dpY2FsIGF0b21zLiBwdXJlIHNpbmdsZSBfYXBwZW5kXG5cdFx0XHRtZXRob2ROYW1lLmZvckVhY2goZnVuY3Rpb24obWV0aG9kTmFtZSkge1xuXHRcdFx0XHRhZGRMZXhlbShsZXhpYywgbGV4aWNOYW1lLCBtZXRob2ROYW1lKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZVxuXHRcdFx0Zm9yICh2YXIgaSBpbiBtZXRob2ROYW1lKSB7XG5cdFx0XHRcdGlmIChpID09PSAnX19iYWJlbHV0ZV9fJyB8fCBpID09PSAnX2xleGVtcycpXG5cdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdGFkZExleGVtKGxleGljLCBsZXhpY05hbWUsIGksIG1ldGhvZE5hbWVbaV0pO1xuXHRcdFx0fVxuXHR9IGVsc2Vcblx0XHRhZGRMZXhlbShsZXhpYywgbGV4aWNOYW1lLCBtZXRob2ROYW1lLCBtZXRob2QpO1xuXHRyZXR1cm4gQmFiZWx1dGU7XG59O1xuXG5mdW5jdGlvbiBhZGRMZXhlbShsZXhpYywgbGV4aWNOYW1lLCBtZXRob2ROYW1lLCBtZXRob2QpIHtcblx0dmFyIGZpcnN0TGV2ZWxQcm90byA9IGxleGljLkZpcnN0TGV2ZWxDbC5wcm90b3R5cGU7XG5cdGZpcnN0TGV2ZWxQcm90b1ttZXRob2ROYW1lXSA9IGdldEZpcnN0TGV2ZWxNZXRob2QobGV4aWNOYW1lLCBtZXRob2ROYW1lKTtcblx0bGV4aWMuQ2wucHJvdG90eXBlW21ldGhvZE5hbWVdID0gbWV0aG9kIHx8IGZpcnN0TGV2ZWxQcm90b1ttZXRob2ROYW1lXTtcblx0YWRkVG9Jbml0aWFsaXplcihsZXhpYywgbWV0aG9kTmFtZSk7XG59XG5cbi8qKlxuICogQWRkIGFjdGlvbidzIG1ldGhvZCB0byBzcGVjaWZpZWQgYWN0aW9uc0RpY28gbmFtZXNwYWNlc1xuICogQHBhcmFtICB7U3RyaW5nfSBhY3Rpb25zTmFtZSBcdG5hbWVzcGFjZSBvZiBhY3Rpb25zRGljbyB3aGVyZSBzdG9yZSBtZXRob2QocylcbiAqIEBwYXJhbSAge1N0cmluZyB8IE9iamVjdH0gXHRcdG1ldGhvZE5hbWUgIHRoZSBuYW1lIG9mIHRoZSBtw6l0aG9kIG9yIGEgbWFwIChvYmplY3QpIG9mIG1ldGhvZHNcbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBtZXRob2QgICAgICBcdHRoZSBtZXRob2QgZnVuY3Rpb24uICh1c2VkIG9ubHkgaWYgbWV0aG9kTmFtZSBpcyBhIHN0cmluZylcbiAqIEByZXR1cm4ge0JhYmVsdXRlfSAgICAgICAgICAgICBcdEJhYmVsdXRlIGZvciBjaGFpbmluZy5cbiAqL1xuQmFiZWx1dGUudG9BY3Rpb25zID0gZnVuY3Rpb24oYWN0aW9uc05hbWUsIG1ldGhvZE5hbWUsIG1ldGhvZCkge1xuXHR2YXIgYWN0aW9ucyA9IGFjdGlvbnNEaWNvW2FjdGlvbnNOYW1lXSA9IGFjdGlvbnNEaWNvW2FjdGlvbnNOYW1lXSB8fCDCoHt9O1xuXHRpZiAodHlwZW9mIG1ldGhvZE5hbWUgPT09ICdvYmplY3QnKSB7XG5cdFx0Zm9yICh2YXIgaSBpbiBtZXRob2ROYW1lKSB7XG5cdFx0XHRpZiAoaSA9PT0gJ19fcmVzdHJpY3Rpb25zX18nKSB7XG5cdFx0XHRcdGFjdGlvbnMuX19yZXN0cmljdGlvbnNfXyA9IGFjdGlvbnMuX19yZXN0cmljdGlvbnNfXyB8fCB7fTtcblx0XHRcdFx0Zm9yICh2YXIgaiBpbiBtZXRob2ROYW1lW2ldKVxuXHRcdFx0XHRcdGFjdGlvbnNbaV1bal0gPSBtZXRob2ROYW1lW2ldW2pdO1xuXHRcdFx0fSBlbHNlXG5cdFx0XHRcdGFjdGlvbnNbaV0gPSBtZXRob2ROYW1lW2ldO1xuXHRcdH1cblx0fSBlbHNlIGlmIChtZXRob2ROYW1lID09PSAnX19yZXN0cmljdGlvbnNfXycpIHtcblx0XHRhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX18gPSBhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX18gfHwge307XG5cdFx0Zm9yICh2YXIgaiBpbiBtZXRob2QpXG5cdFx0XHRhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX19bal0gPSBtZXRob2Rbal07XG5cdH0gZWxzZVxuXHRcdGFjdGlvbnNbbWV0aG9kTmFtZV0gPSBtZXRob2Q7XG5cdHJldHVybiBCYWJlbHV0ZTtcbn07XG5cbi8vIGR1cGxpY2F0ZSBzcGVjaWZpZWQgbGV4aWMgdG8gbmV3TmFtZSBhbmQgYWRkIHByb3ZpZGVkIG1ldGhvZHMgdG8gaXQuXG5CYWJlbHV0ZS5leHRlbmRMZXhpYyA9IGZ1bmN0aW9uKGxleGljTmFtZSwgbmV3TmFtZSwgbWV0aG9kcykge1xuXHR2YXIgbGV4aWMgPSBCYWJlbHV0ZS5nZXRMZXhpYyhsZXhpY05hbWUpLFxuXHRcdG5ld0xleGljID0gaW5pdExleGljKG5ld05hbWUsIGxleGljKTtcblx0aWYgKG1ldGhvZHMpXG5cdFx0QmFiZWx1dGUudG9MZXhpYyhuZXdOYW1lLCBtZXRob2RzKTtcblx0cmV0dXJuIEJhYmVsdXRlO1xufTtcblxuLy8gZHVwbGljYXRlIHNwZWNpZmllZCBhY3Rpb25zIHRvIG5ld05hbWUgYW5kIGFkZCBwcm92aWRlZCBtZXRob2RzIHRvIGl0LlxuQmFiZWx1dGUuZXh0ZW5kQWN0aW9ucyA9IGZ1bmN0aW9uKGFjdGlvbnNOYW1lLCBuZXdOYW1lLCBtZXRob2RzKSB7XG5cdEJhYmVsdXRlLnRvQWN0aW9ucyhuZXdOYW1lLCBCYWJlbHV0ZS5nZXRBY3Rpb25zKGFjdGlvbnNOYW1lKSk7XG5cdGlmIChtZXRob2RzKVxuXHRcdEJhYmVsdXRlLnRvQWN0aW9ucyhuZXdOYW1lLCBtZXRob2RzKTtcblx0dmFyIGFjdGlvbnMgPSBhY3Rpb25zRGljb1tuZXdOYW1lXTtcblx0YWN0aW9ucy5fX3Jlc3RyaWN0aW9uc19fID0gYWN0aW9ucy5fX3Jlc3RyaWN0aW9uc19fIHx8IHt9O1xuXHRhY3Rpb25zLl9fcmVzdHJpY3Rpb25zX19bbmV3TmFtZV0gPSB0cnVlO1xuXHRyZXR1cm4gQmFiZWx1dGU7XG59O1xuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKioqKiogRW52aXJvbm1lbnQgKioqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqL1xuXG5mdW5jdGlvbiBFbnZpcm9ubWVudChhY3Rpb25zTmFtZSwgc2NvcGUpIHtcblx0dGhpcy5fX2JhYmVsdXRlX19lbnZfXyA9IHRydWU7XG5cdHRoaXMuYWN0aW9ucyA9IEJhYmVsdXRlLmdldEFjdGlvbnMoYWN0aW9uc05hbWUpO1xuXHR0aGlzLnNjb3BlID0gc2NvcGUgfHwgwqBudWxsO1xufVxuXG5FbnZpcm9ubWVudC5wcm90b3R5cGUgPSB7XG5cdHB1c2hTY29wZTogZnVuY3Rpb24obmFtZSwgaW5zdGFuY2UpIHtcblx0XHR0aGlzLnNjb3BlcyA9IHRoaXMuc2NvcGVzIHx8IFtdO1xuXHRcdHZhciBzY29wZSA9IHt9O1xuXHRcdGZvciAodmFyIGkgaW4gdGhpcy5zY29wZSlcblx0XHRcdHNjb3BlW2ldID0gdGhpcy5zY29wZVtpXTtcblx0XHRzY29wZVtpXSA9IGluc3RhbmNlO1xuXHRcdHRoaXMuc2NvcGVzLnB1c2goc2NvcGUpO1xuXHRcdHRoaXMuc2NvcGUgPSBzY29wZTtcblx0fSxcblx0cG9wU2NvcGU6IGZ1bmN0aW9uKG5hbWUpIHtcblx0XHRpZiAoIXRoaXMuc2NvcGVzKVxuXHRcdFx0cmV0dXJuO1xuXHRcdGlmICh0aGlzLnNjb3Blcy5sZW5ndGgpXG5cdFx0XHR0aGlzLnNjb3Blcy5wb3AoKTtcblx0XHR0aGlzLnNjb3BlID0gdGhpcy5zY29wZXNbdGhpcy5zY29wZXMubGVuZ3RoIC0gMV0gfHwgbnVsbDtcblx0fVxufTtcblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKiogVVRJTFMgKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuLy8gcGFyc2UgbGV4aWNOYW1lOm1ldGhvZE5hbWUgc3RyaW5nIGZvcm1hdCBhbmQgcmV0dXJuIG1ldGhvZCBmcm9tIGxleGljXG4vLyBhYnNvbHV0bHkgZm9yIGludGVybmFsIHVzZSBvbmx5LlxuZnVuY3Rpb24gZ2V0TWV0aG9kKHJlcSkge1xuXHR2YXIgc3BsaXR0ZWQgPSByZXEuc3BsaXQoJzonKSxcblx0XHRsZXhpY05hbWUgPSBzcGxpdHRlZFswXSxcblx0XHRsZXhpYyA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSksXG5cdFx0bWV0aG9kTmFtZSA9IHNwbGl0dGVkWzFdO1xuXHRpZiAoIWxleGljLkNsLnByb3RvdHlwZVttZXRob2ROYW1lXSlcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0JhYmVsdXRlIDogbWV0aG9kIG5vdCBmb3VuZCA6ICcgKyByZXEpO1xuXHR2YXIgaW5zdGFuY2UgPSBnZXRJbnN0YW5jZShsZXhpY05hbWUsIGxleGljKTtcblx0cmV0dXJuIGZ1bmN0aW9uKGxleGVtcywgYXJncykge1xuXHRcdGluc3RhbmNlLl9sZXhlbXMgPSBsZXhlbXM7XG5cdFx0aW5zdGFuY2VbbWV0aG9kTmFtZV0uYXBwbHkoaW5zdGFuY2UsIGFyZ3MpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGdldEluc3RhbmNlKGxleGljTmFtZSwgbGV4aWMpIHtcblx0aWYgKGxleGljLkluc3RhbmNlKVxuXHRcdHJldHVybiBsZXhpYy5JbnN0YW5jZTtcblx0dmFyIENsID0gbGV4aWMuQ2w7XG5cdHJldHVybiBsZXhpYy5JbnN0YW5jZSA9IG5ldyBDbCgpO1xufVxuXG5mdW5jdGlvbiBpbml0TGV4aWMobGV4aWNOYW1lLCBiYXNlTGV4aWMpIHtcblx0dmFyIEJhc2VDbGFzcyA9IChiYXNlTGV4aWMgJiYgYmFzZUxleGljLkNsKSB8fCBCYWJlbHV0ZSxcblx0XHRCYXNlRkxDbGFzcyA9IChiYXNlTGV4aWMgJiYgYmFzZUxleGljLkZpcnN0TGV2ZWxDbCkgfHwgQmFiZWx1dGU7XG5cblx0dmFyIENsID0gZnVuY3Rpb24oKSB7XG5cdFx0QmFzZUNsYXNzLmNhbGwodGhpcyk7XG5cdFx0dGhpcy5fX2JhYmVsdXRlX18gPSBsZXhpY05hbWU7XG5cdH07XG5cdENsLnByb3RvdHlwZSA9IG5ldyBCYXNlQ2xhc3MoKTtcblxuXHR2YXIgRmlyc3RMZXZlbENsID0gZnVuY3Rpb24oKSB7XG5cdFx0QmFzZUZMQ2xhc3MuY2FsbCh0aGlzKTtcblx0XHR0aGlzLl9fYmFiZWx1dGVfXyA9IGxleGljTmFtZTtcblx0fTtcblx0Rmlyc3RMZXZlbENsLnByb3RvdHlwZSA9IG5ldyBCYXNlRkxDbGFzcygpO1xuXG5cdGxleGljID0gbGV4aWNzRGljb1tsZXhpY05hbWVdID0ge1xuXHRcdENsOiBDbCxcblx0XHRGaXJzdExldmVsQ2w6IEZpcnN0TGV2ZWxDbFxuXHR9O1xuXHRpZiAoYmFzZUxleGljKSB7XG5cdFx0dmFyIG9sZEkgPSBiYXNlTGV4aWMuaW5pdGlhbGl6ZXIsXG5cdFx0XHRuZXdJID0gQmFiZWx1dGUuaW5pdGlhbGl6ZXIobGV4aWNOYW1lKTtcblx0XHRmb3IgKHZhciBpIGluIG9sZEkpIHtcblx0XHRcdGlmIChpID09PSAnX19iYWJlbHV0ZV9fJyB8fCBpID09PSAnX2xleGVtcycpXG5cdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0YWRkVG9Jbml0aWFsaXplcihsZXhpYywgaSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBsZXhpYztcbn1cblxuZnVuY3Rpb24gZ2V0Rmlyc3RMZXZlbE1ldGhvZChsZXhpY05hbWUsIG1ldGhvZE5hbWUpIHtcblx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLl9hcHBlbmQobGV4aWNOYW1lLCBtZXRob2ROYW1lLCBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykpO1xuXHR9O1xufVxuXG5CYWJlbHV0ZS5pbml0TGV4aWMgPSBpbml0TGV4aWM7XG5CYWJlbHV0ZS5FbnZpcm9ubWVudCA9IEVudmlyb25tZW50O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJhYmVsdXRlO1xuXG4vLyIsIi8qKlxuICogQSBGaXJzdExldmVsTm9kZSBpcyBqdXN0IGEgQmFibHV0ZSB0aGF0IGtlZXBzIGFueSBhcHBlbmRlZCBsZXhlbSBhdCB0b3AgbG9naWNhbCBsZXZlbCAodGhhdCBtZWFucyB0aGF0IGFueSBjb21wb3VuZGVkIGxleGVtIChtYWRlIHdpdGggb3RoZXIgbGV4ZW1zKSBpcyBhZGRlZCBhcyBhbiBhdG9taWMgbGV4ZW0pLlxuICogXG4gKiBBIEJhYmVsdXRlIERvY3VtZW50IGlzIGEgQmFiZWx1dGUgdGhhdCB5b3UgY291bGQgZWRpdC4gVGhpbmsgYWJvdXQgYSBYTUwvSFRNTCBEb2N1bWVudC5cbiAqIFRoZSBhaW0gaXMgdG8gYWxsb3cgZnVsbCBlZGl0aW9uIGFuZCBjb25zdHJ1Y3Rpb24gb2YgQmFiZWx1dGUgc2VudGVuY2VzLlxuICogKGJhYmVsdXRlIG5vZGUgd3JhcHBpbmcsIGluc2VydEJlZm9yZSwgcHJlcGVuZCwgcXVlcnkgbm9kZXMsIGV0YylcbiAqIFxuICogQSBGaXJzdExldmVsTm9kZSBkb2N1bWVudCwgdGhhdCBob2xkcyBvdGhlcnMgRmlyc3RMZXZlbE5vZGUgYXMgaW5uZXIgbGV4ZW1zLCBmb3JtcyBhIHZhbGlkIGJhYmVsdXRlLlxuICogRXZlcnkgY2FsbCBvbiBhIEZpcnN0TGV2ZWxOb2RlIGFyZSBqdXN0IGFwcGVuZGVkIHRvIGxleGVtcyBpbiBvYmplY3QgZm9ybSAoYWthIHsgbmFtZTpteUxleGVtTmFtZSwgYXJnczpbbXlBcmdzLi4uXSB9KS5cbiAqXG4gKiBTbyBpdCBrZWVwcyB0aGluZ3MgdGhlIG1vcmUgYWJzdHJhY3QgcG9zc2libGUuIFxuICogXG4gKiBUbyBiZWNhbWUgJG91dHB1dGFibGUgOiBpdCBuZWVkcyBhbiBhZGRpdGlvbmFsIHRyYW5zbGF0aW9uIHRvIGl0c2VsZiAoc2VlIGRvY3MpLlxuICovXG5cbnZhciBCYWJlbHV0ZSA9IHJlcXVpcmUoJy4vYmFiZWx1dGUnKTtcblxudmFyIEZpcnN0TGV2ZWxOb2RlID0gZnVuY3Rpb24oKSB7XG5cdEJhYmVsdXRlLmNhbGwodGhpcyk7XG59O1xuXG5GaXJzdExldmVsTm9kZS5wcm90b3R5cGUgPSBuZXcgQmFiZWx1dGUoKTtcbkZpcnN0TGV2ZWxOb2RlLnByb3RvdHlwZS5iYWJlbHV0ZSA9IGZ1bmN0aW9uKGxleGljTmFtZSkge1xuXHR2YXIgbGV4aWMgPSBCYWJlbHV0ZS5nZXRMZXhpYyhsZXhpY05hbWUpLFxuXHRcdENsID0gbGV4aWMuRmlyc3RMZXZlbENsLFxuXHRcdGIgPSBuZXcgQ2woKTtcblx0Yi5fbGV4ZW1zID0gdGhpcy5fbGV4ZW1zO1xuXHRyZXR1cm4gYjtcbn07XG5cbkJhYmVsdXRlLmZpcnN0TGV2ZWxJbml0aWFsaXplciA9IEZpcnN0TGV2ZWxOb2RlLmluaXRpYWxpemVyID0gZnVuY3Rpb24obGV4aWNOYW1lKSB7XG5cdHZhciBDbCA9IEJhYmVsdXRlLmdldExleGljKGxleGljTmFtZSkuRmlyc3RMZXZlbENsO1xuXHRyZXR1cm4gbGV4aWMuRmlyc3RMZXZlbEluaXRpYWxpemVyIHx8IChsZXhpYy5GaXJzdExldmVsSW5pdGlhbGl6ZXIgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gbmV3IENsKCk7XG5cdH0pO1xufTtcblxuQmFiZWx1dGUuZmlyc3RMZXZlbCA9IGZ1bmN0aW9uKGxleGljTmFtZSkge1xuXHRpZiAobGV4aWNOYW1lKVxuXHRcdHJldHVybiBGaXJzdExldmVsTm9kZS5pbml0aWFsaXplcihsZXhpY05hbWUpKCk7XG5cdHJldHVybiBuZXcgRmlyc3RMZXZlbE5vZGUoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmlyc3RMZXZlbE5vZGU7IiwiLyoqICBcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnMgPGdpbGxlcy5jb29tYW5zQGdtYWlsLmNvbT5cbiAqL1xuXG5mdW5jdGlvbiBnZXRNZXRob2QocGFyZW50LCBuYW1lKSB7XG5cdHZhciBtZXRob2QgPSBwYXJlbnRbbmFtZV07XG5cdGlmICghbWV0aG9kKVxuXHRcdHRocm93IG5ldyBFcnJvcignQmFiZWx1dGUgOiBubyBsZXhlbSBmb3VuZCBpbiBjdXJyZW50IGxleGljICgnICsgKHBhcmVudC5fX2JhYmVsdXRlX18gfHwgJ2RlZmF1bHQnKSArICcpIHdpdGggOicgKyBuYW1lKTtcblx0cmV0dXJuIG1ldGhvZDtcbn1cblxudmFyIGVsZW5waSA9IHJlcXVpcmUoJ2VsZW5waS92MicpLFxuXHRyID0gZWxlbnBpLnIsXG5cdFBhcnNlciA9IGVsZW5waS5QYXJzZXIsXG5cdEJhYmVsdXRlID0gcmVxdWlyZSgnLi9iYWJlbHV0ZScpLFxuXHRyZXBsYWNlU2luZ2xlU3RyaW5nID0gL1xcXFwnL2csXG5cdHJlcGxhY2VEb3VibGVTdHJpbmcgPSAvXFxcXFwiL2csXG5cdC8vIGdyYW1tYXIgc2hvcnRjdXQgbWFwICgxIGNoYXIgcHJldmlzdSkgZm9yIHZhbHVlc1xuXHR2YWx1ZVByZXZpc3VNYXAgPSB7XG5cdFx0JzEnOiAnbnVtYmVyJyxcblx0XHQnMic6ICdudW1iZXInLFxuXHRcdCczJzogJ251bWJlcicsXG5cdFx0JzQnOiAnbnVtYmVyJyxcblx0XHQnNSc6ICdudW1iZXInLFxuXHRcdCc2JzogJ251bWJlcicsXG5cdFx0JzcnOiAnbnVtYmVyJyxcblx0XHQnOCc6ICdudW1iZXInLFxuXHRcdCc5JzogJ251bWJlcicsXG5cdFx0JzAnOiAnbnVtYmVyJyxcblx0XHRcIidcIjogJ3NpbmdsZXN0cmluZycsXG5cdFx0J1wiJzogJ2RvdWJsZXN0cmluZycsXG5cdFx0J3snOiAnb2JqZWN0Jyxcblx0XHQnWyc6ICdhcnJheSdcblx0fSxcblx0cnVsZXMgPSB7XG5cdFx0Ly9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fXG5cdFx0YmFiZWx1dGU6IHIoKVxuXHRcdFx0LnNwYWNlKClcblx0XHRcdC5vbmVPck1vcmUoe1xuXHRcdFx0XHRydWxlOiAnbGV4ZW0nLFxuXHRcdFx0XHRzZXBhcmF0b3I6IHIoKS50ZXJtaW5hbCgvXlxccyovKSxcblx0XHRcdFx0cHVzaFRvOiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudExleGVtKys7XG5cdFx0XHRcdFx0aWYgKG9iai5sZXhpYyAmJiBvYmoubGV4aWMgIT09IGVudi5jdXJyZW50TGV4aWMpIHsgLy8gJ3Njb3BlZCcgbGV4aWMgbWFuYWdlbWVudFxuXHRcdFx0XHRcdFx0aWYgKHBhcmVudC5fX3N3YXBwZWRfXykgLy8gd2UgaGF2ZSBhbHJlYWR5IHB1c2ggc29tZXRoaW5nIGJlZm9yZSAoYWthIHNlY29uZCAob3IgbW9yZSkgbGV4aWMgY2hhbmdlIG9uIHNhbWUgYmFiZWx1dGUpXG5cdFx0XHRcdFx0XHRcdGVudi5sZXhpY3NbZW52LmxleGljcy5sZW5ndGggLSAxXSA9IGVudi5sZXhpYztcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0ZW52LmxleGljcy5wdXNoKG9iai5sZXhpYyk7IC8vIHB1c2ggbGV4aWMgdG8gc2NvcGVcblx0XHRcdFx0XHRcdGVudi5jdXJyZW50TGV4aWMgPSBvYmoubGV4aWM7XG5cdFx0XHRcdFx0XHR2YXIgbmV3UGFyZW50ID0gQmFiZWx1dGUuYihvYmoubGV4aWMpO1xuXHRcdFx0XHRcdFx0bmV3UGFyZW50Ll9sZXhlbXMgPSBwYXJlbnQuX2xleGVtcztcblx0XHRcdFx0XHRcdHBhcmVudC5fX3N3YXBwZWRfXyA9IG5ld1BhcmVudDtcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGVudi5hc0RvYykgLy8gdG9wIGxldmVsIGxleGVtXG5cdFx0XHRcdFx0XHQocGFyZW50Ll9fc3dhcHBlZF9fIHx8IHBhcmVudCkuX2FwcGVuZChlbnYuY3VycmVudExleGljLCBvYmoubmFtZSwgb2JqLmFyZ3MpO1xuXHRcdFx0XHRcdGVsc2UgeyAvLyB1c2UgY3VycmVudCBiYWJlbHV0ZSBsZXhpY1xuXHRcdFx0XHRcdFx0cGFyZW50ID0gcGFyZW50Ll9fc3dhcHBlZF9fIHx8IHBhcmVudDtcblx0XHRcdFx0XHRcdGdldE1ldGhvZChwYXJlbnQsIG9iai5uYW1lKS5hcHBseShwYXJlbnQsIG9iai5hcmdzKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQuZG9uZShmdW5jdGlvbihlbnYsIGJhYmVsdXRlKSB7XG5cdFx0XHRcdGlmIChiYWJlbHV0ZS5fX3N3YXBwZWRfXykgeyAvLyAnc2NvcGVkJyBsZXhpYyBtYW5hZ2VtZW50IDpcblx0XHRcdFx0XHQvLyBvbmUgbGV4aWMgaGFzIGJlZW4gcHVzaGVkIGZyb20gdGhpcyBiYWJlbHV0ZVxuXHRcdFx0XHRcdC8vIHNvIHBvcCB0byBwYXJlbnQgbGV4aWNcblx0XHRcdFx0XHRlbnYubGV4aWNzLnBvcCgpO1xuXHRcdFx0XHRcdGVudi5jdXJyZW50TGV4aWMgPSBlbnYubGV4aWNzW2Vudi5sZXhpY3MubGVuZ3RoIC0gMV07XG5cdFx0XHRcdFx0YmFiZWx1dGUuX19zd2FwcGVkX18gPSBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0LnNwYWNlKCksXG5cblx0XHRsZXhlbTogcigpLm9uZU9mKFxuXHRcdFx0Ly8gbGV4ZW0gKGFrYTogbmFtZShhcmcxLCBhcmcyLCAuLi4pKVxuXHRcdFx0cigpLnRlcm1pbmFsKC9eKFtcXHctX10rKVxccypcXChcXHMqLywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkgeyAvLyBsZXhlbSBuYW1lICsgJyAoICdcblx0XHRcdFx0b2JqLm5hbWUgPSBjYXBbMV07XG5cdFx0XHRcdG9iai5hcmdzID0gW107XG5cdFx0XHR9KVxuXHRcdFx0Lm9uZU9mKFxuXHRcdFx0XHRyKCkudGVybWluYWwoL15cXHMqXFwpLyksIC8vIGVuZCBwYXJlbnRoZXNpc1xuXG5cdFx0XHRcdHIoKVxuXHRcdFx0XHQub25lT3JNb3JlKHsgLy8gYXJndW1lbnRzXG5cdFx0XHRcdFx0cnVsZTogJ3ZhbHVlJyxcblx0XHRcdFx0XHRzZXBhcmF0b3I6IHIoKS50ZXJtaW5hbCgvXlxccyosXFxzKi8pLFxuXHRcdFx0XHRcdHB1c2hUbzogZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iaikge1xuXHRcdFx0XHRcdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudExleGVtVmFsdWVzKys7XG5cdFx0XHRcdFx0XHRwYXJlbnQuYXJncy5wdXNoKG9iai52YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQudGVybWluYWwoL15cXHMqXFwpLykgLy8gZW5kIHBhcmVudGhlc2lzXG5cdFx0XHQpLFxuXG5cdFx0XHQvLyBsZXhpYyBzZWxlY3RvciAoYWthIEBsZXhpYzopXG5cdFx0XHRyKCkudGVybWluYWwoL14jKFtcXHctX10rKTovLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7IC8vICdAJyArIGxleGljIG5hbWUgKyAnOidcblx0XHRcdFx0b2JqLmxleGljID0gY2FwWzFdO1xuXHRcdFx0fSlcblx0XHQpLFxuXG5cblx0XHQvKioqKioqKioqKipcblx0XHQgKiBWQUxVRVNcblx0XHQgKioqKioqKioqKiovXG5cdFx0dmFsdWU6IHIoKVxuXHRcdFx0LmRvbmUoZnVuY3Rpb24oZW52LCBvYmopIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIHNob3J0Y3V0IHdpdGggZmlyc3QgY2hhciBwcmV2aXN1IHRocm91Z2ggdmFsdWVNYXBcblx0XHRcdFx0ZW52LnBhcnNlci5leGVjKHZhbHVlUHJldmlzdU1hcFtlbnYuc3RyaW5nWzBdXSB8fCAnd29yZFZhbHVlJywgb2JqLCBlbnYpO1xuXHRcdFx0fSksXG5cblx0XHRudW1iZXI6IHIoKS50ZXJtaW5hbCgvXlswLTldKyhcXC5bMC05XSspPy8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdG9iai52YWx1ZSA9IGNhcFsxXSA/IHBhcnNlRmxvYXQoY2FwWzBdICsgY2FwWzFdLCAxMCkgOiBwYXJzZUludChjYXBbMF0sIDEwKTtcblx0XHR9KSxcblx0XHRzaW5nbGVzdHJpbmc6IHIoKS50ZXJtaW5hbCgvXicoKD86XFxcXCd8W14nXSkqKScvLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7XG5cdFx0XHRvYmoudmFsdWUgPSBjYXBbMV0ucmVwbGFjZShyZXBsYWNlU2luZ2xlU3RyaW5nLCBcIidcIik7XG5cdFx0fSksXG5cdFx0ZG91Ymxlc3RyaW5nOiByKCkudGVybWluYWwoL15cIigoPzpcXFxcXCJ8W15cIl0pKilcIi8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdG9iai52YWx1ZSA9IGNhcFsxXS5yZXBsYWNlKHJlcGxhY2VEb3VibGVTdHJpbmcsICdcIicpO1xuXHRcdH0pLFxuXG5cdFx0d29yZFZhbHVlOiByKClcblx0XHRcdC5vbmVPZihcblx0XHRcdFx0Ly8gdHJ1ZXxmYWxzZXxudWxsfHVuZGVmaW5lZHxOYU58SW5maW5pdHlcblx0XHRcdFx0cigpLnRlcm1pbmFsKC9eKD86dHJ1ZXxmYWxzZXxudWxsfHVuZGVmaW5lZHxOYU58SW5maW5pdHkpLywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0XHRcdHN3aXRjaCAoY2FwWzBdKSB7XG5cdFx0XHRcdFx0XHRjYXNlICd0cnVlJzpcblx0XHRcdFx0XHRcdFx0b2JqLnZhbHVlID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlICdmYWxzZSc6XG5cdFx0XHRcdFx0XHRcdG9iai52YWx1ZSA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgJ251bGwnOlxuXHRcdFx0XHRcdFx0XHRvYmoudmFsdWUgPSBudWxsO1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdGNhc2UgJ3VuZGVmaW5lZCc6XG5cdFx0XHRcdFx0XHRcdG9iai52YWx1ZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0XHRjYXNlICdOYU4nOlxuXHRcdFx0XHRcdFx0XHRvYmoudmFsdWUgPSBOYU47XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0Y2FzZSAnSW5maW5pdHknOlxuXHRcdFx0XHRcdFx0XHRvYmoudmFsdWUgPSBJbmZpbml0eTtcblx0XHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0Ly8gZnVuY3Rpb25cblx0XHRcdFx0cigpLm9uZSh7XG5cdFx0XHRcdFx0cnVsZTogJ2Z1bmN0aW9uJyxcblx0XHRcdFx0XHQvLyBwcmV2aXN1OiAnZicsXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdFx0XHRpZiAoZW52LmFjY2VwdEZ1bmN0aW9ucykgLy8gdG9kbyA6IGFkZCB3YXJuaW5nIHdoZW4gbm90IGFsbG93ZWQgYnV0IHByZXNlbnRcblx0XHRcdFx0XHRcdFx0cGFyZW50LnZhbHVlID0gRnVuY3Rpb24uYXBwbHkobnVsbCwgb2JqLmFyZ3MuY29uY2F0KG9iai5ibG9jaykpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdC8vIGJhYmVsdXRlc1xuXHRcdFx0XHRyKCkub25lKHtcblx0XHRcdFx0XHRydWxlOiAnYmFiZWx1dGUnLFxuXHRcdFx0XHRcdGFzOiBmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0XHRcdHJldHVybiBlbnYuYXNEb2MgPyBCYWJlbHV0ZS5kb2MoZW52LmN1cnJlbnRMZXhpYykgOiBCYWJlbHV0ZS5iKGVudi5jdXJyZW50TGV4aWMpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c2V0OiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdFx0XHRwYXJlbnQudmFsdWUgPSBvYmo7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0KSxcblxuXHRcdG9iamVjdDogcigpLm9uZSh7XG5cdFx0XHRydWxlOiByKClcblx0XHRcdFx0LnRlcm1pbmFsKC9eXFx7XFxzKi8pIC8vIHN0YXJ0IGJyYWNrZXRcblx0XHRcdFx0Lnplcm9Pck1vcmUoeyAvLyBwcm9wZXJ0aWVzXG5cdFx0XHRcdFx0cnVsZTogcigpXG5cdFx0XHRcdFx0XHQvLyBrZXlcblx0XHRcdFx0XHRcdC50ZXJtaW5hbCgvXihbXFx3LV9dKyl8XCIoW15cIl0qKVwifCcoW14nXSopJy8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdFx0XHRcdFx0b2JqLmtleSA9IGNhcFsxXTtcblx0XHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0XHQudGVybWluYWwoL15cXHMqOlxccyovKVxuXHRcdFx0XHRcdFx0Ly8gdmFsdWVcblx0XHRcdFx0XHRcdC5vbmUoJ3ZhbHVlJyksXG5cdFx0XHRcdFx0c2VwYXJhdG9yOiByKCkudGVybWluYWwoL15cXHMqLFxccyovKSxcblx0XHRcdFx0XHRwdXNoVG86IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHRcdHBhcmVudFtvYmoua2V5XSA9IG9iai52YWx1ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC50ZXJtaW5hbCgvXlxccypcXH0vKSwgLy8gZW5kIGJyYWNrZXRcblxuXHRcdFx0c2V0OiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdHBhcmVudC52YWx1ZSA9IG9iajtcblx0XHRcdH1cblx0XHR9KSxcblxuXHRcdGFycmF5OiByKCkub25lKHtcblx0XHRcdHJ1bGU6IHIoKVxuXHRcdFx0XHQudGVybWluYWwoL15cXFtcXHMqLykgLy8gc3RhcnQgc3F1YXJlIGJyYWNrZXRcblx0XHRcdFx0Lnplcm9Pck1vcmUoeyAvLyBpdGVtc1xuXHRcdFx0XHRcdHJ1bGU6ICd2YWx1ZScsXG5cdFx0XHRcdFx0c2VwYXJhdG9yOiByKCkudGVybWluYWwoL15cXHMqLFxccyovKSxcblx0XHRcdFx0XHRwdXNoVG86IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopIHtcblx0XHRcdFx0XHRcdHBhcmVudC5wdXNoKG9iai52YWx1ZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0XHQudGVybWluYWwoL15cXHMqXFxdLyksIC8vIGVuZCBzcXVhcmUgYnJhY2tldFxuXG5cblx0XHRcdGFzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0cmV0dXJuIFtdO1xuXHRcdFx0fSxcblx0XHRcdHNldDogZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iaikge1xuXHRcdFx0XHRwYXJlbnQudmFsdWUgPSBvYmo7XG5cdFx0XHR9XG5cdFx0fSksXG5cblx0XHQnZnVuY3Rpb24nOiByKClcblx0XHRcdC50ZXJtaW5hbCgvXmZ1bmN0aW9uXFxzKlxcKFxccyovLCBmdW5jdGlvbihlbnYsIG9iaiwgY2FwKSB7XG5cdFx0XHRcdG9iai5hcmdzID0gW107XG5cdFx0XHRcdG9iai5ibG9jayA9ICcnO1xuXHRcdFx0fSlcblx0XHRcdC56ZXJvT3JNb3JlKHsgLy8gYXJndW1lbnRzIGtleVxuXHRcdFx0XHRydWxlOiByKCkudGVybWluYWwoL15bXFx3LV9dKy8sICdrZXknKSxcblx0XHRcdFx0c2VwYXJhdG9yOiByKCkudGVybWluYWwoL15cXHMqLFxccyovKSxcblx0XHRcdFx0cHVzaFRvOiBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKSB7XG5cdFx0XHRcdFx0cGFyZW50LmFyZ3MucHVzaChvYmoua2V5KTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdC50ZXJtaW5hbCgvXlxccypcXClcXHMqXFx7Lylcblx0XHRcdC5vbmUoJ3Njb3BlQmxvY2snKVxuXHRcdFx0LmRvbmUoZnVuY3Rpb24oZW52LCBvYmopIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGxhc3QgdW5lZWRlZCAnfScgaW4gY2F0Y2hlZCBibG9jayAoaXQncyB0aGVyZSBmb3IgaW5uZXItYmxvY2tzIHJlY3Vyc2lvbilcblx0XHRcdFx0b2JqLmJsb2NrID0gb2JqLmJsb2NrLnN1YnN0cmluZygwLCBvYmouYmxvY2subGVuZ3RoIC0gMSk7XG5cdFx0XHR9KSxcblxuXHRcdHNjb3BlQmxvY2s6IHIoKSAvLyBmdW5jdGlvbiBzY29wZSBibG9jayAoYWZ0ZXIgZmlyc3QgJ3snKVxuXHRcdFx0Lm9uZU9mKFxuXHRcdFx0XHQvLyBpbm5lciBibG9jayByZWN1cnNpb25cblx0XHRcdFx0cigpLnRlcm1pbmFsKC9eW15cXHtcXH1dKlxcey8sIGZ1bmN0aW9uKGVudiwgb2JqLCBjYXApIHtcblx0XHRcdFx0XHRvYmouYmxvY2sgKz0gY2FwWzBdO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub25lT3JNb3JlKCdzY29wZUJsb2NrJyksXG5cblx0XHRcdFx0Ly8gZW5kIGJsb2NrIFxuXHRcdFx0XHRyKCkudGVybWluYWwoL15bXlxcfV0qXFx9LywgZnVuY3Rpb24oZW52LCBvYmosIGNhcCkge1xuXHRcdFx0XHRcdG9iai5ibG9jayArPSBjYXBbMF07XG5cdFx0XHRcdH0pXG5cdFx0XHQpXG5cdH07XG5cbkJhYmVsdXRlLlBhcnNlciA9IFBhcnNlcjtcblxudmFyIHBhcnNlciA9IG5ldyBQYXJzZXIocnVsZXMsICdiYWJlbHV0ZScpLFxuXHR0ZW1wbGF0ZUNhY2hlID0ge307XG5cbkJhYmVsdXRlLnBhcnNlID0gZnVuY3Rpb24oc3RyaW5nLCBvcHQpIHtcblx0b3B0ID0gb3B0IHx8IMKge307XG5cdHZhciBlbnYgPSB7fTtcblx0Zm9yICh2YXIgaSBpbiBvcHQpXG5cdFx0ZW52W2ldID0gb3B0W2ldO1xuXHRlbnYubGV4aWNzID0gW29wdC5tYWluTGV4aWNdO1xuXHRlbnYuY3VycmVudExleGljID0gb3B0Lm1haW5MZXhpYztcblx0cmV0dXJuIHBhcnNlci5wYXJzZShzdHJpbmcsICdiYWJlbHV0ZScsIEJhYmVsdXRlLmIob3B0Lm1haW5MZXhpYyksIGVudik7XG59XG5cbkJhYmVsdXRlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuXHRyZXR1cm4gSlNPTi5wYXJzZShqc29uLCBmdW5jdGlvbihrLCB2KSB7XG5cdFx0aWYgKCF2KVxuXHRcdFx0cmV0dXJuIHY7XG5cdFx0aWYgKHYuX19iYWJlbHV0ZWxleGVtX18pXG5cdFx0XHRyZXR1cm4gbmV3IEJhYmVsdXRlLkxleGVtKHYubGV4aWMsIHYubmFtZSwgdi5hcmdzKTtcblx0XHRpZiAodi5fX2JhYmVsdXRlX18pIHtcblx0XHRcdHZhciBiID0gbmV3IEJhYmVsdXRlKCk7XG5cdFx0XHRiLl9sZXhlbXMgPSB2Ll9sZXhlbXM7XG5cdFx0XHRyZXR1cm4gYjtcblx0XHR9XG5cdFx0cmV0dXJuIHY7XG5cdH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBhcnNlcjsiLCIvKipcbiAqIEBhdXRob3IgR2lsbGVzIENvb21hbnNcbiAqIEBsaWNlbmNlIE1JVFxuICogQGNvcHlyaWdodCAyMDE2IEdpbGxlcyBDb29tYW5zXG4gKi9cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqIFN0cmluZ2lmeSBCYWJlbHV0ZSB0byBzZXJpYWxpc2VkIGZvcm0gKGJlYXV0aWZpZWQgb3IgbWluaWZpZWQpXG4gKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxudmFyIEJhYmVsdXRlID0gcmVxdWlyZSgnLi9iYWJlbHV0ZScpO1xuXG4vLyB1dGlsc1xuZnVuY3Rpb24gcHVzaExleGljU2NvcGUob3B0LCBsZXhpYywgYWxyZWFkeVB1c2hlZCkge1xuXHRpZiAoYWxyZWFkeVB1c2hlZClcblx0XHRvcHQubGV4aWNTY29wZVtvcHQubGV4aWNTY29wZS5sZW5ndGggLSAxXSA9IGxleGljO1xuXHRlbHNlXG5cdFx0b3B0LmxleGljU2NvcGUucHVzaChsZXhpYyk7XG5cdG9wdC5jdXJyZW50TGV4aWMgPSBsZXhpYztcblx0cmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIHBvcExleGljU2NvcGUob3B0KSB7XG5cdG9wdC5sZXhpY1Njb3BlLnBvcCgpO1xuXHRvcHQuY3VycmVudExleGljID0gb3B0LmxleGljU2NvcGVbb3B0LmxleGljU2NvcGUubGVuZ3RoIC0gMV07XG59XG5cbmZ1bmN0aW9uIHJlbW92ZUxhc3RVbmRlZmluZWQoYXJyKSB7XG5cdHZhciBpbmRleCA9IGFyci5sZW5ndGgsXG5cdFx0bGVuID0gaW5kZXg7XG5cdHdoaWxlIChpbmRleCAmJiBhcnJbaW5kZXggLSAxXSA9PT0gdW5kZWZpbmVkKVxuXHRcdGluZGV4LS07XG5cdGlmIChpbmRleCA8IGxlbilcblx0XHRhcnIuc3BsaWNlKGluZGV4LCBsZW4gLSBpbmRleCk7XG5cdHJldHVybiBhcnI7XG59XG5cbi8qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICoqKioqKioqKiogYmVhdXR5ZnlcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZnVuY3Rpb24gYmVhdXR5TGV4ZW1zKGxleGVtcywgb3B0KSB7XG5cdHZhciBsZXhlbXNPdXRwdXQgPSBbXSxcblx0XHRvdXRsZW5ndGggPSAwLFxuXHRcdGl0ZW0sXG5cdFx0YXJncyxcblx0XHRsZXhpY1B1c2hlZCA9IGZhbHNlLFxuXHRcdG91dDtcblx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IGxleGVtcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuXHRcdGl0ZW0gPSBsZXhlbXNbaV07XG5cdFx0Ly8gaWYgKGl0ZW0udG9TdHJpbmdpZnkpXG5cdFx0Ly8gaXRlbSA9IGl0ZW0udG9TdHJpbmdpZnkoKTtcblx0XHRpZiAoaXRlbS5sZXhpYyAhPT0gb3B0LmN1cnJlbnRMZXhpYykge1xuXHRcdFx0b3V0ID0gJyMnICsgaXRlbS5sZXhpYyArICc6Jztcblx0XHRcdGxleGVtc091dHB1dC5wdXNoKG91dCk7XG5cdFx0XHRsZXhpY1B1c2hlZCA9IHB1c2hMZXhpY1Njb3BlKG9wdCwgaXRlbS5sZXhpYywgbGV4aWNQdXNoZWQpO1xuXHRcdH1cblx0XHRpZiAoaXRlbS5hcmdzKSB7XG5cdFx0XHRhcmdzID0gYmVhdXR5QXJyYXlWYWx1ZXMocmVtb3ZlTGFzdFVuZGVmaW5lZChpdGVtLmFyZ3MpLCBvcHQpO1xuXHRcdFx0Ly8gYWRkIHJldHVybnNcblx0XHRcdGlmICgoaXRlbS5hcmdzLmxlbmd0aCA+IDEgfHwgKGl0ZW0uYXJnc1swXSAmJiBpdGVtLmFyZ3NbMF0uX19iYWJlbHV0ZV9fKSkgJiYgYXJncy5sZW5ndGggPiBvcHQubWF4TGVuZ3RoKVxuXHRcdFx0XHRvdXQgPSBpdGVtLm5hbWUgKyAnKFxcblxcdCcgKyBhcmdzLnJlcGxhY2UoL1xcbi9nLCBmdW5jdGlvbihzKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHMgKyAnXFx0Jztcblx0XHRcdFx0fSkgKyAnXFxuKSc7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdG91dCA9IGl0ZW0ubmFtZSArICcoJyArIGFyZ3MgKyAnKSc7XG5cdFx0fSBlbHNlXG5cdFx0XHRvdXQgPSBpdGVtLm5hbWUgKyAnKCknO1xuXG5cdFx0bGV4ZW1zT3V0cHV0LnB1c2gob3V0KTtcblx0XHRvdXRsZW5ndGggKz0gb3V0Lmxlbmd0aDtcblx0fVxuXHRpZiAobGV4aWNQdXNoZWQpXG5cdFx0cG9wTGV4aWNTY29wZShvcHQpO1xuXHRvdXRsZW5ndGggKz0gbGV4ZW1zLmxlbmd0aCAtIDE7XG5cdHJldHVybiBsZXhlbXNPdXRwdXQuam9pbigob3V0bGVuZ3RoID4gb3B0Lm1heExlbmd0aCkgPyAnXFxuJyA6ICcgJyk7XG59XG5cbmZ1bmN0aW9uIGJlYXV0eUFycmF5KGFyciwgb3B0KSB7XG5cdHZhciBvdXQsIGFkZFJldHVybiwgbGVuID0gYXJyLmxlbmd0aDtcblx0aWYgKCFsZW4pXG5cdFx0cmV0dXJuICdbXSc7XG5cdG91dCA9IGJlYXV0eUFycmF5VmFsdWVzKGFyciwgb3B0KTtcblx0YWRkUmV0dXJuID0gKGxlbiA+IDEgJiYgb3V0Lmxlbmd0aCA+IG9wdC5tYXhMZW5ndGgpO1xuXHRpZiAoYWRkUmV0dXJuKVxuXHRcdHJldHVybiAnW1xcblxcdCcgKyBvdXQucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uKHMpIHtcblx0XHRcdHJldHVybiBzICsgJ1xcdCc7XG5cdFx0fSkgKyAnXFxuXSc7XG5cdHJldHVybiAnWycgKyBvdXQgKyAnXSc7XG59XG5cbmZ1bmN0aW9uIGJlYXV0eUFycmF5VmFsdWVzKGFyciwgb3B0KSB7XG5cdHZhciBsZW4gPSBhcnIubGVuZ3RoO1xuXHRpZiAoIWxlbilcblx0XHRyZXR1cm4gJyc7XG5cdHZhciBvdXQsXG5cdFx0dmFsdWVzID0gW10sXG5cdFx0b3V0bGVuZ3RoID0gMDtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuXHRcdG91dCA9IHZhbHVlVG9TdHJpbmcoYXJyW2ldLCBvcHQpO1xuXHRcdHZhbHVlcy5wdXNoKG91dCk7XG5cdFx0b3V0bGVuZ3RoICs9IG91dC5sZW5ndGg7XG5cdH1cblx0b3V0bGVuZ3RoICs9IGxlbiAtIDE7XG5cdHJldHVybiB2YWx1ZXMuam9pbigob3V0bGVuZ3RoID4gb3B0Lm1heExlbmd0aCkgPyAnLFxcbicgOiAnLCAnKTtcbn1cblxuZnVuY3Rpb24gYmVhdXR5T2JqZWN0KG9iaiwgb3B0KSB7XG5cdHZhciBvdXQsIGFkZFJldHVybjtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhvYmopO1xuXHRvdXQgPSBiZWF1dHlQcm9wZXJ0aWVzKG9iaiwga2V5cywgb3B0KTtcblx0aWYgKGtleXMubGVuZ3RoID4gMSAmJiBvdXQubGVuZ3RoID4gb3B0Lm1heExlbmd0aCkgeyAvLyBhZGQgcmV0dXJuc1xuXHRcdHJldHVybiAne1xcblxcdCcgKyBvdXQucmVwbGFjZSgvXFxuL2csIGZ1bmN0aW9uKHMpIHtcblx0XHRcdHJldHVybiBzICsgJ1xcdCc7XG5cdFx0fSkgKyAnXFxufSc7XG5cdH1cblx0cmV0dXJuICd7ICcgKyBvdXQgKyAnIH0nO1xufVxuXG5mdW5jdGlvbiBiZWF1dHlQcm9wZXJ0aWVzKG9iaiwga2V5cywgb3B0KSB7XG5cdHZhciBvdXQsXG5cdFx0dmFsdWVzID0gW10sXG5cdFx0b3V0bGVuZ3RoID0gMCxcblx0XHRrZXk7XG5cdGZvciAodmFyIGkgPSAwLCBsZW4gPSBrZXlzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0a2V5ID0ga2V5c1tpXTtcblx0XHRvdXQgPSB2YWx1ZVRvU3RyaW5nKG9ialtrZXldLCBvcHQpO1xuXHRcdG91dGxlbmd0aCArPSBvdXQubGVuZ3RoO1xuXHRcdHZhbHVlcy5wdXNoKGtleSArICc6ICcgKyBvdXQpO1xuXHR9XG5cdG91dGxlbmd0aCArPSBrZXlzLmxlbmd0aCAtIDE7XG5cdHJldHVybiAob3V0bGVuZ3RoID4gb3B0Lm1heExlbmd0aCkgPyB2YWx1ZXMuam9pbignLFxcbicpIDogdmFsdWVzLmpvaW4oJywgJyk7XG59XG5cblxuLyoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gKioqKioqKioqKiBtaW5pZnlcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuZnVuY3Rpb24gdmFsdWVUb1N0cmluZyh2YWwsIG9wdCkge1xuXHRpZiAoIXZhbClcblx0XHRyZXR1cm4gdmFsICsgJyc7XG5cdHN3aXRjaCAodHlwZW9mIHZhbCkge1xuXHRcdGNhc2UgJ29iamVjdCc6XG5cdFx0XHRpZiAodmFsLl9fYmFiZWx1dGVfXylcblx0XHRcdFx0cmV0dXJuIHZhbC5fc3RyaW5naWZ5KG9wdCk7XG5cdFx0XHRpZiAodmFsLmZvckVhY2gpXG5cdFx0XHRcdHJldHVybiAob3B0LmJlYXV0aWZ5KSA/IGJlYXV0eUFycmF5KHZhbCwgb3B0KSA6ICdbJyArIGFycmF5VG9TdHJpbmcodmFsLCBvcHQpICsgJ10nO1xuXHRcdFx0cmV0dXJuIChvcHQuYmVhdXRpZnkpID8gYmVhdXR5T2JqZWN0KHZhbCwgb3B0KSA6IG9iamVjdFRvU3RyaW5nKHZhbCwgb3B0KTtcblx0XHRjYXNlICdzdHJpbmcnOlxuXHRcdFx0Ly8gcmV0dXJuICdcIicgKyB2YWwucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJzsgLy8gYWRkcyBxdW90ZXMgYW5kIGVzY2FwZXMgY29udGVudFxuXHRcdFx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHZhbCk7IC8vIGFkZHMgcXVvdGVzIGFuZCBlc2NhcGVzIGNvbnRlbnRcblx0XHRjYXNlICdmdW5jdGlvbic6XG5cdFx0XHR2YXIgb3V0ID0gKHZhbCArICcnKS5yZXBsYWNlKC9hbm9ueW1vdXMvLCAnJykucmVwbGFjZSgvXFxuXFwvXFwqXFwqXFwvLywgJycpO1xuXHRcdFx0cmV0dXJuIG9wdC5iZWF1dGlmeSA/IG91dCA6IG91dC5yZXBsYWNlKC9gW15gXSpgfFxcblxccyovZywgZnVuY3Rpb24odmFsKSB7XG5cdFx0XHRcdHJldHVybiB2YWxbMF0gPT09IFwiYFwiID8gdmFsIDogJyAnO1xuXHRcdFx0fSk7XG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiB2YWwgKyAnJztcblx0fVxufVxuXG5mdW5jdGlvbiBhcnJheVRvU3RyaW5nKGFyciwgb3B0KSB7XG5cdGlmICghYXJyLmxlbmd0aClcblx0XHRyZXR1cm4gJyc7XG5cdC8vIG1hcCBvdXRwdXRcblx0dmFyIG91dCA9ICcnO1xuXHRmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgKytpKVxuXHRcdG91dCArPSAoaSA/ICcsJyA6ICcnKSArIHZhbHVlVG9TdHJpbmcoYXJyW2ldLCBvcHQpO1xuXHRyZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvYmosIG9wdCkge1xuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaiksXG5cdFx0b3V0ID0gJycsXG5cdFx0a2V5O1xuXHRmb3IgKHZhciBpID0gMCwgbGVuID0ga2V5cy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuXHRcdGtleSA9IGtleXNbaV07XG5cdFx0b3V0ICs9IChpID8gJywnIDogJycpICsga2V5ICsgJzonICsgdmFsdWVUb1N0cmluZyhvYmpba2V5XSwgb3B0KTtcblx0fVxuXHRyZXR1cm4gJ3snICsgb3V0ICsgJ30nO1xufVxuXG4vKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAqKioqKioqKioqIGVuZCBtaW5pZnlcbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKi9cblxuQmFiZWx1dGUucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG5cdHJldHVybiB0aGlzLl9zdHJpbmdpZnkoKTtcbn07XG5cbkJhYmVsdXRlLnByb3RvdHlwZS5fc3RyaW5naWZ5ID0gZnVuY3Rpb24ob3B0KSB7XG5cblx0b3B0ID0gb3B0IHx8IMKge307XG5cdG9wdC5sZXhpY1Njb3BlID0gb3B0LmxleGljU2NvcGUgfHwgW107XG5cblx0aWYgKG9wdC5iZWF1dGlmeSkge1xuXHRcdG9wdC5tYXhMZW5ndGggPSBvcHQubWF4TGVuZ3RoIHx8IDIwO1xuXHRcdHJldHVybiBiZWF1dHlMZXhlbXModGhpcy5fbGV4ZW1zLCBvcHQpO1xuXHR9XG5cblx0Ly8gZWxzZSBtaW5pZml5IGxleGVtc1xuXHR2YXIgbGV4ZW1zID0gdGhpcy5fbGV4ZW1zLFxuXHRcdG91dCA9ICcnLFxuXHRcdGl0ZW0sXG5cdFx0bGV4aWNQdXNoZWQgPSBmYWxzZTtcblxuXHRmb3IgKHZhciBpID0gMCwgbGVuID0gbGV4ZW1zLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0aXRlbSA9IGxleGVtc1tpXTtcblx0XHRpZiAoaXRlbS5sZXhpYyAhPT0gb3B0LmN1cnJlbnRMZXhpYykge1xuXHRcdFx0b3V0ICs9ICcjJyArIGl0ZW0ubGV4aWMgKyAnOic7XG5cdFx0XHRsZXhpY1B1c2hlZCA9IHB1c2hMZXhpY1Njb3BlKG9wdCwgaXRlbS5sZXhpYywgbGV4aWNQdXNoZWQpO1xuXHRcdH1cblx0XHRvdXQgKz0gaXRlbS5uYW1lICsgJygnICsgKGl0ZW0uYXJncyA/IGFycmF5VG9TdHJpbmcocmVtb3ZlTGFzdFVuZGVmaW5lZChpdGVtLmFyZ3MpLCBvcHQpIDogJycpICsgJyknO1xuXHR9XG5cblx0aWYgKGxleGljUHVzaGVkKVxuXHRcdHBvcExleGljU2NvcGUob3B0KTtcblxuXHRyZXR1cm4gb3V0O1xufTtcblxuQmFiZWx1dGUuYXJyYXlUb1N0cmluZyA9IGFycmF5VG9TdHJpbmc7XG5CYWJlbHV0ZS5vYmplY3RUb1N0cmluZyA9IG9iamVjdFRvU3RyaW5nO1xuQmFiZWx1dGUudmFsdWVUb1N0cmluZyA9IHZhbHVlVG9TdHJpbmc7IiwidmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhZGRFdmVudFxuXG5mdW5jdGlvbiBhZGRFdmVudCh0YXJnZXQsIHR5cGUsIGhhbmRsZXIpIHtcbiAgICB2YXIgZXZlbnRzID0gRXZTdG9yZSh0YXJnZXQpXG4gICAgdmFyIGV2ZW50ID0gZXZlbnRzW3R5cGVdXG5cbiAgICBpZiAoIWV2ZW50KSB7XG4gICAgICAgIGV2ZW50c1t0eXBlXSA9IGhhbmRsZXJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnQpKSB7XG4gICAgICAgIGlmIChldmVudC5pbmRleE9mKGhhbmRsZXIpID09PSAtMSkge1xuICAgICAgICAgICAgZXZlbnQucHVzaChoYW5kbGVyKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudCAhPT0gaGFuZGxlcikge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBbZXZlbnQsIGhhbmRsZXJdXG4gICAgfVxufVxuIiwidmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIEV2U3RvcmUgPSByZXF1aXJlKFwiZXYtc3RvcmVcIilcbnZhciBjcmVhdGVTdG9yZSA9IHJlcXVpcmUoXCJ3ZWFrbWFwLXNoaW0vY3JlYXRlLXN0b3JlXCIpXG5cbnZhciBhZGRFdmVudCA9IHJlcXVpcmUoXCIuL2FkZC1ldmVudC5qc1wiKVxudmFyIHJlbW92ZUV2ZW50ID0gcmVxdWlyZShcIi4vcmVtb3ZlLWV2ZW50LmpzXCIpXG52YXIgUHJveHlFdmVudCA9IHJlcXVpcmUoXCIuL3Byb3h5LWV2ZW50LmpzXCIpXG5cbnZhciBIQU5ETEVSX1NUT1JFID0gY3JlYXRlU3RvcmUoKVxuXG5tb2R1bGUuZXhwb3J0cyA9IERPTURlbGVnYXRvclxuXG5mdW5jdGlvbiBET01EZWxlZ2F0b3IoZG9jdW1lbnQpIHtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgRE9NRGVsZWdhdG9yKSkge1xuICAgICAgICByZXR1cm4gbmV3IERPTURlbGVnYXRvcihkb2N1bWVudCk7XG4gICAgfVxuXG4gICAgZG9jdW1lbnQgPSBkb2N1bWVudCB8fCBnbG9iYWxEb2N1bWVudFxuXG4gICAgdGhpcy50YXJnZXQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnRcbiAgICB0aGlzLmV2ZW50cyA9IHt9XG4gICAgdGhpcy5yYXdFdmVudExpc3RlbmVycyA9IHt9XG4gICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnMgPSB7fVxufVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBhZGRFdmVudFxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gcmVtb3ZlRXZlbnRcblxuRE9NRGVsZWdhdG9yLmFsbG9jYXRlSGFuZGxlID1cbiAgICBmdW5jdGlvbiBhbGxvY2F0ZUhhbmRsZShmdW5jKSB7XG4gICAgICAgIHZhciBoYW5kbGUgPSBuZXcgSGFuZGxlKClcblxuICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZSkuZnVuYyA9IGZ1bmM7XG5cbiAgICAgICAgcmV0dXJuIGhhbmRsZVxuICAgIH1cblxuRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZSA9XG4gICAgZnVuY3Rpb24gdHJhbnNmb3JtSGFuZGxlKGhhbmRsZSwgYnJvYWRjYXN0KSB7XG4gICAgICAgIHZhciBmdW5jID0gSEFORExFUl9TVE9SRShoYW5kbGUpLmZ1bmNcblxuICAgICAgICByZXR1cm4gdGhpcy5hbGxvY2F0ZUhhbmRsZShmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIGJyb2FkY2FzdChldiwgZnVuYyk7XG4gICAgICAgIH0pXG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmFkZEdsb2JhbEV2ZW50TGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIGFkZEdsb2JhbEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBmbikge1xuICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXTtcbiAgICAgICAgaWYgKGxpc3RlbmVycy5pbmRleE9mKGZuKSA9PT0gLTEpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5wdXNoKGZuKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5nbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSA9IGxpc3RlbmVycztcbiAgICB9XG5cbkRPTURlbGVnYXRvci5wcm90b3R5cGUucmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lciA9XG4gICAgZnVuY3Rpb24gcmVtb3ZlR2xvYmFsRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGZuKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lcnMgPSB0aGlzLmdsb2JhbExpc3RlbmVyc1tldmVudE5hbWVdIHx8IFtdO1xuXG4gICAgICAgIHZhciBpbmRleCA9IGxpc3RlbmVycy5pbmRleE9mKGZuKVxuICAgICAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICB9XG4gICAgfVxuXG5ET01EZWxlZ2F0b3IucHJvdG90eXBlLmxpc3RlblRvID0gZnVuY3Rpb24gbGlzdGVuVG8oZXZlbnROYW1lKSB7XG4gICAgaWYgKCEoZXZlbnROYW1lIGluIHRoaXMuZXZlbnRzKSkge1xuICAgICAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdID0gMDtcbiAgICB9XG5cbiAgICB0aGlzLmV2ZW50c1tldmVudE5hbWVdKys7XG5cbiAgICBpZiAodGhpcy5ldmVudHNbZXZlbnROYW1lXSAhPT0gMSkge1xuICAgICAgICByZXR1cm5cbiAgICB9XG5cbiAgICB2YXIgbGlzdGVuZXIgPSB0aGlzLnJhd0V2ZW50TGlzdGVuZXJzW2V2ZW50TmFtZV1cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdID1cbiAgICAgICAgICAgIGNyZWF0ZUhhbmRsZXIoZXZlbnROYW1lLCB0aGlzKVxuICAgIH1cblxuICAgIHRoaXMudGFyZ2V0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBsaXN0ZW5lciwgdHJ1ZSlcbn1cblxuRE9NRGVsZWdhdG9yLnByb3RvdHlwZS51bmxpc3RlblRvID0gZnVuY3Rpb24gdW5saXN0ZW5UbyhldmVudE5hbWUpIHtcbiAgICBpZiAoIShldmVudE5hbWUgaW4gdGhpcy5ldmVudHMpKSB7XG4gICAgICAgIHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gPSAwO1xuICAgIH1cblxuICAgIGlmICh0aGlzLmV2ZW50c1tldmVudE5hbWVdID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgdW5saXN0ZW5lZCB0byBldmVudC5cIik7XG4gICAgfVxuXG4gICAgdGhpcy5ldmVudHNbZXZlbnROYW1lXS0tO1xuXG4gICAgaWYgKHRoaXMuZXZlbnRzW2V2ZW50TmFtZV0gIT09IDApIHtcbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5yYXdFdmVudExpc3RlbmVyc1tldmVudE5hbWVdXG5cbiAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcImRvbS1kZWxlZ2F0b3IjdW5saXN0ZW5UbzogY2Fubm90IFwiICtcbiAgICAgICAgICAgIFwidW5saXN0ZW4gdG8gXCIgKyBldmVudE5hbWUpXG4gICAgfVxuXG4gICAgdGhpcy50YXJnZXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGxpc3RlbmVyLCB0cnVlKVxufVxuXG5mdW5jdGlvbiBjcmVhdGVIYW5kbGVyKGV2ZW50TmFtZSwgZGVsZWdhdG9yKSB7XG4gICAgdmFyIGdsb2JhbExpc3RlbmVycyA9IGRlbGVnYXRvci5nbG9iYWxMaXN0ZW5lcnM7XG4gICAgdmFyIGRlbGVnYXRvclRhcmdldCA9IGRlbGVnYXRvci50YXJnZXQ7XG5cbiAgICByZXR1cm4gaGFuZGxlclxuXG4gICAgZnVuY3Rpb24gaGFuZGxlcihldikge1xuICAgICAgICB2YXIgZ2xvYmFsSGFuZGxlcnMgPSBnbG9iYWxMaXN0ZW5lcnNbZXZlbnROYW1lXSB8fCBbXVxuXG4gICAgICAgIGlmIChnbG9iYWxIYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICB2YXIgZ2xvYmFsRXZlbnQgPSBuZXcgUHJveHlFdmVudChldik7XG4gICAgICAgICAgICBnbG9iYWxFdmVudC5jdXJyZW50VGFyZ2V0ID0gZGVsZWdhdG9yVGFyZ2V0O1xuICAgICAgICAgICAgY2FsbExpc3RlbmVycyhnbG9iYWxIYW5kbGVycywgZ2xvYmFsRXZlbnQpXG4gICAgICAgIH1cblxuICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKGV2LnRhcmdldCwgZXYsIGV2ZW50TmFtZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpbmRBbmRJbnZva2VMaXN0ZW5lcnMoZWxlbSwgZXYsIGV2ZW50TmFtZSkge1xuICAgIHZhciBsaXN0ZW5lciA9IGdldExpc3RlbmVyKGVsZW0sIGV2ZW50TmFtZSlcblxuICAgIGlmIChsaXN0ZW5lciAmJiBsaXN0ZW5lci5oYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHZhciBsaXN0ZW5lckV2ZW50ID0gbmV3IFByb3h5RXZlbnQoZXYpO1xuICAgICAgICBsaXN0ZW5lckV2ZW50LmN1cnJlbnRUYXJnZXQgPSBsaXN0ZW5lci5jdXJyZW50VGFyZ2V0XG4gICAgICAgIGNhbGxMaXN0ZW5lcnMobGlzdGVuZXIuaGFuZGxlcnMsIGxpc3RlbmVyRXZlbnQpXG5cbiAgICAgICAgaWYgKGxpc3RlbmVyRXZlbnQuX2J1YmJsZXMpIHtcbiAgICAgICAgICAgIHZhciBuZXh0VGFyZ2V0ID0gbGlzdGVuZXIuY3VycmVudFRhcmdldC5wYXJlbnROb2RlXG4gICAgICAgICAgICBmaW5kQW5kSW52b2tlTGlzdGVuZXJzKG5leHRUYXJnZXQsIGV2LCBldmVudE5hbWUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldExpc3RlbmVyKHRhcmdldCwgdHlwZSkge1xuICAgIC8vIHRlcm1pbmF0ZSByZWN1cnNpb24gaWYgcGFyZW50IGlzIGBudWxsYFxuICAgIGlmICh0YXJnZXQgPT09IG51bGwgfHwgdHlwZW9mIHRhcmdldCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXR1cm4gbnVsbFxuICAgIH1cblxuICAgIHZhciBldmVudHMgPSBFdlN0b3JlKHRhcmdldClcbiAgICAvLyBmZXRjaCBsaXN0IG9mIGhhbmRsZXIgZm5zIGZvciB0aGlzIGV2ZW50XG4gICAgdmFyIGhhbmRsZXIgPSBldmVudHNbdHlwZV1cbiAgICB2YXIgYWxsSGFuZGxlciA9IGV2ZW50cy5ldmVudFxuXG4gICAgaWYgKCFoYW5kbGVyICYmICFhbGxIYW5kbGVyKSB7XG4gICAgICAgIHJldHVybiBnZXRMaXN0ZW5lcih0YXJnZXQucGFyZW50Tm9kZSwgdHlwZSlcbiAgICB9XG5cbiAgICB2YXIgaGFuZGxlcnMgPSBbXS5jb25jYXQoaGFuZGxlciB8fCBbXSwgYWxsSGFuZGxlciB8fCBbXSlcbiAgICByZXR1cm4gbmV3IExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpXG59XG5cbmZ1bmN0aW9uIGNhbGxMaXN0ZW5lcnMoaGFuZGxlcnMsIGV2KSB7XG4gICAgaGFuZGxlcnMuZm9yRWFjaChmdW5jdGlvbiAoaGFuZGxlcikge1xuICAgICAgICBpZiAodHlwZW9mIGhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgICAgaGFuZGxlcihldilcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgaGFuZGxlci5oYW5kbGVFdmVudCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBoYW5kbGVyLmhhbmRsZUV2ZW50KGV2KVxuICAgICAgICB9IGVsc2UgaWYgKGhhbmRsZXIudHlwZSA9PT0gXCJkb20tZGVsZWdhdG9yLWhhbmRsZVwiKSB7XG4gICAgICAgICAgICBIQU5ETEVSX1NUT1JFKGhhbmRsZXIpLmZ1bmMoZXYpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJkb20tZGVsZWdhdG9yOiB1bmtub3duIGhhbmRsZXIgXCIgK1xuICAgICAgICAgICAgICAgIFwiZm91bmQ6IFwiICsgSlNPTi5zdHJpbmdpZnkoaGFuZGxlcnMpKTtcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmZ1bmN0aW9uIExpc3RlbmVyKHRhcmdldCwgaGFuZGxlcnMpIHtcbiAgICB0aGlzLmN1cnJlbnRUYXJnZXQgPSB0YXJnZXRcbiAgICB0aGlzLmhhbmRsZXJzID0gaGFuZGxlcnNcbn1cblxuZnVuY3Rpb24gSGFuZGxlKCkge1xuICAgIHRoaXMudHlwZSA9IFwiZG9tLWRlbGVnYXRvci1oYW5kbGVcIlxufVxuIiwidmFyIEluZGl2aWR1YWwgPSByZXF1aXJlKFwiaW5kaXZpZHVhbFwiKVxudmFyIGN1aWQgPSByZXF1aXJlKFwiY3VpZFwiKVxudmFyIGdsb2JhbERvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxuXG52YXIgRE9NRGVsZWdhdG9yID0gcmVxdWlyZShcIi4vZG9tLWRlbGVnYXRvci5qc1wiKVxuXG52YXIgdmVyc2lvbktleSA9IFwiMTNcIlxudmFyIGNhY2hlS2V5ID0gXCJfX0RPTV9ERUxFR0FUT1JfQ0FDSEVAXCIgKyB2ZXJzaW9uS2V5XG52YXIgY2FjaGVUb2tlbktleSA9IFwiX19ET01fREVMRUdBVE9SX0NBQ0hFX1RPS0VOQFwiICsgdmVyc2lvbktleVxudmFyIGRlbGVnYXRvckNhY2hlID0gSW5kaXZpZHVhbChjYWNoZUtleSwge1xuICAgIGRlbGVnYXRvcnM6IHt9XG59KVxudmFyIGNvbW1vbkV2ZW50cyA9IFtcbiAgICBcImJsdXJcIiwgXCJjaGFuZ2VcIiwgXCJjbGlja1wiLCAgXCJjb250ZXh0bWVudVwiLCBcImRibGNsaWNrXCIsXG4gICAgXCJlcnJvclwiLFwiZm9jdXNcIiwgXCJmb2N1c2luXCIsIFwiZm9jdXNvdXRcIiwgXCJpbnB1dFwiLCBcImtleWRvd25cIixcbiAgICBcImtleXByZXNzXCIsIFwia2V5dXBcIiwgXCJsb2FkXCIsIFwibW91c2Vkb3duXCIsIFwibW91c2V1cFwiLFxuICAgIFwicmVzaXplXCIsIFwic2VsZWN0XCIsIFwic3VibWl0XCIsIFwidG91Y2hjYW5jZWxcIixcbiAgICBcInRvdWNoZW5kXCIsIFwidG91Y2hzdGFydFwiLCBcInVubG9hZFwiXG5dXG5cbi8qICBEZWxlZ2F0b3IgaXMgYSB0aGluIHdyYXBwZXIgYXJvdW5kIGEgc2luZ2xldG9uIGBET01EZWxlZ2F0b3JgXG4gICAgICAgIGluc3RhbmNlLlxuXG4gICAgT25seSBvbmUgRE9NRGVsZWdhdG9yIHNob3VsZCBleGlzdCBiZWNhdXNlIHdlIGRvIG5vdCB3YW50XG4gICAgICAgIGR1cGxpY2F0ZSBldmVudCBsaXN0ZW5lcnMgYm91bmQgdG8gdGhlIERPTS5cblxuICAgIGBEZWxlZ2F0b3JgIHdpbGwgYWxzbyBgbGlzdGVuVG8oKWAgYWxsIGV2ZW50cyB1bmxlc3NcbiAgICAgICAgZXZlcnkgY2FsbGVyIG9wdHMgb3V0IG9mIGl0XG4qL1xubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0b3JcblxuZnVuY3Rpb24gRGVsZWdhdG9yKG9wdHMpIHtcbiAgICBvcHRzID0gb3B0cyB8fCB7fVxuICAgIHZhciBkb2N1bWVudCA9IG9wdHMuZG9jdW1lbnQgfHwgZ2xvYmFsRG9jdW1lbnRcblxuICAgIHZhciBjYWNoZUtleSA9IGRvY3VtZW50W2NhY2hlVG9rZW5LZXldXG5cbiAgICBpZiAoIWNhY2hlS2V5KSB7XG4gICAgICAgIGNhY2hlS2V5ID1cbiAgICAgICAgICAgIGRvY3VtZW50W2NhY2hlVG9rZW5LZXldID0gY3VpZCgpXG4gICAgfVxuXG4gICAgdmFyIGRlbGVnYXRvciA9IGRlbGVnYXRvckNhY2hlLmRlbGVnYXRvcnNbY2FjaGVLZXldXG5cbiAgICBpZiAoIWRlbGVnYXRvcikge1xuICAgICAgICBkZWxlZ2F0b3IgPSBkZWxlZ2F0b3JDYWNoZS5kZWxlZ2F0b3JzW2NhY2hlS2V5XSA9XG4gICAgICAgICAgICBuZXcgRE9NRGVsZWdhdG9yKGRvY3VtZW50KVxuICAgIH1cblxuICAgIGlmIChvcHRzLmRlZmF1bHRFdmVudHMgIT09IGZhbHNlKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29tbW9uRXZlbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkZWxlZ2F0b3IubGlzdGVuVG8oY29tbW9uRXZlbnRzW2ldKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlbGVnYXRvclxufVxuXG5EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGUgPSBET01EZWxlZ2F0b3IuYWxsb2NhdGVIYW5kbGU7XG5EZWxlZ2F0b3IudHJhbnNmb3JtSGFuZGxlID0gRE9NRGVsZWdhdG9yLnRyYW5zZm9ybUhhbmRsZTtcbiIsIi8qKlxuICogY3VpZC5qc1xuICogQ29sbGlzaW9uLXJlc2lzdGFudCBVSUQgZ2VuZXJhdG9yIGZvciBicm93c2VycyBhbmQgbm9kZS5cbiAqIFNlcXVlbnRpYWwgZm9yIGZhc3QgZGIgbG9va3VwcyBhbmQgcmVjZW5jeSBzb3J0aW5nLlxuICogU2FmZSBmb3IgZWxlbWVudCBJRHMgYW5kIHNlcnZlci1zaWRlIGxvb2t1cHMuXG4gKlxuICogRXh0cmFjdGVkIGZyb20gQ0xDVFJcbiAqXG4gKiBDb3B5cmlnaHQgKGMpIEVyaWMgRWxsaW90dCAyMDEyXG4gKiBNSVQgTGljZW5zZVxuICovXG5cbi8qZ2xvYmFsIHdpbmRvdywgbmF2aWdhdG9yLCBkb2N1bWVudCwgcmVxdWlyZSwgcHJvY2VzcywgbW9kdWxlICovXG4oZnVuY3Rpb24gKGFwcCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBuYW1lc3BhY2UgPSAnY3VpZCcsXG4gICAgYyA9IDAsXG4gICAgYmxvY2tTaXplID0gNCxcbiAgICBiYXNlID0gMzYsXG4gICAgZGlzY3JldGVWYWx1ZXMgPSBNYXRoLnBvdyhiYXNlLCBibG9ja1NpemUpLFxuXG4gICAgcGFkID0gZnVuY3Rpb24gcGFkKG51bSwgc2l6ZSkge1xuICAgICAgdmFyIHMgPSBcIjAwMDAwMDAwMFwiICsgbnVtO1xuICAgICAgcmV0dXJuIHMuc3Vic3RyKHMubGVuZ3RoLXNpemUpO1xuICAgIH0sXG5cbiAgICByYW5kb21CbG9jayA9IGZ1bmN0aW9uIHJhbmRvbUJsb2NrKCkge1xuICAgICAgcmV0dXJuIHBhZCgoTWF0aC5yYW5kb20oKSAqXG4gICAgICAgICAgICBkaXNjcmV0ZVZhbHVlcyA8PCAwKVxuICAgICAgICAgICAgLnRvU3RyaW5nKGJhc2UpLCBibG9ja1NpemUpO1xuICAgIH0sXG5cbiAgICBzYWZlQ291bnRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGMgPSAoYyA8IGRpc2NyZXRlVmFsdWVzKSA/IGMgOiAwO1xuICAgICAgYysrOyAvLyB0aGlzIGlzIG5vdCBzdWJsaW1pbmFsXG4gICAgICByZXR1cm4gYyAtIDE7XG4gICAgfSxcblxuICAgIGFwaSA9IGZ1bmN0aW9uIGN1aWQoKSB7XG4gICAgICAvLyBTdGFydGluZyB3aXRoIGEgbG93ZXJjYXNlIGxldHRlciBtYWtlc1xuICAgICAgLy8gaXQgSFRNTCBlbGVtZW50IElEIGZyaWVuZGx5LlxuICAgICAgdmFyIGxldHRlciA9ICdjJywgLy8gaGFyZC1jb2RlZCBhbGxvd3MgZm9yIHNlcXVlbnRpYWwgYWNjZXNzXG5cbiAgICAgICAgLy8gdGltZXN0YW1wXG4gICAgICAgIC8vIHdhcm5pbmc6IHRoaXMgZXhwb3NlcyB0aGUgZXhhY3QgZGF0ZSBhbmQgdGltZVxuICAgICAgICAvLyB0aGF0IHRoZSB1aWQgd2FzIGNyZWF0ZWQuXG4gICAgICAgIHRpbWVzdGFtcCA9IChuZXcgRGF0ZSgpLmdldFRpbWUoKSkudG9TdHJpbmcoYmFzZSksXG5cbiAgICAgICAgLy8gUHJldmVudCBzYW1lLW1hY2hpbmUgY29sbGlzaW9ucy5cbiAgICAgICAgY291bnRlcixcblxuICAgICAgICAvLyBBIGZldyBjaGFycyB0byBnZW5lcmF0ZSBkaXN0aW5jdCBpZHMgZm9yIGRpZmZlcmVudFxuICAgICAgICAvLyBjbGllbnRzIChzbyBkaWZmZXJlbnQgY29tcHV0ZXJzIGFyZSBmYXIgbGVzc1xuICAgICAgICAvLyBsaWtlbHkgdG8gZ2VuZXJhdGUgdGhlIHNhbWUgaWQpXG4gICAgICAgIGZpbmdlcnByaW50ID0gYXBpLmZpbmdlcnByaW50KCksXG5cbiAgICAgICAgLy8gR3JhYiBzb21lIG1vcmUgY2hhcnMgZnJvbSBNYXRoLnJhbmRvbSgpXG4gICAgICAgIHJhbmRvbSA9IHJhbmRvbUJsb2NrKCkgKyByYW5kb21CbG9jaygpO1xuXG4gICAgICAgIGNvdW50ZXIgPSBwYWQoc2FmZUNvdW50ZXIoKS50b1N0cmluZyhiYXNlKSwgYmxvY2tTaXplKTtcblxuICAgICAgcmV0dXJuICAobGV0dGVyICsgdGltZXN0YW1wICsgY291bnRlciArIGZpbmdlcnByaW50ICsgcmFuZG9tKTtcbiAgICB9O1xuXG4gIGFwaS5zbHVnID0gZnVuY3Rpb24gc2x1ZygpIHtcbiAgICB2YXIgZGF0ZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpLnRvU3RyaW5nKDM2KSxcbiAgICAgIGNvdW50ZXIsXG4gICAgICBwcmludCA9IGFwaS5maW5nZXJwcmludCgpLnNsaWNlKDAsMSkgK1xuICAgICAgICBhcGkuZmluZ2VycHJpbnQoKS5zbGljZSgtMSksXG4gICAgICByYW5kb20gPSByYW5kb21CbG9jaygpLnNsaWNlKC0yKTtcblxuICAgICAgY291bnRlciA9IHNhZmVDb3VudGVyKCkudG9TdHJpbmcoMzYpLnNsaWNlKC00KTtcblxuICAgIHJldHVybiBkYXRlLnNsaWNlKC0yKSArXG4gICAgICBjb3VudGVyICsgcHJpbnQgKyByYW5kb207XG4gIH07XG5cbiAgYXBpLmdsb2JhbENvdW50ID0gZnVuY3Rpb24gZ2xvYmFsQ291bnQoKSB7XG4gICAgLy8gV2Ugd2FudCB0byBjYWNoZSB0aGUgcmVzdWx0cyBvZiB0aGlzXG4gICAgdmFyIGNhY2hlID0gKGZ1bmN0aW9uIGNhbGMoKSB7XG4gICAgICAgIHZhciBpLFxuICAgICAgICAgIGNvdW50ID0gMDtcblxuICAgICAgICBmb3IgKGkgaW4gd2luZG93KSB7XG4gICAgICAgICAgY291bnQrKztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBjb3VudDtcbiAgICAgIH0oKSk7XG5cbiAgICBhcGkuZ2xvYmFsQ291bnQgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBjYWNoZTsgfTtcbiAgICByZXR1cm4gY2FjaGU7XG4gIH07XG5cbiAgYXBpLmZpbmdlcnByaW50ID0gZnVuY3Rpb24gYnJvd3NlclByaW50KCkge1xuICAgIHJldHVybiBwYWQoKG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoICtcbiAgICAgIG5hdmlnYXRvci51c2VyQWdlbnQubGVuZ3RoKS50b1N0cmluZygzNikgK1xuICAgICAgYXBpLmdsb2JhbENvdW50KCkudG9TdHJpbmcoMzYpLCA0KTtcbiAgfTtcblxuICAvLyBkb24ndCBjaGFuZ2UgYW55dGhpbmcgZnJvbSBoZXJlIGRvd24uXG4gIGlmIChhcHAucmVnaXN0ZXIpIHtcbiAgICBhcHAucmVnaXN0ZXIobmFtZXNwYWNlLCBhcGkpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBhcGk7XG4gIH0gZWxzZSB7XG4gICAgYXBwW25hbWVzcGFjZV0gPSBhcGk7XG4gIH1cblxufSh0aGlzLmFwcGxpdHVkZSB8fCB0aGlzKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBPbmVWZXJzaW9uQ29uc3RyYWludCA9IHJlcXVpcmUoJ2luZGl2aWR1YWwvb25lLXZlcnNpb24nKTtcblxudmFyIE1ZX1ZFUlNJT04gPSAnNyc7XG5PbmVWZXJzaW9uQ29uc3RyYWludCgnZXYtc3RvcmUnLCBNWV9WRVJTSU9OKTtcblxudmFyIGhhc2hLZXkgPSAnX19FVl9TVE9SRV9LRVlAJyArIE1ZX1ZFUlNJT047XG5cbm1vZHVsZS5leHBvcnRzID0gRXZTdG9yZTtcblxuZnVuY3Rpb24gRXZTdG9yZShlbGVtKSB7XG4gICAgdmFyIGhhc2ggPSBlbGVtW2hhc2hLZXldO1xuXG4gICAgaWYgKCFoYXNoKSB7XG4gICAgICAgIGhhc2ggPSBlbGVtW2hhc2hLZXldID0ge307XG4gICAgfVxuXG4gICAgcmV0dXJuIGhhc2g7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qZ2xvYmFsIHdpbmRvdywgZ2xvYmFsKi9cblxudmFyIHJvb3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/XG4gICAgd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIGdsb2JhbCA6IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGl2aWR1YWw7XG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gcm9vdCkge1xuICAgICAgICByZXR1cm4gcm9vdFtrZXldO1xuICAgIH1cblxuICAgIHJvb3Rba2V5XSA9IHZhbHVlO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgSW5kaXZpZHVhbCA9IHJlcXVpcmUoJy4vaW5kZXguanMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBPbmVWZXJzaW9uO1xuXG5mdW5jdGlvbiBPbmVWZXJzaW9uKG1vZHVsZU5hbWUsIHZlcnNpb24sIGRlZmF1bHRWYWx1ZSkge1xuICAgIHZhciBrZXkgPSAnX19JTkRJVklEVUFMX09ORV9WRVJTSU9OXycgKyBtb2R1bGVOYW1lO1xuICAgIHZhciBlbmZvcmNlS2V5ID0ga2V5ICsgJ19FTkZPUkNFX1NJTkdMRVRPTic7XG5cbiAgICB2YXIgdmVyc2lvblZhbHVlID0gSW5kaXZpZHVhbChlbmZvcmNlS2V5LCB2ZXJzaW9uKTtcblxuICAgIGlmICh2ZXJzaW9uVmFsdWUgIT09IHZlcnNpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gb25seSBoYXZlIG9uZSBjb3B5IG9mICcgK1xuICAgICAgICAgICAgbW9kdWxlTmFtZSArICcuXFxuJyArXG4gICAgICAgICAgICAnWW91IGFscmVhZHkgaGF2ZSB2ZXJzaW9uICcgKyB2ZXJzaW9uVmFsdWUgK1xuICAgICAgICAgICAgJyBpbnN0YWxsZWQuXFxuJyArXG4gICAgICAgICAgICAnVGhpcyBtZWFucyB5b3UgY2Fubm90IGluc3RhbGwgdmVyc2lvbiAnICsgdmVyc2lvbik7XG4gICAgfVxuXG4gICAgcmV0dXJuIEluZGl2aWR1YWwoa2V5LCBkZWZhdWx0VmFsdWUpO1xufVxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsInZhciByb290ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID9cbiAgICBnbG9iYWwgOiB7fTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbmRpdmlkdWFsXG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChyb290W2tleV0pIHtcbiAgICAgICAgcmV0dXJuIHJvb3Rba2V5XVxuICAgIH1cblxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyb290LCBrZXksIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlXG4gICAgICAgICwgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSlcblxuICAgIHJldHVybiB2YWx1ZVxufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJ2YXIgaGlkZGVuU3RvcmUgPSByZXF1aXJlKCcuL2hpZGRlbi1zdG9yZS5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVN0b3JlO1xuXG5mdW5jdGlvbiBjcmVhdGVTdG9yZSgpIHtcbiAgICB2YXIga2V5ID0ge307XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gKG9iaikge1xuICAgICAgICBpZiAoKHR5cGVvZiBvYmogIT09ICdvYmplY3QnIHx8IG9iaiA9PT0gbnVsbCkgJiZcbiAgICAgICAgICAgIHR5cGVvZiBvYmogIT09ICdmdW5jdGlvbidcbiAgICAgICAgKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1dlYWttYXAtc2hpbTogS2V5IG11c3QgYmUgb2JqZWN0JylcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBzdG9yZSA9IG9iai52YWx1ZU9mKGtleSk7XG4gICAgICAgIHJldHVybiBzdG9yZSAmJiBzdG9yZS5pZGVudGl0eSA9PT0ga2V5ID9cbiAgICAgICAgICAgIHN0b3JlIDogaGlkZGVuU3RvcmUob2JqLCBrZXkpO1xuICAgIH07XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGhpZGRlblN0b3JlO1xuXG5mdW5jdGlvbiBoaWRkZW5TdG9yZShvYmosIGtleSkge1xuICAgIHZhciBzdG9yZSA9IHsgaWRlbnRpdHk6IGtleSB9O1xuICAgIHZhciB2YWx1ZU9mID0gb2JqLnZhbHVlT2Y7XG5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCBcInZhbHVlT2ZcIiwge1xuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgIT09IGtleSA/XG4gICAgICAgICAgICAgICAgdmFsdWVPZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogc3RvcmU7XG4gICAgICAgIH0sXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG5cbiAgICByZXR1cm4gc3RvcmU7XG59XG4iLCJ2YXIgaW5oZXJpdHMgPSByZXF1aXJlKFwiaW5oZXJpdHNcIilcblxudmFyIEFMTF9QUk9QUyA9IFtcbiAgICBcImFsdEtleVwiLCBcImJ1YmJsZXNcIiwgXCJjYW5jZWxhYmxlXCIsIFwiY3RybEtleVwiLFxuICAgIFwiZXZlbnRQaGFzZVwiLCBcIm1ldGFLZXlcIiwgXCJyZWxhdGVkVGFyZ2V0XCIsIFwic2hpZnRLZXlcIixcbiAgICBcInRhcmdldFwiLCBcInRpbWVTdGFtcFwiLCBcInR5cGVcIiwgXCJ2aWV3XCIsIFwid2hpY2hcIlxuXVxudmFyIEtFWV9QUk9QUyA9IFtcImNoYXJcIiwgXCJjaGFyQ29kZVwiLCBcImtleVwiLCBcImtleUNvZGVcIl1cbnZhciBNT1VTRV9QUk9QUyA9IFtcbiAgICBcImJ1dHRvblwiLCBcImJ1dHRvbnNcIiwgXCJjbGllbnRYXCIsIFwiY2xpZW50WVwiLCBcImxheWVyWFwiLFxuICAgIFwibGF5ZXJZXCIsIFwib2Zmc2V0WFwiLCBcIm9mZnNldFlcIiwgXCJwYWdlWFwiLCBcInBhZ2VZXCIsXG4gICAgXCJzY3JlZW5YXCIsIFwic2NyZWVuWVwiLCBcInRvRWxlbWVudFwiXG5dXG5cbnZhciBya2V5RXZlbnQgPSAvXmtleXxpbnB1dC9cbnZhciBybW91c2VFdmVudCA9IC9eKD86bW91c2V8cG9pbnRlcnxjb250ZXh0bWVudSl8Y2xpY2svXG5cbm1vZHVsZS5leHBvcnRzID0gUHJveHlFdmVudFxuXG5mdW5jdGlvbiBQcm94eUV2ZW50KGV2KSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFByb3h5RXZlbnQpKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJveHlFdmVudChldilcbiAgICB9XG5cbiAgICBpZiAocmtleUV2ZW50LnRlc3QoZXYudHlwZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBLZXlFdmVudChldilcbiAgICB9IGVsc2UgaWYgKHJtb3VzZUV2ZW50LnRlc3QoZXYudHlwZSkpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBNb3VzZUV2ZW50KGV2KVxuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQUxMX1BST1BTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wS2V5ID0gQUxMX1BST1BTW2ldXG4gICAgICAgIHRoaXNbcHJvcEtleV0gPSBldltwcm9wS2V5XVxuICAgIH1cblxuICAgIHRoaXMuX3Jhd0V2ZW50ID0gZXZcbiAgICB0aGlzLl9idWJibGVzID0gZmFsc2U7XG59XG5cblByb3h5RXZlbnQucHJvdG90eXBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuX3Jhd0V2ZW50LnByZXZlbnREZWZhdWx0KClcbn1cblxuUHJveHlFdmVudC5wcm90b3R5cGUuc3RhcnRQcm9wYWdhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLl9idWJibGVzID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gTW91c2VFdmVudChldikge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQUxMX1BST1BTLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBwcm9wS2V5ID0gQUxMX1BST1BTW2ldXG4gICAgICAgIHRoaXNbcHJvcEtleV0gPSBldltwcm9wS2V5XVxuICAgIH1cblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgTU9VU0VfUFJPUFMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIG1vdXNlUHJvcEtleSA9IE1PVVNFX1BST1BTW2pdXG4gICAgICAgIHRoaXNbbW91c2VQcm9wS2V5XSA9IGV2W21vdXNlUHJvcEtleV1cbiAgICB9XG5cbiAgICB0aGlzLl9yYXdFdmVudCA9IGV2XG59XG5cbmluaGVyaXRzKE1vdXNlRXZlbnQsIFByb3h5RXZlbnQpXG5cbmZ1bmN0aW9uIEtleUV2ZW50KGV2KSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBBTExfUFJPUFMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHByb3BLZXkgPSBBTExfUFJPUFNbaV1cbiAgICAgICAgdGhpc1twcm9wS2V5XSA9IGV2W3Byb3BLZXldXG4gICAgfVxuXG4gICAgZm9yICh2YXIgaiA9IDA7IGogPCBLRVlfUFJPUFMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIGtleVByb3BLZXkgPSBLRVlfUFJPUFNbal1cbiAgICAgICAgdGhpc1trZXlQcm9wS2V5XSA9IGV2W2tleVByb3BLZXldXG4gICAgfVxuXG4gICAgdGhpcy5fcmF3RXZlbnQgPSBldlxufVxuXG5pbmhlcml0cyhLZXlFdmVudCwgUHJveHlFdmVudClcbiIsInZhciBFdlN0b3JlID0gcmVxdWlyZShcImV2LXN0b3JlXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlRXZlbnRcblxuZnVuY3Rpb24gcmVtb3ZlRXZlbnQodGFyZ2V0LCB0eXBlLCBoYW5kbGVyKSB7XG4gICAgdmFyIGV2ZW50cyA9IEV2U3RvcmUodGFyZ2V0KVxuICAgIHZhciBldmVudCA9IGV2ZW50c1t0eXBlXVxuXG4gICAgaWYgKCFldmVudCkge1xuICAgICAgICByZXR1cm5cbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoZXZlbnQpKSB7XG4gICAgICAgIHZhciBpbmRleCA9IGV2ZW50LmluZGV4T2YoaGFuZGxlcilcbiAgICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgZXZlbnQuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudCA9PT0gaGFuZGxlcikge1xuICAgICAgICBldmVudHNbdHlwZV0gPSBudWxsXG4gICAgfVxufVxuIiwiLyoqXG4gKiBAYXV0aG9yIEdpbGxlcyBDb29tYW5zIDxnaWxsZXMuY29vbWFuc0BnbWFpbC5jb20+XG4gKiBlbGVucGkgdjJcblxuXHQvL19fX19fX19fIG5ldyBhcGlcblxuXHRkb25lKGZ1bmN0aW9uKGVudiwgb2JqLCBzdHJpbmcpe1xuXHRcdC8vLi4uXG5cdFx0cmV0dXJuIHN0cmluZyB8fCBmYWxzZTtcblx0fSlcblx0dGVybWluYWwocmVnRXhwLCBuYW1lIHx8IGZ1bmN0aW9uKGVudiwgb2JqLCBzdHJpbmcsIGNhcHR1cmVkKXtcblx0XHQvLy4uLlxuXHRcdHJldHVybiBzdHJpbmcgfHwgZmFsc2U7XG5cdH0pXG5cdGNoYXIodGVzdClcblx0b3B0aW9uYWwocnVsZSlcblx0ZW5kKClcblxuXHRvbmUocnVsZSB8fCB7IFxuXHRcdHJ1bGU6cnVsZSwgXG5cdFx0P2FzOmZ1bmN0aW9uKCl7IHJldHVybiBJbnN0YW5jZSB9LCBcblx0XHQ/c2V0OiduYW1lJyB8fCBmdW5jdGlvbihlbnYsIHBhcmVudCwgb2JqKXsgLi4uIH0gXG5cdH0pXG5cdHplcm9Pck9uZShydWxlIHx8IHsgXG5cdFx0cnVsZTpydWxlLCBcblx0XHQ/YXM6ZnVuY3Rpb24oKXsgcmV0dXJuIEluc3RhbmNlIH0sIFxuXHRcdD9zZXQ6J25hbWUnIHx8IGZ1bmN0aW9uKGVudiwgcGFyZW50LCBvYmopeyAuLi4gfSBcblx0fSlcblx0b25lT2YoW3J1bGVzXSB8fCB7IFxuXHRcdHJ1bGVzOltydWxlc10sIFxuXHRcdD9hczpmdW5jdGlvbigpeyByZXR1cm4gSW5zdGFuY2UgfSwgXG5cdFx0P3NldDonbmFtZScgfHwgZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iail7IC4uLiB9IFxuXHR9KVxuXHR4T3JNb3JlKHsgXG5cdFx0cnVsZTpydWxlLFxuXHRcdG1pbmltdW06aW50LFxuXHRcdD9hczpmdW5jdGlvbigpeyByZXR1cm4gSW5zdGFuY2UgfSwgXG5cdFx0P3B1c2hUbzonbmFtZScgfHwgZnVuY3Rpb24oZW52LCBwYXJlbnQsIG9iail7IC4uLiB9LFxuXHRcdD9zZXBhcmF0b3I6cnVsZSxcblx0XHQ/bWF4aW11bTppbnQgXG5cdH0pXG5cblxuXHRWMyB3aWxsIGJlIGEgQmFiZWx1dGUgd2l0aCBzYW1lIGFwaVxuXG4gKlxuICogXG4gKi9cblxuKGZ1bmN0aW9uKCkge1xuXHR2YXIgZGVmYXVsdFNwYWNlUmVnRXhwID0gL15bXFxzXFxuXFxyXSsvO1xuXG5cdGZ1bmN0aW9uIGV4ZWMocnVsZSwgZGVzY3JpcHRvciwgZW52KSB7XG5cdFx0aWYgKGVudi5zdG9wIHx8IGVudi5lcnJvcilcblx0XHRcdHJldHVybjtcblx0XHRpZiAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnKVxuXHRcdFx0cnVsZSA9IGdldFJ1bGUoZW52LnBhcnNlciwgcnVsZSk7XG5cdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudEV4ZWMrKztcblx0XHR2YXIgcnVsZXMgPSBydWxlLl9xdWV1ZSxcblx0XHRcdGN1cnJlbnQ7XG5cdFx0Zm9yICh2YXIgaSA9IDAsIGxlbiA9IHJ1bGVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG5cdFx0XHRjdXJyZW50ID0gcnVsZXNbaV07XG5cdFx0XHRpZiAoY3VycmVudC5fX2VsZW5waV9fKVxuXHRcdFx0XHRleGVjKGN1cnJlbnQsIGRlc2NyaXB0b3IsIGVudik7XG5cdFx0XHRlbHNlIC8vIGlzIGZ1bmN0aW9uXG5cdFx0XHRcdGN1cnJlbnQoZW52LCBkZXNjcmlwdG9yKTtcblx0XHRcdGlmIChlbnYuZXJyb3IpXG5cdFx0XHRcdHJldHVybjtcblx0XHRcdGlmIChlbnYuc29GYXIgPiBlbnYuc3RyaW5nLmxlbmd0aClcblx0XHRcdFx0ZW52LnNvRmFyID0gZW52LnN0cmluZy5sZW5ndGg7XG5cdFx0XHRpZiAoZW52LnN0b3ApXG5cdFx0XHRcdHJldHVybjtcblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gZ2V0UnVsZShwYXJzZXIsIG5hbWUpIHtcblx0XHR2YXIgciA9IHBhcnNlci5ydWxlc1tuYW1lXTtcblx0XHRpZiAoIXIpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ2VsZW5waSA6IHJ1bGVzIG5vdCBmb3VuZCA6ICcgKyBydWxlKTtcblx0XHRyZXR1cm4gcjtcblx0fVxuXG5cdGZ1bmN0aW9uIFJ1bGUoKSB7XG5cdFx0dGhpcy5fcXVldWUgPSBbXTtcblx0XHR0aGlzLl9fZWxlbnBpX18gPSB0cnVlO1xuXHR9O1xuXG5cdFJ1bGUucHJvdG90eXBlID0ge1xuXHRcdC8vIGJhc2UgZm9yIGFsbCBydWxlJ3MgaGFuZGxlcnNcblx0XHRkb25lOiBmdW5jdGlvbihjYWxsYmFjaykge1xuXHRcdFx0dGhpcy5fcXVldWUucHVzaChjYWxsYmFjayk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdC8vIGZvciBkZWJ1ZyBwdXJwb3NlXG5cdFx0bG9nOiBmdW5jdGlvbih0aXRsZSkge1xuXHRcdFx0dGl0bGUgPSB0aXRsZSB8fCAnJztcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiZWxlbnBpIGxvZyA6IFwiLCB0aXRsZSwgZW52LCBkZXNjcmlwdG9yKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0dXNlOiBmdW5jdGlvbihydWxlKSB7XG5cdFx0XHR2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0cnVsZSA9IGdldFJ1bGUoZW52LnBhcnNlciwgcnVsZSk7XG5cdFx0XHRcdGlmIChydWxlLl9fZWxlbnBpX18pIHtcblx0XHRcdFx0XHRleGVjKHJ1bGUsIGRlc2NyaXB0b3IsIGVudik7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciByID0gbmV3IFJ1bGUoKTtcblx0XHRcdFx0cnVsZS5hcHBseShyLCBhcmdzKTtcblx0XHRcdFx0ZXhlYyhyLCBkZXNjcmlwdG9yLCBlbnYpO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRvcHRpb25hbDogZnVuY3Rpb24ocnVsZSkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0dmFyIHN0cmluZyA9IGVudi5zdHJpbmc7XG5cdFx0XHRcdGV4ZWMocnVsZSwgZGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0aWYgKGVudi5lcnJvcikge1xuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBzdHJpbmc7XG5cdFx0XHRcdFx0ZW52LmVycm9yID0gZmFsc2U7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0dGVybWluYWw6IGZ1bmN0aW9uKHJlZywgc2V0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHQvLyBjb25zb2xlLmxvZygndGVybWluYWwgdGVzdCA6ICcsIHJlZyk7XG5cdFx0XHRcdGlmICghZW52LnN0cmluZy5sZW5ndGgpIHtcblx0XHRcdFx0XHRlbnYuZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50VGVybWluYWxUZXN0Kys7XG5cdFx0XHRcdHZhciBjYXAgPSByZWcuZXhlYyhlbnYuc3RyaW5nKTtcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ3Rlcm1pbmFsIDogJywgcmVnLCBjYXApO1xuXHRcdFx0XHRpZiAoY2FwKSB7XG5cdFx0XHRcdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudFRlcm1pbmFsTWF0Y2hlZCsrO1xuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBlbnYuc3RyaW5nLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcblx0XHRcdFx0XHQvLyBjb25zb2xlLmxvZygndGVybWluYWwgY2FwIDAgbGVuZ3RoIDogJywgY2FwWzBdLmxlbmd0aCk7XG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coJ3Rlcm1pbmFsIHN0cmluZyBsZW5ndGggOiAnLCBzdHJpbmcubGVuZ3RoLCBjYXBbMF0pO1xuXHRcdFx0XHRcdGlmIChzZXQpIHtcblx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygc2V0ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRvcltzZXRdID0gY2FwWzBdO1xuXHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRzZXQoZW52LCBkZXNjcmlwdG9yLCBjYXApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0Y2hhcjogZnVuY3Rpb24odGVzdCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCB8fCBlbnYuc3RyaW5nWzBdICE9PSB0ZXN0KVxuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRlbnYuc3RyaW5nID0gZW52LnN0cmluZy5zdWJzdHJpbmcoMSk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHhPck1vcmU6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdHZhciBvcHQgPSAodHlwZW9mIHJ1bGUgPT09ICdzdHJpbmcnIHx8IMKgcnVsZS5fX2VsZW5waV9fKSA/IHtcblx0XHRcdFx0cnVsZTogcnVsZVxuXHRcdFx0fSA6IHJ1bGU7XG5cdFx0XHRvcHQubWluaW11bSA9IG9wdC5taW5pbXVtIHx8IDA7XG5cdFx0XHRvcHQubWF4aW11bSA9IG9wdC5tYXhpbXVtIHx8IEluZmluaXR5O1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0dmFyIG9wdGlvbnMgPSBvcHQ7XG5cdFx0XHRcdGlmICghZW52LnN0cmluZy5sZW5ndGggJiYgb3B0aW9ucy5taW5pbXVtID4gMCkge1xuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBzdHJpbmcgPSBlbnYuc3RyaW5nLFxuXHRcdFx0XHRcdGNvdW50ID0gMCxcblx0XHRcdFx0XHRydWxlID0gb3B0aW9ucy5ydWxlLFxuXHRcdFx0XHRcdHB1c2hUbyA9IG9wdGlvbnMucHVzaFRvLFxuXHRcdFx0XHRcdHB1c2hUb1N0cmluZyA9IHR5cGVvZiBwdXNoVG8gPT09ICdzdHJpbmcnLFxuXHRcdFx0XHRcdEFzID0gb3B0aW9ucy5hcyxcblx0XHRcdFx0XHRzZXBhcmF0b3IgPSBvcHRpb25zLnNlcGFyYXRvcixcblx0XHRcdFx0XHRuZXdEZXNjcmlwdG9yO1xuXHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50WG9yTW9yZSsrO1xuXHRcdFx0XHR3aGlsZSAoIWVudi5lcnJvciAmJiBlbnYuc3RyaW5nLmxlbmd0aCAmJiBjb3VudCA8IG9wdGlvbnMubWF4aW11bSkge1xuXG5cdFx0XHRcdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudFhvck1vcmVzKys7XG5cblx0XHRcdFx0XHRuZXdEZXNjcmlwdG9yID0gQXMgPyBBcyhlbnYsIGRlc2NyaXB0b3IpIDogKHB1c2hUbyA/IHt9IDogZGVzY3JpcHRvcik7XG5cdFx0XHRcdFx0ZXhlYyhydWxlLCBuZXdEZXNjcmlwdG9yLCBlbnYpO1xuXG5cdFx0XHRcdFx0aWYgKGVudi5lcnJvcilcblx0XHRcdFx0XHRcdGJyZWFrO1xuXG5cdFx0XHRcdFx0Y291bnQrKztcblxuXHRcdFx0XHRcdGlmICghbmV3RGVzY3JpcHRvci5za2lwICYmIHB1c2hUbylcblx0XHRcdFx0XHRcdGlmIChwdXNoVG9TdHJpbmcpIHtcblx0XHRcdFx0XHRcdFx0ZGVzY3JpcHRvcltwdXNoVG9dID0gZGVzY3JpcHRvcltwdXNoVG9dIHx8IFtdO1xuXHRcdFx0XHRcdFx0XHRkZXNjcmlwdG9yW3B1c2hUb10ucHVzaChuZXdEZXNjcmlwdG9yKTtcblx0XHRcdFx0XHRcdH0gZWxzZVxuXHRcdFx0XHRcdFx0XHRwdXNoVG8oZW52LCBkZXNjcmlwdG9yLCBuZXdEZXNjcmlwdG9yKTtcblxuXHRcdFx0XHRcdGlmIChzZXBhcmF0b3IgJiYgZW52LnN0cmluZy5sZW5ndGgpXG5cdFx0XHRcdFx0XHRleGVjKHNlcGFyYXRvciwgbmV3RGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0fVxuXHRcdFx0XHRlbnYuZXJyb3IgPSAoY291bnQgPCBvcHRpb25zLm1pbmltdW0pO1xuXHRcdFx0XHRpZiAoIWNvdW50KVxuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBzdHJpbmc7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHplcm9Pck1vcmU6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdHJldHVybiB0aGlzLnhPck1vcmUocnVsZSk7XG5cdFx0fSxcblx0XHRvbmVPck1vcmU6IGZ1bmN0aW9uKHJ1bGUpIHtcblx0XHRcdGlmICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgfHwgcnVsZS5fX2VsZW5waV9fKVxuXHRcdFx0XHRydWxlID0ge1xuXHRcdFx0XHRcdHJ1bGU6IHJ1bGUsXG5cdFx0XHRcdFx0bWluaW11bTogMVxuXHRcdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcy54T3JNb3JlKHJ1bGUpO1xuXHRcdH0sXG5cdFx0emVyb09yT25lOiBmdW5jdGlvbihydWxlKSB7XG5cdFx0XHR2YXIgb3B0aW9ucyA9ICh0eXBlb2YgcnVsZSA9PT0gJ3N0cmluZycgfHwgwqBydWxlLl9fZWxlbnBpX18pID8ge1xuXHRcdFx0XHRydWxlOiBydWxlXG5cdFx0XHR9IDogcnVsZTtcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdGlmICghZW52LnN0cmluZy5sZW5ndGgpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50WmVyb09yT25lKys7XG5cdFx0XHRcdHZhciBuZXdEZXNjcmlwdG9yID0gb3B0aW9ucy5hcyA/IG9wdGlvbnMuYXMoZW52LCBkZXNjcmlwdG9yKSA6IChvcHRpb25zLnNldCA/IHt9IDogZGVzY3JpcHRvcik7XG5cdFx0XHRcdHZhciBzdHJpbmcgPSBlbnYuc3RyaW5nO1xuXHRcdFx0XHRleGVjKG9wdGlvbnMucnVsZSwgbmV3RGVzY3JpcHRvciwgZW52KTtcblx0XHRcdFx0aWYgKCFlbnYuZXJyb3IpIHtcblx0XHRcdFx0XHRpZiAoIW5ld0Rlc2NyaXB0b3Iuc2tpcCAmJiBvcHRpb25zLnNldCkge1xuXHRcdFx0XHRcdFx0aWYgKHR5cGVvZiBvcHRpb25zLnNldCA9PT0gJ3N0cmluZycpXG5cdFx0XHRcdFx0XHRcdGRlc2NyaXB0b3Jbb3B0aW9ucy5zZXRdID0gbmV3RGVzY3JpcHRvcjtcblx0XHRcdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRcdFx0b3B0aW9ucy5zZXQoZW52LCBkZXNjcmlwdG9yLCBuZXdEZXNjcmlwdG9yKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGVudi5zdHJpbmcgPSBzdHJpbmc7XG5cdFx0XHRcdGVudi5lcnJvciA9IGZhbHNlO1xuXHRcdFx0fSk7XG5cdFx0fSxcblx0XHRvbmVPZjogZnVuY3Rpb24ocnVsZXMpIHtcblx0XHRcdHZhciBvcHQgPSAodHlwZW9mIHJ1bGVzID09PSAnc3RyaW5nJyB8fCBydWxlcy5fX2VsZW5waV9fKSA/IHtcblx0XHRcdFx0cnVsZXM6IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuXHRcdFx0fSA6IHJ1bGVzO1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIG9wdGlvbnMgPSBvcHQsXG5cdFx0XHRcdFx0Y291bnQgPSAwLFxuXHRcdFx0XHRcdGxlbiA9IG9wdGlvbnMucnVsZXMubGVuZ3RoLFxuXHRcdFx0XHRcdHJ1bGUsXG5cdFx0XHRcdFx0bmV3RGVzY3JpcHRvcixcblx0XHRcdFx0XHRzdHJpbmcgPSBlbnYuc3RyaW5nO1xuXHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50T25lT2YrKztcblx0XHRcdFx0d2hpbGUgKGNvdW50IDwgbGVuKSB7XG5cdFx0XHRcdFx0cnVsZSA9IG9wdGlvbnMucnVsZXNbY291bnRdO1xuXHRcdFx0XHRcdGNvdW50Kys7XG5cdFx0XHRcdFx0Ly8gUGFyc2VyLmNvdW50cy5jb3VudE9uZU9mcysrO1xuXHRcdFx0XHRcdG5ld0Rlc2NyaXB0b3IgPSBvcHRpb25zLmFzID8gb3B0aW9ucy5hcyhlbnYsIGRlc2NyaXB0b3IpIDogKG9wdGlvbnMuc2V0ID8ge30gOiBkZXNjcmlwdG9yKTtcblx0XHRcdFx0XHRleGVjKHJ1bGUsIG5ld0Rlc2NyaXB0b3IsIGVudik7XG5cdFx0XHRcdFx0aWYgKCFlbnYuZXJyb3IpIHtcblx0XHRcdFx0XHRcdGlmICghbmV3RGVzY3JpcHRvci5za2lwICYmIG9wdGlvbnMuc2V0KSB7XG5cdFx0XHRcdFx0XHRcdGlmICh0eXBlb2Ygb3B0aW9ucy5zZXQgPT09ICdzdHJpbmcnKVxuXHRcdFx0XHRcdFx0XHRcdGRlc2NyaXB0b3Jbb3B0aW9ucy5zZXRdID0gbmV3RGVzY3JpcHRvcjtcblx0XHRcdFx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdFx0XHRcdG9wdGlvbnMuc2V0KGVudiwgZGVzY3JpcHRvciwgbmV3RGVzY3JpcHRvcik7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVudi5lcnJvciA9IGZhbHNlO1xuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0ZW52LmVycm9yID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0b25lOiBmdW5jdGlvbihydWxlKSB7XG5cdFx0XHR2YXIgb3B0ID0gKHR5cGVvZiBydWxlID09PSAnc3RyaW5nJyB8fCDCoChydWxlICYmIHJ1bGUuX19lbGVucGlfXykpID8ge1xuXHRcdFx0XHRydWxlOiBydWxlXG5cdFx0XHR9IDogcnVsZTtcblx0XHRcdHJldHVybiB0aGlzLmRvbmUoZnVuY3Rpb24oZW52LCBkZXNjcmlwdG9yKSB7XG5cdFx0XHRcdGlmICghZW52LnN0cmluZy5sZW5ndGgpIHtcblx0XHRcdFx0XHRlbnYuZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBQYXJzZXIuY291bnRzLmNvdW50T25lKys7XG5cdFx0XHRcdHZhciBvcHRpb25zID0gb3B0LFxuXHRcdFx0XHRcdG5ld0Rlc2NyaXB0b3IgPSBvcHRpb25zLmFzID8gb3B0aW9ucy5hcyhlbnYsIGRlc2NyaXB0b3IpIDogKG9wdGlvbnMuc2V0ID8ge30gOiBkZXNjcmlwdG9yKTtcblx0XHRcdFx0ZXhlYyhvcHRpb25zLnJ1bGUsIG5ld0Rlc2NyaXB0b3IsIGVudik7XG5cdFx0XHRcdGlmICghZW52LmVycm9yICYmICFuZXdEZXNjcmlwdG9yLnNraXAgJiYgb3B0aW9ucy5zZXQpIHtcblx0XHRcdFx0XHRpZiAodHlwZW9mIG9wdGlvbnMuc2V0ID09PSAnc3RyaW5nJylcblx0XHRcdFx0XHRcdGRlc2NyaXB0b3Jbb3B0aW9ucy5zZXRdID0gbmV3RGVzY3JpcHRvcjtcblx0XHRcdFx0XHRlbHNlXG5cdFx0XHRcdFx0XHRvcHRpb25zLnNldChlbnYsIGRlc2NyaXB0b3IsIG5ld0Rlc2NyaXB0b3IpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdHNraXA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0ZGVzY3JpcHRvci5za2lwID0gdHJ1ZTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0c3BhY2U6IGZ1bmN0aW9uKG5lZWRlZCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZG9uZShmdW5jdGlvbihlbnYsIGRlc2NyaXB0b3IpIHtcblx0XHRcdFx0aWYgKCFlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHRcdGlmIChuZWVkZWQpXG5cdFx0XHRcdFx0XHRlbnYuZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgY2FwID0gKGVudi5wYXJzZXIucnVsZXMuc3BhY2UgfHwgZGVmYXVsdFNwYWNlUmVnRXhwKS5leGVjKGVudi5zdHJpbmcpO1xuXHRcdFx0XHRpZiAoY2FwKVxuXHRcdFx0XHRcdGVudi5zdHJpbmcgPSBlbnYuc3RyaW5nLnN1YnN0cmluZyhjYXBbMF0ubGVuZ3RoKTtcblx0XHRcdFx0ZWxzZSBpZiAobmVlZGVkKVxuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGVuZDogZnVuY3Rpb24obmVlZGVkKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kb25lKGZ1bmN0aW9uKGVudiwgZGVzY3JpcHRvcikge1xuXHRcdFx0XHRpZiAoIWVudi5zdHJpbmcubGVuZ3RoKVxuXHRcdFx0XHRcdGVudi5zdG9wID0gdHJ1ZTtcblx0XHRcdFx0ZWxzZSBpZiAobmVlZGVkKVxuXHRcdFx0XHRcdGVudi5lcnJvciA9IHRydWU7XG5cdFx0XHR9KTtcblx0XHR9XG5cdH07XG5cblx0dmFyIFBhcnNlciA9IGZ1bmN0aW9uKHJ1bGVzLCBkZWZhdWx0UnVsZSkge1xuXHRcdHRoaXMucnVsZXMgPSBydWxlcztcblx0XHR0aGlzLmRlZmF1bHRSdWxlID0gZGVmYXVsdFJ1bGU7XG5cdH07XG5cdFBhcnNlci5wcm90b3R5cGUgPSB7XG5cdFx0ZXhlYzogZnVuY3Rpb24ocnVsZSwgZGVzY3JpcHRvciwgZW52KSB7XG5cdFx0XHRleGVjKHJ1bGUsIGRlc2NyaXB0b3IsIGVudik7XG5cdFx0fSxcblx0XHRwYXJzZTogZnVuY3Rpb24oc3RyaW5nLCBydWxlLCBkZXNjcmlwdG9yLCBlbnYpIHtcblx0XHRcdGVudiA9IGVudiB8fCB7fTtcblx0XHRcdGRlc2NyaXB0b3IgPSBkZXNjcmlwdG9yIHx8IHt9O1xuXHRcdFx0ZW52LnBhcnNlciA9IHRoaXM7XG5cdFx0XHRlbnYuc29GYXIgPSBJbmZpbml0eTtcblx0XHRcdGVudi5zdHJpbmcgPSBzdHJpbmc7XG5cdFx0XHRpZiAoIXJ1bGUpXG5cdFx0XHRcdHJ1bGUgPSB0aGlzLnJ1bGVzW3RoaXMuZGVmYXVsdFJ1bGVdO1xuXHRcdFx0ZXhlYyhydWxlLCBkZXNjcmlwdG9yLCBlbnYpO1xuXHRcdFx0aWYgKGVudi5lcnJvciB8fCBlbnYuc3RyaW5nLmxlbmd0aCkge1xuXHRcdFx0XHR2YXIgcG9zID0gc3RyaW5nLmxlbmd0aCAtIGVudi5zb0Zhcjtcblx0XHRcdFx0Ly8gdG9kbyA6IGNhdGNoIGxpbmUgbnVtYmVyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoJ2VsZW5waSBwYXJzaW5nIGZhaWxlZCA6IChwb3M6JyArIHBvcyArICcpIG5lYXIgOlxcbicsIHN0cmluZy5zdWJzdHJpbmcoTWF0aC5tYXgocG9zIC0gMSwgMCksIHBvcyArIDUwKSk7XG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkZXNjcmlwdG9yO1xuXHRcdH1cblx0fTtcblxuXHQvLyBcdFBhcnNlci5jb3VudHMgPSB7XG5cdC8vIFx0Y291bnRUZXJtaW5hbFRlc3Q6IDAsXG5cdC8vIFx0Y291bnRUZXJtaW5hbE1hdGNoZWQ6IDAsXG5cdC8vIFx0Y291bnRPbmVPZjogMCxcblx0Ly8gXHRjb3VudE9uZU9mczogMCxcblx0Ly8gXHRjb3VudEV4ZWM6IDAsXG5cdC8vIFx0Y291bnRYb3JNb3JlOiAwLFxuXHQvLyBcdGNvdW50WG9yTW9yZXM6IDAsXG5cdC8vIFx0Y291bnRaZXJvT3JPbmU6IDAsXG5cdC8vIFx0Y291bnRPbmU6IDBcblx0Ly8gfTtcblxuXHR2YXIgZWxlbnBpID0ge1xuXHRcdHI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIG5ldyBSdWxlKCk7XG5cdFx0fSxcblx0XHRSdWxlOiBSdWxlLFxuXHRcdFBhcnNlcjogUGFyc2VyXG5cdH07XG5cblx0aWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKVxuXHRcdG1vZHVsZS5leHBvcnRzID0gZWxlbnBpOyAvLyB1c2UgY29tbW9uIGpzIGlmIGF2YWlhYmxlXG5cdGVsc2UgdGhpcy5lbGVucGkgPSBlbGVucGk7IC8vIGFzc2lnbiB0byBnbG9iYWwgd2luZG93XG59KSgpO1xuLy9fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX19fX18iLCJ2YXIgY3JlYXRlRWxlbWVudCA9IHJlcXVpcmUoXCIuL3Zkb20vY3JlYXRlLWVsZW1lbnQuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFbGVtZW50XG4iLCJ2YXIgZGlmZiA9IHJlcXVpcmUoXCIuL3Z0cmVlL2RpZmYuanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBkaWZmXG4iLCJ2YXIgaCA9IHJlcXVpcmUoXCIuL3ZpcnR1YWwtaHlwZXJzY3JpcHQvaW5kZXguanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBoXG4iLCIvKiFcbiAqIENyb3NzLUJyb3dzZXIgU3BsaXQgMS4xLjFcbiAqIENvcHlyaWdodCAyMDA3LTIwMTIgU3RldmVuIExldml0aGFuIDxzdGV2ZW5sZXZpdGhhbi5jb20+XG4gKiBBdmFpbGFibGUgdW5kZXIgdGhlIE1JVCBMaWNlbnNlXG4gKiBFQ01BU2NyaXB0IGNvbXBsaWFudCwgdW5pZm9ybSBjcm9zcy1icm93c2VyIHNwbGl0IG1ldGhvZFxuICovXG5cbi8qKlxuICogU3BsaXRzIGEgc3RyaW5nIGludG8gYW4gYXJyYXkgb2Ygc3RyaW5ncyB1c2luZyBhIHJlZ2V4IG9yIHN0cmluZyBzZXBhcmF0b3IuIE1hdGNoZXMgb2YgdGhlXG4gKiBzZXBhcmF0b3IgYXJlIG5vdCBpbmNsdWRlZCBpbiB0aGUgcmVzdWx0IGFycmF5LiBIb3dldmVyLCBpZiBgc2VwYXJhdG9yYCBpcyBhIHJlZ2V4IHRoYXQgY29udGFpbnNcbiAqIGNhcHR1cmluZyBncm91cHMsIGJhY2tyZWZlcmVuY2VzIGFyZSBzcGxpY2VkIGludG8gdGhlIHJlc3VsdCBlYWNoIHRpbWUgYHNlcGFyYXRvcmAgaXMgbWF0Y2hlZC5cbiAqIEZpeGVzIGJyb3dzZXIgYnVncyBjb21wYXJlZCB0byB0aGUgbmF0aXZlIGBTdHJpbmcucHJvdG90eXBlLnNwbGl0YCBhbmQgY2FuIGJlIHVzZWQgcmVsaWFibHlcbiAqIGNyb3NzLWJyb3dzZXIuXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFN0cmluZyB0byBzcGxpdC5cbiAqIEBwYXJhbSB7UmVnRXhwfFN0cmluZ30gc2VwYXJhdG9yIFJlZ2V4IG9yIHN0cmluZyB0byB1c2UgZm9yIHNlcGFyYXRpbmcgdGhlIHN0cmluZy5cbiAqIEBwYXJhbSB7TnVtYmVyfSBbbGltaXRdIE1heGltdW0gbnVtYmVyIG9mIGl0ZW1zIHRvIGluY2x1ZGUgaW4gdGhlIHJlc3VsdCBhcnJheS5cbiAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2Ygc3Vic3RyaW5ncy5cbiAqIEBleGFtcGxlXG4gKlxuICogLy8gQmFzaWMgdXNlXG4gKiBzcGxpdCgnYSBiIGMgZCcsICcgJyk7XG4gKiAvLyAtPiBbJ2EnLCAnYicsICdjJywgJ2QnXVxuICpcbiAqIC8vIFdpdGggbGltaXRcbiAqIHNwbGl0KCdhIGIgYyBkJywgJyAnLCAyKTtcbiAqIC8vIC0+IFsnYScsICdiJ11cbiAqXG4gKiAvLyBCYWNrcmVmZXJlbmNlcyBpbiByZXN1bHQgYXJyYXlcbiAqIHNwbGl0KCcuLndvcmQxIHdvcmQyLi4nLCAvKFthLXpdKykoXFxkKykvaSk7XG4gKiAvLyAtPiBbJy4uJywgJ3dvcmQnLCAnMScsICcgJywgJ3dvcmQnLCAnMicsICcuLiddXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gKGZ1bmN0aW9uIHNwbGl0KHVuZGVmKSB7XG5cbiAgdmFyIG5hdGl2ZVNwbGl0ID0gU3RyaW5nLnByb3RvdHlwZS5zcGxpdCxcbiAgICBjb21wbGlhbnRFeGVjTnBjZyA9IC8oKT8/Ly5leGVjKFwiXCIpWzFdID09PSB1bmRlZixcbiAgICAvLyBOUENHOiBub25wYXJ0aWNpcGF0aW5nIGNhcHR1cmluZyBncm91cFxuICAgIHNlbGY7XG5cbiAgc2VsZiA9IGZ1bmN0aW9uKHN0ciwgc2VwYXJhdG9yLCBsaW1pdCkge1xuICAgIC8vIElmIGBzZXBhcmF0b3JgIGlzIG5vdCBhIHJlZ2V4LCB1c2UgYG5hdGl2ZVNwbGl0YFxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoc2VwYXJhdG9yKSAhPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgcmV0dXJuIG5hdGl2ZVNwbGl0LmNhbGwoc3RyLCBzZXBhcmF0b3IsIGxpbWl0KTtcbiAgICB9XG4gICAgdmFyIG91dHB1dCA9IFtdLFxuICAgICAgZmxhZ3MgPSAoc2VwYXJhdG9yLmlnbm9yZUNhc2UgPyBcImlcIiA6IFwiXCIpICsgKHNlcGFyYXRvci5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCIpICsgKHNlcGFyYXRvci5leHRlbmRlZCA/IFwieFwiIDogXCJcIikgKyAvLyBQcm9wb3NlZCBmb3IgRVM2XG4gICAgICAoc2VwYXJhdG9yLnN0aWNreSA/IFwieVwiIDogXCJcIiksXG4gICAgICAvLyBGaXJlZm94IDMrXG4gICAgICBsYXN0TGFzdEluZGV4ID0gMCxcbiAgICAgIC8vIE1ha2UgYGdsb2JhbGAgYW5kIGF2b2lkIGBsYXN0SW5kZXhgIGlzc3VlcyBieSB3b3JraW5nIHdpdGggYSBjb3B5XG4gICAgICBzZXBhcmF0b3IgPSBuZXcgUmVnRXhwKHNlcGFyYXRvci5zb3VyY2UsIGZsYWdzICsgXCJnXCIpLFxuICAgICAgc2VwYXJhdG9yMiwgbWF0Y2gsIGxhc3RJbmRleCwgbGFzdExlbmd0aDtcbiAgICBzdHIgKz0gXCJcIjsgLy8gVHlwZS1jb252ZXJ0XG4gICAgaWYgKCFjb21wbGlhbnRFeGVjTnBjZykge1xuICAgICAgLy8gRG9lc24ndCBuZWVkIGZsYWdzIGd5LCBidXQgdGhleSBkb24ndCBodXJ0XG4gICAgICBzZXBhcmF0b3IyID0gbmV3IFJlZ0V4cChcIl5cIiArIHNlcGFyYXRvci5zb3VyY2UgKyBcIiQoPyFcXFxccylcIiwgZmxhZ3MpO1xuICAgIH1cbiAgICAvKiBWYWx1ZXMgZm9yIGBsaW1pdGAsIHBlciB0aGUgc3BlYzpcbiAgICAgKiBJZiB1bmRlZmluZWQ6IDQyOTQ5NjcyOTUgLy8gTWF0aC5wb3coMiwgMzIpIC0gMVxuICAgICAqIElmIDAsIEluZmluaXR5LCBvciBOYU46IDBcbiAgICAgKiBJZiBwb3NpdGl2ZSBudW1iZXI6IGxpbWl0ID0gTWF0aC5mbG9vcihsaW1pdCk7IGlmIChsaW1pdCA+IDQyOTQ5NjcyOTUpIGxpbWl0IC09IDQyOTQ5NjcyOTY7XG4gICAgICogSWYgbmVnYXRpdmUgbnVtYmVyOiA0Mjk0OTY3Mjk2IC0gTWF0aC5mbG9vcihNYXRoLmFicyhsaW1pdCkpXG4gICAgICogSWYgb3RoZXI6IFR5cGUtY29udmVydCwgdGhlbiB1c2UgdGhlIGFib3ZlIHJ1bGVzXG4gICAgICovXG4gICAgbGltaXQgPSBsaW1pdCA9PT0gdW5kZWYgPyAtMSA+Pj4gMCA6IC8vIE1hdGgucG93KDIsIDMyKSAtIDFcbiAgICBsaW1pdCA+Pj4gMDsgLy8gVG9VaW50MzIobGltaXQpXG4gICAgd2hpbGUgKG1hdGNoID0gc2VwYXJhdG9yLmV4ZWMoc3RyKSkge1xuICAgICAgLy8gYHNlcGFyYXRvci5sYXN0SW5kZXhgIGlzIG5vdCByZWxpYWJsZSBjcm9zcy1icm93c2VyXG4gICAgICBsYXN0SW5kZXggPSBtYXRjaC5pbmRleCArIG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIGlmIChsYXN0SW5kZXggPiBsYXN0TGFzdEluZGV4KSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHN0ci5zbGljZShsYXN0TGFzdEluZGV4LCBtYXRjaC5pbmRleCkpO1xuICAgICAgICAvLyBGaXggYnJvd3NlcnMgd2hvc2UgYGV4ZWNgIG1ldGhvZHMgZG9uJ3QgY29uc2lzdGVudGx5IHJldHVybiBgdW5kZWZpbmVkYCBmb3JcbiAgICAgICAgLy8gbm9ucGFydGljaXBhdGluZyBjYXB0dXJpbmcgZ3JvdXBzXG4gICAgICAgIGlmICghY29tcGxpYW50RXhlY05wY2cgJiYgbWF0Y2gubGVuZ3RoID4gMSkge1xuICAgICAgICAgIG1hdGNoWzBdLnJlcGxhY2Uoc2VwYXJhdG9yMiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAyOyBpKyspIHtcbiAgICAgICAgICAgICAgaWYgKGFyZ3VtZW50c1tpXSA9PT0gdW5kZWYpIHtcbiAgICAgICAgICAgICAgICBtYXRjaFtpXSA9IHVuZGVmO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG1hdGNoLmxlbmd0aCA+IDEgJiYgbWF0Y2guaW5kZXggPCBzdHIubGVuZ3RoKSB7XG4gICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkob3V0cHV0LCBtYXRjaC5zbGljZSgxKSk7XG4gICAgICAgIH1cbiAgICAgICAgbGFzdExlbmd0aCA9IG1hdGNoWzBdLmxlbmd0aDtcbiAgICAgICAgbGFzdExhc3RJbmRleCA9IGxhc3RJbmRleDtcbiAgICAgICAgaWYgKG91dHB1dC5sZW5ndGggPj0gbGltaXQpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHNlcGFyYXRvci5sYXN0SW5kZXggPT09IG1hdGNoLmluZGV4KSB7XG4gICAgICAgIHNlcGFyYXRvci5sYXN0SW5kZXgrKzsgLy8gQXZvaWQgYW4gaW5maW5pdGUgbG9vcFxuICAgICAgfVxuICAgIH1cbiAgICBpZiAobGFzdExhc3RJbmRleCA9PT0gc3RyLmxlbmd0aCkge1xuICAgICAgaWYgKGxhc3RMZW5ndGggfHwgIXNlcGFyYXRvci50ZXN0KFwiXCIpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKFwiXCIpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaChzdHIuc2xpY2UobGFzdExhc3RJbmRleCkpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0Lmxlbmd0aCA+IGxpbWl0ID8gb3V0cHV0LnNsaWNlKDAsIGxpbWl0KSA6IG91dHB1dDtcbiAgfTtcblxuICByZXR1cm4gc2VsZjtcbn0pKCk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qZ2xvYmFsIHdpbmRvdywgZ2xvYmFsKi9cblxudmFyIHJvb3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/XG4gICAgd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgP1xuICAgIGdsb2JhbCA6IHt9O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluZGl2aWR1YWw7XG5cbmZ1bmN0aW9uIEluZGl2aWR1YWwoa2V5LCB2YWx1ZSkge1xuICAgIGlmIChrZXkgaW4gcm9vdCkge1xuICAgICAgICByZXR1cm4gcm9vdFtrZXldO1xuICAgIH1cblxuICAgIHJvb3Rba2V5XSA9IHZhbHVlO1xuXG4gICAgcmV0dXJuIHZhbHVlO1xufVxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICB2YXIgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxuXG4gICAgbW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcblx0cmV0dXJuIHR5cGVvZiB4ID09PSBcIm9iamVjdFwiICYmIHggIT09IG51bGw7XG59O1xuIiwidmFyIG5hdGl2ZUlzQXJyYXkgPSBBcnJheS5pc0FycmF5XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG5cbm1vZHVsZS5leHBvcnRzID0gbmF0aXZlSXNBcnJheSB8fCBpc0FycmF5XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiXG59XG4iLCJ2YXIgcGF0Y2ggPSByZXF1aXJlKFwiLi92ZG9tL3BhdGNoLmpzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gcGF0Y2hcbiIsInZhciBpc09iamVjdCA9IHJlcXVpcmUoXCJpcy1vYmplY3RcIilcbnZhciBpc0hvb2sgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdmhvb2suanNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBhcHBseVByb3BlcnRpZXNcblxuZnVuY3Rpb24gYXBwbHlQcm9wZXJ0aWVzKG5vZGUsIHByb3BzLCBwcmV2aW91cykge1xuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BzKSB7XG4gICAgICAgIHZhciBwcm9wVmFsdWUgPSBwcm9wc1twcm9wTmFtZV1cblxuICAgICAgICBpZiAocHJvcFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUsIHByZXZpb3VzKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0hvb2socHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgcmVtb3ZlUHJvcGVydHkobm9kZSwgcHJvcE5hbWUsIHByb3BWYWx1ZSwgcHJldmlvdXMpXG4gICAgICAgICAgICBpZiAocHJvcFZhbHVlLmhvb2spIHtcbiAgICAgICAgICAgICAgICBwcm9wVmFsdWUuaG9vayhub2RlLFxuICAgICAgICAgICAgICAgICAgICBwcm9wTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWQpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoaXNPYmplY3QocHJvcFZhbHVlKSkge1xuICAgICAgICAgICAgICAgIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVByb3BlcnR5KG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUsIHByZXZpb3VzKSB7XG4gICAgaWYgKHByZXZpb3VzKSB7XG4gICAgICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXNbcHJvcE5hbWVdXG5cbiAgICAgICAgaWYgKCFpc0hvb2socHJldmlvdXNWYWx1ZSkpIHtcbiAgICAgICAgICAgIGlmIChwcm9wTmFtZSA9PT0gXCJhdHRyaWJ1dGVzXCIpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcmV2aW91c1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcE5hbWUgPT09IFwic3R5bGVcIikge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gcHJldmlvdXNWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW2ldID0gXCJcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHByZXZpb3VzVmFsdWUgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBub2RlW3Byb3BOYW1lXSA9IFwiXCJcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbm9kZVtwcm9wTmFtZV0gPSBudWxsXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAocHJldmlvdXNWYWx1ZS51bmhvb2spIHtcbiAgICAgICAgICAgIHByZXZpb3VzVmFsdWUudW5ob29rKG5vZGUsIHByb3BOYW1lLCBwcm9wVmFsdWUpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHBhdGNoT2JqZWN0KG5vZGUsIHByb3BzLCBwcmV2aW91cywgcHJvcE5hbWUsIHByb3BWYWx1ZSkge1xuICAgIHZhciBwcmV2aW91c1ZhbHVlID0gcHJldmlvdXMgPyBwcmV2aW91c1twcm9wTmFtZV0gOiB1bmRlZmluZWRcblxuICAgIC8vIFNldCBhdHRyaWJ1dGVzXG4gICAgaWYgKHByb3BOYW1lID09PSBcImF0dHJpYnV0ZXNcIikge1xuICAgICAgICBmb3IgKHZhciBhdHRyTmFtZSBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBhdHRyVmFsdWUgPSBwcm9wVmFsdWVbYXR0ck5hbWVdXG5cbiAgICAgICAgICAgIGlmIChhdHRyVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIG5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgaWYocHJldmlvdXNWYWx1ZSAmJiBpc09iamVjdChwcmV2aW91c1ZhbHVlKSAmJlxuICAgICAgICBnZXRQcm90b3R5cGUocHJldmlvdXNWYWx1ZSkgIT09IGdldFByb3RvdHlwZShwcm9wVmFsdWUpKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0gcHJvcFZhbHVlXG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGlmICghaXNPYmplY3Qobm9kZVtwcm9wTmFtZV0pKSB7XG4gICAgICAgIG5vZGVbcHJvcE5hbWVdID0ge31cbiAgICB9XG5cbiAgICB2YXIgcmVwbGFjZXIgPSBwcm9wTmFtZSA9PT0gXCJzdHlsZVwiID8gXCJcIiA6IHVuZGVmaW5lZFxuXG4gICAgZm9yICh2YXIgayBpbiBwcm9wVmFsdWUpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gcHJvcFZhbHVlW2tdXG4gICAgICAgIG5vZGVbcHJvcE5hbWVdW2tdID0gKHZhbHVlID09PSB1bmRlZmluZWQpID8gcmVwbGFjZXIgOiB2YWx1ZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZikge1xuICAgICAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICAgIH0gZWxzZSBpZiAodmFsdWUuX19wcm90b19fKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgICB9IGVsc2UgaWYgKHZhbHVlLmNvbnN0cnVjdG9yKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgICB9XG59XG4iLCJ2YXIgZG9jdW1lbnQgPSByZXF1aXJlKFwiZ2xvYmFsL2RvY3VtZW50XCIpXG5cbnZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1ZOb2RlID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZub2RlLmpzXCIpXG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy12dGV4dC5qc1wiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldC5qc1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2hhbmRsZS10aHVuay5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUVsZW1lbnRcblxuZnVuY3Rpb24gY3JlYXRlRWxlbWVudCh2bm9kZSwgb3B0cykge1xuICAgIHZhciBkb2MgPSBvcHRzID8gb3B0cy5kb2N1bWVudCB8fCBkb2N1bWVudCA6IGRvY3VtZW50XG4gICAgdmFyIHdhcm4gPSBvcHRzID8gb3B0cy53YXJuIDogbnVsbFxuXG4gICAgdm5vZGUgPSBoYW5kbGVUaHVuayh2bm9kZSkuYVxuXG4gICAgaWYgKGlzV2lkZ2V0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gdm5vZGUuaW5pdCgpXG4gICAgfSBlbHNlIGlmIChpc1ZUZXh0KHZub2RlKSkge1xuICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZVRleHROb2RlKHZub2RlLnRleHQpXG4gICAgfSBlbHNlIGlmICghaXNWTm9kZSh2bm9kZSkpIHtcbiAgICAgICAgaWYgKHdhcm4pIHtcbiAgICAgICAgICAgIHdhcm4oXCJJdGVtIGlzIG5vdCBhIHZhbGlkIHZpcnR1YWwgZG9tIG5vZGVcIiwgdm5vZGUpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9ICh2bm9kZS5uYW1lc3BhY2UgPT09IG51bGwpID9cbiAgICAgICAgZG9jLmNyZWF0ZUVsZW1lbnQodm5vZGUudGFnTmFtZSkgOlxuICAgICAgICBkb2MuY3JlYXRlRWxlbWVudE5TKHZub2RlLm5hbWVzcGFjZSwgdm5vZGUudGFnTmFtZSlcblxuICAgIHZhciBwcm9wcyA9IHZub2RlLnByb3BlcnRpZXNcbiAgICBhcHBseVByb3BlcnRpZXMobm9kZSwgcHJvcHMpXG5cbiAgICB2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gY3JlYXRlRWxlbWVudChjaGlsZHJlbltpXSwgb3B0cylcbiAgICAgICAgaWYgKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChjaGlsZE5vZGUpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbm9kZVxufVxuIiwiLy8gTWFwcyBhIHZpcnR1YWwgRE9NIHRyZWUgb250byBhIHJlYWwgRE9NIHRyZWUgaW4gYW4gZWZmaWNpZW50IG1hbm5lci5cbi8vIFdlIGRvbid0IHdhbnQgdG8gcmVhZCBhbGwgb2YgdGhlIERPTSBub2RlcyBpbiB0aGUgdHJlZSBzbyB3ZSB1c2Vcbi8vIHRoZSBpbi1vcmRlciB0cmVlIGluZGV4aW5nIHRvIGVsaW1pbmF0ZSByZWN1cnNpb24gZG93biBjZXJ0YWluIGJyYW5jaGVzLlxuLy8gV2Ugb25seSByZWN1cnNlIGludG8gYSBET00gbm9kZSBpZiB3ZSBrbm93IHRoYXQgaXQgY29udGFpbnMgYSBjaGlsZCBvZlxuLy8gaW50ZXJlc3QuXG5cbnZhciBub0NoaWxkID0ge31cblxubW9kdWxlLmV4cG9ydHMgPSBkb21JbmRleFxuXG5mdW5jdGlvbiBkb21JbmRleChyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMpIHtcbiAgICBpZiAoIWluZGljZXMgfHwgaW5kaWNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHt9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaW5kaWNlcy5zb3J0KGFzY2VuZGluZylcbiAgICAgICAgcmV0dXJuIHJlY3Vyc2Uocm9vdE5vZGUsIHRyZWUsIGluZGljZXMsIG5vZGVzLCAwKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVjdXJzZShyb290Tm9kZSwgdHJlZSwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleCkge1xuICAgIG5vZGVzID0gbm9kZXMgfHwge31cblxuXG4gICAgaWYgKHJvb3ROb2RlKSB7XG4gICAgICAgIGlmIChpbmRleEluUmFuZ2UoaW5kaWNlcywgcm9vdEluZGV4LCByb290SW5kZXgpKSB7XG4gICAgICAgICAgICBub2Rlc1tyb290SW5kZXhdID0gcm9vdE5vZGVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciB2Q2hpbGRyZW4gPSB0cmVlLmNoaWxkcmVuXG5cbiAgICAgICAgaWYgKHZDaGlsZHJlbikge1xuXG4gICAgICAgICAgICB2YXIgY2hpbGROb2RlcyA9IHJvb3ROb2RlLmNoaWxkTm9kZXNcblxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0cmVlLmNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcm9vdEluZGV4ICs9IDFcblxuICAgICAgICAgICAgICAgIHZhciB2Q2hpbGQgPSB2Q2hpbGRyZW5baV0gfHwgbm9DaGlsZFxuICAgICAgICAgICAgICAgIHZhciBuZXh0SW5kZXggPSByb290SW5kZXggKyAodkNoaWxkLmNvdW50IHx8IDApXG5cbiAgICAgICAgICAgICAgICAvLyBza2lwIHJlY3Vyc2lvbiBkb3duIHRoZSB0cmVlIGlmIHRoZXJlIGFyZSBubyBub2RlcyBkb3duIGhlcmVcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXhJblJhbmdlKGluZGljZXMsIHJvb3RJbmRleCwgbmV4dEluZGV4KSkge1xuICAgICAgICAgICAgICAgICAgICByZWN1cnNlKGNoaWxkTm9kZXNbaV0sIHZDaGlsZCwgaW5kaWNlcywgbm9kZXMsIHJvb3RJbmRleClcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByb290SW5kZXggPSBuZXh0SW5kZXhcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBub2Rlc1xufVxuXG4vLyBCaW5hcnkgc2VhcmNoIGZvciBhbiBpbmRleCBpbiB0aGUgaW50ZXJ2YWwgW2xlZnQsIHJpZ2h0XVxuZnVuY3Rpb24gaW5kZXhJblJhbmdlKGluZGljZXMsIGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGluZGljZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH1cblxuICAgIHZhciBtaW5JbmRleCA9IDBcbiAgICB2YXIgbWF4SW5kZXggPSBpbmRpY2VzLmxlbmd0aCAtIDFcbiAgICB2YXIgY3VycmVudEluZGV4XG4gICAgdmFyIGN1cnJlbnRJdGVtXG5cbiAgICB3aGlsZSAobWluSW5kZXggPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgY3VycmVudEluZGV4ID0gKChtYXhJbmRleCArIG1pbkluZGV4KSAvIDIpID4+IDBcbiAgICAgICAgY3VycmVudEl0ZW0gPSBpbmRpY2VzW2N1cnJlbnRJbmRleF1cblxuICAgICAgICBpZiAobWluSW5kZXggPT09IG1heEluZGV4KSB7XG4gICAgICAgICAgICByZXR1cm4gY3VycmVudEl0ZW0gPj0gbGVmdCAmJiBjdXJyZW50SXRlbSA8PSByaWdodFxuICAgICAgICB9IGVsc2UgaWYgKGN1cnJlbnRJdGVtIDwgbGVmdCkge1xuICAgICAgICAgICAgbWluSW5kZXggPSBjdXJyZW50SW5kZXggKyAxXG4gICAgICAgIH0gZWxzZSAgaWYgKGN1cnJlbnRJdGVtID4gcmlnaHQpIHtcbiAgICAgICAgICAgIG1heEluZGV4ID0gY3VycmVudEluZGV4IC0gMVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gYXNjZW5kaW5nKGEsIGIpIHtcbiAgICByZXR1cm4gYSA+IGIgPyAxIDogLTFcbn1cbiIsInZhciBhcHBseVByb3BlcnRpZXMgPSByZXF1aXJlKFwiLi9hcHBseS1wcm9wZXJ0aWVzXCIpXG5cbnZhciBpc1dpZGdldCA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy13aWRnZXQuanNcIilcbnZhciBWUGF0Y2ggPSByZXF1aXJlKFwiLi4vdm5vZGUvdnBhdGNoLmpzXCIpXG5cbnZhciB1cGRhdGVXaWRnZXQgPSByZXF1aXJlKFwiLi91cGRhdGUtd2lkZ2V0XCIpXG5cbm1vZHVsZS5leHBvcnRzID0gYXBwbHlQYXRjaFxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHZwYXRjaCwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciB0eXBlID0gdnBhdGNoLnR5cGVcbiAgICB2YXIgdk5vZGUgPSB2cGF0Y2gudk5vZGVcbiAgICB2YXIgcGF0Y2ggPSB2cGF0Y2gucGF0Y2hcblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlIFZQYXRjaC5SRU1PVkU6XG4gICAgICAgICAgICByZXR1cm4gcmVtb3ZlTm9kZShkb21Ob2RlLCB2Tm9kZSlcbiAgICAgICAgY2FzZSBWUGF0Y2guSU5TRVJUOlxuICAgICAgICAgICAgcmV0dXJuIGluc2VydE5vZGUoZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLlZURVhUOlxuICAgICAgICAgICAgcmV0dXJuIHN0cmluZ1BhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guV0lER0VUOlxuICAgICAgICAgICAgcmV0dXJuIHdpZGdldFBhdGNoKGRvbU5vZGUsIHZOb2RlLCBwYXRjaCwgcmVuZGVyT3B0aW9ucylcbiAgICAgICAgY2FzZSBWUGF0Y2guVk5PREU6XG4gICAgICAgICAgICByZXR1cm4gdk5vZGVQYXRjaChkb21Ob2RlLCB2Tm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpXG4gICAgICAgIGNhc2UgVlBhdGNoLk9SREVSOlxuICAgICAgICAgICAgcmVvcmRlckNoaWxkcmVuKGRvbU5vZGUsIHBhdGNoKVxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICAgICAgY2FzZSBWUGF0Y2guUFJPUFM6XG4gICAgICAgICAgICBhcHBseVByb3BlcnRpZXMoZG9tTm9kZSwgcGF0Y2gsIHZOb2RlLnByb3BlcnRpZXMpXG4gICAgICAgICAgICByZXR1cm4gZG9tTm9kZVxuICAgICAgICBjYXNlIFZQYXRjaC5USFVOSzpcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlUm9vdChkb21Ob2RlLFxuICAgICAgICAgICAgICAgIHJlbmRlck9wdGlvbnMucGF0Y2goZG9tTm9kZSwgcGF0Y2gsIHJlbmRlck9wdGlvbnMpKVxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgcmV0dXJuIGRvbU5vZGVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZU5vZGUoZG9tTm9kZSwgdk5vZGUpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuXG4gICAgaWYgKHBhcmVudE5vZGUpIHtcbiAgICAgICAgcGFyZW50Tm9kZS5yZW1vdmVDaGlsZChkb21Ob2RlKVxuICAgIH1cblxuICAgIGRlc3Ryb3lXaWRnZXQoZG9tTm9kZSwgdk5vZGUpO1xuXG4gICAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gaW5zZXJ0Tm9kZShwYXJlbnROb2RlLCB2Tm9kZSwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyT3B0aW9ucy5yZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSkge1xuICAgICAgICBwYXJlbnROb2RlLmFwcGVuZENoaWxkKG5ld05vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIHBhcmVudE5vZGVcbn1cblxuZnVuY3Rpb24gc3RyaW5nUGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB2VGV4dCwgcmVuZGVyT3B0aW9ucykge1xuICAgIHZhciBuZXdOb2RlXG5cbiAgICBpZiAoZG9tTm9kZS5ub2RlVHlwZSA9PT0gMykge1xuICAgICAgICBkb21Ob2RlLnJlcGxhY2VEYXRhKDAsIGRvbU5vZGUubGVuZ3RoLCB2VGV4dC50ZXh0KVxuICAgICAgICBuZXdOb2RlID0gZG9tTm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG4gICAgICAgIG5ld05vZGUgPSByZW5kZXJPcHRpb25zLnJlbmRlcih2VGV4dCwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICBpZiAocGFyZW50Tm9kZSAmJiBuZXdOb2RlICE9PSBkb21Ob2RlKSB7XG4gICAgICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdOb2RlLCBkb21Ob2RlKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gd2lkZ2V0UGF0Y2goZG9tTm9kZSwgbGVmdFZOb2RlLCB3aWRnZXQsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgdXBkYXRpbmcgPSB1cGRhdGVXaWRnZXQobGVmdFZOb2RlLCB3aWRnZXQpXG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmICh1cGRhdGluZykge1xuICAgICAgICBuZXdOb2RlID0gd2lkZ2V0LnVwZGF0ZShsZWZ0Vk5vZGUsIGRvbU5vZGUpIHx8IGRvbU5vZGVcbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdOb2RlID0gcmVuZGVyT3B0aW9ucy5yZW5kZXIod2lkZ2V0LCByZW5kZXJPcHRpb25zKVxuICAgIH1cblxuICAgIHZhciBwYXJlbnROb2RlID0gZG9tTm9kZS5wYXJlbnROb2RlXG5cbiAgICBpZiAocGFyZW50Tm9kZSAmJiBuZXdOb2RlICE9PSBkb21Ob2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgaWYgKCF1cGRhdGluZykge1xuICAgICAgICBkZXN0cm95V2lkZ2V0KGRvbU5vZGUsIGxlZnRWTm9kZSlcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3Tm9kZVxufVxuXG5mdW5jdGlvbiB2Tm9kZVBhdGNoKGRvbU5vZGUsIGxlZnRWTm9kZSwgdk5vZGUsIHJlbmRlck9wdGlvbnMpIHtcbiAgICB2YXIgcGFyZW50Tm9kZSA9IGRvbU5vZGUucGFyZW50Tm9kZVxuICAgIHZhciBuZXdOb2RlID0gcmVuZGVyT3B0aW9ucy5yZW5kZXIodk5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICBpZiAocGFyZW50Tm9kZSAmJiBuZXdOb2RlICE9PSBkb21Ob2RlKSB7XG4gICAgICAgIHBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG5ld05vZGUsIGRvbU5vZGUpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld05vZGVcbn1cblxuZnVuY3Rpb24gZGVzdHJveVdpZGdldChkb21Ob2RlLCB3KSB7XG4gICAgaWYgKHR5cGVvZiB3LmRlc3Ryb3kgPT09IFwiZnVuY3Rpb25cIiAmJiBpc1dpZGdldCh3KSkge1xuICAgICAgICB3LmRlc3Ryb3koZG9tTm9kZSlcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlb3JkZXJDaGlsZHJlbihkb21Ob2RlLCBtb3Zlcykge1xuICAgIHZhciBjaGlsZE5vZGVzID0gZG9tTm9kZS5jaGlsZE5vZGVzXG4gICAgdmFyIGtleU1hcCA9IHt9XG4gICAgdmFyIG5vZGVcbiAgICB2YXIgcmVtb3ZlXG4gICAgdmFyIGluc2VydFxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtb3Zlcy5yZW1vdmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlbW92ZSA9IG1vdmVzLnJlbW92ZXNbaV1cbiAgICAgICAgbm9kZSA9IGNoaWxkTm9kZXNbcmVtb3ZlLmZyb21dXG4gICAgICAgIGlmIChyZW1vdmUua2V5KSB7XG4gICAgICAgICAgICBrZXlNYXBbcmVtb3ZlLmtleV0gPSBub2RlXG4gICAgICAgIH1cbiAgICAgICAgZG9tTm9kZS5yZW1vdmVDaGlsZChub2RlKVxuICAgIH1cblxuICAgIHZhciBsZW5ndGggPSBjaGlsZE5vZGVzLmxlbmd0aFxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgbW92ZXMuaW5zZXJ0cy5sZW5ndGg7IGorKykge1xuICAgICAgICBpbnNlcnQgPSBtb3Zlcy5pbnNlcnRzW2pdXG4gICAgICAgIG5vZGUgPSBrZXlNYXBbaW5zZXJ0LmtleV1cbiAgICAgICAgLy8gdGhpcyBpcyB0aGUgd2VpcmRlc3QgYnVnIGkndmUgZXZlciBzZWVuIGluIHdlYmtpdFxuICAgICAgICBkb21Ob2RlLmluc2VydEJlZm9yZShub2RlLCBpbnNlcnQudG8gPj0gbGVuZ3RoKysgPyBudWxsIDogY2hpbGROb2Rlc1tpbnNlcnQudG9dKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZVJvb3Qob2xkUm9vdCwgbmV3Um9vdCkge1xuICAgIGlmIChvbGRSb290ICYmIG5ld1Jvb3QgJiYgb2xkUm9vdCAhPT0gbmV3Um9vdCAmJiBvbGRSb290LnBhcmVudE5vZGUpIHtcbiAgICAgICAgb2xkUm9vdC5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChuZXdSb290LCBvbGRSb290KVxuICAgIH1cblxuICAgIHJldHVybiBuZXdSb290O1xufVxuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZShcImdsb2JhbC9kb2N1bWVudFwiKVxudmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgcmVuZGVyID0gcmVxdWlyZShcIi4vY3JlYXRlLWVsZW1lbnRcIilcbnZhciBkb21JbmRleCA9IHJlcXVpcmUoXCIuL2RvbS1pbmRleFwiKVxudmFyIHBhdGNoT3AgPSByZXF1aXJlKFwiLi9wYXRjaC1vcFwiKVxubW9kdWxlLmV4cG9ydHMgPSBwYXRjaFxuXG5mdW5jdGlvbiBwYXRjaChyb290Tm9kZSwgcGF0Y2hlcywgcmVuZGVyT3B0aW9ucykge1xuICAgIHJlbmRlck9wdGlvbnMgPSByZW5kZXJPcHRpb25zIHx8IHt9XG4gICAgcmVuZGVyT3B0aW9ucy5wYXRjaCA9IHJlbmRlck9wdGlvbnMucGF0Y2ggJiYgcmVuZGVyT3B0aW9ucy5wYXRjaCAhPT0gcGF0Y2hcbiAgICAgICAgPyByZW5kZXJPcHRpb25zLnBhdGNoXG4gICAgICAgIDogcGF0Y2hSZWN1cnNpdmVcbiAgICByZW5kZXJPcHRpb25zLnJlbmRlciA9IHJlbmRlck9wdGlvbnMucmVuZGVyIHx8IHJlbmRlclxuXG4gICAgcmV0dXJuIHJlbmRlck9wdGlvbnMucGF0Y2gocm9vdE5vZGUsIHBhdGNoZXMsIHJlbmRlck9wdGlvbnMpXG59XG5cbmZ1bmN0aW9uIHBhdGNoUmVjdXJzaXZlKHJvb3ROb2RlLCBwYXRjaGVzLCByZW5kZXJPcHRpb25zKSB7XG4gICAgdmFyIGluZGljZXMgPSBwYXRjaEluZGljZXMocGF0Y2hlcylcblxuICAgIGlmIChpbmRpY2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGVcbiAgICB9XG5cbiAgICB2YXIgaW5kZXggPSBkb21JbmRleChyb290Tm9kZSwgcGF0Y2hlcy5hLCBpbmRpY2VzKVxuICAgIHZhciBvd25lckRvY3VtZW50ID0gcm9vdE5vZGUub3duZXJEb2N1bWVudFxuXG4gICAgaWYgKCFyZW5kZXJPcHRpb25zLmRvY3VtZW50ICYmIG93bmVyRG9jdW1lbnQgIT09IGRvY3VtZW50KSB7XG4gICAgICAgIHJlbmRlck9wdGlvbnMuZG9jdW1lbnQgPSBvd25lckRvY3VtZW50XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbmRpY2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBub2RlSW5kZXggPSBpbmRpY2VzW2ldXG4gICAgICAgIHJvb3ROb2RlID0gYXBwbHlQYXRjaChyb290Tm9kZSxcbiAgICAgICAgICAgIGluZGV4W25vZGVJbmRleF0sXG4gICAgICAgICAgICBwYXRjaGVzW25vZGVJbmRleF0sXG4gICAgICAgICAgICByZW5kZXJPcHRpb25zKVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBhcHBseVBhdGNoKHJvb3ROb2RlLCBkb21Ob2RlLCBwYXRjaExpc3QsIHJlbmRlck9wdGlvbnMpIHtcbiAgICBpZiAoIWRvbU5vZGUpIHtcbiAgICAgICAgcmV0dXJuIHJvb3ROb2RlXG4gICAgfVxuXG4gICAgdmFyIG5ld05vZGVcblxuICAgIGlmIChpc0FycmF5KHBhdGNoTGlzdCkpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXRjaExpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIG5ld05vZGUgPSBwYXRjaE9wKHBhdGNoTGlzdFtpXSwgZG9tTm9kZSwgcmVuZGVyT3B0aW9ucylcblxuICAgICAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICAgICAgcm9vdE5vZGUgPSBuZXdOb2RlXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBuZXdOb2RlID0gcGF0Y2hPcChwYXRjaExpc3QsIGRvbU5vZGUsIHJlbmRlck9wdGlvbnMpXG5cbiAgICAgICAgaWYgKGRvbU5vZGUgPT09IHJvb3ROb2RlKSB7XG4gICAgICAgICAgICByb290Tm9kZSA9IG5ld05vZGVcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByb290Tm9kZVxufVxuXG5mdW5jdGlvbiBwYXRjaEluZGljZXMocGF0Y2hlcykge1xuICAgIHZhciBpbmRpY2VzID0gW11cblxuICAgIGZvciAodmFyIGtleSBpbiBwYXRjaGVzKSB7XG4gICAgICAgIGlmIChrZXkgIT09IFwiYVwiKSB7XG4gICAgICAgICAgICBpbmRpY2VzLnB1c2goTnVtYmVyKGtleSkpXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gaW5kaWNlc1xufVxuIiwidmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXdpZGdldC5qc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHVwZGF0ZVdpZGdldFxuXG5mdW5jdGlvbiB1cGRhdGVXaWRnZXQoYSwgYikge1xuICAgIGlmIChpc1dpZGdldChhKSAmJiBpc1dpZGdldChiKSkge1xuICAgICAgICBpZiAoXCJuYW1lXCIgaW4gYSAmJiBcIm5hbWVcIiBpbiBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5pZCA9PT0gYi5pZFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGEuaW5pdCA9PT0gYi5pbml0XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2Vcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEV2U3RvcmUgPSByZXF1aXJlKCdldi1zdG9yZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2SG9vaztcblxuZnVuY3Rpb24gRXZIb29rKHZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEV2SG9vaykpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBFdkhvb2sodmFsdWUpO1xuICAgIH1cblxuICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbn1cblxuRXZIb29rLnByb3RvdHlwZS5ob29rID0gZnVuY3Rpb24gKG5vZGUsIHByb3BlcnR5TmFtZSkge1xuICAgIHZhciBlcyA9IEV2U3RvcmUobm9kZSk7XG4gICAgdmFyIHByb3BOYW1lID0gcHJvcGVydHlOYW1lLnN1YnN0cigzKTtcblxuICAgIGVzW3Byb3BOYW1lXSA9IHRoaXMudmFsdWU7XG59O1xuXG5Fdkhvb2sucHJvdG90eXBlLnVuaG9vayA9IGZ1bmN0aW9uKG5vZGUsIHByb3BlcnR5TmFtZSkge1xuICAgIHZhciBlcyA9IEV2U3RvcmUobm9kZSk7XG4gICAgdmFyIHByb3BOYW1lID0gcHJvcGVydHlOYW1lLnN1YnN0cigzKTtcblxuICAgIGVzW3Byb3BOYW1lXSA9IHVuZGVmaW5lZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gU29mdFNldEhvb2s7XG5cbmZ1bmN0aW9uIFNvZnRTZXRIb29rKHZhbHVlKSB7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNvZnRTZXRIb29rKSkge1xuICAgICAgICByZXR1cm4gbmV3IFNvZnRTZXRIb29rKHZhbHVlKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbHVlID0gdmFsdWU7XG59XG5cblNvZnRTZXRIb29rLnByb3RvdHlwZS5ob29rID0gZnVuY3Rpb24gKG5vZGUsIHByb3BlcnR5TmFtZSkge1xuICAgIGlmIChub2RlW3Byb3BlcnR5TmFtZV0gIT09IHRoaXMudmFsdWUpIHtcbiAgICAgICAgbm9kZVtwcm9wZXJ0eU5hbWVdID0gdGhpcy52YWx1ZTtcbiAgICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgaXNBcnJheSA9IHJlcXVpcmUoJ3gtaXMtYXJyYXknKTtcblxudmFyIFZOb2RlID0gcmVxdWlyZSgnLi4vdm5vZGUvdm5vZGUuanMnKTtcbnZhciBWVGV4dCA9IHJlcXVpcmUoJy4uL3Zub2RlL3Z0ZXh0LmpzJyk7XG52YXIgaXNWTm9kZSA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXZub2RlJyk7XG52YXIgaXNWVGV4dCA9IHJlcXVpcmUoJy4uL3Zub2RlL2lzLXZ0ZXh0Jyk7XG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKCcuLi92bm9kZS9pcy13aWRnZXQnKTtcbnZhciBpc0hvb2sgPSByZXF1aXJlKCcuLi92bm9kZS9pcy12aG9vaycpO1xudmFyIGlzVlRodW5rID0gcmVxdWlyZSgnLi4vdm5vZGUvaXMtdGh1bmsnKTtcblxudmFyIHBhcnNlVGFnID0gcmVxdWlyZSgnLi9wYXJzZS10YWcuanMnKTtcbnZhciBzb2Z0U2V0SG9vayA9IHJlcXVpcmUoJy4vaG9va3Mvc29mdC1zZXQtaG9vay5qcycpO1xudmFyIGV2SG9vayA9IHJlcXVpcmUoJy4vaG9va3MvZXYtaG9vay5qcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGg7XG5cbmZ1bmN0aW9uIGgodGFnTmFtZSwgcHJvcGVydGllcywgY2hpbGRyZW4pIHtcbiAgICB2YXIgY2hpbGROb2RlcyA9IFtdO1xuICAgIHZhciB0YWcsIHByb3BzLCBrZXksIG5hbWVzcGFjZTtcblxuICAgIGlmICghY2hpbGRyZW4gJiYgaXNDaGlsZHJlbihwcm9wZXJ0aWVzKSkge1xuICAgICAgICBjaGlsZHJlbiA9IHByb3BlcnRpZXM7XG4gICAgICAgIHByb3BzID0ge307XG4gICAgfVxuXG4gICAgcHJvcHMgPSBwcm9wcyB8fCBwcm9wZXJ0aWVzIHx8IHt9O1xuICAgIHRhZyA9IHBhcnNlVGFnKHRhZ05hbWUsIHByb3BzKTtcblxuICAgIC8vIHN1cHBvcnQga2V5c1xuICAgIGlmIChwcm9wcy5oYXNPd25Qcm9wZXJ0eSgna2V5JykpIHtcbiAgICAgICAga2V5ID0gcHJvcHMua2V5O1xuICAgICAgICBwcm9wcy5rZXkgPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gc3VwcG9ydCBuYW1lc3BhY2VcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkoJ25hbWVzcGFjZScpKSB7XG4gICAgICAgIG5hbWVzcGFjZSA9IHByb3BzLm5hbWVzcGFjZTtcbiAgICAgICAgcHJvcHMubmFtZXNwYWNlID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIGZpeCBjdXJzb3IgYnVnXG4gICAgaWYgKHRhZyA9PT0gJ0lOUFVUJyAmJlxuICAgICAgICAhbmFtZXNwYWNlICYmXG4gICAgICAgIHByb3BzLmhhc093blByb3BlcnR5KCd2YWx1ZScpICYmXG4gICAgICAgIHByb3BzLnZhbHVlICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgIWlzSG9vayhwcm9wcy52YWx1ZSlcbiAgICApIHtcbiAgICAgICAgcHJvcHMudmFsdWUgPSBzb2Z0U2V0SG9vayhwcm9wcy52YWx1ZSk7XG4gICAgfVxuXG4gICAgdHJhbnNmb3JtUHJvcGVydGllcyhwcm9wcyk7XG5cbiAgICBpZiAoY2hpbGRyZW4gIT09IHVuZGVmaW5lZCAmJiBjaGlsZHJlbiAhPT0gbnVsbCkge1xuICAgICAgICBhZGRDaGlsZChjaGlsZHJlbiwgY2hpbGROb2RlcywgdGFnLCBwcm9wcyk7XG4gICAgfVxuXG5cbiAgICByZXR1cm4gbmV3IFZOb2RlKHRhZywgcHJvcHMsIGNoaWxkTm9kZXMsIGtleSwgbmFtZXNwYWNlKTtcbn1cblxuZnVuY3Rpb24gYWRkQ2hpbGQoYywgY2hpbGROb2RlcywgdGFnLCBwcm9wcykge1xuICAgIGlmICh0eXBlb2YgYyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgY2hpbGROb2Rlcy5wdXNoKG5ldyBWVGV4dChjKSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgYyA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgY2hpbGROb2Rlcy5wdXNoKG5ldyBWVGV4dChTdHJpbmcoYykpKTtcbiAgICB9IGVsc2UgaWYgKGlzQ2hpbGQoYykpIHtcbiAgICAgICAgY2hpbGROb2Rlcy5wdXNoKGMpO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheShjKSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFkZENoaWxkKGNbaV0sIGNoaWxkTm9kZXMsIHRhZywgcHJvcHMpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIGlmIChjID09PSBudWxsIHx8IGMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVW5leHBlY3RlZFZpcnR1YWxFbGVtZW50KHtcbiAgICAgICAgICAgIGZvcmVpZ25PYmplY3Q6IGMsXG4gICAgICAgICAgICBwYXJlbnRWbm9kZToge1xuICAgICAgICAgICAgICAgIHRhZ05hbWU6IHRhZyxcbiAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wc1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRyYW5zZm9ybVByb3BlcnRpZXMocHJvcHMpIHtcbiAgICBmb3IgKHZhciBwcm9wTmFtZSBpbiBwcm9wcykge1xuICAgICAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBwcm9wc1twcm9wTmFtZV07XG5cbiAgICAgICAgICAgIGlmIChpc0hvb2sodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcm9wTmFtZS5zdWJzdHIoMCwgMykgPT09ICdldi0nKSB7XG4gICAgICAgICAgICAgICAgLy8gYWRkIGV2LWZvbyBzdXBwb3J0XG4gICAgICAgICAgICAgICAgcHJvcHNbcHJvcE5hbWVdID0gZXZIb29rKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaXNDaGlsZCh4KSB7XG4gICAgcmV0dXJuIGlzVk5vZGUoeCkgfHwgaXNWVGV4dCh4KSB8fCBpc1dpZGdldCh4KSB8fCBpc1ZUaHVuayh4KTtcbn1cblxuZnVuY3Rpb24gaXNDaGlsZHJlbih4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnc3RyaW5nJyB8fCBpc0FycmF5KHgpIHx8IGlzQ2hpbGQoeCk7XG59XG5cbmZ1bmN0aW9uIFVuZXhwZWN0ZWRWaXJ0dWFsRWxlbWVudChkYXRhKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuXG4gICAgZXJyLnR5cGUgPSAndmlydHVhbC1oeXBlcnNjcmlwdC51bmV4cGVjdGVkLnZpcnR1YWwtZWxlbWVudCc7XG4gICAgZXJyLm1lc3NhZ2UgPSAnVW5leHBlY3RlZCB2aXJ0dWFsIGNoaWxkIHBhc3NlZCB0byBoKCkuXFxuJyArXG4gICAgICAgICdFeHBlY3RlZCBhIFZOb2RlIC8gVnRodW5rIC8gVldpZGdldCAvIHN0cmluZyBidXQ6XFxuJyArXG4gICAgICAgICdnb3Q6XFxuJyArXG4gICAgICAgIGVycm9yU3RyaW5nKGRhdGEuZm9yZWlnbk9iamVjdCkgK1xuICAgICAgICAnLlxcbicgK1xuICAgICAgICAnVGhlIHBhcmVudCB2bm9kZSBpczpcXG4nICtcbiAgICAgICAgZXJyb3JTdHJpbmcoZGF0YS5wYXJlbnRWbm9kZSlcbiAgICAgICAgJ1xcbicgK1xuICAgICAgICAnU3VnZ2VzdGVkIGZpeDogY2hhbmdlIHlvdXIgYGgoLi4uLCBbIC4uLiBdKWAgY2FsbHNpdGUuJztcbiAgICBlcnIuZm9yZWlnbk9iamVjdCA9IGRhdGEuZm9yZWlnbk9iamVjdDtcbiAgICBlcnIucGFyZW50Vm5vZGUgPSBkYXRhLnBhcmVudFZub2RlO1xuXG4gICAgcmV0dXJuIGVycjtcbn1cblxuZnVuY3Rpb24gZXJyb3JTdHJpbmcob2JqKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9iaiwgbnVsbCwgJyAgICAnKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcob2JqKTtcbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzcGxpdCA9IHJlcXVpcmUoJ2Jyb3dzZXItc3BsaXQnKTtcblxudmFyIGNsYXNzSWRTcGxpdCA9IC8oW1xcLiNdP1thLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykvO1xudmFyIG5vdENsYXNzSWQgPSAvXlxcLnwjLztcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZVRhZztcblxuZnVuY3Rpb24gcGFyc2VUYWcodGFnLCBwcm9wcykge1xuICAgIGlmICghdGFnKSB7XG4gICAgICAgIHJldHVybiAnRElWJztcbiAgICB9XG5cbiAgICB2YXIgbm9JZCA9ICEocHJvcHMuaGFzT3duUHJvcGVydHkoJ2lkJykpO1xuXG4gICAgdmFyIHRhZ1BhcnRzID0gc3BsaXQodGFnLCBjbGFzc0lkU3BsaXQpO1xuICAgIHZhciB0YWdOYW1lID0gbnVsbDtcblxuICAgIGlmIChub3RDbGFzc0lkLnRlc3QodGFnUGFydHNbMV0pKSB7XG4gICAgICAgIHRhZ05hbWUgPSAnRElWJztcbiAgICB9XG5cbiAgICB2YXIgY2xhc3NlcywgcGFydCwgdHlwZSwgaTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWdQYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJ0ID0gdGFnUGFydHNbaV07XG5cbiAgICAgICAgaWYgKCFwYXJ0KSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHR5cGUgPSBwYXJ0LmNoYXJBdCgwKTtcblxuICAgICAgICBpZiAoIXRhZ05hbWUpIHtcbiAgICAgICAgICAgIHRhZ05hbWUgPSBwYXJ0O1xuICAgICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICcuJykge1xuICAgICAgICAgICAgY2xhc3NlcyA9IGNsYXNzZXMgfHwgW107XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocGFydC5zdWJzdHJpbmcoMSwgcGFydC5sZW5ndGgpKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnIycgJiYgbm9JZCkge1xuICAgICAgICAgICAgcHJvcHMuaWQgPSBwYXJ0LnN1YnN0cmluZygxLCBwYXJ0Lmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoY2xhc3Nlcykge1xuICAgICAgICBpZiAocHJvcHMuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICBjbGFzc2VzLnB1c2gocHJvcHMuY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHByb3BzLmNsYXNzTmFtZSA9IGNsYXNzZXMuam9pbignICcpO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9wcy5uYW1lc3BhY2UgPyB0YWdOYW1lIDogdGFnTmFtZS50b1VwcGVyQ2FzZSgpO1xufVxuIiwidmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzVlRleHQgPSByZXF1aXJlKFwiLi9pcy12dGV4dFwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaGFuZGxlVGh1bmtcblxuZnVuY3Rpb24gaGFuZGxlVGh1bmsoYSwgYikge1xuICAgIHZhciByZW5kZXJlZEEgPSBhXG4gICAgdmFyIHJlbmRlcmVkQiA9IGJcblxuICAgIGlmIChpc1RodW5rKGIpKSB7XG4gICAgICAgIHJlbmRlcmVkQiA9IHJlbmRlclRodW5rKGIsIGEpXG4gICAgfVxuXG4gICAgaWYgKGlzVGh1bmsoYSkpIHtcbiAgICAgICAgcmVuZGVyZWRBID0gcmVuZGVyVGh1bmsoYSwgbnVsbClcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBhOiByZW5kZXJlZEEsXG4gICAgICAgIGI6IHJlbmRlcmVkQlxuICAgIH1cbn1cblxuZnVuY3Rpb24gcmVuZGVyVGh1bmsodGh1bmssIHByZXZpb3VzKSB7XG4gICAgdmFyIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZVxuXG4gICAgaWYgKCFyZW5kZXJlZFRodW5rKSB7XG4gICAgICAgIHJlbmRlcmVkVGh1bmsgPSB0aHVuay52bm9kZSA9IHRodW5rLnJlbmRlcihwcmV2aW91cylcbiAgICB9XG5cbiAgICBpZiAoIShpc1ZOb2RlKHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1ZUZXh0KHJlbmRlcmVkVGh1bmspIHx8XG4gICAgICAgICAgICBpc1dpZGdldChyZW5kZXJlZFRodW5rKSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidGh1bmsgZGlkIG5vdCByZXR1cm4gYSB2YWxpZCBub2RlXCIpO1xuICAgIH1cblxuICAgIHJldHVybiByZW5kZXJlZFRodW5rXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzVGh1bmtcclxuXHJcbmZ1bmN0aW9uIGlzVGh1bmsodCkge1xyXG4gICAgcmV0dXJuIHQgJiYgdC50eXBlID09PSBcIlRodW5rXCJcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzSG9va1xuXG5mdW5jdGlvbiBpc0hvb2soaG9vaykge1xuICAgIHJldHVybiBob29rICYmXG4gICAgICAodHlwZW9mIGhvb2suaG9vayA9PT0gXCJmdW5jdGlvblwiICYmICFob29rLmhhc093blByb3BlcnR5KFwiaG9va1wiKSB8fFxuICAgICAgIHR5cGVvZiBob29rLnVuaG9vayA9PT0gXCJmdW5jdGlvblwiICYmICFob29rLmhhc093blByb3BlcnR5KFwidW5ob29rXCIpKVxufVxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gaXNWaXJ0dWFsTm9kZVxuXG5mdW5jdGlvbiBpc1ZpcnR1YWxOb2RlKHgpIHtcbiAgICByZXR1cm4geCAmJiB4LnR5cGUgPT09IFwiVmlydHVhbE5vZGVcIiAmJiB4LnZlcnNpb24gPT09IHZlcnNpb25cbn1cbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGlzVmlydHVhbFRleHRcblxuZnVuY3Rpb24gaXNWaXJ0dWFsVGV4dCh4KSB7XG4gICAgcmV0dXJuIHggJiYgeC50eXBlID09PSBcIlZpcnR1YWxUZXh0XCIgJiYgeC52ZXJzaW9uID09PSB2ZXJzaW9uXG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzV2lkZ2V0XG5cbmZ1bmN0aW9uIGlzV2lkZ2V0KHcpIHtcbiAgICByZXR1cm4gdyAmJiB3LnR5cGUgPT09IFwiV2lkZ2V0XCJcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gXCIyXCJcbiIsInZhciB2ZXJzaW9uID0gcmVxdWlyZShcIi4vdmVyc2lvblwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi9pcy12bm9kZVwiKVxudmFyIGlzV2lkZ2V0ID0gcmVxdWlyZShcIi4vaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuL2lzLXRodW5rXCIpXG52YXIgaXNWSG9vayA9IHJlcXVpcmUoXCIuL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbE5vZGVcblxudmFyIG5vUHJvcGVydGllcyA9IHt9XG52YXIgbm9DaGlsZHJlbiA9IFtdXG5cbmZ1bmN0aW9uIFZpcnR1YWxOb2RlKHRhZ05hbWUsIHByb3BlcnRpZXMsIGNoaWxkcmVuLCBrZXksIG5hbWVzcGFjZSkge1xuICAgIHRoaXMudGFnTmFtZSA9IHRhZ05hbWVcbiAgICB0aGlzLnByb3BlcnRpZXMgPSBwcm9wZXJ0aWVzIHx8IG5vUHJvcGVydGllc1xuICAgIHRoaXMuY2hpbGRyZW4gPSBjaGlsZHJlbiB8fCBub0NoaWxkcmVuXG4gICAgdGhpcy5rZXkgPSBrZXkgIT0gbnVsbCA/IFN0cmluZyhrZXkpIDogdW5kZWZpbmVkXG4gICAgdGhpcy5uYW1lc3BhY2UgPSAodHlwZW9mIG5hbWVzcGFjZSA9PT0gXCJzdHJpbmdcIikgPyBuYW1lc3BhY2UgOiBudWxsXG5cbiAgICB2YXIgY291bnQgPSAoY2hpbGRyZW4gJiYgY2hpbGRyZW4ubGVuZ3RoKSB8fCAwXG4gICAgdmFyIGRlc2NlbmRhbnRzID0gMFxuICAgIHZhciBoYXNXaWRnZXRzID0gZmFsc2VcbiAgICB2YXIgaGFzVGh1bmtzID0gZmFsc2VcbiAgICB2YXIgZGVzY2VuZGFudEhvb2tzID0gZmFsc2VcbiAgICB2YXIgaG9va3NcblxuICAgIGZvciAodmFyIHByb3BOYW1lIGluIHByb3BlcnRpZXMpIHtcbiAgICAgICAgaWYgKHByb3BlcnRpZXMuaGFzT3duUHJvcGVydHkocHJvcE5hbWUpKSB7XG4gICAgICAgICAgICB2YXIgcHJvcGVydHkgPSBwcm9wZXJ0aWVzW3Byb3BOYW1lXVxuICAgICAgICAgICAgaWYgKGlzVkhvb2socHJvcGVydHkpICYmIHByb3BlcnR5LnVuaG9vaykge1xuICAgICAgICAgICAgICAgIGlmICghaG9va3MpIHtcbiAgICAgICAgICAgICAgICAgICAgaG9va3MgPSB7fVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGhvb2tzW3Byb3BOYW1lXSA9IHByb3BlcnR5XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgdmFyIGNoaWxkID0gY2hpbGRyZW5baV1cbiAgICAgICAgaWYgKGlzVk5vZGUoY2hpbGQpKSB7XG4gICAgICAgICAgICBkZXNjZW5kYW50cyArPSBjaGlsZC5jb3VudCB8fCAwXG5cbiAgICAgICAgICAgIGlmICghaGFzV2lkZ2V0cyAmJiBjaGlsZC5oYXNXaWRnZXRzKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFoYXNUaHVua3MgJiYgY2hpbGQuaGFzVGh1bmtzKSB7XG4gICAgICAgICAgICAgICAgaGFzVGh1bmtzID0gdHJ1ZVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWRlc2NlbmRhbnRIb29rcyAmJiAoY2hpbGQuaG9va3MgfHwgY2hpbGQuZGVzY2VuZGFudEhvb2tzKSkge1xuICAgICAgICAgICAgICAgIGRlc2NlbmRhbnRIb29rcyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzV2lkZ2V0cyAmJiBpc1dpZGdldChjaGlsZCkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2hpbGQuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFzV2lkZ2V0cyA9IHRydWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICghaGFzVGh1bmtzICYmIGlzVGh1bmsoY2hpbGQpKSB7XG4gICAgICAgICAgICBoYXNUaHVua3MgPSB0cnVlO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5jb3VudCA9IGNvdW50ICsgZGVzY2VuZGFudHNcbiAgICB0aGlzLmhhc1dpZGdldHMgPSBoYXNXaWRnZXRzXG4gICAgdGhpcy5oYXNUaHVua3MgPSBoYXNUaHVua3NcbiAgICB0aGlzLmhvb2tzID0gaG9va3NcbiAgICB0aGlzLmRlc2NlbmRhbnRIb29rcyA9IGRlc2NlbmRhbnRIb29rc1xufVxuXG5WaXJ0dWFsTm9kZS5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxOb2RlLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsTm9kZVwiXG4iLCJ2YXIgdmVyc2lvbiA9IHJlcXVpcmUoXCIuL3ZlcnNpb25cIilcblxuVmlydHVhbFBhdGNoLk5PTkUgPSAwXG5WaXJ0dWFsUGF0Y2guVlRFWFQgPSAxXG5WaXJ0dWFsUGF0Y2guVk5PREUgPSAyXG5WaXJ0dWFsUGF0Y2guV0lER0VUID0gM1xuVmlydHVhbFBhdGNoLlBST1BTID0gNFxuVmlydHVhbFBhdGNoLk9SREVSID0gNVxuVmlydHVhbFBhdGNoLklOU0VSVCA9IDZcblZpcnR1YWxQYXRjaC5SRU1PVkUgPSA3XG5WaXJ0dWFsUGF0Y2guVEhVTksgPSA4XG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFBhdGNoXG5cbmZ1bmN0aW9uIFZpcnR1YWxQYXRjaCh0eXBlLCB2Tm9kZSwgcGF0Y2gpIHtcbiAgICB0aGlzLnR5cGUgPSBOdW1iZXIodHlwZSlcbiAgICB0aGlzLnZOb2RlID0gdk5vZGVcbiAgICB0aGlzLnBhdGNoID0gcGF0Y2hcbn1cblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS52ZXJzaW9uID0gdmVyc2lvblxuVmlydHVhbFBhdGNoLnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsUGF0Y2hcIlxuIiwidmFyIHZlcnNpb24gPSByZXF1aXJlKFwiLi92ZXJzaW9uXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gVmlydHVhbFRleHRcblxuZnVuY3Rpb24gVmlydHVhbFRleHQodGV4dCkge1xuICAgIHRoaXMudGV4dCA9IFN0cmluZyh0ZXh0KVxufVxuXG5WaXJ0dWFsVGV4dC5wcm90b3R5cGUudmVyc2lvbiA9IHZlcnNpb25cblZpcnR1YWxUZXh0LnByb3RvdHlwZS50eXBlID0gXCJWaXJ0dWFsVGV4dFwiXG4iLCJ2YXIgaXNPYmplY3QgPSByZXF1aXJlKFwiaXMtb2JqZWN0XCIpXG52YXIgaXNIb29rID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZob29rXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZGlmZlByb3BzXG5cbmZ1bmN0aW9uIGRpZmZQcm9wcyhhLCBiKSB7XG4gICAgdmFyIGRpZmZcblxuICAgIGZvciAodmFyIGFLZXkgaW4gYSkge1xuICAgICAgICBpZiAoIShhS2V5IGluIGIpKSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IHVuZGVmaW5lZFxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGFWYWx1ZSA9IGFbYUtleV1cbiAgICAgICAgdmFyIGJWYWx1ZSA9IGJbYUtleV1cblxuICAgICAgICBpZiAoYVZhbHVlID09PSBiVmFsdWUpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3QoYVZhbHVlKSAmJiBpc09iamVjdChiVmFsdWUpKSB7XG4gICAgICAgICAgICBpZiAoZ2V0UHJvdG90eXBlKGJWYWx1ZSkgIT09IGdldFByb3RvdHlwZShhVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICBkaWZmW2FLZXldID0gYlZhbHVlXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGlzSG9vayhiVmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICAgICAgIGRpZmZbYUtleV0gPSBiVmFsdWVcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIG9iamVjdERpZmYgPSBkaWZmUHJvcHMoYVZhbHVlLCBiVmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgKG9iamVjdERpZmYpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGRpZmYgfHwge31cbiAgICAgICAgICAgICAgICAgICAgZGlmZlthS2V5XSA9IG9iamVjdERpZmZcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkaWZmID0gZGlmZiB8fCB7fVxuICAgICAgICAgICAgZGlmZlthS2V5XSA9IGJWYWx1ZVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZm9yICh2YXIgYktleSBpbiBiKSB7XG4gICAgICAgIGlmICghKGJLZXkgaW4gYSkpIHtcbiAgICAgICAgICAgIGRpZmYgPSBkaWZmIHx8IHt9XG4gICAgICAgICAgICBkaWZmW2JLZXldID0gYltiS2V5XVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRpZmZcbn1cblxuZnVuY3Rpb24gZ2V0UHJvdG90eXBlKHZhbHVlKSB7XG4gIGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKVxuICB9IGVsc2UgaWYgKHZhbHVlLl9fcHJvdG9fXykge1xuICAgIHJldHVybiB2YWx1ZS5fX3Byb3RvX19cbiAgfSBlbHNlIGlmICh2YWx1ZS5jb25zdHJ1Y3Rvcikge1xuICAgIHJldHVybiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGVcbiAgfVxufVxuIiwidmFyIGlzQXJyYXkgPSByZXF1aXJlKFwieC1pcy1hcnJheVwiKVxuXG52YXIgVlBhdGNoID0gcmVxdWlyZShcIi4uL3Zub2RlL3ZwYXRjaFwiKVxudmFyIGlzVk5vZGUgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtdm5vZGVcIilcbnZhciBpc1ZUZXh0ID0gcmVxdWlyZShcIi4uL3Zub2RlL2lzLXZ0ZXh0XCIpXG52YXIgaXNXaWRnZXQgPSByZXF1aXJlKFwiLi4vdm5vZGUvaXMtd2lkZ2V0XCIpXG52YXIgaXNUaHVuayA9IHJlcXVpcmUoXCIuLi92bm9kZS9pcy10aHVua1wiKVxudmFyIGhhbmRsZVRodW5rID0gcmVxdWlyZShcIi4uL3Zub2RlL2hhbmRsZS10aHVua1wiKVxuXG52YXIgZGlmZlByb3BzID0gcmVxdWlyZShcIi4vZGlmZi1wcm9wc1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRpZmZcblxuZnVuY3Rpb24gZGlmZihhLCBiKSB7XG4gICAgdmFyIHBhdGNoID0geyBhOiBhIH1cbiAgICB3YWxrKGEsIGIsIHBhdGNoLCAwKVxuICAgIHJldHVybiBwYXRjaFxufVxuXG5mdW5jdGlvbiB3YWxrKGEsIGIsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChhID09PSBiKSB7XG4gICAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHZhciBhcHBseSA9IHBhdGNoW2luZGV4XVxuICAgIHZhciBhcHBseUNsZWFyID0gZmFsc2VcblxuICAgIGlmIChpc1RodW5rKGEpIHx8IGlzVGh1bmsoYikpIHtcbiAgICAgICAgdGh1bmtzKGEsIGIsIHBhdGNoLCBpbmRleClcbiAgICB9IGVsc2UgaWYgKGIgPT0gbnVsbCkge1xuXG4gICAgICAgIC8vIElmIGEgaXMgYSB3aWRnZXQgd2Ugd2lsbCBhZGQgYSByZW1vdmUgcGF0Y2ggZm9yIGl0XG4gICAgICAgIC8vIE90aGVyd2lzZSBhbnkgY2hpbGQgd2lkZ2V0cy9ob29rcyBtdXN0IGJlIGRlc3Ryb3llZC5cbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBhZGRpbmcgdHdvIHJlbW92ZSBwYXRjaGVzIGZvciBhIHdpZGdldC5cbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgY2xlYXJTdGF0ZShhLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgICAgICBhcHBseSA9IHBhdGNoW2luZGV4XVxuICAgICAgICB9XG5cbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCBhLCBiKSlcbiAgICB9IGVsc2UgaWYgKGlzVk5vZGUoYikpIHtcbiAgICAgICAgaWYgKGlzVk5vZGUoYSkpIHtcbiAgICAgICAgICAgIGlmIChhLnRhZ05hbWUgPT09IGIudGFnTmFtZSAmJlxuICAgICAgICAgICAgICAgIGEubmFtZXNwYWNlID09PSBiLm5hbWVzcGFjZSAmJlxuICAgICAgICAgICAgICAgIGEua2V5ID09PSBiLmtleSkge1xuICAgICAgICAgICAgICAgIHZhciBwcm9wc1BhdGNoID0gZGlmZlByb3BzKGEucHJvcGVydGllcywgYi5wcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGlmIChwcm9wc1BhdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFZQYXRjaC5QUk9QUywgYSwgcHJvcHNQYXRjaCkpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGFwcGx5ID0gZGlmZkNoaWxkcmVuKGEsIGIsIHBhdGNoLCBhcHBseSwgaW5kZXgpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZOT0RFLCBhLCBiKSlcbiAgICAgICAgICAgICAgICBhcHBseUNsZWFyID0gdHJ1ZVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChWUGF0Y2guVk5PREUsIGEsIGIpKVxuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWVGV4dChiKSkge1xuICAgICAgICBpZiAoIWlzVlRleHQoYSkpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgICAgIGFwcGx5Q2xlYXIgPSB0cnVlXG4gICAgICAgIH0gZWxzZSBpZiAoYS50ZXh0ICE9PSBiLnRleHQpIHtcbiAgICAgICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLlZURVhULCBhLCBiKSlcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNXaWRnZXQoYikpIHtcbiAgICAgICAgaWYgKCFpc1dpZGdldChhKSkge1xuICAgICAgICAgICAgYXBwbHlDbGVhciA9IHRydWVcbiAgICAgICAgfVxuXG4gICAgICAgIGFwcGx5ID0gYXBwZW5kUGF0Y2goYXBwbHksIG5ldyBWUGF0Y2goVlBhdGNoLldJREdFVCwgYSwgYikpXG4gICAgfVxuXG4gICAgaWYgKGFwcGx5KSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGx5XG4gICAgfVxuXG4gICAgaWYgKGFwcGx5Q2xlYXIpIHtcbiAgICAgICAgY2xlYXJTdGF0ZShhLCBwYXRjaCwgaW5kZXgpXG4gICAgfVxufVxuXG5mdW5jdGlvbiBkaWZmQ2hpbGRyZW4oYSwgYiwgcGF0Y2gsIGFwcGx5LCBpbmRleCkge1xuICAgIHZhciBhQ2hpbGRyZW4gPSBhLmNoaWxkcmVuXG4gICAgdmFyIG9yZGVyZWRTZXQgPSByZW9yZGVyKGFDaGlsZHJlbiwgYi5jaGlsZHJlbilcbiAgICB2YXIgYkNoaWxkcmVuID0gb3JkZXJlZFNldC5jaGlsZHJlblxuXG4gICAgdmFyIGFMZW4gPSBhQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGJMZW4gPSBiQ2hpbGRyZW4ubGVuZ3RoXG4gICAgdmFyIGxlbiA9IGFMZW4gPiBiTGVuID8gYUxlbiA6IGJMZW5cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBiQ2hpbGRyZW5baV1cbiAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgIGlmICghbGVmdE5vZGUpIHtcbiAgICAgICAgICAgIGlmIChyaWdodE5vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBFeGNlc3Mgbm9kZXMgaW4gYiBuZWVkIHRvIGJlIGFkZGVkXG4gICAgICAgICAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSxcbiAgICAgICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guSU5TRVJULCBudWxsLCByaWdodE5vZGUpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FsayhsZWZ0Tm9kZSwgcmlnaHROb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaXNWTm9kZShsZWZ0Tm9kZSkgJiYgbGVmdE5vZGUuY291bnQpIHtcbiAgICAgICAgICAgIGluZGV4ICs9IGxlZnROb2RlLmNvdW50XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3JkZXJlZFNldC5tb3Zlcykge1xuICAgICAgICAvLyBSZW9yZGVyIG5vZGVzIGxhc3RcbiAgICAgICAgYXBwbHkgPSBhcHBlbmRQYXRjaChhcHBseSwgbmV3IFZQYXRjaChcbiAgICAgICAgICAgIFZQYXRjaC5PUkRFUixcbiAgICAgICAgICAgIGEsXG4gICAgICAgICAgICBvcmRlcmVkU2V0Lm1vdmVzXG4gICAgICAgICkpXG4gICAgfVxuXG4gICAgcmV0dXJuIGFwcGx5XG59XG5cbmZ1bmN0aW9uIGNsZWFyU3RhdGUodk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIC8vIFRPRE86IE1ha2UgdGhpcyBhIHNpbmdsZSB3YWxrLCBub3QgdHdvXG4gICAgdW5ob29rKHZOb2RlLCBwYXRjaCwgaW5kZXgpXG4gICAgZGVzdHJveVdpZGdldHModk5vZGUsIHBhdGNoLCBpbmRleClcbn1cblxuLy8gUGF0Y2ggcmVjb3JkcyBmb3IgYWxsIGRlc3Ryb3llZCB3aWRnZXRzIG11c3QgYmUgYWRkZWQgYmVjYXVzZSB3ZSBuZWVkXG4vLyBhIERPTSBub2RlIHJlZmVyZW5jZSBmb3IgdGhlIGRlc3Ryb3kgZnVuY3Rpb25cbmZ1bmN0aW9uIGRlc3Ryb3lXaWRnZXRzKHZOb2RlLCBwYXRjaCwgaW5kZXgpIHtcbiAgICBpZiAoaXNXaWRnZXQodk5vZGUpKSB7XG4gICAgICAgIGlmICh0eXBlb2Ygdk5vZGUuZGVzdHJveSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICBwYXRjaFtpbmRleF0gPSBhcHBlbmRQYXRjaChcbiAgICAgICAgICAgICAgICBwYXRjaFtpbmRleF0sXG4gICAgICAgICAgICAgICAgbmV3IFZQYXRjaChWUGF0Y2guUkVNT1ZFLCB2Tm9kZSwgbnVsbClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNWTm9kZSh2Tm9kZSkgJiYgKHZOb2RlLmhhc1dpZGdldHMgfHwgdk5vZGUuaGFzVGh1bmtzKSkge1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICB2YXIgbGVuID0gY2hpbGRyZW4ubGVuZ3RoXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICBpbmRleCArPSAxXG5cbiAgICAgICAgICAgIGRlc3Ryb3lXaWRnZXRzKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgIGlmIChpc1ZOb2RlKGNoaWxkKSAmJiBjaGlsZC5jb3VudCkge1xuICAgICAgICAgICAgICAgIGluZGV4ICs9IGNoaWxkLmNvdW50XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsodk5vZGUpKSB7XG4gICAgICAgIHRodW5rcyh2Tm9kZSwgbnVsbCwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuLy8gQ3JlYXRlIGEgc3ViLXBhdGNoIGZvciB0aHVua3NcbmZ1bmN0aW9uIHRodW5rcyhhLCBiLCBwYXRjaCwgaW5kZXgpIHtcbiAgICB2YXIgbm9kZXMgPSBoYW5kbGVUaHVuayhhLCBiKVxuICAgIHZhciB0aHVua1BhdGNoID0gZGlmZihub2Rlcy5hLCBub2Rlcy5iKVxuICAgIGlmIChoYXNQYXRjaGVzKHRodW5rUGF0Y2gpKSB7XG4gICAgICAgIHBhdGNoW2luZGV4XSA9IG5ldyBWUGF0Y2goVlBhdGNoLlRIVU5LLCBudWxsLCB0aHVua1BhdGNoKVxuICAgIH1cbn1cblxuZnVuY3Rpb24gaGFzUGF0Y2hlcyhwYXRjaCkge1xuICAgIGZvciAodmFyIGluZGV4IGluIHBhdGNoKSB7XG4gICAgICAgIGlmIChpbmRleCAhPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2Vcbn1cblxuLy8gRXhlY3V0ZSBob29rcyB3aGVuIHR3byBub2RlcyBhcmUgaWRlbnRpY2FsXG5mdW5jdGlvbiB1bmhvb2sodk5vZGUsIHBhdGNoLCBpbmRleCkge1xuICAgIGlmIChpc1ZOb2RlKHZOb2RlKSkge1xuICAgICAgICBpZiAodk5vZGUuaG9va3MpIHtcbiAgICAgICAgICAgIHBhdGNoW2luZGV4XSA9IGFwcGVuZFBhdGNoKFxuICAgICAgICAgICAgICAgIHBhdGNoW2luZGV4XSxcbiAgICAgICAgICAgICAgICBuZXcgVlBhdGNoKFxuICAgICAgICAgICAgICAgICAgICBWUGF0Y2guUFJPUFMsXG4gICAgICAgICAgICAgICAgICAgIHZOb2RlLFxuICAgICAgICAgICAgICAgICAgICB1bmRlZmluZWRLZXlzKHZOb2RlLmhvb2tzKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgIClcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2Tm9kZS5kZXNjZW5kYW50SG9va3MgfHwgdk5vZGUuaGFzVGh1bmtzKSB7XG4gICAgICAgICAgICB2YXIgY2hpbGRyZW4gPSB2Tm9kZS5jaGlsZHJlblxuICAgICAgICAgICAgdmFyIGxlbiA9IGNoaWxkcmVuLmxlbmd0aFxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBjaGlsZCA9IGNoaWxkcmVuW2ldXG4gICAgICAgICAgICAgICAgaW5kZXggKz0gMVxuXG4gICAgICAgICAgICAgICAgdW5ob29rKGNoaWxkLCBwYXRjaCwgaW5kZXgpXG5cbiAgICAgICAgICAgICAgICBpZiAoaXNWTm9kZShjaGlsZCkgJiYgY2hpbGQuY291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5kZXggKz0gY2hpbGQuY291bnRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzVGh1bmsodk5vZGUpKSB7XG4gICAgICAgIHRodW5rcyh2Tm9kZSwgbnVsbCwgcGF0Y2gsIGluZGV4KVxuICAgIH1cbn1cblxuZnVuY3Rpb24gdW5kZWZpbmVkS2V5cyhvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge31cblxuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSB1bmRlZmluZWRcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0XG59XG5cbi8vIExpc3QgZGlmZiwgbmFpdmUgbGVmdCB0byByaWdodCByZW9yZGVyaW5nXG5mdW5jdGlvbiByZW9yZGVyKGFDaGlsZHJlbiwgYkNoaWxkcmVuKSB7XG4gICAgLy8gTyhNKSB0aW1lLCBPKE0pIG1lbW9yeVxuICAgIHZhciBiQ2hpbGRJbmRleCA9IGtleUluZGV4KGJDaGlsZHJlbilcbiAgICB2YXIgYktleXMgPSBiQ2hpbGRJbmRleC5rZXlzXG4gICAgdmFyIGJGcmVlID0gYkNoaWxkSW5kZXguZnJlZVxuXG4gICAgaWYgKGJGcmVlLmxlbmd0aCA9PT0gYkNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hpbGRyZW46IGJDaGlsZHJlbixcbiAgICAgICAgICAgIG1vdmVzOiBudWxsXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPKE4pIHRpbWUsIE8oTikgbWVtb3J5XG4gICAgdmFyIGFDaGlsZEluZGV4ID0ga2V5SW5kZXgoYUNoaWxkcmVuKVxuICAgIHZhciBhS2V5cyA9IGFDaGlsZEluZGV4LmtleXNcbiAgICB2YXIgYUZyZWUgPSBhQ2hpbGRJbmRleC5mcmVlXG5cbiAgICBpZiAoYUZyZWUubGVuZ3RoID09PSBhQ2hpbGRyZW4ubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjaGlsZHJlbjogYkNoaWxkcmVuLFxuICAgICAgICAgICAgbW92ZXM6IG51bGxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIE8oTUFYKE4sIE0pKSBtZW1vcnlcbiAgICB2YXIgbmV3Q2hpbGRyZW4gPSBbXVxuXG4gICAgdmFyIGZyZWVJbmRleCA9IDBcbiAgICB2YXIgZnJlZUNvdW50ID0gYkZyZWUubGVuZ3RoXG4gICAgdmFyIGRlbGV0ZWRJdGVtcyA9IDBcblxuICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBhIGFuZCBtYXRjaCBhIG5vZGUgaW4gYlxuICAgIC8vIE8oTikgdGltZSxcbiAgICBmb3IgKHZhciBpID0gMCA7IGkgPCBhQ2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGFJdGVtID0gYUNoaWxkcmVuW2ldXG4gICAgICAgIHZhciBpdGVtSW5kZXhcblxuICAgICAgICBpZiAoYUl0ZW0ua2V5KSB7XG4gICAgICAgICAgICBpZiAoYktleXMuaGFzT3duUHJvcGVydHkoYUl0ZW0ua2V5KSkge1xuICAgICAgICAgICAgICAgIC8vIE1hdGNoIHVwIHRoZSBvbGQga2V5c1xuICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGJLZXlzW2FJdGVtLmtleV1cbiAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKGJDaGlsZHJlbltpdGVtSW5kZXhdKVxuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBvbGQga2V5ZWQgaXRlbXNcbiAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBpIC0gZGVsZXRlZEl0ZW1zKytcbiAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKG51bGwpXG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBNYXRjaCB0aGUgaXRlbSBpbiBhIHdpdGggdGhlIG5leHQgZnJlZSBpdGVtIGluIGJcbiAgICAgICAgICAgIGlmIChmcmVlSW5kZXggPCBmcmVlQ291bnQpIHtcbiAgICAgICAgICAgICAgICBpdGVtSW5kZXggPSBiRnJlZVtmcmVlSW5kZXgrK11cbiAgICAgICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKGJDaGlsZHJlbltpdGVtSW5kZXhdKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBUaGVyZSBhcmUgbm8gZnJlZSBpdGVtcyBpbiBiIHRvIG1hdGNoIHdpdGhcbiAgICAgICAgICAgICAgICAvLyB0aGUgZnJlZSBpdGVtcyBpbiBhLCBzbyB0aGUgZXh0cmEgZnJlZSBub2Rlc1xuICAgICAgICAgICAgICAgIC8vIGFyZSBkZWxldGVkLlxuICAgICAgICAgICAgICAgIGl0ZW1JbmRleCA9IGkgLSBkZWxldGVkSXRlbXMrK1xuICAgICAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2gobnVsbClcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHZhciBsYXN0RnJlZUluZGV4ID0gZnJlZUluZGV4ID49IGJGcmVlLmxlbmd0aCA/XG4gICAgICAgIGJDaGlsZHJlbi5sZW5ndGggOlxuICAgICAgICBiRnJlZVtmcmVlSW5kZXhdXG5cbiAgICAvLyBJdGVyYXRlIHRocm91Z2ggYiBhbmQgYXBwZW5kIGFueSBuZXcga2V5c1xuICAgIC8vIE8oTSkgdGltZVxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgYkNoaWxkcmVuLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBuZXdJdGVtID0gYkNoaWxkcmVuW2pdXG5cbiAgICAgICAgaWYgKG5ld0l0ZW0ua2V5KSB7XG4gICAgICAgICAgICBpZiAoIWFLZXlzLmhhc093blByb3BlcnR5KG5ld0l0ZW0ua2V5KSkge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBhbnkgbmV3IGtleWVkIGl0ZW1zXG4gICAgICAgICAgICAgICAgLy8gV2UgYXJlIGFkZGluZyBuZXcgaXRlbXMgdG8gdGhlIGVuZCBhbmQgdGhlbiBzb3J0aW5nIHRoZW1cbiAgICAgICAgICAgICAgICAvLyBpbiBwbGFjZS4gSW4gZnV0dXJlIHdlIHNob3VsZCBpbnNlcnQgbmV3IGl0ZW1zIGluIHBsYWNlLlxuICAgICAgICAgICAgICAgIG5ld0NoaWxkcmVuLnB1c2gobmV3SXRlbSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChqID49IGxhc3RGcmVlSW5kZXgpIHtcbiAgICAgICAgICAgIC8vIEFkZCBhbnkgbGVmdG92ZXIgbm9uLWtleWVkIGl0ZW1zXG4gICAgICAgICAgICBuZXdDaGlsZHJlbi5wdXNoKG5ld0l0ZW0pXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgc2ltdWxhdGUgPSBuZXdDaGlsZHJlbi5zbGljZSgpXG4gICAgdmFyIHNpbXVsYXRlSW5kZXggPSAwXG4gICAgdmFyIHJlbW92ZXMgPSBbXVxuICAgIHZhciBpbnNlcnRzID0gW11cbiAgICB2YXIgc2ltdWxhdGVJdGVtXG5cbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGJDaGlsZHJlbi5sZW5ndGg7KSB7XG4gICAgICAgIHZhciB3YW50ZWRJdGVtID0gYkNoaWxkcmVuW2tdXG4gICAgICAgIHNpbXVsYXRlSXRlbSA9IHNpbXVsYXRlW3NpbXVsYXRlSW5kZXhdXG5cbiAgICAgICAgLy8gcmVtb3ZlIGl0ZW1zXG4gICAgICAgIHdoaWxlIChzaW11bGF0ZUl0ZW0gPT09IG51bGwgJiYgc2ltdWxhdGUubGVuZ3RoKSB7XG4gICAgICAgICAgICByZW1vdmVzLnB1c2gocmVtb3ZlKHNpbXVsYXRlLCBzaW11bGF0ZUluZGV4LCBudWxsKSlcbiAgICAgICAgICAgIHNpbXVsYXRlSXRlbSA9IHNpbXVsYXRlW3NpbXVsYXRlSW5kZXhdXG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXNpbXVsYXRlSXRlbSB8fCBzaW11bGF0ZUl0ZW0ua2V5ICE9PSB3YW50ZWRJdGVtLmtleSkge1xuICAgICAgICAgICAgLy8gaWYgd2UgbmVlZCBhIGtleSBpbiB0aGlzIHBvc2l0aW9uLi4uXG4gICAgICAgICAgICBpZiAod2FudGVkSXRlbS5rZXkpIHtcbiAgICAgICAgICAgICAgICBpZiAoc2ltdWxhdGVJdGVtICYmIHNpbXVsYXRlSXRlbS5rZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgYW4gaW5zZXJ0IGRvZXNuJ3QgcHV0IHRoaXMga2V5IGluIHBsYWNlLCBpdCBuZWVkcyB0byBtb3ZlXG4gICAgICAgICAgICAgICAgICAgIGlmIChiS2V5c1tzaW11bGF0ZUl0ZW0ua2V5XSAhPT0gayArIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW92ZXMucHVzaChyZW1vdmUoc2ltdWxhdGUsIHNpbXVsYXRlSW5kZXgsIHNpbXVsYXRlSXRlbS5rZXkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2ltdWxhdGVJdGVtID0gc2ltdWxhdGVbc2ltdWxhdGVJbmRleF1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHRoZSByZW1vdmUgZGlkbid0IHB1dCB0aGUgd2FudGVkIGl0ZW0gaW4gcGxhY2UsIHdlIG5lZWQgdG8gaW5zZXJ0IGl0XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNpbXVsYXRlSXRlbSB8fCBzaW11bGF0ZUl0ZW0ua2V5ICE9PSB3YW50ZWRJdGVtLmtleSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydHMucHVzaCh7a2V5OiB3YW50ZWRJdGVtLmtleSwgdG86IGt9KVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXRlbXMgYXJlIG1hdGNoaW5nLCBzbyBza2lwIGFoZWFkXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaW11bGF0ZUluZGV4KytcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc2VydHMucHVzaCh7a2V5OiB3YW50ZWRJdGVtLmtleSwgdG86IGt9KVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnNlcnRzLnB1c2goe2tleTogd2FudGVkSXRlbS5rZXksIHRvOiBrfSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaysrXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhIGtleSBpbiBzaW11bGF0ZSBoYXMgbm8gbWF0Y2hpbmcgd2FudGVkIGtleSwgcmVtb3ZlIGl0XG4gICAgICAgICAgICBlbHNlIGlmIChzaW11bGF0ZUl0ZW0gJiYgc2ltdWxhdGVJdGVtLmtleSkge1xuICAgICAgICAgICAgICAgIHJlbW92ZXMucHVzaChyZW1vdmUoc2ltdWxhdGUsIHNpbXVsYXRlSW5kZXgsIHNpbXVsYXRlSXRlbS5rZXkpKVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2ltdWxhdGVJbmRleCsrXG4gICAgICAgICAgICBrKytcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIHJlbW92ZSBhbGwgdGhlIHJlbWFpbmluZyBub2RlcyBmcm9tIHNpbXVsYXRlXG4gICAgd2hpbGUoc2ltdWxhdGVJbmRleCA8IHNpbXVsYXRlLmxlbmd0aCkge1xuICAgICAgICBzaW11bGF0ZUl0ZW0gPSBzaW11bGF0ZVtzaW11bGF0ZUluZGV4XVxuICAgICAgICByZW1vdmVzLnB1c2gocmVtb3ZlKHNpbXVsYXRlLCBzaW11bGF0ZUluZGV4LCBzaW11bGF0ZUl0ZW0gJiYgc2ltdWxhdGVJdGVtLmtleSkpXG4gICAgfVxuXG4gICAgLy8gSWYgdGhlIG9ubHkgbW92ZXMgd2UgaGF2ZSBhcmUgZGVsZXRlcyB0aGVuIHdlIGNhbiBqdXN0XG4gICAgLy8gbGV0IHRoZSBkZWxldGUgcGF0Y2ggcmVtb3ZlIHRoZXNlIGl0ZW1zLlxuICAgIGlmIChyZW1vdmVzLmxlbmd0aCA9PT0gZGVsZXRlZEl0ZW1zICYmICFpbnNlcnRzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY2hpbGRyZW46IG5ld0NoaWxkcmVuLFxuICAgICAgICAgICAgbW92ZXM6IG51bGxcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIGNoaWxkcmVuOiBuZXdDaGlsZHJlbixcbiAgICAgICAgbW92ZXM6IHtcbiAgICAgICAgICAgIHJlbW92ZXM6IHJlbW92ZXMsXG4gICAgICAgICAgICBpbnNlcnRzOiBpbnNlcnRzXG4gICAgICAgIH1cbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlbW92ZShhcnIsIGluZGV4LCBrZXkpIHtcbiAgICBhcnIuc3BsaWNlKGluZGV4LCAxKVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZnJvbTogaW5kZXgsXG4gICAgICAgIGtleToga2V5XG4gICAgfVxufVxuXG5mdW5jdGlvbiBrZXlJbmRleChjaGlsZHJlbikge1xuICAgIHZhciBrZXlzID0ge31cbiAgICB2YXIgZnJlZSA9IFtdXG4gICAgdmFyIGxlbmd0aCA9IGNoaWxkcmVuLmxlbmd0aFxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgY2hpbGQgPSBjaGlsZHJlbltpXVxuXG4gICAgICAgIGlmIChjaGlsZC5rZXkpIHtcbiAgICAgICAgICAgIGtleXNbY2hpbGQua2V5XSA9IGlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyZWUucHVzaChpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAga2V5czoga2V5cywgICAgIC8vIEEgaGFzaCBvZiBrZXkgbmFtZSB0byBpbmRleFxuICAgICAgICBmcmVlOiBmcmVlICAgICAgLy8gQW4gYXJyYXkgb2YgdW5rZXllZCBpdGVtIGluZGljZXNcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGFwcGVuZFBhdGNoKGFwcGx5LCBwYXRjaCkge1xuICAgIGlmIChhcHBseSkge1xuICAgICAgICBpZiAoaXNBcnJheShhcHBseSkpIHtcbiAgICAgICAgICAgIGFwcGx5LnB1c2gocGF0Y2gpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcHBseSA9IFthcHBseSwgcGF0Y2hdXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYXBwbHlcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcGF0Y2hcbiAgICB9XG59XG4iLCJCYWJlbHV0ZSA9IHJlcXVpcmUoJy4uL2luZGV4Jyk7XG5yZXF1aXJlKCcuLi9sYW5ndWFnZXMvaHRtbCcpO1xucmVxdWlyZSgnLi4vYmFiZWx1dGUtaHRtbC9odG1sLXZpZXcnKTtcbkJhYmVsdXRlLmV4dGVuZExleGljKCdodG1sJywgJ215aHRtbCcpO1xuXG52YXIgaCA9IEJhYmVsdXRlLmluaXRpYWxpemVyKCdteWh0bWwnKTtcblxuQmFiZWx1dGUudG9MZXhpYygnbXlodG1sJywge1xuXHRmaWx0ZXJhYmxlUHJvZHVjdHNUYWJsZTogZnVuY3Rpb24ocHJvZHVjdHMpIHtcblx0XHRyZXR1cm4gdGhpcy52aWV3KHtcblx0XHRcdGZpbHRlclByb2R1Y3RzOiBmdW5jdGlvbihmaWx0ZXIsIHByb2R1Y3RzKSB7XG5cdFx0XHRcdHJldHVybiBwcm9kdWN0cy5maWx0ZXIoZnVuY3Rpb24ocHJvZCkge1xuXHRcdFx0XHRcdHJldHVybiBwcm9kLnRpdGxlLmluZGV4T2YoZmlsdGVyKSA+IC0xO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0sXG5cdFx0XHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdGZpbHRlcjogJydcblx0XHRcdFx0fTtcblx0XHRcdH0sXG5cdFx0XHRyZW5kZXI6IGZ1bmN0aW9uKHN0YXRlKSB7XG5cdFx0XHRcdHJldHVybiBoLmRpdihcblx0XHRcdFx0XHRoLmNsYXNzKCdmaWx0ZXJhYmxlLXByb2R1Y3RzLXRhYmxlJylcblx0XHRcdFx0XHQuc2VhcmNoQmFyKHN0YXRlLmZpbHRlciwgZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdFx0c3RhdGUuc2V0KHtcblx0XHRcdFx0XHRcdFx0ZmlsdGVyOiBlLnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQucHJvZHVjdHNUYWJsZSh0aGlzLmZpbHRlclByb2R1Y3RzKHN0YXRlLmZpbHRlciwgcHJvZHVjdHMpKVxuXHRcdFx0XHRcdC5idXR0b24oJ2FkZCBvbmUnLCBoLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRcdHByb2R1Y3RzLnVuc2hpZnQoe1xuXHRcdFx0XHRcdFx0XHR0aXRsZTogJ2hhYWFpaXUnICsgTWF0aC5yYW5kb20oKSxcblx0XHRcdFx0XHRcdFx0bGFiZWw6ICd5b3Vob3UnXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHN0YXRlLnJlbmRlcigpO1xuXHRcdFx0XHRcdH0pKVxuXHRcdFx0XHQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXHRwcm9kdWN0c1RhYmxlOiBmdW5jdGlvbihwcm9kdWN0cykge1xuXHRcdHJldHVybiB0aGlzLmRpdihcblx0XHRcdGguY2xhc3MoJ3Byb2R1Y3RzLXRhYmxlJylcblx0XHRcdC5fZWFjaChwcm9kdWN0cywgdGhpcy5wcm9kdWN0KVxuXHRcdCk7XG5cdH0sXG5cdHByb2R1Y3Q6IGZ1bmN0aW9uKHByb2R1Y3QpIHtcblx0XHRyZXR1cm4gdGhpcy5kaXYoXG5cdFx0XHRoLmNsYXNzKCdwcm9kdWN0LXJvdycpXG5cdFx0XHQuaDMocHJvZHVjdC50aXRsZSlcblx0XHRcdC5kaXYocHJvZHVjdC5sYWJlbClcblx0XHRcdC50ZXh0KCdmbG91cGkgZG91cGknKVxuXHRcdFx0LmRpdignc2Vjb25kIHRleHQnKVxuXHRcdFx0LmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2hldScpXG5cdFx0XHR9KVxuXHRcdCk7XG5cdH0sXG5cdHNlYXJjaEJhcjogZnVuY3Rpb24oZmlsdGVyLCB1cGRhdGVGaWx0ZXIpIHtcblx0XHRyZXR1cm4gdGhpcy5kaXYoXG5cdFx0XHRoLmNsYXNzKCdzZWFyY2gtYmFyJylcblx0XHRcdC50ZXh0SW5wdXQoZmlsdGVyLFxuXHRcdFx0XHRoLmF0dHIoJ3BsYWNlSG9sZGVyJywgJ3NlYXJjaCB0ZXJtJylcblx0XHRcdFx0Lm9uKCdpbnB1dCcsIHVwZGF0ZUZpbHRlcilcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTtcblxuLyoqXG4gKiB1c2FnZVxuICovXG5cbmZ1bmN0aW9uIHJlbmRlcjMoKSB7XG5cdHZhciB0ID0gaC5kaXYoJ3dvcmxkJyArIE1hdGgucmFuZG9tKCksXG5cdFx0aC5hdHRyKCdibG91cGknLCAnZm9vJylcblx0XHQuaDMoJ2hvb29vb29vJyArIE1hdGgucmFuZG9tKCkpXG5cdFx0LnNlY3Rpb24oJ2hlbGxvJyxcblx0XHRcdGguZGl2KCdob29vb29vampqampqbycpXG5cdFx0KVxuXHQpXG5cdGZvciAodmFyIGkgPSAwOyBpIDwgNTAwOyArK2kpXG5cdFx0dC5kaXYoJ3dvcmxkJyArIE1hdGgucmFuZG9tKCksXG5cdFx0XHRoLmF0dHIoJ2Jsb3VwaScsICdmb28nKVxuXHRcdFx0LmgzKCdob29vb29vbycgKyBNYXRoLnJhbmRvbSgpKVxuXHRcdFx0LnNlY3Rpb24oJ2hlbGxvJyxcblx0XHRcdFx0aC5hdHRyKCdibG91cGknLCAnZm9vJykuZGl2KCdob29vb29vampqampqbycpXG5cdFx0XHQpXG5cdFx0XHQuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnaGV1Jylcblx0XHRcdH0pXG5cdFx0KTtcblx0cmV0dXJuIHQ7XG59XG5cbmZ1bmN0aW9uIGdldFByb2R1Y3RzKCkge1xuXHR2YXIgcHJvZHVjdHMgPSBbXTtcblx0Zm9yICh2YXIgaSA9IDA7IGkgPCAxMDA7ICsraSlcblx0XHRwcm9kdWN0cy5wdXNoKHtcblx0XHRcdHRpdGxlOiAnaG9vb28nICsgTWF0aC5yYW5kb20oKSxcblx0XHRcdGxhYmVsOiAnaGlzc3NzJ1xuXHRcdH0sIHtcblx0XHRcdHRpdGxlOiAnaGFhYScsXG5cdFx0XHRsYWJlbDogJ2h1dXNzc3MnXG5cdFx0fSwge1xuXHRcdFx0dGl0bGU6ICdoaWlpbycsXG5cdFx0XHRsYWJlbDogJ2hlZWVzc3NzJ1xuXHRcdH0pO1xuXHRyZXR1cm4gcHJvZHVjdHM7XG59XG5cblxuXG5mdW5jdGlvbiByZW5kZXIyKCkge1xuXHRyZXR1cm4gaFxuXHRcdC50ZXh0KCdibG91cGlpaWknKVxuXHRcdC5kaXYoaC5zcGFuKCdoaWlpJykpXG5cdFx0LmZpbHRlcmFibGVQcm9kdWN0c1RhYmxlKGdldFByb2R1Y3RzKCkpXG5cdFx0LmRpdigneWVlZWVlZWhhYWFhYScpO1xufVxuXG52YXIgdCA9IHJlbmRlcjIoKTtcblxuZnVuY3Rpb24gcmVuZGVyKCkge1xuXHRyZXR1cm4gdDtcbn1cblxuXG4vKipcbiAqIG91dHB1dHNcbiAqL1xuXG5yZXF1aXJlKCcuLi9sYW5ndWFnZXMvYWN0aW9ucy9odG1sLXRvLXN0cmluZycpO1xucmVxdWlyZSgnLi4vbGFuZ3VhZ2VzL2FjdGlvbnMvaHRtbC10by1kb20nKTtcbnJlcXVpcmUoJy4uL2JhYmVsdXRlLWh0bWwvaHRtbC10by12ZG9tJyk7XG5yZXF1aXJlKCcuLi9iYWJlbHV0ZS1odG1sL2h0bWwtdG8tZGVhdGhtb29kJyk7XG5cbi8vIGNvbnNvbGUubG9nKCdqIDogJXMnLCBKU09OLnN0cmluZ2lmeSh0KSlcbi8vIGNvbnNvbGUubG9nKCd0IDogJXMnLCB0Ll9zdHJpbmdpZnkoKSlcbi8vIGNvbnNvbGUubG9nKCdyIDogJXMnLCB0LiRodG1sVG9TdHJpbmcoKSk7XG5cbi8vIFxuXG5mdW5jdGlvbiB0ZXN0SlNPTihtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0SlNPTi5zdHJpbmdpZnkocmVuZGVyKCkpO1xuXHR9XG5cdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdGNvbnNvbGUubG9nKCdKU09OIDogJXMgLSAlcycsIHRpbWUsIHRpbWUgLyBtYXgpO1xufVxuXG5mdW5jdGlvbiB0ZXN0U3RyaW5naWZ5KG1heCwgcmVuZGVyKSB7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpIHtcblx0XHRyZW5kZXIoKS5fc3RyaW5naWZ5KCk7XG5cdH1cblx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0Y29uc29sZS5sb2coJ1NlcmlhbGl6ZSA6ICVzIC0gJXMnLCB0aW1lLCB0aW1lIC8gbWF4KTtcbn1cblxuZnVuY3Rpb24gdGVzdFN0cmluZyhtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0cmVuZGVyKCkuJGh0bWxUb1N0cmluZygpO1xuXHR9XG5cdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdGNvbnNvbGUubG9nKCdodG1sOnN0cmluZyA6ICVzIC0gJXMnLCB0aW1lLCB0aW1lIC8gbWF4KTtcbn1cblxuZnVuY3Rpb24gdGVzdERvbShtYXgsIHJlbmRlcikge1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpO1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0JHJvb3QuaW5uZXJIVE1MID0gJyc7XG5cdFx0cmVuZGVyKCkuJGh0bWxUb0RPTSgkcm9vdClcblx0fVxuXHR0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCkgLSB0aW1lO1xuXHRjb25zb2xlLmxvZygnaHRtbDpkb20gOiAlcyAtICVzJywgdGltZSwgdGltZSAvIG1heCk7XG59XG5cbmZ1bmN0aW9uIHRlc3RWZG9tKG1heCwgcmVuZGVyKSB7XG5cdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHR2YXIgdGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpLFxuXHRcdG50O1xuXHRmb3IgKHZhciBpID0gMDsgaSA8IG1heDsgKytpKSB7XG5cdFx0bnQgPSByZW5kZXIoKS4kaHRtbFRvVkRPTSgkcm9vdCwgbnQpXG5cdH1cblx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0Ly8gY29uc29sZS5sb2coJ2h0bWw6dmRvbScsIHRpbWUpXG59XG5cbmZ1bmN0aW9uIHRlc3REZWF0aG1vb2QobWF4LCByZW5kZXIpIHtcblx0JHJvb3QuaW5uZXJIVE1MID0gJyc7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCksXG5cdFx0bnQ7XG5cdGZvciAodmFyIGkgPSAwOyBpIDwgbWF4OyArK2kpIHtcblx0XHRudCA9IHJlbmRlcigpLiRodG1sVG9EZWF0aG1vb2QoJHJvb3QsIG50KTtcblx0fVxuXHR0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCkgLSB0aW1lO1xuXHRjb25zb2xlLmxvZygnaHRtbDpkZWF0aG1vb2QgOiAlcyAtICVzJywgdGltZSwgdGltZSAvIG1heCk7XG5cdHJldHVybiBudDtcbn1cblxuXG5mdW5jdGlvbiBydW5BbGwobWF4LCByZW5kZXIpIHtcblx0Y29uc29sZS5sb2coJ19fX19fX19fX19fX19fX18gJXN4JywgbWF4KTtcblx0dGVzdEpTT04obWF4LCByZW5kZXIpO1xuXHR0ZXN0U3RyaW5naWZ5KG1heCwgcmVuZGVyKTtcblx0dGVzdFN0cmluZyhtYXgsIHJlbmRlcik7XG5cdHRlc3REZWF0aG1vb2QobWF4LCByZW5kZXIpOyAvLyAxNTIsIDE0OCwgMTAwIC0gMzIwLCA4MDAsIDI3NSAtICAgNDAwLCAxNDAwLCA0MjYgLS0tICAgNTQ0LCAyMDMzLCA2MTggIC0tLSAyNTgsIDMzNywgMTExXG5cdHRlc3REb20obWF4LCByZW5kZXIpOyAvLyAxNzgsIDIxOSwgMTYxICAtICA0OTYsIDEwMDEsIDMyMCAtLSAgNTM1LCAxNjUwLCA0NzYgLSA1ODcsIDIxMjcsIDY1MSAgLS0tIDY4NCwgODcyLCAxNjZcblx0Ly8gdGVzdFZkb20obWF4LCByZW5kZXIpO1xufVxuXG52YXIgY3VycmVudFJlbmRlciA9IHJlbmRlcjI7XG5cbnZhciAkcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JyksXG5cdCRzaW5nbGVET01UZXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbmdsZS1kb20tdGVzdC1idXR0b24nKSxcblx0JHNpbmdsZURlYXRoTW9vZFRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2luZ2xlLWRlYXRobW9vZC10ZXN0LWJ1dHRvbicpLFxuXHQkZG9tVGVzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZXN0LWRvbS1idXR0b24nKSxcblx0JGRlYXRobW9vZFRlc3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVzdC1kZWF0aG1vb2QtYnV0dG9uJyksXG5cdCRhbGwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVzdC1hbGwtYnV0dG9uJyksXG5cdCRjbGVhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjbGVhci1idXR0b24nKTtcblxuXG52YXIgbWF4VGVzdCA9IDIwMCxcblx0dGVzdERlbGF5ID0gNTA7XG5cbiRkb21UZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHR2YXIgY291bnQgPSAwLFxuXHRcdHRvdGFsVGltZSA9IDAsXG5cdFx0aW50ZXJ2YWxJRCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKTtcblx0XHRcdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHRcdFx0Y3VycmVudFJlbmRlcigpLiRodG1sVG9ET00oJHJvb3QpO1xuXHRcdFx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0XHRcdHRvdGFsVGltZSArPSB0aW1lO1xuXHRcdFx0Y291bnQrKztcblx0XHRcdGlmIChjb3VudCA9PT0gbWF4VGVzdCkge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnZG9tIDEwMHggOiAlcyAtICVzJywgdG90YWxUaW1lLCB0b3RhbFRpbWUgLyBtYXhUZXN0KVxuXHRcdFx0XHRjbGVhckludGVydmFsKGludGVydmFsSUQpO1xuXHRcdFx0fVxuXHRcdH0sIHRlc3REZWxheSk7XG59KTtcbiRkZWF0aG1vb2RUZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHR2YXIgY291bnQgPSAwLFxuXHRcdHRvdGFsVGltZSA9IDAsXG5cdFx0bnQsXG5cdFx0aW50ZXJ2YWxJRCA9IHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKTtcblx0XHRcdG50ID0gY3VycmVudFJlbmRlcigpLiRodG1sVG9EZWF0aG1vb2QoJHJvb3QsIG50KTtcblx0XHRcdHRpbWUgPSBuZXcgRGF0ZSgpLnZhbHVlT2YoKSAtIHRpbWU7XG5cdFx0XHR0b3RhbFRpbWUgKz0gdGltZTtcblx0XHRcdGNvdW50Kys7XG5cdFx0XHRpZiAoY291bnQgPT09IG1heFRlc3QpIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJ2RlYXRobW9vZCAxMDB4IDogJXMgLSAlcycsIHRvdGFsVGltZSwgdG90YWxUaW1lIC8gbWF4VGVzdClcblx0XHRcdFx0Y2xlYXJJbnRlcnZhbChpbnRlcnZhbElEKTtcblx0XHRcdH1cblx0XHR9LCB0ZXN0RGVsYXkpO1xufSk7XG5cbiRhbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcblx0JHJvb3QuaW5uZXJIVE1MID0gJyc7XG5cdHJ1bkFsbCgxMDAsIGN1cnJlbnRSZW5kZXIpO1xufSk7XG5cbnZhciBudDtcbiRzaW5nbGVEZWF0aE1vb2RUZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cdG50ID0gY3VycmVudFJlbmRlcigpLiRodG1sVG9EZWF0aG1vb2QoJHJvb3QsIG50KTtcblx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0Y29uc29sZS5sb2coJ3NpbmdsZSBkZWF0aG1vb2QgdGVzdCcsIHRpbWUpXG59KTtcbiRzaW5nbGVET01UZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdHZhciB0aW1lID0gbmV3IERhdGUoKS52YWx1ZU9mKCk7XG5cdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHRjdXJyZW50UmVuZGVyKCkuJGh0bWxUb0RPTSgkcm9vdClcblx0dGltZSA9IG5ldyBEYXRlKCkudmFsdWVPZigpIC0gdGltZTtcblx0Y29uc29sZS5sb2coJ3NpbmdsZSBkb20gdGVzdCcsIHRpbWUpXG59KTtcblxuJGNsZWFyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdCRyb290LmlubmVySFRNTCA9ICcnO1xuXHRudCA9IG51bGw7XG59KTtcblxuLy8gcnVuQWxsKDEsIGN1cnJlbnRSZW5kZXIpO1xuXG4vLyJdfQ==
