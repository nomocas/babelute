var m = Babelute.initializer('loopback-model');

var model = m()
	.name('Project')
	.description('Blabla')
	.base('...')
	.production(
		m().persisted('mongodb', ...)
	)
	.dev(
		m().persisted('memory', ...)
	)
	._use(...)
	/*******************
	 ********* Custom API
	 ********************/
	.remote('myRemote', ...)
	.scope(..., ...)
	// Relations
	.hasMany('Pages')
	.belongsTo('user')
	// ACL
	.allow(m().role('admin'))
	.deny(m().role('all'))
	// custom http testcases
	.babelute('http-test')
	.test('my test',
		b('http-test')
		.post('project/myRemote', {...
		})
		.resultEqual(...)
		.validateResult(
			b('aright')...
		)
	)
	// model fields
	.fields(
		b('aright')
		.id()
		.creationTime()
		.updateTime()
		.string('title',
			b('aright').default('')
		)
		.string('baseline',
			b('aright').required(false).default('')
		)
		.boolean('published',
			b('aright').default(false)
		)
		.array('content',
			b('aright').default([])
		)
	)
	// scss
	.css('main',
		css()
		.css('> div',
			css()
			.background('...')
			.backgroundImage('...')
		)
		.css('.foo', css().fontSize('...').color('...'))
	)
	// model view(s)
	.babelute('yamvish')
	.view(
		y().route('/project/s:id')
		.load('project', 'project::{{ $route.params.id }}')
		.model('project', 'Project')
		.div(
			//...
		)
	)
	.view(
		y().route('/projects/?s:query')
		.load('projects', 'project::?{{ $route.params.query || "" }}')
		.collectionModel('projects', 'project')
		.div(
			//...
		)
	)


model.$output('loopback-model:scaffold', {...
});
model.$output('aright:instance-builder');
model.$output('aright:instance-validater');
model.$output('loopback-model:access-controler');
model.$output('loopback-model:http-tests', {...
});
model.$output('loopback-model:docs');
model.$output('loopback-model:reports');
model.$output('loopback-model:explorer');
model.$output('*:babelute-exposer');
model.$output('loopback-model:uml');

model.$output('loopback-model:c3po-server-client');
model.$output('loopback-model:c3po-http-client');
model.$output('loopback-model:yamvish-model');
model.$output('yamvish:html-dom', {});
model.$output('yamvish:html-string', {});