This is a place for ideas for Fluid.js that aren't fully baked.

Simplify template syntax/remove extra markup in output
======================================================

-----------------------------------------------------------------------------
| NOTE: This whole section needs to be rethought in light of the fact that	|
| `$el.before()` only changes the parents of `$el`, and even then only if	|
| `$el` (the variable) was the result of querying the parent's children.	|
| Thus `$el.before()` is problematic if `$el` is the result of a `filter`	|
| command rather than a `find` command.										|
-----------------------------------------------------------------------------

This could be done as follows:

1.	Remove anchor at the end of child views.  This can be done by simply
	using existing child views as anchors.  Initially you'd need some kind
	of anchor of course, but after initialization it shouldn't be necessary.
	In the case that these are no child nodes (e.g. an empty array of child
	nodes), you could use direct siblings as anchors.  If there are no
	siblings, use the parent.  If there are no parents *and* no siblings,
	then the view *must* be something like `"[[children]]"`, which should
	*never* happen because it's *clearly* useless.  But even so, in this
	bizzar edge case we can use fall back on using a
	`<span style='display: none'></span>` anchor.  It will probably never
	even be seen so it shouldn't be a problem
2.	Combind the `{{}}` syntax for injecting text nodes and the `[[]]` syntax
	for injecting views.  This isn't too complicated to implement given the
	previous step, since injected text nodes could be used as anchors just
	like child views.
3.	Strip out identifying attributes during initialization.  This can be done
	by caching the relavant results.
4.	Allow the following types of commands for setting attributes:

	1.	`{{name}}="val"`
	2.	`{{name}}={{val}}`
	3.	`{{name}}`
	4.	`{{nameAndVal}}`
	5.	`{{twoAttrsInOneVar}}`
	6.	`hello_{{world}}`

	The one rule restricting these is that they must be contiguous with
	respect to white space. Note that the last one could be something like 
	`{{attrAndStartOfVal}}endOfVal"`
5.	Depreciate `attr={{val}}` and `[[]]` syntax

## Pros

*	Template syntax would be more consistent and would look/behave like
	syntax in other templating engines.
*	`{{}}` would have a universal meaning of "this gets filled in"
*	You could switch from injecting a piece of text to injecting something
	like an image without having to change the template at all.
*	Output would be easier to look at in the web inspector.  Currently all
	the extra markup might be confusing to people using Fluid for the first
	time.

## Cons

*	It would be tricky to write
*	It would be slower to run, particularly during initialization
*	We'd have to limit the ways in which extensions can markup a template
	for identification.  We'd also have to provide an alternate way of
	retrieving attributes which have been stripped out.
*	No one smart enough to write an HTML template would be unable to figure
	out `[[]]` syntax.
*	Extra markup in the web inspector would probably only briefly be
	confusing.
*	It doesn't change *anything* user-facing
