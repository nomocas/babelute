# Babelute

Internal Domain Specific Language javascript framework based on Method Chaining 
and dedicated to Domain Specific (multi)Modeling (DSM).

or How to design and code as you think...
And boost your productivity as never.

Really small, simple, incredibly powerful and super fast.

(documentation in progress)

## Aim

The aim of Babelute is to provide :
- a simple "(meta) meta language" (a grammar - based on Method Chaining) and tools for Domain Specific Language definition
- tools for managing dictionaries (called lexics) of those DSL (namespaces, translations between languages, real semantics depending to specific context, etc)
- helpers for writing structured "sentences" (called "babelutes") in those DSL (always based on Method Chaining)
- ways to interpret/run sentences depending on a particular context (sentence-to-sentence or sentence-to-specific-actions)
- ways to execute Babelute sentences immediatly (and only once - classical simple Method Chaining)
- ways to execute Babelute sentences on demand (sentence's elements are kept in local array), and therefor they could be seen as multi-purpose template. (where they release all their potential)
- tools to make Babelute sentences handelable and editable
- a lightweight optimal serialised form of Babelute sentences and the associated parser/stringifier


## Fluent Interfaces as DSL

Expressing DSL with Fluent Interface is something that is well known today.
The term "Fluent Interface" comes from Martin Fowler's [2005 article](http://martinfowler.com/bliki/FluentInterface.html) where he associated clearly Internal DSL and fluency.

Fluent interfaces does not mean necessary Method Chaining. It's just one way to achieve it.
And Method Chaining doesn't mean necessary Internal DSL.

Fluent Internal DSL are much more about choosing right words with right semantics for optimaly expressing particular problems through readable and meaningful sentences. Not simply chaining calls.

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

## DSM

Model Driven approach. (Model First, automation, standard)

## Translation Chain : From High Level to Code Level

Community of Abstract and Concreet DSLs.

## DSL as "Template"

Method Chaining along with Command Design Pattern to build Facade.

RSIC vs CISC

Auto-parsing

## Template as Document

From persistence, to meta-programing, to shadow document.

### Order means everything

### Lightweight optimal serialised form

#### Introduce elenpi

#### Persitence

### Document edition and meta-programing

#### Chained DSL Facade as Document Pilot

#### GUI for all

### Document instanciation, data-binding and Shadow Document

## Todo soon

- debug and report
- open problem : meta-model and model evolution and versioning
	(maybe introduce Consumer Contract Driven logics)

## Further

- coordination problem and method
- Link with ontologies
- Inference Engine
- DSL repository
- Web exposition
- DSL-DB


# Babelute examples
```javascript
var b = require('babelute').b;

// define language "foo" with 3 words
Babelute.toLexic('family', ['myMethod', 'mySecondMethod', 'myThirdMethod']);

// you could directly write sentences with it
var myBabelute = b('foo')
	.myMethod()
	.mySecondMethod('John', true)
	.myThirdMethod(
		b('foo')
		.mySecondMethod('Biloud', false);
	);

//...

// then provides semantics for those words
Babelute.toActions('foo:bar', {
	myMethod:function(env, subject, args){
		subject.first = true;
	},
	mySecondMethod:function(env, subject, args){
		subject.second = 'Hello '+ args[0] + ' ! ' + (args[1] ? 'Greetings.' : '');
	},
	myThirdMethod:function(env, subject, args){
		subject.third = args[0]._output(env, {}); // sub-babelute usage
	}
});

//...

// then output sentence with your semantics
var output = myBabelute._output('foo:bar', {});
// => {first:true, second:'Hello John ! Greetings.', third:{ second:'Hello Biloud !' } }

```


More coming really soon.


## Licence

The [MIT](http://opensource.org/licenses/MIT) License

Copyright (c) 2016 Gilles Coomans <gilles.coomans@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
