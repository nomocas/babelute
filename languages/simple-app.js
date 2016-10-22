m.app('ACDecor',
	m.restful('/api/v1',
		m.model('contact',
			m.role('$unauthenticated', m.restriction('post'))
			.server(
				m.after('post', d.emailTo('admin@foo.com', d.settings('admin-email')))
			)
			.fields(
				aright
				.creationDate()
				.email('from')
				.email('to')
				.string('message')
			)
		)
		.model('gallery',
			m.role('$unauthenticated', m.restriction('*|get'))
			.fields(
				aright
				.creationDate()
				.string('title')
				.boolean('published')
				.images('images', {

				})
			)
		)
	)
	.statics('/statics', fs.jsFile('app.js', ))
	.htmlPage('/',
		h.link('...')
		.link('...')
		.keywords('...')
		.description('...')
		.main(
			h.id('app')
			.myRootComponent() // server rendering
		)
		.script('/statics/app.js')
		.script(function() {
			// client boot script
			myhtml
				.myRootComponent()
				.$htmlToDOM('#app');
		})
	)
	._babelute('babelute-doc')
	.lexic('myhtml',
		bdoc
		.extend('html')
		.lexem('myRootComponent',
			bdoc.description('my root component')
			.method(function(c3poreq) {
				return this.view({
					load: function(state) {
						return state.load('galleries', 'gallery::?published');
					},
					route: '/foo/bar/?s:id',
					render: function(state) {
						return h.div('...');
					}
				});
			})
		)
		.lexem('gallery',
			bdoc.description('the html gallery')
			.method(function(gallery) {
				return this.view({
					render: function(state) {
						return h.div(gallery.title)
					}
				});
			})
		)
	)
);