# DSLs Translations


So, you've read [designing a descriptive DSL]() and [designing a Facade Pragmatics](), and you know the difference between Information and Implementation.

You should be able to write descriptive sentences that hold pure information, and to interpret them with different implementation engines.

And you should be able to write directly active sentences for immediate actions.


Descriptive Sentences ---- interpreted later by ----> Different Implementation Engines

Active Sentences ---- immediatly applied through ----> One Implementation Engine


So we have Information -----> Actions

It's time to open doors...

What if we want to obtain Information from Information.


Information ----> Information ---...---> Actions

DSL1 (Domain1)	----> DSL2 (Domain2)  ------> Actions

Sentence(DSL1) ----> Sentence(DSL2) -----> Actions

[Lexem(DSL1)...]  -----> [Lexems(DSL2)...]  ------> Actions



## Sentences free transformations

sentence ---> sentence

```javascript
const lexicon = babelute.createLexicon('mydsl');

...

const i = lexicon.initializer();
const sentence = i.foo(...).bar().zoo(...);

const newSetence = sentence._transform(sentence => {
	// do something with sentence and return another sentence
});
```

## Simple Lexems Mapping

lexem ---> lexem

```javascript
const lexicon = babelute.createLexicon('mydsl');

...

const i = lexicon.initializer();
const sentence = i.foo(...).bar().zoo(...);

const newSetence = sentence._mapLexems(lexem => {
	// do something with lexem and return a new lexem
});
```

## Lexems Mapping through Dialects 

lexem ---> lexems[...]

The simplest way of doing this, which works in many cases, is to provide a map that simply associate each source lexem to its targets lexems.

lexem(myLexicon, foo, [true]) -----> sentence( lexem(myTargetLexicon, bar, [...]) lexem(myTargetLexicon, zoo, [...]) ... )

For this : we'll simply introduce a third lexicon which is a __Dialect__ of the target lexicon :

Lexems(DSL1) -----> Lexems(DSL1/DSL2) ----> Lexems(DSL2) ---> Actions 


```javascript
const myLexicon = babelute.createLexicon('mylexicon');

...

const i = myLexicon.initializer();

const mySentence = i.bla().bla(...).foo(...);

const myTranslatedSentence = mySentence._translateLexems({
	mylexicon: myTargetLexicon
});
```


