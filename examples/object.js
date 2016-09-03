var Babelute = require('../index');

Babelute.toSemantic('toObject', {
	object: function(target, name, child) {
		target[name] = {};
		if (child)
			child.toObject(target[name]);
	},
	array: function(target, name) {
		target[name] = [];
	}
});

Babelute.prototype.toObject = function(target) {
	target = target || {};
	this.output('toObject', target)
	return target;
};
