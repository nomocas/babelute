# Practically

To understand simply Babelute principle, the easyest way is to construct a DSL and its pragmatics together.

As Babelute is primarily aimed to handle Descriptive/Declarative DSLs, HTML language is a good candidate and is finally quite canonical in regards to Babelute philosophy :

- it's purely declarative
- basically, it's based a few Semantic Atoms : tag, attr, class, prop, data and style
- all other HTML object and concepts are based in those Atoms (a div is a tag, a component is a bunch of tag, ...)
- it gains from dialecting : HTML Dialects are a powerful way to construct reusable Components base.
- it needs different pragmatics : mainly pure dom-output and pure string-output (but more is possible)
- Atomic and FirstLevel Forms are both useful : FirstLevel will help us to "edit" and save our "html templates"
- FirstLevel Form and one-level-developement are smart and elegant way to obtain one of the fastest DOM Diffing engine avaiable
- it will be a natural translation target for many other DSL that needs html representation.

## 1. Write needed sentences

As the idea of babelute, is first to encapsulate Information in sentences, lets try to write __what we want__ before all.
Here we want to be able to write sentences that could describe any pieces of HTML. 

A sentence is a chain of calls. Each sentence's word (called lexem) correspond to one of those calls. Call's arguments are the lexem's arguments.

```javascript
b.this(...).is().a(...).sentence(...)
```
__Rem__ : `b` is an object, called `initializer` provided by babelute's Lexicon (the one of your DSL) which contains all DSL's lexems (functions) to start sentences with your DSL. Of course, it could be named freely.

```javascript
h.h1('hello world')
.section(
	h.class('my-section')
	.p('some text')
);
```

## 2. Imagine usage

How do we want to work with them :

In case of DOM output, we could apply sentence directly on a DOM element :
```javascript
var mySentence = h.div(...)...;
myDomEngine.applyToDom(mySentence, $myRootElement);
```

In case of String output, we could directly transform sentence to string :
```javascript
var mySentence = h.div(...)...;
var myHTMLString = myStringEngine.htmlToString(mySentence);
```

When designing usage, we should try to see if sentences imagined in 1. fits all needs in 2., or if we should think about particular needed "syntaxes" or lexems.
So practically, we should iterate from 1. to 2. - mentally - as much as needed to be sure, before any implementations, that your DSL could express all needed use cases.

Of course, generally, when designin DSL we could (its even highly recommended with Babelute) ignore all the usage that will be derivated from sentences, but we have an idea of at least one precise usage (or you trying to create a DSL with no known usage at all which is obviously stupid).

Practically, you'll see that is more a matter of expressivity of high level concepts (i.e. concepts that relate to language's domain itself) than a matter of output's implementation.

So focusing on domain and few known usage(s) should drive you to correctly design DSL, that will fit normally any unpredicted usage.

Domain Languages are forged though years of community work and are the best thing we have to tackle Domain's problems and usages.
It's their essence.

## 3. Construct lexicon

```javascript
import babelute from 'babelute';

// a lexicon is where we'll store our lexems as Semantic Atoms
// or as "Compounds Words" with their Internal Denotation
var lexicon = babelute.createLexicon('html');
```
### 3.1 Isolate Semantic Atoms

Then we need to isolate Semantic Atoms 

### 3.2 Add Compounds Words


### 3.3 Create Dialects

## 4. Atomic Concept

## 5. Implement Pragmatics

### 5.1 DOM Engine
### 5.2 String Engine


## 6. First Level Concept

## 7. Translation Targets

