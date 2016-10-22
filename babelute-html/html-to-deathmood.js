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