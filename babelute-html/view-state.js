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