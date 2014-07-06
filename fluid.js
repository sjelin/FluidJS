//Header copied from jQuery
(function(global, factory) {

	/* istanbul ignore else */
	if ((typeof module == "object") && (typeof module.exports == "object")) {
		// For CommonJS and CommonJS-like environments where a proper window
		// is present execute the factory and get Fluid
		// For environments that do not inherently posses a window with a
		// document (such as Node.js), expose a Fluid-making factory as
		// module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var Fluid = require("./fluid.js")(window);
		module.exports =
			global.document ? /* istanbul ignore next */
					factory(global, global.jQuery || require("jquery")) :
			(function() {
				var jQueryFactory = require("jquery");
				return function(window) {
					return factory(window,
									window.jQuery || jQueryFactory(window));
				};
			})();
	} else {
		global.Fluid = factory(global, jQuery);
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ?
		/* istanbul ignore next */ window : this, function(window, $) {
	"use strict";

	var Fluid = {};
	var DEBUG = true;

/*****************\
 *    Helpers    *
\*****************/

	//Credit to MDN
	var isArray = Array.isArray || /* istanbul ignore next */ function(x) {
		return Object.prototype.toString.call(x) === '[object Array]';
	};

	function jqFind($el, sel) {
		return sel == "" ? $el : $el.filter(sel).add($el.find(sel));
	}

	//Generate a random string beginning with an "_".  Collisions should
	//never happen
	function rndStr() {
		//We only use six digits of Math.random().toString(36) because
		//Math.random() is based off of random 32-bit integers in some
		//implementations (e.g. V8)
		return "_" +	Math.random().toString(36).substr(2,6) +
						Math.random().toString(36).substr(2,6);
	}

	function isCheckable($elem) {
		var inType = ((($elem[0].tagName.toUpperCase() == "INPUT") &&
						$elem.attr("type")) || "").toUpperCase();
		return (inType == "CHECKBOX") || (inType == "RADIO");
	}

/****************\
 *  Fluid.utils *
\****************/

	Fluid.utils = {};
	Fluid.utils.rndAttrName = rndStr;
	Fluid.utils.isCheckable = isCheckable;

/***********************\
 *  Fluid.extendViews  *
\***********************/

	var extFuns = {};

	function wrapExtFunctions(funs, prefix) {
		var hash = rndStr();
		function wrap(fun) {
			return function() {return fun.apply(this[hash], arguments)};
		}
		for(var name in funs)
			funs[prefix+"_"+name] = wrap(funs[name]);
		return hash;
	}

	function addExtFunctions(funs) {
		for(var name in funs) {
			if(extFuns[name] == null)
				extFuns[name] = [];
			extFuns[name].push(funs[name]);
		}
	}

	Fluid.extendViews = function(funs) {
		var hash = wrapExtFunctions(funs, "view");
		funs.view_initPrototype = function() {
			this[hash] = function() {};
		};
		funs.view_initInstance = function() {
			var view = this;
			this[hash] = new this[hash]();
			this[hash].getState = function() {return view.state};
			this[hash].find = function(sel) {return jqFind(view.$el, sel);};
		};
		addExtFunctions(funs);
	}

	Fluid.extendModels = function(funs) {
		var hash = wrapExtFunctions(funs, "model");
		funs.model_initInstance = function() {
			this[hash] = {};
		};
		addExtFunctions(funs);
	}

	function callExtFun() {
		var thisObj = arguments[0];
		var name;
		var returns;
		var args;
		if(typeof arguments[1] == "string") {
			returns = false;
			name = arguments[1];
			args = Array.prototype.slice.call(arguments, 2);
		} else {
			returns = arguments[1];
			name = arguments[2];
			args = Array.prototype.slice.call(arguments, 3);
		}
		var funs = extFuns[name] || [];
		for(var i = 0; i < funs.length; i++) {
			var ret = funs[i].apply(thisObj, args);
			if(returns)
				args[0] = ret;
		}
		return args[0];
	}
	function callExtFunWithArgsArray() {
		var a = Array.prototype.slice.call(arguments, 0, arguments.length-1);
		a.push.apply(a, arguments[arguments.length-1])
		return callExtFun.apply({}, a);
	}

/***********************\
 *     Fluid.model     *
\***********************/

	//See README.md for spec
	function model_get() {return this()};
	function model_set(x) {return this(x)};
	function addValSyntax(model) {
		/* istanbul ignore else */
		if(Object.defineProperty) try {
			Object.defineProperty(model,"val",{get:model_get,set:model.set});
		} catch(ex){}
	}
	function model_sub(prop) {
		var sup = this;
		var ret = function() {
			if(arguments.length > 0) {
				sup()[prop] = arguments[0];
				sup.alert();
				return arguments[0];
			} else
				return sup()[prop];
		}
		$.extend(ret, sup);
		addValSyntax(ret);
		return ret;
	}
	Fluid.newModel = function(val) {
		//Make model
		var ret = function() {
			if(arguments.length > 0) {
				val = arguments[0];
				ret.alert();
			}
			return val;
		}

		//Set Up Extensions
		callExtFun(ret, "model_initInstance");
		val = callExtFunWithArgsArray(ret, true, "model_compile", arguments);

		//Listeners
		var listeners = [];
		ret.listen = listeners.push.bind(listeners);
		ret.alert = function() {
			for(var i = 0; i < listeners.length; i++)
				listeners[i]();
			callExtFun(ret, "model_alert", ret);
		}

		//Other Commands
		ret.get = model_get;
		ret.set = model_set;
		ret.sub = model_sub;
		addValSyntax(ret);

		//More Extensions!
		callExtFun(ret, "model_init", ret);
		return ret;
	};

/************************\
 *  Internal View Code	*
\************************/

/****************************************************************************
 *	HOW VIEWS WORK
 ****************************************************************************
 *
 *	When Fluid.compileView() is called, the template parameter is heavily
 *	modified.  In elements where attributes or text are marked to be filled
 *	in by the MVC, the {{}} commands are removed and the element is given
 *	a special attribute with a unique random name (something like
 *	"_egcer5ghz88h0k9") so that it can quickly be found by jQuery later.  In
 *	places where child views are to be injected, a hidden <span> tag is added
 *	in their place, with a unique random id (similar format) so that it can
 *	be found by jQuery later.
 *
 *	Later, when the view is being updated/initialized, these special
 *	attributes are used to locate which elements need to be updated in which
 *	ways, and these special <span> tags are used to point to where the child
 *	views should be placed.
 *
 ****************************************************************************
 *
 *	View instances have the following properties & methods:
 *
 *	typeHash - A random, unique string
 *
 *	fill() -	The function passed when the view class was declared
 *	addControls() - The function passed when the view class was declared  
 *	updateControls() - The function passed when the view class was declared  
 *	noMemoize -	A flag saying that the render code for this view should
 *				always be rerun, even if the arguments to the view look from
 *				the outside like they are the same as last time.  Note that
 *				this flag may be turned on  automatically during runtime by
 *				the MVC if the MVC decides it would be more efficient.
 *
 *	template -	A string representation of a blank template, ready to be 
 *				filled in by the result of fill()
 *	valCommands  -	map ("varname" -> ["idAttr"])
 *	attrCommands -	map ("varname" -> "idAttr" -> "attrToSet")
 *	textCommands -	map ("idAttr" -> "varname")
 *	viewCommands -	map ("viewname" -> "id")
 *	cmplxAttrCmds -	map ("idAttr" -> cmdObj)
 *						cmdObj has the following properties:
 *							attr: The attribute to set
 *							format:	A description of what to put in the
 *									attribute.  Array of strings.  Even
 *									indexed elements are raw strings, and odd
 *									indexed ones are variable names
 *	textNodes - map ("varname" -> [textNode])
 *				This is set during initialization, not at compile time
 *
 *	state -	The array which was last used as arguments for the fill()
 *			function.  Or, if the fill function hasn't been called yet, the
 *			array of arguments passed into the constructor.
 *	vals -	The last result of the fill() function, undefined if fill()
 *			hasn't been called yet
 *
 *	oldStateHash -	A hash (in some sense) of the state the last time the
 *					update() funtion was run.  undefined if the update()
 *					function has not yet been run or noMemoize is set
 *	memoTime -	A measure of the amount of time it takes to see if the update
 *				should be skiped due to memoization
 *	updateTime -	A measure of the amount of time it takes to run the
 *					update code.  Does not count time saved or lost because
 *					of memoization, nor time spent updating child views
 *	$el -	The jQuery object which is the markup for the view.  Is undefined
 *			until update is called for the first time.
 *	update([view]) - Does the following:
 *		1.	If the view parameter was specified, this.state = view.state
 *		2.	Unless the noMemoize flag is set, if the current state was used
 *			in the last update() call, skip the remaining steps
 *		2.	Run fill()
 *		3.	Use the result of the fill function to update this.$el
 *		4.	Call addControls() and updateControls() with the correct params
 *
 ***************************************************************************/

	function AbstractView() {}
	AbstractView.prototype.update = function(view)
	{
		this.state = (view || {}).state || this.state;
		if(!this.noMemoize && ((this.memoTime||0)<=(this.updateTime||0)/2)) {
			var memoStart = new Date().getTime();
			var stateHash = JSON.stringify(this.state);
			var skip = stateHash == this.oldStateHash;
			var memoTime = new Date().getTime() - memoStart;
			this.memoTime = ((this.memoTime || memoTime)*4+memoTime)/5;
			if(skip)
				return;
			else
				this.oldStateHash = stateHash;
		} else
			this.oldStateHash = undefined;

		var updateStart = new Date().getTime();

		var newVals = this.fill.apply(this, this.state);

		//Init
		var inited = this.vals != null;
		if(!inited) {
			this.$el = $(this.template);
			this.vals = {};
			var textNodes = this.textNodes = {};
			//Credit to http://stackoverflow.com/questions/298750/how-do-i-select-text-nodes-with-jquery
			var hashToVName = this.textCommands;
			var findTextNodes = function(node) {
				if(node.nodeType == window.Node.TEXT_NODE) {
					var vname = hashToVName[node.nodeValue];
					if(vname !== undefined)
						(textNodes[vname] = textNodes[vname]||[]).push(node);
				} else
					for(var i = 0, len = node.childNodes.length; i<len; i++)
						findTextNodes(node.childNodes[i]);
			}
			for(var i = 0; i < this.$el.length; i++)
				findTextNodes(this.$el[i]);
			callExtFun(this, "view_initInstance");
			callExtFun(this, "view_init");
		}

		//Set values using fill()
		for(var vname in this.valCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			var cmds = this.valCommands[vname];
			for(var i = 0; i < cmds.length; i++)
				setVal(this, jqFind(this.$el, "["+cmds[i]+"]"), val);
		}

		//Set attributes using the result of fill()
		for(var vname in this.attrCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val)
				for(var idAttr in this.attrCommands[vname]) {
					var $elem = jqFind(this.$el, "["+idAttr+"]"); 
					$elem.attr(this.attrCommands[vname][idAttr], val);
				}
		}

		//Set more complex attributes using the result of fill()
		for(var idAttr in this.cmplxAttrCmds) {
			var cmd = this.cmplxAttrCmds[idAttr];
			var val = "";
			for(var i = 0; (val != undefined) && i < cmd.format.length; i++)
				if(i%2 == 0)
					val += cmd.format[i];
				else if(newVals.hasOwnProperty(cmd.format[i]))
					val += newVals[cmd.format[i]];
				else
					val = undefined;
			if(val == undefined)
				continue;
			var $elem = jqFind(this.$el, "["+idAttr+"]");
			if(cmd.attr.toUpperCase() == "VALUE")
				setVal(this, $elem, val);
			else
				$elem.attr(cmd.attr, val);
		}

		//Set the text of some elements using the result of fill()
		for(var vname in this.textNodes) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val)
				for(var i = 0, ns = this.textNodes[vname]; i<ns.length; i++)
					ns[i].nodeValue = val;
		}

		//Update a child view, but don't count that time towards updateTime
		function updateView(view, viewInfo) {
			updateStart -= new Date().getTime();
			if(arguments.length == 1)
				view.update();
			else
				view.update(viewInfo);
			updateStart += new Date().getTime();
		}
		//Update child views using the result of fill()
		for(var vname in this.viewCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var view = newVals[vname];
			var oldView = this.vals[vname];
			var $elem = jqFind(this.$el, "#"+this.viewCommands[vname]);

			if(isArray(view)) {
				/* istanbul ignore else */
				if(DEBUG) {
					for(var i = 0; i < view.length; i++)
						this.assertIsView(view[i], vname+"["+i+"]");
				}
				if(inited) {
					//Turn oldView into an array containing just old elements
					//which should be kept & updated.  Remove all else
					if(isArray(oldView)) {
						var numToKeep = Math.min(view.length,oldView.length);
						for(var i = 0; i < numToKeep; i++)
							if(oldView[i].typeHash != view[i].typeHash)
								numToKeep = i;
						while(oldView.length > numToKeep) {
							oldView[oldView.length-1].$el.remove();
							oldView.length--;
						}
					} else {
						if(oldView instanceof AbstractView)
							oldView.$el.remove();
						else //Must be an object
							for(var key in oldView)
								if(oldView[key] instanceof AbstractView)
									oldView[key].$el.remove(); 
						oldView = [];
					}
				} else
					oldView = [];
				//Update old stuff and inject new stuff
				for(var i = 0; i < oldView.length; i++) {
					updateView(oldView[i], view[i]);
					view[i] = oldView[i];
				}
				for(var i = oldView.length; i < view.length; i++) {
					updateView(view[i]);
					$elem.before(view[i].$el);
				}
			} else if(view instanceof AbstractView) {
				var insertFresh = true;
				if(inited) {
					//Remove or update old content
					if(isArray(oldView)) {
						for(var i = 0; i < oldView.length; i++)
							oldView[i].$el.remove();
					} else if(oldView instanceof AbstractView) {
						if(oldView.typeHash != view.typeHash)
							oldView.$el.remove();
						else {
							insertFresh = false;
							updateView(oldView, view);
							newVals[vname] = oldView;
						}
					} else // Must be an object
						for(var key in oldView)
							if(oldView[key] instanceof AbstractView)
								oldView[key].$el.remove(); 
				}
				if(insertFresh) {
					//Insert new content (old content was removed)
					updateView(view);
					$elem.before(view.$el);
				}
			} else if(view instanceof Object) {
				if(inited) {
					if(isArray(oldView)) {
						for(var i = 0; i < oldView.length; i++)
							oldView[i].$el.remove();
						oldView = {};
					} else if(oldView instanceof AbstractView) {
						oldView.$el.remove();
						oldView = {};
					} else { // Must be an object
						for(var k in oldView)
							if(!(oldView[k] instanceof AbstractView))
								oldView[k] = undefined;
							else if(!(view[k] instanceof AbstractView) ||
									(view[k].typeHash!=oldView[k].typeHash)){
								oldView[k].$el.remove();
								oldView[k] = undefined;
							}
					}
				} else
					oldView = {};
				var keys = [];
				for(var key in view)
					if(view[key] instanceof AbstractView)
						keys.push(key);
				if(view.__SORT__) {
					if(view.__SORT__ instanceof Function)
						keys.sort(view.__SORT__);
					else
						keys.sort();
				}
				for(var i = keys.length-1; i >= 0; i--) {
					var key = keys[i];
					if(oldView[key] == undefined) {
						updateView(view[key]);
						(i+1 == keys.length ? $elem : view[keys[i+1]].$el
							).before(view[key].$el);
					} else {
						updateView(oldView[key], view[key]);
						view[key] = oldView[key];
					}
				}
			} else /* istanbul ignore else */ if(DEBUG)
				this.throwNotView(view, vname);
		}

		this.vals = newVals;

		//Control code
		callExtFun(this, "view_control");
		if(!inited)
			this.addControls.apply(this, [this.$el].concat(this.state));
		this.updateControls.apply(this,[inited,this.$el].concat(this.state));

		//Self monitoring!
		var updateTime = new Date().getTime() - updateStart;
		this.updateTime = ((this.updateTime || updateTime)*4+updateTime)/5;
	}
	function setVal(view, $elem, val)
	{
		if(isCheckable($elem))
			$elem[0].checked = val;
		else {
			val = callExtFun(view, true, "view_preprocessValue", val, $elem);
			if($elem.val() != val) {
				$elem.val(val);
				callExtFun(view, "view_postValueProcessing", val, $elem);
			}
		}
	}
	AbstractView.prototype.assertIsView = function(view, vname) {
		if(!(view instanceof AbstractView))
			this.throwNotView(view, vname);
	}
	AbstractView.prototype.throwNotView = function(view, vname) {
		throw new Error("fill() returned "+vname+"="+JSON.stringify(view)+
						" as a view\n\n"+
						"Calling view's compiled template is:\n\t"+
						this.template.split("\n").join("\n\t") +
						"\nNote that compiled templates don't look exactly "+
						"like the views original template");
	}

/***********************\
 *  Fluid.compileView  *
\***********************/

	function getEmptyObj() {
		return new Object();
	};

	//See README.md and the giant comment a little ways back
	Fluid.compileView = function(props) {
		function View() {
			this.state = Array.prototype.slice.call(arguments, 0);
		};
		View.prototype = new AbstractView();

		//Sanitize arguments
		arguments.length = arguments.length || 1;
		arguments[0] = props = props || {};

		//Set up prototype for extentions
		callExtFun(View.prototype, "view_initPrototype");
		var protoProtos = {};
		for(var key in View.prototype)
			protoProtos[key] = View.prototype[key].prototype;
		callExtFunWithArgsArray(protoProtos, "view_compile", arguments);

		//Load properties
		View.prototype.fill = props.fill || getEmptyObj;
		View.prototype.addControls = props.addControls || $.noop;
		View.prototype.updateControls = props.updateControls || $.noop
		View.prototype.noMemoize = !!props.noMemoize;
		View.prototype.typeHash = rndStr();

		//Modify Template
		View.prototype.valCommands = {};
		View.prototype.attrCommands = {};
		View.prototype.textCommands = {};
		View.prototype.cmplxAttrCmds = {};
		View.prototype.viewCommands = {};

		View.prototype.template =
			//Extension Commands
			callExtFun(protoProtos, true, "view_modifyTemplate",
														props.template || ""
			//Rewrite simple commands written in a complex way
			).replace(/[^\s]+=['"]{{\s*\w+\s*}}['"]/g, function(match) {
				var i = match.lastIndexOf('"{{');
				if(i == -1)
					i = match.lastIndexOf("'{{");
				return match.slice(0,i) + match.slice(i+1, -1);
			//Value Commands
			}).replace(/value={{\s*\w+\s*}}/g, function(match) {
				var vname = match.slice(8,-2).trim();
				var idAttr = rndStr();
				if(View.prototype.valCommands[vname] == null)
					View.prototype.valCommands[vname] = [];
				View.prototype.valCommands[vname].push(idAttr);
				return idAttr;
			//Attribute Commands
			}).replace(/[^\s]+={{\s*\w+\s*}}/g, function(match) {
				var i = match.lastIndexOf("=");
				var aname = match.slice(0, i);
				var vname = match.slice(i+3, -2).trim();
				var idAttr = rndStr();
				if(View.prototype.attrCommands[vname] == null)
					View.prototype.attrCommands[vname] = {};
				View.prototype.attrCommands[vname][idAttr] = aname;
				return idAttr;
			//Complex Attribute Commands
			}).replace(/[^\s]+=(?:"[^"]*?{{\s*\w+\s*}}(?:[^"]*?[^\\])?"|'[^']*?{{\s*\w+\s*}}(?:[^']*?[^\\])?')/g, function(match) {
				var i = match.indexOf("=");
				var attr = match.substr(0, i);
				var q = match.substr(i+1, 1);
				var	format=match.slice(i+2, -1).split(/{{|}}/);
				for(i = 0; i < format.length; i+=2)
					format[i] = eval(q+format[i]+q);
				var id = rndStr();
				View.prototype.cmplxAttrCmds[id] = {attr:attr,format:format};
				return id;
			//Text Commands
			}).replace(/{{\s*\w+\s*}}/g, function(match) {
				var vname = match.slice(2, -2).trim();
				var idAttr = rndStr();
				View.prototype.textCommands[idAttr] = vname;
				return	"<span style='display: none'></span>" +
							idAttr +
						"<span style='display: none'></span>";
			//View Commands
			}).replace(/\[\[\s*\w+\s*\]\]/g, function(match) {
				var vname = match.slice(2, -2).trim();
				var id = rndStr();
				View.prototype.viewCommands[vname] = id;
				return "<span id='"+id+"' style='display: none'></span>";
			});

		return View;
	};

/**********************\
 *  Fluid.attachView  *
\**********************/

	Fluid.attachView = function($elem, ViewClass) {
		var models = Array.prototype.slice.call(arguments, 2);

		//We need to be able to call the ViewClass constructor with an array
		//for an argument list.  This is going to be a bit hack-y
		function ViewInstance() {
			var mVals = [];
			for(var i = 0; i < models.length; i++)
				mVals.push(models[i].get());
			ViewClass.apply(this, mVals);
		}
		ViewInstance.prototype = ViewClass.prototype;

		//Make the actual view
		var view = new ViewInstance();
		view.update();

		//Update code
		function updateView() {view.update(new ViewInstance());}
		for(var i = 0; i < models.length; i++)
			models[i].listen(updateView);

		//Attach to the DOM
		$elem.replaceWith(view.$el);
	}

	return Fluid;
}));
