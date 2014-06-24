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
	var model = Fluid.newModel(init);
```

Once this has been done, `model` will have the following methods:

```js
	model.get(); //Gets the current value of the model
	model.set(val); //Sets & returns the value of the model
	model.listen(fun); //Sets up fun to be called whenever the model changes
	model.alert(); //Calls all listening functions
	model.sub(prop); //Creates a submodel.  See details below
```

Clearly there are a lot of features missing here.  Because this is a very
early version of Fluid.js, and because the innovation is really all about the
way the views are rendered, this very-minimal implementation of client-side
models is being used for now.

It is worth noting that the listeners are called in the order ithey are
installed.  So if you want to add some sort of post-processing to an model,
simply add a listener directly after declaring the model.

#### Submodels

Let's say you create a model `person` for an person

```js
	var person = Fluid.newModel({name: 'Joe', age: 21});
```

But now suppose you want a model for just the person's age.  You could do so
as follows:

```js
	var age = person.sub("age");
```

`age` is now a submodel of `person`.  It has all the same methods as a
regular model, but they're all linked to the `age` attribute of `person`'s
underlying value.  So `age.get()` is the same as `person.get().age`.
Submodels work nearly the same as regular models, except for one caveat:
submodels share a set of listeners with their parent.  In some cases this
makes sense:

```js
	var person = Fluid.newModel({name: 'Joe', age: 21});
	person.listen(updatePersonDisplay);
	var age = person.sub("age");
	age.set(22);//Calls updatePersonDisplay
```

In some cases it makes less sense:

```js
	var person = Fluid.newModel({name: 'Joe', age: 21});
	var name = person.sub("name");
	name.listen(updateNameDisplay);
	var age = person.sub("age");
	age.set(22);//Calls updateNameDisplay
```

Unfortunately, as javascript doesn't support deconstructors, you can't do
much better.

#### Alternate `set`/`get` Syntax

Typing `model.get()` and `model.set(newVal)` can be annoying.  Especially if
it's really more like

```js
	models.familyName.set(models.dad.get().lastName);
```

Ugh, so ugly, right?  Luckily, we've created two sets of alternate syntax.
Use `model()` or `model.val` instead of `model.get()`, and `model(newVal)` or
`model.val = newVal` instead of `model.set(newVal)`.  So we could rewrite the
above line as:

```js
	models.familyName(models.dad().lastName);
```

or:

```js
	models.familyName.val = models.dad.val.lastName;
```

Look, it's an improvement, alright?

Note that the `.val` syntax uses `Object.defineProperty`, and therefore only
works on browsers where `Object.defineProperty` is supported on non-DOM
objects.  What's more, `val` is a non-enumerable property, meaning that it
will not show up in a `for...in` loop.

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

	The above will inject the view or collection of views in the variable
	named `viewName`.

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
		fill: /* Function */,
		addControls: /* Function */,
		updateControls: /* Function */,
		listeners: /* Object or Function */,
		noMemoize: /* boolean */
	});
```

All the properties in the above code are optional.

The `template` property is the template for the view.

The `fill` property is the function which computes the values that are used
to fill in the template.  This job includes passing the relevant information
along to child views.  Once these values are computed, they are returned in
the form of an object, where the key names in the object line up with the
variable names in the template.

The `addControls` and `updateControls` functions are in charge of attaching
all the relevant events to a view.  `addControls` is only called when the
view is initialized, `updateControls` is called on every update.

`listeners` is described in the [Features for Forms](#features-for-forms)
section.

The `noMemoize` property says that the MVC should always rerun the rendering
code, even if it seems like the view is being passed the same values twice.
This flag is particularly important if one of the arguments is an opaque
object (e.g. instance of a class with private variables), because the MVC may
not be able to detect changes in the internal state of the arguments.

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

Child views are attached to their parent during the `fill` function through
commands like the following:

```js
	ret.childView = new ViewClass([param1[, param2[, ...]]]);
```

Where `ret` is the object which `fill` will return, `childView` is the name
of the child view in the template, `ViewClass` is the class of the child
view, and `param1, param2, ...` is the information which the child view will
be based off.

To see this all in action, check out 
[the example](http://sjelin.github.io/FluidJS).

### Declaring new classes of view, details

#### `template`

By default, this is `""`

#### The `fill` function

If the view is a root view, then the parameters to the `fill` function are
the values of the models which the view is being based on.  If the view is
a child view, then the parameters to the `fill` function are the values which
were passed to it by its parent's `fill` function.

A collection of views can either be an array or an object.  By default, if a
collection is an object, the order in which the views are inserted into the
parent view is not well definied, and may even change over time as the parent
view is updated.  If you would like the order to be consistant, you can
specify the `__SORT__` property, which will sort the object's keys before
using them.  You can use any truthy value for `__SORT__`, but if you use a
function then that function will be used as the compare function for the
sort.  Otherwise, keys are sorted by each character's Unicode code point
value, according to the string conversion of the key.

If the returned object is missing a property needed to fill in the template,
then that part of the template will not be updated.  For instance, if the
template says an input box should be filled in by the `val` property, but the
`val` property is missing from the object returned by `fill`, then whatever
the user has typed into the input box will be left alone.  Note that there is
a difference between a property being set to `undefined` and the property
not being specified.

Primarily, the properties of the object returned by the `fill` function are
used directly to fill in the template.  However, there may be special
properties in the future.

By default, `fill` is set to `function() {return new Object();}`

#### The `addControls` and `updateControls` functions

The parameters of `updateControls` are:

1. `true` iff the view has already been initialized
2. The jQuery object representing representing this view
3. The first parameter to the `fill` function, if one exists
4. The second parameter to the `fill` function, if one exists
5. The third parameter to the `fill` function, if one exists
6. Etc.

`setControls` has the same parameters, except for the first one, which is
omitted (since `setControls` is only called during initialization).  Both
functions default to `function(){}`

Features for Forms
==================

Fluid.js has some special features to eliminate boilerplate code when
writing forms and transfering the data from those forms to models.

## View `listeners`

`listeners` is an optional property of `Fluid.compileView` which is used to
add a listener to an element so that whenever that element's value changes
that value is passed on along to a model.

`listeners` should be an object, with keys corresponding to selectors for
the relevant elements, and values corresponding to where to push the values
to (e.g. models).  For instance, you might see the following:

```js
	listeners: {
		"input.age": dadModels.age,
		"input.firstName": dadModels.firstName,
		"input.lastName": [dadModels.lastName, sonModels.lastName]
	}
```

As you can see, one selector can set the value of multiple models if desired.
What's more, values don't need to be pushed to models.  They can also be
pushed to functions:

```js
	listeners: {
		"input.name": function(name) {console.log(name);}
	}
```

Also, `listeners` can be a function returning an object rather than an
object directly.  In that case, the parameters to the function are the same
as they are for the `fill` function.

The default value for `listeners` is `{}`.  As a special case, the empty
string `""` is interpreted as the selector for the root of the template.

## `Fluid.defineInputType`

Allows the programmer to define new types for `<input>` tags (or create
fallback implementations for HTML5 types).  For instance, if you wanted
to define a type for inputting integers:

```js
Fluid.defineInputType("integer", {
	typeAttr: ["integer", "number"],
	validate: /^-?\d*$/
});
```

When Fluid.js was parsing a template, if it encounted an input tag with
`type="integer"`, it would do the following:

*	See if the input type `"integer"` is supported.  If not, try `"number"`.
	If that isn't supported either, default to `"text"`.
*	Add a listener to the element so that every time the value changes, it is
	checked against the regex `/^-?\d*$/`.  If it does not match the regex,
	the user's most recent change will be reverted.  So, for instance, if the 
	user the characters `1`, `2`, `3`, `.`, `4` in order, Fluid.js will be
	fine with the first three, but revert the `.`, and then allow the `4`,
	making the final result `"1234"`.  However, if the user pastes the string
	`"123.4"` from the clipboard directly into an empty input box, Fluid.js
	will revert back to the empty input box, making the result `""`.

In general, the syntax for the command is as follows:

```js
Fluid.defineInputType("type-name", {
	typeAttr: /* Array of strings */,
	validate: /* Function or RegExp or Object of the two */,
	format: /* Function or Object of Functions */,
	valChars: /* Function or RegExp or Object or the two */
});
```
All properties are optional.

`typeAttr` is a list of values to use for the tag's `type` property.  Values
to the front of the list will be tried first.  If none of the values in the
list are supported, `"text"` is used.  By default, this property is an array
containing just the `type-name`.  if `validate`, `format` and/or `valChars`
object, then that object will be used to select a validator/formater/value
character set based on which type attribute is actually used.


`validate` is used to check if an input is valid.  If it is a regex, then
the input much match that regex.  If it is a function, then that input, when
passed into the function, must cause the function to return a truthy value.
By default, this propert is `function() {return true;}`

`format` is used to format an input so that it will be displayed in a better
format.  `valChars` is used to determine which characters are actually part
of the element's value vs just used for formatting.  For instance, you might
define a fallback implementation for telephone numbers as follows:

```js
Fluid.defineInputType("tel", {
	validate: /^\d*$/,
	format: function(val, type) {
		//If browser supports "tel" type, it will handle the formatting
		if(type == "tel")
			return val;

		//We will assume that it's a US phone number
		if(!val || val.length == 0)
			return "";
		else if(val.slice(0,1) == "1") {
			return "1" +(val.length <= 1 ? "" : " ("+val.slice(1,3)+")"	+
						(val.length <= 4 ? "" : " " +val.slice(4,3)		+
						(val.length <= 7 ? "" : "-" +val.slice(7)		)));
		} else if(val.length <= 3)
			return val;
		else if(val.length <= 7)
			return val.slice(0,3)+" "+val.slice(3);
		else
			return "("+val.slice(0,3)+") "+val.slice(3,3)+"-"+val.slice(7);
	},
	valChars: /[0-9]/
});
```

What will happen here is that when the user changes the input box, and `tel`
is not supported by the browser, then Fluid.js will first strip out any
characters not matched by `valChars`, then check this stripped value against
`validate`, and then finally run `format` on the stripped value and put the
reformatted result back into the input box.

TODO
====

1.	Allow `{{}}` injections inside of strings (e.g.
`<a href="{{domain}}.com"></a>`).
2.  Allow `{{}}` text node injections at any point in the DOM (i.e. remove
the constraint that it must be the sole content of an element).  This can be
done by putting a `display: none` element before and after the text node,
then searching for the text node (using `.contents()` if it isn't a root),
and then replace the old one usings `document.createTextNode`.


Discuss
=======

[Discuss this on Hacker News](https://news.ycombinator.com/item?id=7606183)

Also feel free to contact me through any of the normal GitHub methods.

License
=======

See the LICENSE file for license rights and limitations. 
