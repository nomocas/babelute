Reflexion base :
__________________

Avec les Classes : 
	on confond exprimer le probleme et encoder/executer le probleme

Babelute :


	
ex : gateauChoco(
		mix('pâte', beurre(250) farine(250) oeufBattu(3))
		mix('coulis', menthe(3), framboises(200))
		attendre('15min')
		mix('gateau', prendre('pâte', 2/3), sucre(250))
		attendre('5min')
		empiler('gateau', napage('coulis'),  prendre('pâte', 1/3), napage(chocolat(100)))
		cuire('gateau', '180C°', '25min')
	)



Ca marche pour bcp de choses :

	language métier :

		voiture
			essieu, pneu, roue, moteur, volant, route

		lego
			type piece, couleur, empiler, ...


		univers
			super-amas
			amas
			galaxie
			bras
			système
			étoiles
			planete
			satelite
			continent
			ocean
			mer
			région


		planche-à-voile

		projet
			horticulture
			agrobio
			permaculture

		construction
			vis, tourne-vis, marteau, clou, planche, poteau,	 

		matière
			bois, metal, plastique

		texture
			transparente, matte, bosselé, brossé, plaqué, 

		assembler
			visser, clouer, coller, souder, relier, connecter

		menuiserie
			poncer, raboter, ...

		design-objet
			texture
			matière-organique
			matière-synthetique
			assembler
			menuiserie
			metalurgie
			mobilier

		meuble:table(
			matiere('bois')
			texture('foncé')
			pieds(3, 
				matiere('alluminium')
				texture('brossé')
				hauteur(70)
			)
			tirroire()
			largeur(100)
			longueur(200)
		)
		lit(
			matiere('bois')
			texture('clair')
			tiroire()
			largeur(160)
			longueur(200)
		)

		tableNuit(
			matiere('metal')
		)

		balade(
			heureDepart(...)
			heureFin(...)
			chemin(
				chemin:
				depart('...')
				etape('...')
				etape('...')
			)
		)



		soirée

		lieu
			position

		événement
			commence, fini, position, programme, 

		menuiserie

		maison
			chambre, cuisine, salon, ...
			mur, porte, fenetre, ...
			tuyau,

		construction-batiment

		Exemple plus complet : 

		projet(
			team:members('marco','gilles','ploum')
			place(position:pos(...))
			product:produit('lampe')
			page:pages(
				header(
					h1('{{ title }}')
					h2('....')
					quote('....')
				)
				body(
					img('...')
					map('...')
					contactForm()
				),

				layout('product')
				route('product/s:id')
				h1('....')
				h2('....')
				quote('....')
				img('...')
				product:produit('{{ $route.param.id }}')
			)
	
			page('product/s:id', 
				content:
					h1('....')
					h2('....')
					quote('....')
					img('...')
					product:produit('{{ $route.param.id }}')
			)
		);

		chaim:semantic('web-output',
			content:
				page[content](
					css:rule('.myclass', background(...) height(...))
					yam:section(
						cl('myclass')
						use(@content)
					)
				)
				header[content](
					css:rule('.myclass', background(...) height(...))
					yam:header(
						cl('myclass')
						use(@content)
					)
				)
				conctactForm[](
					css:rule('.myclass2', 
						background(...) 
						height(...)
					)
					yam:div(
						cl('myclass2')
						form(...)
					)
				)
		)


		semantic('dom',
			yam:tag(function(name, ...content){
				
			})
			cl(function(name, flag){

			})
			attr(function(name, flag){
			
			})
		)

		semantic('twopass',
			yam:tag(function(name, ...content){
				
			})
			cl(function(name, flag){

			})
			attr(function(name, flag){
			
			})
		)


		y.output('web-output:dom', babelute.doc(templ).find('page("contact")'))

		semantic('cssoutput', 
			css:rule(function(name, ...content){
				
			})
		)

		y.output('cssoutput', ['css'], templ.$get('page("*")'))

		//______________________________________________________________________


		recette:gateauChocolat(
			mix('pâte', beurre(250), farine(250), oeufBattu(3))
			mix('coulis', menthe(3), framboises(200))
			attendre('15min')
			mix('gateau', prendre('pâte', 2/3), sucre(250))
			empiler('gateau', prendre('coulis'),  prendre('pâte', 1/3), napage(chocolat(100)))
			cuire('gateau', '180C°', '25min')
		);

		semantic('object', 
			recette:
				mix(function(name, ...content){
					
				})
				empiler(function(name, ...content){
					
				})
				attendre(function(duration){

				})
				cuire(function(name, temperature, duration){

				})
		)
		
		y.exec('object', recette, {})

		//______________________________________________________________________


		EDITABLE MODE
		==> piste pour modification
		=> peut pas etre binder ou patché classiquement (pas de path human-readable)

		==> il faudrait pouvoir appliquer modif depuis document parsé lui même puisqu'il est maitre et qu'il peut avoir plusieurs représentations
		==> c'est lui qui contient les données à modifier
		=> penser WebComponent et shadowDom : 

			==> alors remplacer les arguments primitifs par un call special
				hello(arg1, arg2) ==> hello(c.arg(arg1), c.arg(arg2))

				retourne un Argument {
					callNode: refVersNodeContenantArg,
					index:1,
					update:function(value){
						this.callNode.args[this.index] = value;
					}
				}


Solution :

Faire un document en tant que tel
	un document n'est pas la meme chose qu'une chaine compilée mais il a la même forme
	il contient juste  la premiere description (aucune execution - interprétation)

	ce document est modifiable avec son propre médiateur chainé à execution immédiate
	(à la jquery)

il contient en plus : 
gateau.output('weboutput:string')
.stabilised(function(s){
	
})

gateau.subscribe(function(value, type, path, key){
	
})

gateau.instance('weboutput:string', function(value){
	
})

gateau.instance('object', function(value){
	
})

De l'intérieur = Binding = un Observable est une solution simple
	faudrait pouvoir le faire de l'intérieur aussi (type édition en place) => utiliser interpolable ou similaire (mediateur observable)
	==> donc depuis une représentation vers master vers autres représentations
	donc faudrait aussi pouvoir conserver un lien entre master et ses représentations au cas ou full-rerender

	==> on doit produire Argument {
		node: node,
		path:'0.1.0',
		subscribe:function(func){},
		get:function(){
			// return this.path
		},
		set:function(value){
			// set this.path
			// this.callNode.args[this.index] = value;
		}
	 }
	 => le faire percoler et s'en servir pour avoir du bind


De l'extérieur : 
	mediateur/language de query sur une babelute
	faire un jquery like pour babelute :

	babelute.doc(string || compiled)
	.find('//mix("gateau")[1]')
	.each(function(content){
		
	})
	.find('//attendre("15min")')
	.set('[0]', '10min')
	.replaceArgs(..., ..., ...)

	babelute('monLanguage')
	.maMethode(...)
	...
	.babelute('monAutreLanguage')


	// initialisateur execution immediate
	babelute('monLanguage', {
		semantic:'dom' // on fixe le moteur d'interpretation
	})
	// => on wrap
	monLanguage = function(targets){
		return babelute('monLanguage', {
			immediate:true,
			semantic:'dom' // on fixe le moteur d'interpretation
		});
	}
	// ou on utilise initier
	var m = babelute.initier('monLanguage', opt);



mababelute.mediator('/mix(...)')


Theorie 



	Quelles sont les règles pour savoir que modéliser et comment ?

	Y'en a-t-il ? réponse : bof... la seule universelle c'est l'itération : on tâtonne...

	Où utiliser des classes, ou utiliser autre chose ?
			Flou

	Qu'avons nous d'autre que des classes : 

			AOP ?

			design patterns ?

			ontologies ?
			
			et puis ?


	Réponse :
		Classes bon quand on connait execactement ce qu'il faut modéliser.
		Adapté pour répondre à un probleme informatico-informatique
	Mais
		Ornytorinque ?
		Horrible pour modéliser ce qui est flou, pas précis, très dynamique, forme multiple, etc.
	
	Certitude : Classe = ENCODER un modèle... 

	Grosse différence entre modéliser et ENCODER...

	Encodage d'un modèle est tjrs ad'hoc puisque difficile de ne pas perdre de l'info exprimée dans le modèle.
	dés que traduction : c'est ad'hoc.
	
	Classe = tentative de traduction vers un language purement informatique (qui n'a plus rien à voir avec le probleme de départ)
	
	But de l'OOP :
		Encapsulation
		Factory
		(Heritage) => pas une propriété primaire de l'OO : moyen d'organiser le code : et ca ne devrait jamais etre autre chose
	
	Aujourd'hui : 
		on traduit en language informatique = perversion de la compréhension

	On oublie le principale : 
		notre probleme n'est pas informatique
		il correspond à un problème réel. 
		Il n'est pas une collection de champs stockée quelquepart.
		
		Il s'exprime avant tout en language métier. 

		Avec des phrases.

		Un langage métier c'est ce qu'on a de mieux = un language forgé par des experts depuis longtemps pour décrire un probleme particulier selon leur point de vue.

	Primitives logique d'un language métier : 
		propre au language

	Primitives logiques du code : 
		bool, string, int object, array, functions

	Classe = encoder ==> encoder = traduction en primitive de code
	==> classe bon pour organiser le code : pas le modèle.

	Pq? parce que encodage est rigide.
	Et qu'on veut de la souplesse avant tout.

	meme si API d'une classe peut être (et devrait être) de l'ordre du language métier :
		l'api fait quoi ? il encode...

	Modéliser par en bas ou par en haut...

	Un bon modèle est construit par en bas càd qu'il est défini par ce qu'il contient et rien d'autre

 Un mediateur n'est jamais rien d'autre que ce qu'il fait :
 il n'a aucune variable propre : Enveloppe floue, défini par ses fonctions 
 exactement comme un bon model doit être : défini de l'intérieur