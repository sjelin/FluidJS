This is a place for ideas for Fluid.js that aren't fully baked.

Simplify template syntax/remove extra markup in output
======================================================

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
4.	Disallow `attr={{val}}` syntax

## Pros

*	Template syntax would be more consistent and would look like syntax in
	other templating engines.
*	Output would be easier to look at in the web inspector.  All the extra
	markup might be confusing to people using Fluid for the first time.

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