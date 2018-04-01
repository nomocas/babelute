# Designing a DSL

To understand simply Babelute principles, the easyest way is to construct a DSL and its pragmatics together.

As Babelute is primarily aimed to handle Descriptive/Declarative DSLs, HTML language is a good candidate and is finally quite canonical in regards to Babelute philosophy :

- it's purely declarative.
- basically, it's based a few Semantic Atoms : tag, attr, class, prop, data and style.
- all other HTML object and concepts are based on those Atoms (a div is a tag, a component is a bunch of tag, ...)
- it gains from dialecting : HTML Dialects are a powerful way to construct reusable Components base.
- it needs different pragmatics : mainly dom-output, string-output, dom-diffing, two-pass-string, ...
- Atomic and FirstLevel Forms are both useful : FirstLevel will help us to "edit" and save our "html templates".
- FirstLevel Form and one-level-developement are smart and elegant way to obtain one of the fastest DOM Diffing engine avaiable.
- it will be a natural translation target for many other DSL that needs html representation.

Of course, you could find final sources and related libraries at [htsl-lexicon](https://github.com/nomocas/htsl-lexicon) (which is much more complete than this article).

## 1. Write needed sentences

As the idea of babelute, is first to encapsulate Information in sentences, lets try to write __what we want__ before all.
Here we want to be able to write sentences that could describe any pieces of HTML. 

A sentence is a chain of functions calls. Each sentence's word (called lexem) correspond to one of those calls. Call's arguments are the lexem's arguments.

One sentence = List of calls.

One Lexem = One call.

```javascript
b.this(...).is().a(...).sentence(...)
```

__Rem__ : `b` is an object, called `initializer` provided by babelute's Lexicon (the one of your DSL) which contains all DSL's lexems (functions) to start sentences with your DSL. Of course, it could be named freely.

For HTML case, we should have :
- tags (h1, section, p, ...) that could contains children (possible mix of tags and textNodes),
- textNodes that only contain a string value,
- and we should be able to assign to tags :
  - classes,
  - attributes,
  - id,
  - properties (checked, disabled, ...),
  - styles,
  - events,
  - and data-*

So, we could write things like :

```javascript
h.h1('hello world') // write a h1 tag and add text-node in h1
.section( // add section as nextSibling of h1
    h.class('my-section')  // assign class to section
    .p('some text') // add p children in section with a single textNode
);
```

Another more complete example :

```javascript
h.h1('hello world', h.id('my-title') /* assign id */)
.section(
    h.class('my-section') // assign class
    .attr('myAttr', true) // assign attribute
    .p('some text', h.style('min-height', '100px')) // assign style
    .button('action time !', 
        h.prop('disabled', true)  // assign property
        .on('click', (e) => console.log('bam !', e)) // assign event handler
    )
    .footer(h.data('myVar', true), 'this is footer') // assign data-* property
);
```

We see that tags methods (h1, section, ...) should accept multiple arguments that could be either other sentences (that could express anything) or string value (for text-nodes)

Ok, it looks like any html structure could be expressed with this.


## 2. Imagine concreet usage

How do we want to work with written sentences ?

In case of DOM output, we could want to apply sentence directly on a DOM element :

```javascript
var mySentence = h.div(...)...;
myDomEngine.applyToDom($myRootElement, mySentence);
```

Any tags will be append to `$myRootElement`, and any classes, attr, etc. will also be assigned.

In case of String output, we could directly transform sentence to string :

```javascript
var mySentence = h.div(...)...;
var myHTMLString = myStringEngine.htmlToString(mySentence);
```

When designing usage, we should try to see if sentences imagined in 1. fits all needs in 2., or if we should think about and add particular needed "syntaxes" or lexems.
So practically, we should iterate from 1. to 2. - mentally and by writting only what you __want__ (the result needed - the What of your program) - as much as needed to be sure, before any implementations, that your DSL could express __all use-cases__.

When we say "usage" we talk about outputs and practical consideration.

- Could we produce what we want ? 
- Could we do it in one-pass ? (true for DOM Engine and HTMLString engine)
- Or are we needing two-pass ? (true for Isomorphic HTMLString Engine (not explored in this paper))
- Are we needing intermediate structure to save things will interpreting sentences ? (true for Isomorphic HTMLString Engine)
- etc, etc.

Of course, generally, when designin DSL we could (its even highly recommended with Babelute) ignore all the usage that will be derivated from sentences, but we have an idea of at least one precise usage (or you trying to create a DSL with no known usage at all which is obviously stupid).

Practically, you'll see that is more a matter of expressivity of high level concepts (i.e. concepts that relate to domain itself) than a matter of output's implementation.

So focusing on domain and few known usages should drive you to correctly design DSL, that will fit normally other unpredicted usages. Of course, for certain cases, other DSL(s) should be forged for the same Domain to fit specific expressivity/design needs.


## 3. Construct lexicon

A lexicon is where we'll store our lexems (aka div, p, class, attr, ...) as "Semantic Atoms" or as "Compounds Words" with their Internal Denotation.

One DSL = One Lexicon.

Creating your first lexicon :

```javascript
import babelute  from 'babelute';
const htmlLexicon = babelute.createLexicon('html');
```

### 3.1 Isolate Semantic Atoms

___Semantic Atoms___ are the minimal set of words that allow to express any other language's words.

For HTML it's quite clear : any `div, span, p, ...` (aka tags) could be expressed by a `.tag(tagName:String, children:Array<String|Babelute>)` function. 

And `.tag()` itself could not be expressed in term of `classes, attributes, properties,...`. So `.tag(...)` is an _Atom_.

And as `.class(...)`, `.attr(...)`, `.prop(...)`, and `.on(...)` could not be expressed by each other, they are also _Atoms_.

Still `id`, `style` and `data-*`. 
As id is formally an attribute in String output, and a property in DOM output (`myDomElement.id = '...'`), it should be defined as an _Atom_.

And its the same to both style and data-* (sub-properties when DOM, attributes when String). Also _Atoms_

So we have all our base concepts that we could compose to make richer words or sentences.

Lets define this the simplest way.

```javascript
// add atoms to lexicon (no arguments constraints)
htmlLexicon.addAtoms(['tag', 'class', 'attr', 'prop', 'data', 'style', 'id', 'on']);
```

That's all we need to start. 

Lets study this gently.

__A single call__

```javascript
const mySentence = h.id('foo');
```

```javascript
{ // mySentence structure
	_lexems:[
		{ lexicon:'html', name:'id', args:['foo'] } // lexem descriptor
	]
}
```

As you see, an _Atom_ call result in adding the corresponding lexem descriptor to _lexems array, which is stored in sentence instance (produced with initializer "h").

A lexem descriptor is composed of three fields : 
- the lexicon's name (to which the lexem belongs)
- the lexem's name 
- and the lexem's arguments

Nothing more.

In fact, for each added atoms (through `.addAtoms([...])`), the lexicon has added a default function that looks like :

```javascript
lexicon.api[atomName] = function(...args) {
    return this._append(lexiconName, atomName, args);
};
```

`._append(lexiconName, lexemName, args)` is the core method to append a lexem to current sentence.

__Two followed calls__

```javascript
const mySentence = h.id('foo').attr('bar', 123);
```

```javascript
{ // mySentence structure
	_lexems:[
		{ lexicon:'html', name:'id', args:['foo'] },
		{ lexicon:'html', name:'attr', args:['bar', 123] }
	]
}
```

We have two lexems descriptors in `_lexems` array...

Nothing complex.

__A single tag call__

```javascript
const mySentence = h.tag('div', ['foo']);
```

```javascript
{ // mySentence structure
	_lexems:[
		{ lexicon:'html', name:'tag', args:['div',['foo']] } // lexem descriptor
	]
}
```

__Structured calls__

And with nested `.tag(...)` (a little bit more complex due to children sub-sentences holding) :

```javascript
// let express things like
// <div><strong>John Doe</strong> say hello</div>

const h = htmlLexicon.initializer();

const mySentence = h.tag('div', [h.tag('span', ['John Doe']), ' say hello']);
```

Not really readable... we'll do better below.


```javascript
{ // mySentence structure
	_lexems:[{  // div lexem descriptor
		lexicon:'html', 
		name:'tag', 
		args:[
			'div',  // tagName
			[ // children
				{  // child sentence
					_lexems:[{   // strong lexem descriptor
						lexicon:'html', 
						name:'tag', 
						args:[
							'strong',
							['John Doe'] // children with one textnode
						] 
					}]
				},
				' say hello'  // text node value
			]
		]
	}]
}
```
Same thing than before : a sentences is just made of a list (here an array in js) of lexems. 

In our example, the first lexem, a tag, contains a sentence in its children (second argument). And this sentence contains also lexem(s)...

### 3.2 Add Compounds Words

__Compounds Words__ are words expressed by other words (lexems) from their own language. 

For HTML case, the obvious first candidates are tags (div, section, p, ...) which could be expressed with .tag(...).

```javascript
htmlLexicon.addCompounds(() => {
	return {
		div(...children) {
			return this.tag('div', children);
		},
		span(...children) {
			return this.tag('span', children);
		},
		section(...children) {
			return this.tag('section', children);
		},
		...
	};
});
```

Of course it could be shortened by :
```javascript
htmlLexicon.addCompounds(() => {
	const methods = {};
	['div', 'span', 'section', 'p', 'footer', 'h1', 'h2', ...]
	.forEach(tagName => methods[tagName] = function(...children){
		return this.tag(tagName, children);
	});
	return methods;
});
```

We could also add common events name based on `.on(eventName:String, callback:Function)`
```javascript
htmlLexicon.addCompounds(() => {
	const methods = {};
	['click', 'focus', 'blur', 'touch', ...]
	.forEach(eventName => methods[eventName] = function(callback){
		return this.on(eventName, callback);
	});
	return methods;
});
```

Now, using a tag method gives the translated form (the atom(s) behind the compound word) :

```javascript
const mySentence = h.div('foo');
```

```javascript
{ // mySentence structure
	_lexems:[
		{ lexicon:'html', name:'tag', args:['div', ['foo']] } // lexem descriptor
	]
}
```

Or an event :

```javascript
const mySentence = h.click(e => ...);
```

```javascript
{ // mySentence structure
	_lexems:[
		{ lexicon:'html', name:'on', args:['click', function(e){ ... }] } // lexem descriptor
	]
}
```

Or our example above :

```javascript
// let express things like
// <div><strong>John Doe</strong> say hello</div>

const h = htmlLexicon.initializer();

const mySentence = h.div(h.strong('John Doe'), ' say hello');
```

Much more readable... 

But, the structure of mySentence has not change :

```javascript
{ // mySentence structure
	_lexems:[{  // div lexem descriptor
		lexicon:'html',
		name:'tag',
		args:[
			'div',  // tagName
			[ // children
				{  // child sentence
					_lexems:[{   // strong lexem descriptor
						lexicon:'html',
						name:'tag',
						args:[
							'strong',
							['John Doe'] // children with one textnode
						]
					}]
				},
				' say hello'  // text node value
			]
		]
	}]
}
```

So all together it gives :

```javascript
import babelute  from 'babelute';
const htmlLexicon = babelute.createLexicon('html');
htmlLexicon
	.addAtoms(['tag', 'class', 'attr', 'prop', 'data', 'style', 'id', 'on'])
	.addCompounds(() => {
		const methods = {};

		['div', 'span', 'section', 'p', 'footer', 'h1', 'h2', ...]
		.forEach((tagName) => methods[tagName] = function(...children){
			return this.tag(tagName, children);
		});

		['click', 'focus', 'blur', 'touch', ...]
		.forEach((eventName) => methods[eventName] = function(callback){
			return this.on(eventName, callback);
		});
		return methods;
	});
```

Usage :

```javascript
const h = htmlLexicon.initializer();
const mySentence = h.section(
	h.class('my-class')
	.h1('hello world')
	.div(h.id('my-id'), 'lorem ipsum...')
	.button('fire !', h.click(e => console.log('bouh', e)))
);
```

We have everything we need to describe any HTML fragment.

Short and neat isn't it ? 

### 3.3 Create Dialects

Now, with our Atoms and our firsts Compounds Words, we should be able to define more complex words...

A good idea is to make a Dialect for storing them.

A __Dialect__ is simply an extension (OO meaning) of a base lexicon, and so it's also a Lexicon.


```javascript
const myHTMLDialect = htmlLexicon.createDialect('my-dialect'); // extending htmlLexicon

myHTMLDialect.addCompounds(h => {
	return {
		myGreatComponent(title, content, clickHandler) {
			return this.section(
				h.class('my-great-component')
				.h1(title)
				.div(h.id('my-id'), content)
				.button('fire !', h.click(clickHandler))
			);
		},
		mySuperComponent(state, ctrl){
			return this.div(
				h.id('app')
				.header(state.headerText)
				.myGreatComponent(state.title, state.content, ctrl.clickHandler)
				.footer(state.footertext)
			);
		},
		...
	};
});

const h = myHTMLDialect.initializer();

const mySentence = h.mySuperComponent({
    headerText:'Foo bar zoo',
    title:'Hello world',
    content:'lorem ipsum',
    footerText:'bla bla'
}, {
    clickHandler: e => console.log('bouh', e)
});
```

__Remarque 1__: if we take a look at `mySentence` internal structure (remember ? a bunch of lexems descriptor stored in an _lexems array), we'll see that it's made of the complete html structure in __Atomic Form__, it means with all the .tag('...', [...]) and .class(...) etc. So everything has been "expanded" to atoms and are stored as this.

__Remarque 2__ : __Dialecting__ is really an important part of DSL Design and of __Mind processing__. Think about how we talk, how we construct Domain Related words and how we tie them together, how we are able to translate human dialects, etc. All that is __closely linked__ to the natural ways used by our brains to understand things.

__Remarque 3__ : And __Compounds Words__ (aka "components" in web world) __are a powerful way to encapsulate abstractions__, and that's true for any DSL, not only for HTML. In fact with such compound word, expressed as function, we obtain two things : __Model__ (the function itself) and __Data__ (the word instance, aka the function result with a particular set of arguments). 


## 4. Implementing Pragmatics

Until now, nothing could be done with our sentences. They just hold lexems that represent pure information and are target/context free.

To obtain __complete context/target dependent semantic__, we need to provide implementations for our DSL.

__Most of the time__, we only need to provides __Atoms__ implementation. By default, every sentence, even written with a dialect, is made of only __Atoms__.

For HTML case, we mainly need two output engines : __DOM__ and __HTMLString__. Both should simply implement known HTML atoms (tag, class, attr, id, style, data, prop and on).

### 4.1 DOM Engine

We just want to output sentence directly in DOM.

Implementation is straight-forward.

```javascript
const domEngine = {
	tag($parent, args /* tagName, children */) {
		const tag = document.createElement(args[0]),
			children = args[1];

		$parent.appendChild(tag);

		children.forEach((child) => {
			if (child && child.__babelute__) // all sentences hold a "__babelute__" bool equal to true
				this.toDOM(tag, child);
			else // any other value (string, bool, number, null, ...)
				tag.appendChild(document.createTextNode(child)); // auto escaped when added to dom.
		});
	},
	class($tag, args /* className */) {
		$tag.classList.add(args[0]);
	},
	style($tag, args /* name, value  */ ) {
		$tag.style[args[0]] = args[1];
	},
	attr($tag, args /* name, value */ ) {
		$tag.setAttribute(args[0], args[1]);
	},
	prop($tag, args /* name, value */ ) {
		$tag[args[0]] = args[1];
	},
	data($tag, args /* name, value */ ) {
		$tag.dataset[args[0]] = args[1];
	},
	id($tag, args /* value */ ) {
		$tag.id = args[0];
	},
	on($tag, args /* eventName, callback */ ) {
		$tag.addEventListener(args[0], args[1]);
	},
	toDOM(babelute, $tag) {
		babelute._lexems.forEach((lexem) => lexem.lexicon === 'html' && this[lexem.name]($tag, lexem.args));
		return $tag;
	}
};
```

Final Usage :

```javascript
const h = htmlLexicon.initializer();
const mySentence = h.section(
    h.class('my-class')
    .h1('hello world')
    .div(h.id('my-id'), 'lorem ipsum...')
    .button('fire !', h.click((e) => console.log('bouh', e)))
);

const $myTag = document.getElementById('my-tag');
domEngine.toDOM(mySentence, $myTag);
```

For convenience we could do :

```javascript
// aliases are a third kind of method that we'll see by after. 
// just use it for the moment when you want to add output related methods.
htmlLexicon.addAliases({
	// convention : when adding output related method in lexicon, add a '$' in front of its name
	$toDOM(domElement) { 
		return domEngine.toDOM(this, domElement);
	}
});

h.section(
    h.class('my-class')
    .h1('hello world')
    .div(h.id('my-id'), 'lorem ipsum...')
    .button('fire !', h.click((e) => console.log('bouh', e)))
)
.$toDOM(document.getElementById('...'));
```

__Congratulation__ !!

You have your first DSL that allow you to express any html fragment and to produce it in real DOM. And you know how make easily your own dialects with plenty of useful components.

And best of all, you've learned almost everything...

So... Was that hard ? :)

### 4.2 String Engine

Lets do the same for HTMLString output...

This one is a little bit more verbose because, as attributes (and class, prop, etc) could be mixed with children - due to sentence expressivity - we need to handle Node descriptors for constructing the whole string. And escape strings values for safe output.

Beside of that : it's also quite straight-forward.

```javascript
import toSlugCase from 'to-slug-case'; // for data-* attributes
import htmlSpecialChars from 'nomocas-utils/lib/string/html-special-chars'; // for safe string output

const openTags = /br/, // should be completed
    strictTags = /span|script|meta|div|i/;

// for tags string construction
class TagDescriptor {
	constructor() {
		this.children = '';
		this.classes = '';
		this.style = '';
		this.attributes = '';
	}
}

// TagDescriptor-to-string output
function tagOutput(parent, tag, name) {
	let out = '<' + name + tag.attributes;
	if (tag.style)
		out += ' style="' + tag.style + '"';
	if (tag.classes)
		out += ' class="' + tag.classes + '"';
	if (tag.children)
		parent.children += out + '>' + tag.children + '</' + name + '>';
	else if (openTags.test(name))
		parent.children += out + '>';
	else if (strictTags.test(name))
		parent.children += out + '></' + name + '>';
	else
		parent.children += out + '/>';
}

const stringEngine = {
	tag(parent, args /* tagName, children */) {
		const tag = new TagDescriptor(),
			children = args[1];

		children.forEach((child) => {
			if (child && child.__babelute__)
				this.toHTMLString(child, tag);
			else if (typeof child === 'string')
				tag.children += htmlSpecialChars.encode(child);
			else
				tag.children += child;
		});

		tagOutput(parent, tag, args[0]);
	},
	class(tag, args /* className */ ) {
		if (args[0] && (args.length === 1 || args[1]))
			tag.classes += ' ' + args[0];
	},
	style(tag, args /* name, value  */ ) {
		tag.style += args[0] + '=' + args[1] + ';';
	},
	prop(tag, args /* name, value */) {
		if(args[0] === true)
			tag.attributes += ' ' + args[0] + ' ';
	},
	data(tag, args) {
		const name = 'data-' + toSlugCase(args[0]),
			value = args[1],
			hasValue = typeof value !== 'undefined';
		tag.attributes += ' ' + name + (hasValue ? ('="' + value + '"') : '');
    },
    attr(tag, args /* name, value */ ) {
        const value = args[1];
		tag.attributes += ' ' + args[0] + '="' + (typeof value === 'string' ? encodeHtmlSpecialChars(value) : value) + '"';
	},
	id(tag, args /* value */ ) {
		tag.attributes = ' id="' + args[0] + '"' + tag.attributes;
	},
	toHTMLString(babelute, tag = new TagDescriptor()) {
		babelute._lexems.forEach(lexem => 
			lexem.lexicon === 'html' 
			&& this[lexem.name]
			&& this[lexem.name](tag, lexem.args)
		);
		return tag.children;
	}
};

export default stringEngine;
```

Final Usage :

```javascript
import stringEngine from 'your-html-string-pragmatics-engine';
import htmlLexicon from 'your-html-lexicon';

const h = htmlLexicon.initializer();
const mySentence = h.section(
    h.class('my-class')
    .h1('hello world')
    .div(h.id('my-id'), 'lorem ipsum...')
    .button('fire !', h.click(e => console.log('bouh', e)))
);

const htmlString = stringEngine.toHTMLString(mySentence);
```

Great ! Now we're able to output same sentences to DOM or to HTML String.

### 4.3 Dif Engine

Ok... now, as a pure DOM Engine is not so useful - what about rerendering ? - it's time to develop a DOM-Diffing algorithm.

In fact it's really simple : we just need 3 dedicated engine : Render, Dif, Remove.

And as an engine is just a bunch of functions (the Atoms implementations) stored in a simple object, it should be easy now.

See [htsl-dom-diffing-pragmatics](https://github.com/nomocas/htsl-dom-diffing-pragmatics) for real world example...
