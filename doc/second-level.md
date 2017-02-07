# Second Degré

api premier degré
api deuxième degré
api atomique

si on écrit tout en api de deuxième degré : on a toute l'infos

premier degré : on perd structure intermédiaire
atomique : on perd toute la structure


si on fournit deuxième degré :
- on peut déduire premier (facile : juste remplacement par atome)
- et on peut déduire atomique (facile : juste développement complet sur lui même)


Donc si on veut tout avoir : 
- document = premier degré
- AST = deuxième degré
- interpretable = atomique

==> fournir api en deuxième degré

const lexicon = new Lexicon('html');


lexicon.addAtoms(['tag', 'text', 'attr']) // ok change rien

// compounds : passer par une fonction
lexicon.addCompounds((h) => {
	return {
		foo:function(babelute){
			return this.tag('div', ['foo', h.tag('span', '...'), babelute]);
		},
		boo:function(){
			return this.foo(h.attr('...', '...').tag('section', ['...']));
		}
	}
});


// if another lexicon could be translated in this lexicon :
lexicon.addTranslationTargets('my-custom-lexicon-name')

var domPragmatics = new Pragmatics({
	targets:['html'],
	methods:{
		tag:function($parent, args){
			const $child = document.createElement(args[0]);
			$parent.appendChild($child);
			args[1].forEach((b) => {
				if(typeof b === 'undefined')
					return;
				if(!b.__isBabelute__)
					this.text($child, [b]);
				else
					domPragmatics.$output($child, b);
			});
		},
		text:function($parent, args){
			$parent.appendChild(document.createTextNode(args[0]));
		},
		attr:function($tag, args){
			$tag.setAttribute(args[0], args[1]);
		}
	}
})

==> doit être executé deux fois automatiquement pour produire api atomique et api second degré + api de premier degré sur base d'un des call

==> ou à la demande : lazzy api production
==> lorsque :
lexicon.initializer()
lexicon.firstLevelInitializer()

Mais comme :
Pas de : lexicon.secondLevelInitializer()
==> toujours utiliser firstLevelIntializer à la place : 
	c'est à l'interprétation pour construire AST (oneLevelDeveloppement) qu'il est nécessaire d'avoir le second degré

lexicon.developOneLevel = function(lexem){
	var secondLevelApi = this.getSecondLevelApi(); // lazzy api "compilation" and caching
	//...
}

