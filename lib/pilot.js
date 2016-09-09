/**
 * A pilot is a Babelute where appended lexems are immediatly translate to actions and executed.
 *
 * It "pilots" directly something through mediations. 
 * Think about jquery case : in fact, it's a chained mediator with immediate execution on dom-node's sets. A jquery handler holds a dom-nodes set and apply dom-related mediation on it.
 *
 * A "pilot" (here called "dothat") is the generalisation of this pattern.
 *
 * We could make pilots for lot of domain, exactly as babelute.
 * ex : 
 * - app pilot (login/logout, endoss roles, init resources, place app in certains states, make tests, etc)
 * - dom pilot : ok jquery (and derivated) does it already... ;)
 * - process pilot : spawn, cd, exec, etc
 * - babelute document pilot : same idea from jquery but for babelute's doc
 * - restful pilot : post, put, del, ... that manage missing methods, 405, 404, etc on simple restful clients
 * - ...
 */


/*
	Work in progress : don't read further... ;)

	Will maybe extracted to its own lib...

	...

	Doit etre basé sur un ensemble restreint d'atome logique de type lexem.

	.done(function(subject, args, env){} || ...fluents)
	.error()
	.all(...promises || fluents)
	.catch() // return a promise
	.then() // return a promise

	+ baser un maximum sur les atomes
	.if(condition, fluent || function(subject, args, env){})
	.each(fluent || function) : .done + .all ?
	.first() -> just .done
	.last() -> just .done
	
	doit se lancer que si sujet est fourni à l'initialisateur.
	Sinon reste en attente qu'on lui file un sujet et un env
 */

var Dothat = function(subject) {
	this.__dothat__ = true;
	this._subject = subject;
	this._queue = [];
};

var Api = Dothat.api = {};

function createClass(apiName, api) {
	var Cl = function(subject) {
		Dothat.call(this, subject);
		this.__dothat__ = apiName;
	};
	Cl.prototype = new Dothat();
	for (var i in api)
		Cl.prototype[i] = api[i];
	return Cl;
}

function relaunch(dothat) {
	if (dothat._queue.length) {
		var m = dothat._queue.shift();
		exec(dothat, m.method, m.args);
	}
}

function exec(dothat, method, args) {
	dothat._waiting = method.apply(dothat._subject, args);
	if (dothat._waiting && dothat._waiting.then)
		dothat._waiting.then(function(s) {
			dothat._waiting = null;
			relaunch(dothat);
			return s;
		});
	else
		relaunch(dothat);
}

Dothat.prototype = {
	dothat: function(apiName) {
		var api = Dothat.getApi(apiName);
		api.__DothatClass__ = api.__DothatClass__ || createClass(apiName, api);
		return new api.__DothatClass__();
	},
	done: function(method, args) {
		if (this._waiting || !this._launched)
			this._queue.push({ method: method, args: args });
		else
			exec(this, method, args)
		return this;
	},
	error: function(callback) {

	},
	all: function() {

	},
	catch: function(func) {

	},
	then: function() {

	},
	_append: function(method, args) {
		return this.done(method, args);
	}
};

Dothat.getApi = function(apiName) {
	if (!Api[apiName])
		throw new Error('Dothat : no api found with "' + apiName + '"');
	return Api[apiName];
};

Dothat.toApi = function(apiName, methodName, method) {
	var api = Api[apiName] = Api[apiName] ||  {};
	if (typeof methodName === 'object') {
		for (var i in methodName)
			api[i] = methodName[i];
	} else
		api[methodName] = method;
	return Pilot;
};

// duplicate specified lexic to newName and add provided methods to it.
Dothat.extendsApi = function(name, newName, methods) {
	Dothat.toApi(newName, Dothat.getApi(name));
	if (methods)
		Dothat.toApi(newName, methods);
	return Dothat;
};

Dothat.initializer = function(apiName) {
	var api = Dothat.getApi(apiName);
	if (api.__DothatInitializer__)
		return api.__DothatInitializer__;
	var Cl = api.__DothatClass__ = api.__DothatClass__ || createClass(apiName, api);
	return api.__DothatInitializer__ = function(subject) {
		if (api.__dothatinitializer__)
			subject = api.__dothatinitializer__(subject);
		return new Cl(subject);
	};
};

Dothat.d = function(apiName, subject) {
	if (apiName)
		return Dothat.initializer(apiName)(subject);
	return new Dothat(subject);
};

//____________________________________

Dothat.toApi('app', {
	// __dothatinitializer__: function(subject) {

	// },
	login: function(credential) {
		return this._append(function(app) {

		}, [credential]);
	}
});


/*
 *
 *
 * p('html:dom', myNode).div(...).span(...)
 *
 * var d = Dothat.initializer('html:dom');
 *
 * d(myNode).div(...).span(...)
 *
 *
 * a(app).login().logout().post('campaign', {}).then(function(s){})
 *
 *
 * bdp(babelute).find('...').wrap('cuire').prepend(...)
 *
 * les vraies questions sont : 
 *
 *  différence entre sujet et résultat ?
 *
 * 	promise : orienté résultat
 * 	facade : orienté sujet
 *
 *  doit on fournir les deux ?
 *
 *	regle du retour : si undefined ne pas changer résultat courant. ne changer que si pas undefined...
 *	==> est ce une bonne idée ?
 *
 * 	si c3po à son pilote : mixer avec app
 * 	
 * 	passer de app à restful ? implications ?
 *  utiles? pas moyen de trouver autre moyen (type structure language)
 *
 *
 * Bon mais si on veut un truc simple pour les doc babelute ?
 *
 * on s'en fout de l'async pour l'instant.
 *
 * ici on a qu'un sujet.
 *
 * la structuration en arbre est quand meme intéressante : lorsque tout linéaire : pauvre :
 * 
 *
 *
 * aussi : question de fond : doit on furnir nouvelle instance (dans le but de faire du caching) ou pouvons nous rester avec une seul instance.
 * 
 * autre question : quand va t'on utiliser un language actif sous forme de template
 *
 * ==> est ce intéressant de mixer les deux :
 *
 * 	yamvish:
 * 		div(...)
 * 		
 * 	jquery:
 * 		find(...)
 * 		click(...)
 *
 * ==> bof : tout se fait dans le template yamvish (click, etc)
 *
 * 	avec bdoc ca n'a pas de sens
 *
 *  ...
 *
 *
 * ==> vaut mieux séparer completement (autant pour des raisons de modularités et de poids que de compréhension générale)
 * ==> il serait peut être quand même bon de pouvoir avoir la même signature entre les actions babelute et dothat.
 * ou la possibilité de wrapper celle de babelute vers celle de dothat
 * (pour les cas ou on veut offrir le choix entre templating ou action direct : à trouver encore)
 *
 * garder l'aspect templating à l'omission du sujet a quand meme un avantage :
 * 	pour la structuration
 *
 * a(app)
 * .login('foo@ff.com', 'test1234')
 * .all(
 * 		a().post('campaign')...,
 * 		a().post('profile')...,
 * 		a().put('foo')...,
 * )
 * .done(function(s){
 * 	 // s = array de résultats
 * 	 // this = sujet
 * })
 * .error(function(e){
 * 	 // this = sujet
 *   // e = error
 * })
 * .logout()
 * 	 
 * 	// then et catch : sortie de dothat : retourne une promesse
 * .then(function(s){
 * 	 // s = résultat
 * 	 // pas de this
 * })
 *
 *
 *
 * bdp(doc)
 * .find(...)
 * .done(
 * 		bdp().wrap(
 * 			bdoc('html')
 * 			div(...)
 * 		),
 * 		bdp().find(..).prepend(
 * 			bdoc('html')
 * 			div(...)
 * 		)
 * )
 *
 * ==> en fait l'intérêt d'un dothat c'est justement qu'il parle d'execution
 * donc de gestion du temps, du branchement logique, etc.
 *
 * donc la structuration est bienveue ici pour fournir branchement logique clean et fluent.
 *
 *
 * choix de l'unicité des instances : pas de nouvelle instance à chaque call.
 * trop lourd : déjà bcp d'instance
 * besoin de garder l'historique des calls (si pas de sujet à l'écriture ou async)
 * 
 */
