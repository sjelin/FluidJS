Fluid.js
========

Fluid.js is a new Model View Controller (MVC) designed to make it easier for
webapps to have smooth transitions and animations.

This is only a very early version of the MVC, intended primarily as a proof
of concept.

### Why?

The animations and smooth transitions of native apps are one of the major
factors that give them their fun, playful feel.  Webapps, in contrast,
generally lack animations and have jarring, instantaneous transitions.  This
is a major reason why webapps, even ones which are well designed and look
beautiful in screen shots, still feel clunky and low-tech when you actually
use them.

This is totally unacceptable.  The WebKit team introduced CSS transitions
[7 years ago](https://www.webkit.org/blog/138/css-animation/).  More complex
animations using `keyframes` date back five years.  These CSS features are
actually perfectly designed to give webapps the missing dynamic feel of a
native app.  Yet, these features are barely used.  The reason has to do with
the way that most of our webapps are rendered.

Generally, when our models change, the MVC will discard all the stale content
from the DOM, and replace it with fresh content.  While this certainly works,
and is easy to think about from a programing POV, it also makes transitions
incredibly difficult.  This is because the browser cannot smooth out the
transition from old content to new when the old content is simply being
replaced.  Instead, for these CSS features to be truly effective, the old DOM
content needs to be updated instead of replaced.

The goal of this project is to build an MVC that works by updating content
instead of replacing it, but is still just as easy to work with as an MVC
which creates the content from scratch each time.

Example
=======

Fluid.js is unfortunately very opaque about how it works.  You just kind of
have to trust that the APIs do what they say and not worry about "how."  This
is unfortunately necessary in order to hide the complexity of updating DOM
elements instead of recreating them.

Because of this complexity, we suggest that you look at
[our example](http://sjelin.github.io/FluidJS) regularly when reading this
document.

Models
======

Models in Fluid.js are very minimal.  A new model is declared as follows:
```js
	var model = new Fluid.model(init);
```

Once this has been done, `model` will have the following methods:

```js
	model.get(); //Gets the current value of the model
	model.set(val); //Sets & returns the value of the model
	model.listen(fun); //Sets up fun to be called whenever the model changes
	model.alert(); //Calls all listening functions
```

Clearly there are a lot of features missing here.  Because this is a very
early version of Fluid.js, and because the innovation is really all about the
way the views are rendered, this very-minimal implementation of client-side
models is being used for now.

Templating
==========

Fluid.js is tightly coupled to a templating engine.  The reason for this is
that more so than other MVCs Fluid.js needs to really understand how a
template works so that in can update the produced dynamically instead of
having to re-run the template from scratch.  Additionally, the templating
language for Fluid.js needs to be able to express concepts like child views
instead of just raw HTML injections.  Finally, Fuild.js needs to have
explicit and limited syntax in its templating language so that content can be
quickly understood and updated.

In that vain, there are three ways to inject values/views in Fluid.js'
templating language:

1.	`<tag attr={{varName}}>`

	The above will link the attribute `attr` with the variable `varName`

2.	`<tag>{{varName}}</tag>`

	The above will link the inner text of a tag with the variable `varName`.
	Not that this command cannot be used to set HTML content.  It sets text.
	What's more, it is not possible to use this command to set the text
	inside a tag and also have other content inside the tag.  If you are
	using this command, this injection must be the sole contents of the tag.

3.	`[[viewName]]`

	The above will inject the view or array of views in the variable named
	`viewName`

WARNING:  Some browsers have weird ways of parsing tags like `<body>`

### Example

Main Template:

```html
	[[header]]
	<ul class="id-cards">
		[[idCards]]
	</ul>
```

Header Template:

```html
	<h1>ID Card List</h1>
```

ID Card Template:

```html
	<li class="id-card" style={{style}}>
		<span class="name">{{name}}</span>
		<span class="dob">{{dob}}</span>
	</li>
```

Views
=====

### Declaring new classes of views, an overview

New classes of views are declared as follows:

```js
	var ViewClass = Fluid.compileView({
		template: /* String */,
		calc: /* Function */,
		setControls: /* Function */
	});
```

The `template` property is the template for the view.

The `calc` property is the function which computes the values that are used
to fill in the template.  This job includes passing the relevant information
along to child views.  Once these values are computed, they are returned in
the form of an object, where the key names in the object line up with the
variable names in the template.

The `setControls` function is in charge of attaching all the relevant events
to a view.

### Root Views vs Child Views

There are two types of views: *Root Views* and *Child Views*.

*Root Views* are not the child of any other view.  They are attached directly
to the DOM, and are rendered according to information coming directly from
models.  *Child Views* on the other hand, have a parent view.  They are
linked to the DOM only through their parent view, and are rendered based
solely on the information that their parents provide them.  Thus, information
percolates from the models, to the root views, through the child views, down
to the leaf views (views with no children).

Root views are attached to the DOM/models as follows:

```js
	Fluid.attachView($elem, ViewClass[, model1[, model2[, ...]]])
```

Where `$elem` is an object which will be replaced by the root view,
`ViewClass` is the class of the root view, and `model1, model2, ...` are the
models which the root view will be based off of.

Child views are attached to their parent during the `calc` function through
commands like the following:

```js
	ret.childView = new ViewClass([param1[, param2[, ...]]]);
```

Where `ret` is the object which `calc` will return, `childView` is the name
of the child view in the template, `ViewClass` is the class of the child
view, and `param1, param2, ...` is the information which the child view will
be based off.

To see this all in action, check out 
[the example](http://sjelin.github.io/FluidJS).

### Declaring new classes of view, details

#### `template`

By default, this is `""`

#### The `calc` function

If the view is a root view, then the parameters to the `calc` function are
the values of the models which the view is being based on.  If the view is
a child view, then the parameters to the `calc` function are the values which
were passed to it by its parent's `calc` function.

Primarily, the properties of the object returned by the `calc` function are
used directly to fill in the template.  However, there may be special
properties in the future.

By default, `calc` is set to `function() {return new Object();}`

#### The `setControls` function

The parameters of `setControls` are:

1. `true` iff this function is being called for the first time this instance
2. The jQuery object representing representing this view
3. The first parameter to the `calc` function, if one exists
4. The second parameter to the `calc` function, if one exists
5. The third parameter to the `calc` function, if one exists
6. Etc.

By default, `setControls` is set to `function(){}`

Discuss
=======

Discuss this MVC on Hacker News:
[link coming soon]()

Also feel free to contact me through any of the normal GitHub methods.

License
=======

See the LICENSE file for license rights and limitations. 
