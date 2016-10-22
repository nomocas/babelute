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