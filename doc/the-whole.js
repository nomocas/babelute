_append = (lexic, name, args) => {
	this._lexems.push({
		lexic: lexic,
		name: name,
		args: args
	});
	return this;
}