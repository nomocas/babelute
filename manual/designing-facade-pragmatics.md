# Designing a Facade Pragmatics

So, if you've already read "designing a descriptive DSL", you should know that a __Lexicon__ encapsulate related words and their __denotations__ and that a __Pragmatics Engine__ provides implementation (real meaning) of those words.

You should also know how to construct by hand such a "pragmatics" engine (aka a simple dico of semantic atoms implementation and a way to apply the correspondance to lexems - most of the time a simple loop that match things by name).

Here we'll see that there are useful patterns and tools that could help us to construct a particular kind of pragmatics engine : the Facade Pragmatics (that you already know with the HTSL example).

__Definition : Facade Pattern__

> The Façade pattern provides an interface which shields clients from complex functionality in one or more subsystems. It is a simple pattern that may seem trivial but it is powerful and extremely useful. It is often present in systems that are built around a multi-layer architecture.

> The intent of the Façade is to provide a high-level interface (properties and methods) that makes a subsystem or toolkit easy to use for the client.

> [http://www.dofactory.com/](http://www.dofactory.com/javascript/facade-design-pattern)

> When we put up a facade, we present an outward appearance to the world which may conceal a very different reality. [...] This pattern provides a convenient higher-level interface to a larger body of code, hiding its true underlying complexity. Think of it as simplifying the API being presented to other developers, something which almost always improves usability.

> [Addy Osmani 2015](https://addyosmani.com/resources/essentialjsdesignpatterns/book/#facadepatternjavascript)

Think about jQuery by example : in fact it simply encapsulate the DSL for handling the DOM itself, which could be different from one plateform to another. jQuery hide DOM complexity behind well choosed methods (lexems), that we use by writting __sentences__ (chained calls where the order is fundamental).

No internal state, pure bridge, juste a simple api that act on something else.

Ok... now that we know this, we should observe that Descriptive Information always refer to __something__. So Describing === Talking About Something. In other words, Descriptive DSL fits naturally with Facade Patterns.

The language itself could be seen as a Facade of the reality. The important point is that the DSL itself is independent (or should be) from what we do with it. That's the true power of languages : Words and concepts provide structure and semantics that is rather independent of contextual actions that we could do with it.

When a Lexicon and a Pragmatics engine define same words (semantic atoms in most of the cases) : they could be bridged/connected together easily.




```javascript
import babelute from 'babelute';

function mapAttributes(data, fields) {
	const attr = {};
	fields.forEach(field => attr[field] = data[field]);
	return attr;
}

const jsonapiPragmatics = babelute
	.createFacadePragmatics({ jsonapi:true })
	.addPragmas(p => ({
		pageLinks(parent, model, data, query, pageInfos) {
			parent.links = {
				self: `http://foo.com/bar/..../${ pageInfos.self }`
			};
		},
		pageMeta(parent, model, data, query, pageInfos) {
			parent.meta = {
				'total-pages': pageInfos.totalPages
			};
		},
		pageData(parent, model, data, query) {
			parent.data = [];
			data.forEach(item => p(parent.data).dataItem(model, item, query)); // use initializer
		},
		dataItem(parent, model, data, query) {
			parent.push({
				id: data.id,
				type: model.name,
				attributes: mapAttributes(data, query.fields)
			});
		},
		page(parent, model, data, query, pageInfos) {
			p(parent) // use initializer
				.pageMeta(model, data, query, pageInfos)
				.pageData(model, data, query)
				.pageLinks(model, data, query, pageInfos);
		}
	}));

export default jsonapiPragmatics;
```


## Functional Facade Pragmatics

There is [three sort of functions] : Functional Mixins, ...

The Functional Mixins could be seen as a particular case of Facade Pattern.

And in fact, we could easily derivate such Functions from our Facade Pragmatics.


## Create Lexicon from FacadePragmatics

## Benchmarking

Please read [this](https://a-journey-in-javascript-performance) before.

| name | ops/sec | precision (%) | runs | coef | ns/op |
|------|---------|---------------|------|------|-------|
| vanilla:functional-splitted | 1,889,596 | 1.64 | 83 | 1.00 | 529 |
| vanilla:bystep | 1,742,525 | 0.56 | 79 | 0.92 | 574 |
| vanilla:constante | 1,502,135 | 1.72 | 85 | 0.79 | 666 |
| vanilla:immediate object | 1,430,315 | 1.56 | 82 | 0.76 | 699 |
| jsonapi FP initializer | 1,364,206 | 0.63 | 86 | 0.72 | 733 |
| jsonapi FFP page (no rebuild) | 1,241,468 | 1.49 | 86 | 0.66 | 805 |
| jsonapi Lexicon toObject (no rebuild) | 1,034,121 | 1.46 | 88 | 0.55 | 967 |
| jsonapi Lexicon toObject (with rebuild) | 786,015 | 2.73 | 87 | 0.42 | 1272 |
| jsonapi FFP piped (no rebuild) | 731,000 | 1.97 | 85 | 0.39 | 1368 |
| jsonapi FFP page (with rebuild) | 576,889 | 1.64 | 85 | 0.31 | 1733 |
| jsonapi FFP piped (with rebuild) | 285,685 | 1.60 | 83 | 0.15 | 3500 |
| jsonapi Lexicon toFunction()({}) (so rebuild) | 217,710 | 1.78 | 83 | 0.12 | 4593 |
| vanilla:functional-piped (no rebuild) | 190,164 | 3.32 | 84 | 0.10 | 5259 |
| vanilla:functional-piped (with rebuild) | 65,038 | 2.73 | 78 | 0.03 | 15376 |


### Vanilla

__Functional-Splitted__ : 

```javascript 

```

__By-step__ : 

```javascript 

```

__Constante__ : 

```javascript 

```


__Immediate-Object__ : 

```javascript 

```


__Functional-Piped__ (no rebuild) : 

```javascript 

```