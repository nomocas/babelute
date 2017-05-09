# Theorical part

As you've seen in previous articles ([Designing DSL]()), Babelute is highly practical and quite simple to use. And at usage, almost everything is self-explanatory...

Most of the people will use already defined lexicons, write sentences with them, play with associated Pragmatics, maybe define Dialects, translate sentences with third party bridge lexicon(s), serialize sentences and store them somewhere...

All this doesn't require to dive deeply in theoretical considerations.

So if you're here, normally it's because you want to develop fine grained DSLs or simply you want to know what's behind and what's after.

Little reminder :

> The law of leaky abstractions means that whenever somebody comes up with a wizzy new code-generation tool that is supposed to make us all ever-so-efficient, you hear a lot of people saying "learn how to do it manually first, then use the wizzy tool to save time." Code generation tools which pretend to abstract out something, like all abstractions, leak, and the only way to deal with the leaks competently is to learn about how the abstractions work and what they are abstracting. So the abstractions save us time working, but they don't save us time learning.

> And all this means that paradoxically, even as we have higher and higher level programming tools with better and better abstractions, becoming a proficient programmer is getting harder and harder.

> [Leaky Abstractions Law - Joel Spolsky](http://www.joelonsoftware.com/Articles/LeakyAbstractions.html)


This doesn't mean that it will be hard to learn... Just that it could take a little bit of time.


## MDD & DS(M)M


> __MDD realizes the “Separation of Concerns” principle by separating the business
know-how that represents the “WHAT” form of system specifications from the
technological know-how that represents the ”HOW”__. By this, MDD achieves three
main objectives; portability, interoperability, and reuse which will eventually
lead to an increase in productivity.
Domain Specific Languages (DSLs) are very important concept in MDD. DSLs are
modeling languages that target a specific domain. It is the responsibility of
domain experts to capture domain knowledge into a DSL. Application developers
can then use the developed DSL to develop and configure the required system.

> [Software Engineering Competence Center : MDD tuto](http://www.secc.org.eg/RECOCAPE/Documents/SECC_Tutorials_MDD_Getting-started-with-MDD-and-DSM.pdf)

### Domain-Specific Modeling


> According to Software Productivity Research, the average productivity in Java is only 20%
better than in BASIC. C++ fares no better than Java [SPR, 2005]. In fact, with the
exception of Smalltalk, not a single programming language in general use today can show a
substantial increase in productivity over BASIC.
So after all of the language wars, objects, components, and frameworks, we are still
scarcely more effective than 20 years ago. However, go back a couple of decades more and
there is a radical change: a leap in productivity of 400% from Assembler to BASIC. Why
was that leap so big, and how can we achieve it again today?
The 400% increase was because of a step up to the next level of abstraction. Each
statement in C++, BASIC or Java corresponds to several statements in Assembler. Most
importantly, these languages can be automatically translated into Assembler. In terms of
productivity, this means you effectively get five lines of code for the price of one.

> [...]

> Currently, the Object Management Group (OMG) is intensively promoting its ModelDriven
Architecture (MDA), a model-driven development method that comes down to
transforming UML models on a higher level of abstraction into UML models on a lower
level of abstraction.

> Normally there are two levels, platform-independent models (PIMs) and platformspecific
models (PSMs). These PIMs and PSMs are plain UML and thus offer no raise in
abstraction. [...]

> In MDA, at each stage you edit the models in more detail, reverse and round-trip
engineer this and in the end you generate substantial code from the final model. The aim
the OMG has with MDA is to achieve the ability to use the same PIM on different software
platforms and to standardize all translations and model formats so that models become
portable between tools from different vendors. Achieving this is very ambitious but also
still many years away. This focus however clearly defines the difference between DSM and
MDA, and answers the question of when each should be applied.


> [Improving Developer Productivity
With Domain-Specific Modeling Languages - Steven Kelly, PhD - 2005](http://www.developerdotstar.com/mag/articles/PDF/DevDotStar_Kelly_DomainModeling.pdf)

More :

> Domain-Specific Modeling raises the level of abstraction beyond programming by __specifying the solution directly using domain concepts__. The final products are generated from these high-level specifications. This automation is possible because both the language and generators need fit the requirements of only one company and domain. Your expert defines them, your developers use them.

> Industrial experiences of DSM __consistently show it to be 5-10 times faster than current practices, including current UML-based implementations of MDA__. As Booch et al. say* "the full value of MDA is only achieved when the modeling concepts map directly to domain concepts rather than computer technology concepts." For example, DSM for cell phone software would have concepts like "Soft key button", "SMS" and "Ring tone", and generators to create calls to corresponding code components. DSM fulfils the promise of model-driven development.

> Since your expert specifies the code generators - for your domain and your components - the resulting code is better than most developers write by hand. No "one size fits all" generated code, no stubs, no "round trip" problems. Instead, full, top quality code. __DSM does to code what compilers did to assembly language__.

> [Domain-Specific Modeling for Full Code Generation - Juha-Pekka Tolvanen - Fall 2005](http://www.methodsandtools.com/archive/archive.php?id=26)


Domain Specific Modeling further reading
- [Multi-lingual Programming](https://www.infoq.com/news/2007/08/multi-lingual-programming)
- [DSL Interoperability](https://dzone.com/articles/dsl-interoperability-and)
- [DSM : 76 cases of MDD That works](https://metacase.com/webinar/Domain_Specific_Modeling_76_cases_of_MDD_that_works_Nov2009.pdf)
- [Domain specific modeling (Robert France, Bernhard Rumpe, 2005)](http://s3.amazonaws.com/academia.edu.documents/42473462/Domain_specific_modeling20160209-12929-16vmdfi.pdf?AWSAccessKeyId=AKIAJ56TQJRTWSMTNPEA&Expires=1481808605&Signature=33JXUlf1xs9BZBWjiDjGo3XTJ7I%3D&response-content-disposition=inline%3B%20filename%3DDomain_specific_modeling.pdf)
- [DSM Forum](http://www.dsmforum.org/why.html)



### Domain Specific MultiModeling


> Domain-specific multimodeling is a software development paradigm where each view is made explicit as a separate domain-specific language (DSL).

> Successful development of a modern enterprise system requires the convergence of multiple views. Business analysts, domain experts, interaction designers, database experts, and developers with different kinds of expertise all take part in the process of building such a system. Their different work products must be managed, aligned, and integrated to produce a running system. Every participant of the development process has a particular language tailored to solve problems specific to its view on the system. The challenge of integrating these different views and avoiding the potential cacophony of multiple different languages is the coordination problem.

>  [wikipedia](https://en.wikipedia.org/wiki/Domain-specific_multimodeling)

For Coordination Problem : [Hessellund, Anders (2009). "Domain-Specific Multimodeling". IT University of Copenhagen, Denmark. 2009.](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.453.9934&rep=rep1&type=pdf)


### Third Programming Revolution

> Binary Machine Code __--(1)-->__  Assembler __--(2)-->__ General Purpose Languages (GPL) __--(3)-->__ DS(M)M

Each step equals a big boost in productivity.

Paradoxally, __General Purpose Languages are DSLs.__ And Assembler is also a DSL (the one for managing registers, memory adresses, atomic ops, etc...).

Precisely, all GPLs are Dialects of the generic DSL for handling variables and objects. Nothing more. As dialects, they all give a particular vision (and particular associated concepts) of the same problem : managing pure atomic Code related objects : string, number, bool, object, arrays, var, const, functions, if, loops, ...

No one, a part programmers, should take a look at it. That's pure esoteric expert driven language.

GPLs are called GPL because we pretend to be able to _model_ everything with those primitives. Not because they effectively and efficiently cover every Domains without further abstractions. And so to high level business related considerations, we try to answer with low level code related stuffs, or at best (in the sens of less purely technical) with UML, which is by essence generic, exactly as GPLs are.

DSMM, by filling the gap between fuzzy imprecise customer thinking and pure technical considerations, with __Multi-Level of abstractions__ that fits naturally Business Domains Languages inclusions and structurations - __because it mimics how we think and by extension how the world is structured__ - provides simply one of the "final" form of programmation.

https://martinfowler.com/bliki/OneLanguage.html

## DSLs

### DSL Universality and Stability

Domain Languages are forged though years of communities works and are the best thing we have to tackle any Domain's problems and usages.

It's their essence. 

We'll never, never, have something better than avaiable DSLs (at any moment) for talking about Domain's problems. Maybe tomorrow we'll have better DSLs... Sure... Domains will evolve.
But the best knowledge and concepts __useful__ for any domain at any moment are always encapsulated in and avaiable through DSLs.

And as Technics evolves quickly and Domains evolves slowly... The more stable solutions we could provide for any problem are based on related DSL(s) and not on technics.

In other words, modeling problems with __DSLs as First Class Citizen__ make code more useful, reusable and stable than ever.

### Internal vs External DSL

[Martin Fowler comparison](https://www.martinfowler.com/articles/languageWorkbench.html#tradeOffs)

Short version : 
- __Internal DSL__ : soft, easily extendable, with open environment (host language itself), readable but could be verbose, restrict expressivity, and implies minimal host-language knowledge.

- __External DSL__ : harder to define (need parser/compiler), with closed environment (symbolic barrier) and not always shorter (e.g. RegExp vs HTML vs SQL) but could be more expressive and better understoud by domains experts.

Babelute focus on Internal DSL main benefits which are the openness of the environement and the easyness of extension. 

By allowing mix of host-language code and objects __and__ Internal DSL sentences, it simply marry genericity and specificity, and so allow to gain, through the same paradigm (the one of the host language), a good balance between expressivity and softness.

For the easyness of extension take a look at [Dialecting]() below.


### DSL Orientations

> FBM is based on logic and controlled natural language, whereby the resulting fact based model (the conceptual data model) captures the semantics of the domain of interest by means of fact types, together with the associated concept definitions and the integrity and derivation rules applying to populations (facts) associated with these fact types.

> http://www.factbasedmodeling.org/

> __Software is not mainly about how, but about what and why__. Software projects fail most commonly because they build the wrong thing, not because they build it wrongly. Other forms of modeling, such as object modeling and entity relationship modeling, attempt to capture what, __but the models are shaped from the start by the needs of implementation (how)__. That shuts out the non-technical business expert, and bends the model out of shape, losing track of why each feature is needed, what it means and under what terms, the roles it plays in the overall system. Fact-Based Modeling incorporates and transcends both approaches, and works in either Agile or traditional environments.

> [Why Fact-Based Modeling?](http://dataconstellation.com/ActiveFacts/why.html)

I recommend to (quick) read : https://fr.slideshare.net/marcoewobben/fact-oriented-modeling-in-10-steps


As Babelute first aim is to catch pure information in DSL's sentences, without knowing all sort of things that will be applied/extracted from those sentences, Babelute is mainly suited to handle Descriptive DSL. And Fact Oriented DSL is a good ideal to have in mind when developing such languages. Of course descriptive doesn't mean necessary Fact Based and there is other way to describe things.

But there is other possible orientations : Behavioural or Structural.

And Babelute is open... You could of course imagine plenty of DSL of any types - and even a mix of them in the same language.

As long as your DSL(s) is(are) interpretable/translatable easily (for us as for computers ;) : you're free.

Whatever you do, keep in mind that pure behavioural DSL are often closy linked to technologies and so to the output's context.
And so should be better used in pragmatics implementations, which means out of babelute's primary scope.

If you need to implement pure Behavioural DSL, take a look to [DoThat](https://github.com/nomocas/dothat) - as example or for usage - wich is a Promise Based Facade DSL tool.

### Fluent Interfaces as DSL

https://en.wikipedia.org/wiki/Fluent_interface

Expressing DSL with Fluent Interface is something that is well known today.
The term "Fluent Interface" comes from Martin Fowler's [2005 article](http://martinfowler.com/bliki/FluentInterface.html) where he associated clearly Internal DSL and fluency.

Fluent interfaces does not mean necessary Method Chaining. It's just one way to achieve it.
And Method Chaining doesn't mean necessary Internal DSL.

Fluent Internal DSL are much more about choosing right words with right semantics for optimally expressing particular problems through readable and meaningful sentences. Not simply chaining calls.

Examples of Domain Specific Language expressed with Method Chaining :

SQL in JAVA : http://www.jooq.org/
```java
create.select(AUTHOR.FIRST_NAME, AUTHOR.LAST_NAME, count())
      .from(AUTHOR)
      .join(BOOK).on(AUTHOR.ID.equal(BOOK.AUTHOR_ID))
      .where(BOOK.LANGUAGE.eq("DE"))
      .and(BOOK.PUBLISHED.gt(date("2008-01-01")))
      .groupBy(AUTHOR.FIRST_NAME, AUTHOR.LAST_NAME)
      .having(count().gt(5))
      .orderBy(AUTHOR.LAST_NAME.asc().nullsFirst())
      .limit(2)
      .offset(1)
```
Other example not expressed with Method Chaining : 
RTF Doc construction in JAVA : https://github.com/ullenboom/jrtf/
```java
rtf().section(
   p( "first paragraph" ),
   p( tab(),
      " second par ",
      bold( "with something in bold" ),
      text( " and " ),
      italic( underline( "italic underline" ) )     
    )  
).out( out );
```

Or even take a look to [elenpi](https://github.com/nomocas/elenpi) which probide a small expressive internal DSL for LL(1) parser generator.

Further reading :
- http://leecampbell.blogspot.be/2008/11/method-chaining-to-create-your-dsl.html
- https://sanaulla.info/2013/05/30/creating-internal-dsls-in-java-java-8-adopting-martin-fowlers-approach
- https://msdn.microsoft.com/en-us/magazine/ee291514.aspx

### DSL Dialects

Dialects are the corner stone of Semantic structure and the key to takle complexity.

Wathever OO language you use, OOP (including Aspect Oriented Programmation) focus on behaviour. And inheritance (or class mixins) talk about methods (override, overload, super, ...). And so OO focus on how __encapsulate and structure behaviours__. Classes mostly talk about Implementation related things.

__Real__ behaviours (in all their details) are always closely linked to technologies, languages and particular temporary needs (needs that will change quickly).
And this is one reason of OO difficulties to takle most of our problems. They are condamned to play at behaviour level. Level which is itself condamned to evolve quickly and to respond to plenty of really different use cases in the same time. And trying to encapsulate a complex coherent behaviour (a class is __a bunch__ of functions that play together on same state) that will work in any cases (by extension), or that will follow easily any change, is obviously hard.

Functional Programming show us another way : what if we use smaller bricks, by splitting every behaviour to its atomic pure functions, and to __compose__ complex behaviour by piping (left or right) those atomic bricks together on demand ? When changes in needs happend, we could easily re-compose things because it's made of __atomic independant pieces__. It's much more soft, and will obviously fit much wider needs.
And we also gain big boost in Testability and Debugability.

Whatever approach we take (OOP, AOP, FP, ...), what is sure is that any _implementations_ (the active part of programs) will always be based on behavioural objects (functions, classes, ...).

Descriptive DSLs talk about Information, the state(s) of things - i.e. what things _are_ - and not how to process precisely things. We only want to encapsulate what we want and/or what we know. 

The big point here is that Information Models, most of the time hidden in Code, are much more stable and transversal than what we __actualy__ need to do with them at a particular moment. 

Think about any DB : what's important is the information encapsulated in it and not how it's really stored on the disk nor how we actually structure it... Is that a NoSQL Document or a plain old bunch of SQL tables ? Who cares apart developpers ? Certainly not the final user that only needs information. Information that should only reflect pure business related concepts. Concepts that will evolves only when the business itself will evolves. But even 10 years after, stored Information could be useful and reprocessed to obtain something else.

Dialecting could be seen as an equivalent to Class Inheritance (and is implemented as this in Babelute's Lexicon). A dialect "inherit" from another language and complete it, or change specific meanings, by providing specific words. 

But composing Information through dialecting is __much more easy__ than composing Behaviours through inheritance. Because Dialecting consist essentialy to __define Compounds Words__ which are themselves made (composed) __from other words from the same Lexicon__. And a Lexicon is primarily made of Atomic Concepts.
Finally, we always produces a list of _atoms_. 

It's much more as composing a painting, by putting freely pieces together, exactly as FP does, than extending complex objects that execute precisely something. 

So we finally have the liberty and softness of FP, ready for any adaptation, to handle Information - that will be the more stable and useful things through years.

Software Adequation

One other great benefits from DSM and Dialecting, is that DSL resolve problems horizontaly. It means that when we develop a DSL for a particular Domain, we should resolve things for a much wider audience (or application) than just __our particular business__. 

If you provide to a customer, from any food industry (lets say that he produces Pies), a General Cooking Receipts DSL and its bunch of transformations, you allow him to produce/handle __any__ receipts __simply by Dialecting__. And so tomorrow, whatever food industry evolutions are, this customer __could adapt everything easily__ for making Pizza or Beers, by just changing or producing Dialects.

So we could say that DSL resolve horizontally things, which is obviously more "adequate".


## Semantics and Interpretations


Beside talking about Fast-Dev and Software Adequation, Babelute talks about how our brain works, how naturally we understand and construct mentally things, how we talk and how we interpret things in particular contexts. 

https://en.wikipedia.org/wiki/Semantics

> Semantics (from Ancient Greek: σημαντικός sēmantikos, "significant")[1][2] is primarily the linguistic, and also philosophical, study of meaning—in language, programming languages, formal logics, and semiotics. It focuses on __the relationship between signifiers—like words, phrases, signs, and symbols—and what they stand for, their denotation__.


https://en.wikipedia.org/wiki/Pragmatics

> Pragmatics is a subfield of linguistics and semiotics that studies the ways in which __context contributes to meaning__.

We could say that Pragmatics are links between Ideas and real World.
Here it will be seen as "__finalising Meaning__ through Concreet Actions". It simply means that we'll provide particular implementation for our atomic concepts. (see below)



[Properties of semantic transmission](http://wiki.aardrock.com/Semantic_Transmission_and_the_Emergent_Mind)

> Semantic content [...] has a value only in a particular context, and __the meaning of the message is apparent only through translation and/or interpretation.__
[...]. Before anything has meaning it has to go through a hierarchical series of translational and interpretational filters. __We cannot interpret information for which we lack the translational machinery.__



[Content and meaning](http://visual-memory.co.uk/daniel/Documents/short/trans.html#G)

> [...]It is widely assumed that meaning is contained in the 'message' rather than in its interpretation. __But there is no single, fixed meaning in any message.__ We bring varying attitudes, expectations and understandings to communicative situations. Even if the receiver sees or hears exactly the same message which the sender sent, the sense which the receiver makes of it may be quite different from the sender's intention. __The same 'message' may represent multiple meanings.__[...]


### Semantic Encapsulation & Openness

https://en.wikipedia.org/wiki/Lexicon

> __A lexicon is the vocabulary of a person, language, or branch of knowledge (such as nautical or medical).__ In linguistics, a lexicon is a language's inventory of lexemes. The word "lexicon" derives from the Greek λεξικόν (lexicon), neuter of λεξικός (lexikos) meaning "of or for words".[1]

"Internal Denotation" and "Internal Grammar" are closely linked :
- Top -> Bottom === Denotation
- Bottom -> Up === Grammar




#### Syntactic Atoms and Language Openness

> [Def](http://www.glottopedia.org/index.php/Syntactic_atom) : Syntactic atom is a term introduced in Di Sciullo & Williams (1987) to refer to the property of words that they are the indivisible building blocks of syntax. Words are atomic with respect to syntax, since syntactic rules or principles cannot make reference to their parts (see lexical integrity).

Syntactic Atoms, or here we should maybe call them Semantic Atoms, are _the minimal set of concepts useful in a Domain that is not expressed themselves with concepts of that Domain_.

Atoms are the Abstract concept in OO. Atoms need implementation (i.e. interpretation in a particular context). So they are the "gate" through which we'll provide Real World Semantic

## Sentence's Forms

### Atomic Form

### FirstLevel Form

### Abstract Syntax Tree

#### Internal AST vs Host Language AST

https://en.wikipedia.org/wiki/Abstract_syntax_tree

Highly Analysable Tree

Javascript community has, more than any other, raised (Host Language) AST to almost first class citizen. It's heavily used by so much tools now (Linter, True Script, Coffee Script, Babel and plugins, Webpack Loaders, rollup, ...) that any Junior Dev learn quickly what is it (even if he do not play directly with it).


"Internal AST" should be seen as an AST lite that focus on the important part of your program.

Host Language AST : provide you ALL the nodes of your program, which is complex and blurred by many second importance pieces of code



### Pragmatics 

Pragmatics are implementation of lexems. "Implement" means here to provide __particular behaviour for specific context__.

Babelute sentences hold only information, that need interpretation before to become useful.


#### Facade Patterns (Introducing Side Effects)

One common way to implement pragmatics is to use the ["Facade" Design Pattern](https://en.wikipedia.org/wiki/Facade_pattern).
It means here that sentences __will be apply on an object__ (it will modify its state), one lexem after the other, and so sentence itself could be seen as a Facade.

By example, with htsl-lexicon, we could use sentences to set state of DOM elements by applying directly dom-implementation-of-lexems to it.
The htsl sentence is just a simple way of setting properties and children of DOM Elements (which could look like jquery).


## Translation

Translation (or transformation) are the fundamental concept behind everything. No translation === no meaning nor actions.

## Serialization

See [babelute-uus](https://github.com/nomocas/babelute-uus) for more infos.


## Disambiguation

https://en.wikipedia.org/wiki/Word-sense_disambiguation

> In computational linguistics, word-sense disambiguation (WSD) is __an open problem__ of natural language processing and ontology. WSD is identifying which sense of a word (i.e. meaning) is used in a sentence, when the word has multiple meanings. The solution to this problem impacts other computer-related writing, such as discourse, improving relevance of search engines, anaphora resolution, coherence, inference et cetera.

Babelute allows a big step toward WSD's resolution. For 3 reasons :

- Lexicon Second Dimension : 
   - aka the fact that related lexicon reference is always stored in any lexem. 
   - So sentences that need to be recognized contains directly the missing information (i.e. how it could be "understand", literally, word by word). 
- Dry & Context Free Grammar
   - babelute sentences syntax focus on structuration (through parenthesis) in place of linearisation as in Human related languages (where lexem are placed side by side in sentence, with few punctuation). It make sentences Unambiguous in their structure.
- 4 Dimensions full disambiguation : lexicon, word, arguments, pragmas
   - In fact, to get __FULL__ meaning of a concept, we need to know its effects in the real world (which is the fondamentals of Pragmatics Philosophy from Charles Sanders Pierce). So to get the precise meaning of something we need to get 4 variables :
      - the word used (the model name)
      - its arguments (the instance parameters)
      - the lexicon (the words semantics (their internal denotation and relations - aka the models))
      - the pragmatics (the word(s) concreet effects)


And if we add the lexicon's dialects (aka the extensions or the relations between closely linked lexicons) and the translations between DSLs (aka the relations between loosly linked Domains) : we gain a full Semantic Information Model that drasticaly boost our ability to understand things through automats. 


## Denotation, Extansion, Connotation, Intention

What about the four aspects of Comprehension from Logic Science ?

- __Denotation__ : provided by internal grammar/semantic, and translations
- __Connotation__ : provided by other lexicons where word(s) exist(s) and links between them
- __Extansion__ : Similarities notion, provided by pattern matching between DSLs (Internal Denotations and/or Data Population (set of sentences), or by transitivity)
- __Intention__ : the only aspect that is not stored in the model. There is no easy way to deduce the exact intention behind a simple sentence or even behind a full text (bunch of sentences). Only an explicit text that focus on real (conscious) intention of the data provider could help. And even then, as meaning depending on receiver, there is no way to be sure that we have grab the exact intention.

## Optimal Information Model


https://en.wikipedia.org/wiki/Information_model

> An information model in software engineering is a __representation of concepts and the relationships, constraints, rules, and operations to specify data semantics for a chosen domain of discourse__. Typically it specifies relations between kinds of things, but may also include relations with individual things. __It can provide sharable, stable, and organized structure of information requirements or knowledge for the domain context.__

The Maximal Information per language is provided by :

- Lexicon (+ internal grammar/semantic)
- FirstLevel sentences (structure + Primitives Values + Disambiguation)
- Pragmatics
- Translations

Nothing could be removed or we loose informations.

To gain the Maximal Global Information, we need to add the "Meta Semantic Network", which is deduced from connections between languages (lexicons) - pragmas, translations, transitivity, ...




## World Consequences

### Maximal Shareability

#### Technology Bridge

#### Ontology Bridge, SEO and Machine Learning

Virtual World Brain


One day, soon I hope, we will have DSLs for each know domain


## Dev Consequences

### Full Real Reusability

- minimal coupling == binary coupling
- best naming : only natural business related naming.
- best expressivity
- real modularity
- non obstrusive : no input or output general constraints


### DSMM Robustness and Agility

- translation lexicons couple just two lexicons together and are the softest way of coupling.
- real parallele programming : teams could work on DSLs totally independently.
- real implications and collaboration of experts at domain's border

Agile has never been so straight forward

Changes are absorbed easily. Change always occur from top level and has always  minimal implications.

Resilience by network. Natural Shock Absorbtion.

### Testability 

### Leaky Abstraction Bis

   Open Windows

### Naming Problem



## Further Reading

https://www.martinfowler.com/articles/languageWorkbench.html

### Semantic Information : Further studies

- https://en.wikipedia.org/wiki/Pragmatic_theory_of_information
- https://plato.stanford.edu/entries/information-semantic/#1.2
- http://www.sciencedirect.com/science/article/pii/S1574119213000953
- http://www.slideshare.net/baojie_iowa/semantic-information-theory-in-20-minutes
- http://octavia.zoology.washington.edu/publications/BergstromAndRosvall09.pdf
- http://www.slideshare.net/drrubrico/semantics-meanings-of-language
- http://link.springer.com/chapter/10.1007/11568346_41

### Advanced Semantic Network studies

- http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.295.4692&rep=rep1&type=pdf
- https://bi.snu.ac.kr/~scai/Info/AI/Fusion,%20Propagation,%20and%20Structuring%20in%20Belief%20Networks.pdf
- http://philsci-archive.pitt.edu/2536/1/iimd.pdf

