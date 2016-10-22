/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 *
 */

var Babelute = require('../index'),
	promisify = require("promisify-node"),
	fs = promisify('fs'),
	pathUtil = require("path");

Babelute.toActions('fs:fs', {
	__restrictions__: {
		fs: true
	},
	isWritable: function(env, cwd, arg /* path */ ) {
		return is('writable', cwd, args[0], 2);
	},
	isExecutable: function(env, cwd, args) {
		return is('executable', cwd, args[0], 1);
	},
	isReadable: function(env, cwd, args) {
		return is('readable', cwd, args[0], 4);
	},
	exists: function(env, cwd, args /* path, assertion */ ) {
		var path = args[0],
			assertion = args[1];
		if (path === true && !assertion) {
			path = '.';
			assertion = true;
		}
		var check = function(path) {
			return fs.exists(normalize(cwd, path)).then(function(res) {
				if (res != assertion)
					throw new Error("path (" + path + ") don't exists");
				return res;
			});
		};
		return path.forEach ? Promise.all(path.map(check)) : check(tmp);
	},
	cd: function(env, cwd, args) {
		var babelute = args[1],
			newCwd = pathUtil.resolve(normalize(cwd, args[0]));
		return fs.exists(newCwd, true)
			.then(function(s) {
				return babelute.$output(env, newCwd);
			});
	},
	touch: function(env, cwd, args) {

	},
	rename: function(env, cwd, args) {
		return fs.rename(normalize(cwd, args[0]), normalize(cwd, args[1]));
	},
	chown: function(env, cwd, args /* path, uid, gid */ ) {
		return fs.chown(normalize(cwd, args[0] || '.'), args[1], args[2]);
	},
	chmod: function(env, cwd, args /* path, mode */ ) {
		return fs.chmod(normalize(cwd, args[0] || '.'), args[1]);
	},
	link: function(env, cwd, args /* src, dest */ ) {
		return fs.link(normalize(cwd, args[0]), normalize(cwd, args[1]));
	},
	unlink: function(env, cwd, args) {
		return fs.unlink(normalize(cwd, args[0]));
	},
	rmdir: function(env, cwd, args) {
		return fs.rmdir(normalize(cwd, args[0]));
	},
	/**
	 * 
	 */
	dir: function(env, cwd, args) {
		var path = normalize(cwd, args[0]),
			p = fs.mkdir(path);
		return args[1] ? p.then(function(s) {
			return args[1].$output(env, path);
		}) : p;
	},
	jsonFile: function(env, cwd, args) {
		var path = normalize(cwd, args[0]);
		return fs.readFile(path, {
			type: 'json'
		}).then(function(s) {
			return args[1].$output('object:object', {
				path: path,
				content: JSON.parse(String(s))
			});
		});
	},
	jsFile: function(env, cwd, args) {
		var path = normalize(cwd, args[0]);
		return fs.readFile(path, {
			type: 'text'
		}).then(function(s) {
			return args[1].$output('js:string', {
				path: path,
				content: JSON.parse(String(s))
			});
		});
	},
	htmlFile: function(env, cwd, args) {
		var path = normalize(cwd, args[0]);
		return fs.readFile(path, {
			type: 'json'
		}).then(function(s) {
			return args[1].$output('html:string', {
				path: path,
				content: JSON.parse(String(s))
			});
		});
	},
	fileContent: function(env, cwd, args) {},
	appendTo: function(env, cwd, args) {

	}
});

Babelute.prototype.$fs = function(cwd) {
	return this.$output('fs:fs', cwd);
};

function normalize(cwd, path) {
	if (path && path[0] !== '/')
		path = pathUtil.normalize(cwd + "/" + path);
	return path || cwd;
}

function checkPermission(path, mask) {
	return fs.stat(path).then(function(stats) {
		return !!(mask & parseInt((stats.mode & parseInt("777", 8)).toString(8)[0]));
	});
}

function is(name, cwd, path, flag) {
	var check = function(p) {
		return checkPermission(normalize(cwd, path), flag)
			.then(function(sc) {
				if (!sc)
					throw new Error(path + " is not " + name + ".");
			});
	};
	return path.forEach ? Promise.all(path.map(check)) : check(path);
}