/**
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

var Babelute = require('../index');

Babelute
	.toLexic('fs', [
		'isWritable',
		'isExecutable',
		'isReadable',
		'cd',
		'rename',
		'chown',
		'chmod',
		'exists',
		'link',
		'unlink',
		'rmdir',
		'dir',
		'writeFile',
		'appendTo'
	])
	.toLexic('fs', {
		jsonFile: function(path) {
			return this.readFile(path, {
				type: 'json'
			});
		},
		textFile: function(path) {
			return this.readFile(path, {
				type: 'text'
			});
		}
	});

[]
.forEach(function(type) {
	Babelute.toLexic('fs', null, null);
});

/**
 * @example
 *
 * #fs:
 * cd('./foo', 
 * 		dir('src',
 * 			touch('bar.txt')
 * 			appendTo('bar.txt', 'foo')
 * 			all(
 * 				git('clone', '...'),
 * 			 	npm('install', '...'),
 * 			 	json('zoo.json', function(value){
 * 				 	value.title = '...';
 * 			  	}),
 * 			  	html('index.html', 
 * 			  		#html('scaffold|html:string'):
 * 			  		head()
 * 			  		body(
 * 			  			div(...)
 * 			  		)
 * 			  	)
 * 			)
 * 			link('./ff', '...')
 * 			chown(...)
 * 		)
 * 		logError()
 * 		chmod()
 * )
 * file('./pop', append('rooo'))
 */