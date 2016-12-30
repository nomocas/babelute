# Babelute.js

> "A Babelut(t)e is a sort of long toffee flavoured with honey or vergeoise (demerara sugar) from [...] Flanders, Belgium".

> __Etymology__ : "[A french word that] is likely to come from the Flemish "babbelen", speaking a lot, and "uit", finished because when you eat the toffee, you cannot speak anymore (either because you are enjoying it or because you cannot open the mouth).[...]"

> src : [wikipedia](https://en.wikipedia.org/wiki/Babelutte)


### Internal Domain Specific (Multi)Modeling js framework

> __42__ &asymp; [ lexem( lexicon, word, arguments ), ... ]

Really small, simple, incredibly powerful and super fast __Internal DSLs__ tools.

Babelute.js provides helpers to :
- define and manage Internal DSLs for __modeling__ any kind of problems
- with a simple (meta)grammar - based on Method Chaining - for writing __structured unambiguous "sentences"__ (called __babelutes__)
- and to provide ways :
	- to manage __dictionaries of related lexems__ that form DSL semantic fields (called __lexicons__)
	- to translate DSL sentences to other DSL sentences (through __dedicated bridge-DSLs__ with their own lexic(on)s)
	- to interpret sentences in many context with specific __fine grained concreet semantics__ (called __pragmatics__)


What is the final usage ?

So at usage (when you use DSLs written with Babelute) : you talk a lot ("babbelen" in Flemish), by writting structured sentences, using different DSLs to __describe__ things accuratly and generally, at higher level possible... Then maybe you "still talking" by __translating__ your sentences to more specific DSL sentences...
And then you stop talking ("babbel uit") and you simply __do concreetly__ what you've said in a particular context. (You interpret sentences through choosen __pragmatics.__)

 Describe generally, maybe translate specifically, then act concreetly as needed. That's the main idea...

```javascript
var b = Babelute.initializer('my-lexicon'),
	babelute = b.letsTalk(b.describing('things').accuratly(true)); // talk generally

var output = myInterpreter.doSomethingWith(babelute);	// then interpret concreetly as you wish
```
Alone, Babelute provides no usable DSL. Only tools necessary to handle/create sentences and to define DSLs lexics, translations between them, and output actions.

## Core Libraries

- babelute
- babelute-facade-actions
- babelute-uus

## Understanding by examples

Low Level DSLs (Developement related domains) :
- [babelute-aright](https://github.com/nomocas/babelute-aright) : Objects and types validation DSL (ultra-fast, ultra-modular)
- [babelute-html](https://github.com/nomocas/babelute-html) : HTML5 DSL and its isomorphic render-engines. (modern, __world's fastest__, React-like templating)
- [babelute-fs](https://github.com/nomocas/babelute-fs) : File System Description DSL and its runners.
- [babelute-lexic-dl](https://github.com/nomocas/babelute-doc) : Babelute Lexic Definition DSL and its generators.

High Level DSLs (Human related domains) :
- [babelute-cooking](https://github.com/nomocas/babelute-cooking) : High Level Cooking DSL demo and its bunch of transformations and DSLs targets.

# Theory part

## So What does it try to resolve

Domain Specific Modeling
- [[1]](https://metacase.com/webinar/Domain_Specific_Modeling_76_cases_of_MDD_that_works_Nov2009.pdf) DSM : 76 cases of MDD That works
- [[2]](http://s3.amazonaws.com/academia.edu.documents/42473462/Domain_specific_modeling20160209-12929-16vmdfi.pdf?AWSAccessKeyId=AKIAJ56TQJRTWSMTNPEA&Expires=1481808605&Signature=33JXUlf1xs9BZBWjiDjGo3XTJ7I%3D&response-content-disposition=inline%3B%20filename%3DDomain_specific_modeling.pdf) Domain specific modeling (Robert France, Bernhard Rumpe, 2005)
- [[4]](http://www.dsmforum.org/why.html) DSM Forum

Domain Specific MultiModeling

> Domain-specific multimodeling[1] is a software development paradigm where each view is made explicit as a separate domain-specific language (DSL).
src : [wikipedia](https://en.wikipedia.org/wiki/Domain-specific_multimodeling)

- [[1]](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.453.9934&rep=rep1&type=pdf) Hessellund, Anders (2009). "Domain-Specific Multimodeling". IT University of Copenhagen, Denmark. 2009.


DSM is true, practical MDD that rocks. Yeah... Finally ! ;)

MDD is where (Meta)Models are the only first class citizens and where everything else is transformations and could be thrown and replaced at any time.

Classical MDD is broadly based on UML (Meta)Modeling and propriatary transformations tool boxes.
The main idea is to maintain and focus on the business (Meta)Models through years and to provide automated transformation pipes (from UML to code) to produce runable and testable Apps (any sort of...) that will evolve and die much faster than (Meta)Models.

Great idea ! But... Until now, it hasn't produce all promised benefits (precise and complete UML modeling is quite heavy and make things less clear than needed (too generic), and transformations rules are hard to maintain or to closely coupled with monolithics propriatary environnement). So for the moment it's clearly far more  expensive than good Agile approach...

With DSM, Models and instances are not seen as UML nor Object any more. Models are DSLs and instances are sentences (even graphical) of those DSLs.
DSMM says that we could express any DSL by another one __when we need to precise things in a particular context__.

Babelute tries to provide tools for defining meta-models (DSLs definitions) and transformations/translations between them with simple Method Chaining pattern.

Which kind of things could be modeled ? __Everything that could be describe with words__ and __simple parameters__ (i.e. where an __Internal DSL__ could be found).

By example, describing a mouvement accuratly with only words is highly difficult and in many case impossible, and so Internal DSL based on words lexics __only__ seems not to be the best (or complete) solution. (we would need coordinate system and mathematics objects to do it)

But the "logic" behind the movement could be expressed with words that could be mixed with coordinate system or any other DSL (algebra is a DSL by example). 
```javascript
var m = Babelute.initializer('myMovementLexic');

m.moveTo(12, 30, m.duration(200).bounce(3))
.delay(300)
.oscillateHorizontally(20 /* pix left and right */, 150 /* ms for each cycle */)
.cinematic('3x - 2 = y');
```

Or in [UUS](https://github.com/nomocas/babelute-uus) style :

```
#myMovementLexic:
	moveTo(12, 30, duration(200) bounce(3))
	delay(300)
	oscillateHorizontally(20 /* pix left and right */, 150 /* ms for each cycle */)
	cinematic("3x - 2 = y")
```

What is sure, there will never be a lexical Internal DSL for expressing RegExp by example.

## Creating Lexics

### Logical Atoms 

Reduction principle

### Shortcut

### Compounds words

RIS vs CIS

### Extending lexics

### Atomic-Babelute vs First-Degree-Babelute

## Implementing Actions

## Advice for creating DSL

- write sentences (what you finally want) before all
- be descriptive
- be DRY
- be pure
- maximize holded informations
- think transformability

## Fluent Interfaces as DSL

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

Further reading :
- http://leecampbell.blogspot.be/2008/11/method-chaining-to-create-your-dsl.html
- https://sanaulla.info/2013/05/30/creating-internal-dsls-in-java-java-8-adopting-martin-fowlers-approach
- https://msdn.microsoft.com/en-us/magazine/ee291514.aspx
- https://books.google.be/books?id=EhOXBQAAQBAJ&pg=PA403&lpg=PA403&dq=method+chaining+DSL&source=bl&ots=vMd25Y86E1&sig=d7SbHZoiLA8X1g4nsoo5Ph5kHTA&hl=fr&sa=X&ved=0ahUKEwiR_-32usvOAhUSahoKHTk2C9Y4ChDoAQgwMAM#v=onepage&q=method%20chaining%20DSL&f=false

## Translation Chain : From High Level to Code Level

Community of Abstract and Concreet DSLs.

Auto-parsing

## Todo soon

- debug and report
- open problem : meta-model and model evolution and versioning
	(maybe introduce Consumer Contract Driven logics)

## Further

- coordination problem and method


# Babelute examples

Rem : don't try to appreciate the usefulness of the "family" DSL. It's just a dummy example.
```javascript
var Babelute = require('babelute');

// Define a lexic called "family" with 7 words
Babelute.toLexic('family', ['me', 'brother', 'sister', 'parent', 'man', 'women', 'age']);

var f = Babelute.initializer('family');

// You could directly write sentences with it
var myFamily = f
	.me('Bob', f.man().age(30))
	.parent('dad', f.man().age(52))
	.parent('mum', f.woman().age(50))
	.brother('John', f.age(28))
	.sister('Eva', f.age(25));

// That's it : your family is defined and could be used in many cases.

//...

// Then provides semantics for those words.
// by example what to do when transforming family sentences to object.
Babelute.toActions('family:object', {
	me:function(subject, args, env){
		subject.me = args[1].$output(env, {	name:args[0] });
	},
	parent:function(subject, args, env){
		subject.parents = subject.parents || [];
		subject.parents.push(args[1].$output(env, { name:args[0] }));
	},
	brother:function(subject, args, env){
		subject.brothers = subject.brothers || [];
		subject.brothers.push(args[1].$output(env, { name:args[0], gender:'man' }));
	},
	sister:function(subject, args, env){
		subject.sisters = subject.sisters || [];
		subject.sisters.push(args[1].$output(env, { name:args[0], gender:'woman' }));
	},
	man:function(subject, args){
		subject.gender = 'man';
	},
	woman:function(subject, args){
		subject.gender  = 'woman';
	},
	age:function(subject, args){
		subject.age  = args[0];
	}
});

//...

// then get output from sentence with your concreet semantic
var output = myFamily.$output('family:object', {});
// => 

```

More coming really soon.

## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
