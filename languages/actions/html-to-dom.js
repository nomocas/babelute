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