function extend(BaseClass, ...apis) {
	const B = function(...args) {
		BaseClass.apply(this, args);
	};
	B.prototype = Object.create(BaseClass.prototype);
	B.prototype.constructor = B;
	apis.forEach((api) => {
		for (var i in api) B.prototype[i] = api[i];
	});
	return B;
}

export default extend;

