/**
 * Babelute Lexic/Actions Documentations DSL
 *
 * @author Gilles Coomans
 * @licence MIT
 * @copyright 2016 Gilles Coomans
 */

require('../lib/babelute')
	.toLexic('babelute-doc', [
		'lexic',
		'lexem',
		'actions',
		'action',
		'extend',
		'description',
		'argument',
		'argumentsRest',
		'method'
	]);

/**
 * @example
 * #babelute-doc:
 * lexic('html',
 * 		lexem('tag', 
 * 			description('html tag')
 * 			argument('name',
 * 				description('the name of the tag')
 * 				#aright:
 * 				required()
 * 				isString()
 * 			)
 * 			argument('babelutes',
 * 				description('an array of babelutes to apply on tag')
 * 				#aright:
 * 				isArray()
 * 				items(
 * 					or(
 * 						isBabelute(),
 * 						isString() // will be wrapped in h().text(value)
 * 					)
 * 				)
 * 			)
 * 		)
 * 		_each(['div', 'section', ...], function(tagName){
 * 			this.lexem(tagName,
 * 				bb()
 * 				.description(tagName + ' tag')
 * 			 	.argumentsRest('babelutes',
 * 				 	bb()
 * 				 	.description('an array of babelutes to apply on tag')
 * 				  	.babelute('aright')
 * 				   	.isArray()
 * 				    .items(
 * 					   a().or(
 * 					   		a().isBabelute('html:*'),
 * 						    a().isString()
 * 					   )
 * 				    )
 * 			     )
 * 			     .method(function(...babelutes){
 * 				    return this.tag(tagName, babelutes);
 * 			     })
 * 		      )
 * 	    })
 * 	)
 */