Reflexion base :
__________________

Avec les Classes : 
	on confond exprimer le probleme et encoder/executer le probleme

Babelute :



	language métier :
		recette-cuisine

		voiture
			essieu, pneu, roue, moteur, volant, route

		lego
			piece


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

		canvasProjet(
			competences(

			)
		)


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


		me()
		.facette('bloupi')
		.place()


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


		==> piste pour modification
		=> peut pas etre binder ou patché classiquement (pas de path humain)


		=> demande de conserver un lien avec document de départ = document maitre
		==> c'est lui qu'on modifie => donc c'est lui qui contient les données à modifier
		==> pas
		=> penser WebComponent et shadowDom : 
			=> nous avons besoin d'un editeur de document
			==> lors execution vers editeur
			==> soit  conserver path type 0.1.23.0
				==> mediateur de type Interpolable qui lui connait path et fait dual binding

			==> ou alors remplacer les arguments primitifs par un call special
				hello(arg1, arg2) ==> hello(c.arg(arg1), c.arg(arg2))

				retourne un Argument {
					callNode: refVersNodeContenantArg,
					index:1,
					update:function(value){
						this.callNode.args[this.index] = value;
					}
				}



			==> chaque argument injecté dans un corps de fonction : appartient au scope de la fonction



==> peut etre simplement scope(monNom, maValue)
ex : gateauChoco(
		mix('pâte', beurre(250) farine(250) oeufBattu(3))
		mix('coulis', menthe(3), framboises(200))
		attendre('15min')
		mix('gateau', prendre('pâte', 2/3), sucre(250))
		attendre('5min')
		empiler('gateau', napage('coulis'),  prendre('pâte', 1/3), napage(chocolat(100)))
		cuire('gateau', '180C°', '25min')
	)

Non faut garder document de départ pour appliquer les modif
il faudrait pouvoir appliquer modif depuis document parsé lui même puisqu'il est maitre et qu'il peut avoir plusieurs représentations


Solution :

Faire un document en tant que tel
	un document n'est pas la meme chose qu'une chaine compilée
	il contient juste  le premier étage descriptif (aucune execution)

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

De l'intérieur
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
	mediateur/language de query sur un chaim
	faire un jquery like pour babelute
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
 Un mediateur n'est jamais rien d'autre que ce qu'il fait :
 il n'a aucune variable propre : Enveloppe floue, défini par ses fonctions 
 exactement comme un bon model doit être : défini de l'intérieur