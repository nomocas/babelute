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