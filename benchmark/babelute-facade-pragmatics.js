/*
* @Author: Gilles Coomans
* @Date:   2017-05-30 15:50:27
* @Last Modified by:   Gilles Coomans
* @Last Modified time: 2017-06-01 00:34:38
*/

'use strict';

import jsonapiPragmatics from './jsonapi-facade-pragmatics';

jsonapiPragmatics.addTargets({
	jsonapi: true
});

/**
 ******************* Functional Facade Pragmas  ************
 */

const jsonapiFunctionalPragmatics = jsonapiPragmatics.toFunctionalFacadePragmatics();
const functionalPragmas = jsonapiFunctionalPragmatics.pragmas;
function createFFPPage(model, data, query, pageInfos){
	return functionalPragmas.page(model, data, query, pageInfos);
}

jsonapiFunctionalPragmatics.addTargets({
	jsonapi: true
});

const pipe = (...fns) => x => fns.reduce((v, f) => f(v), x);

function createFFPPipedPage(model, data, query, pageInfos){
	return pipe(
		functionalPragmas.pageMeta(model, data, query, pageInfos),
		functionalPragmas.pageData(model, data, query),
		functionalPragmas.pageLinks(model, data, query, pageInfos)
	);
}
/**
 ******************* LEXICON ************
 */

const jsonapiLexicon = jsonapiPragmatics.toLexicon('jsonapi')
	.addAliases({
		$toObject(subject = {}) {
			return jsonapiPragmatics.$apply(this, subject);
		},
		$toFunction() {
			return jsonapiFunctionalPragmatics.$toFunction(this);
		}
	});

const jali = jsonapiLexicon.initializer();
function createSentence(model, data, query, pageInfos) {
	return jali.page(model, data, query, pageInfos);
}

/**
 ************** exports
 */

const japi = jsonapiPragmatics.initializer();

export {
	japi,
	jali,
	createSentence,
	createFFPPage,
	createFFPPipedPage
};