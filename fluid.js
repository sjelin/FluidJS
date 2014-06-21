//Header copied from jQuery
(function(global, factory) {

	if ((typeof module == "object") && (typeof module.exports == "object")) {
		// For CommonJS and CommonJS-like environments where a proper window
		// is present execute the factory and get Fluid
		// For environments that do not inherently posses a window with a
		// document (such as Node.js), expose a Fluid-making factory as
		// module.exports
		// This accentuates the need for the creation of a real window
		// e.g. var Fluid = require("./fluid.js")(window);
		module.exports =
			global.jQuery ? factory(global.jQuery) :
			global.document ? factory(require("jquery")) : (function() {
				var jQueryFactory = require("jquery");
				return function(window) {
					return factory(window.jQuery || jQueryFactory(window));
				};
			})();
	} else {
		global.Fluid = factory(jQuery);
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ? window : this, function($) {
	"use strict";

	var fluid = {};

/*****************\
 *    Helpers    *
\*****************/

	//Credit to MDN
	var isArray = Array.isArray || function(x) {
		return Object.prototype.toString.call(x) === '[object Array]';
	};

	var jqFind = function($el, sel) {
		return sel == "" ? $el : $el.filter(sel).add($el.find(sel));
	}

/**********************\
 *     Fluid.model     *
\**********************/

	//See README.md for spec
	function model_get() {return this()};
	function model_set(x) {return this(x)};
	function addValSyntax(model) {
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
	fluid.newModel = function(val) {
		var listeners = [];
		var ret = function() {
			if(arguments.length > 0) {
				val = arguments[0];
				ret.alert();
			}
			return val;
		}
		ret.listen = listeners.push.bind(listeners);
		ret.alert = function() {
			for(var i = 0; i < listeners.length; i++)
				listeners[i]();
		}
		ret.get = model_get;
		ret.set = model_set;
		ret.sub = model_sub;
		addValSyntax(ret);
		return ret;
	};

/**********************\
 *  Fluid.compileView  *
\**********************/

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
 *	calc() -	The function passed when the view class was declared
 *	addControls() - The function passed when the view class was declared  
 *	updateControls() - The function passed when the view class was declared  
 *	noMemoize -	A flag saying that the render code for this view should
 *				always be rerun, even if the arguments to the view look from
 *				the outside like they are the same as last time.  Note that
 *				this flag may be turned on  automatically during runtime by
 *				the MVC if the MVC decides it would be more efficient.
 *
 *	getFreshJQ -	Generates a jQuery object based on the template ready to
 *					be updated based on the results of calc()
 *	valCommands  -	map ("varname" -> ["idAttr"])
 *	attrCommands -	map ("varname" -> "idAttr" -> "attrToSet")
 *	textCommands -	map ("varname" -> ["idAttr"])
 *	viewCommands -	map ("viewname" -> "id")
 *
 *	listeners -	The function or object passed at declaration
 *	listenTrgts -	Map from selectors to places where the data needs to be
 *					pushed.  Either the same as listeners or the result of
 *					calling listeners
 *	watch(sel) -	Watches an element for changes in its value, pushing the
 *					new value to whatever listeners says
 *	prevValues -	Values of elements the last time they were checked.  Used
 *					so that a value will only be pushed if it is different
 *					from the last value pushed.  Map from selectors to values
 *
 *	state -	The array which was last used as arguments for the calc()
 *			function.  Or, if the calc function hasn't been called yet, the
 *			array of arguments passed into the constructor.
 *	vals -	The last result of the calc() function, undefined if calc()
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
 *		2.	Run calc()
 *		3.	Use the result of the calc function to update this.$el
 *		4.	Call addControls() and updateControls() with the correct params
 */
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

		var newVals = this.calc.apply(this, this.state);

		var inited = this.vals != null;
		if(!inited) {
			this.$el = this.getFreshJQ();
			this.vals = {};
		}

		//Set values using calc()
		for(var vname in this.valCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			var cmds = this.valCommands[vname];
			for(var i = 0; i < cmds.length; i++) {
				var $elem = jqFind(this.$el, "["+cmds[i]+"]");
				if($elem.val() != val)
					$elem.val(val);
			}
		}

		//Set attributes using the result of calc()
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

		//Set the text of some elements using the result of calc()
		for(var vname in this.textCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val) {
				var idAttrs = this.textCommands[vname];
				for(var i = 0; i < idAttrs.length; i++)
					jqFind(this.$el, "["+idAttrs[i]+"]").text(val);
			}
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
		//Update child views using the result of calc()
		for(var vname in this.viewCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var view = newVals[vname];
			var oldView = this.vals[vname];
			var $elem = jqFind(this.$el, "#"+this.viewCommands[vname]);

			if(isArray(view)) {
				if(inited) {
					//Turn oldView into an array containing just old elements
					//which should be kept & updated.  Remove all else
					if(isArray(oldView)) {
						var numToKeep = Math.min(view.length,oldView.length);
						for(var i = 0; i < numToKeep; i++)
							if(oldView[i].typeHash != view[i].typeHash)
								numToKeep = i+1;
						while(oldView.length > numToKeep) {
							oldView[oldView.length-1].$el.remove();
							oldView.length--;
						}
					} else {
						if(oldView instanceof AbstractView)
							oldView.$el.remove();
						else if(oldView instanceof Object)
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
					} else if(oldView instanceof Object)
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
						oldView[i].$el.remove();
						oldView = {};
					} else if(oldView instanceof Object)
						for(var k in oldView)
							if(!(view[k] instanceof AbstractView) &&
									(view[k].typeHash!=oldView[k].typeHash)){
								oldView[k].$el.remove();
								oldView[k] = undefined;
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
			}
		}

		this.vals = newVals;

		//Make sure all the listen stuff is up to date
		this.listenTrgts =	this.listeners instanceof Function ?
							this.listeners() : this.listeners;
		for(var sel in this.listenTrgts)
			this.watch(sel);

		//Control code
		if(!inited)
			this.addControls.apply(this, [this.$el].concat(this.state));
		this.updateControls.apply(this,[inited,this.$el].concat(this.state));

		//Self monitoring!
		var updateTime = new Date().getTime() - updateStart;
		this.updateTime = ((this.updateTime || updateTime)*4+updateTime)/5;
	}
	AbstractView.prototype.watch = function(sel)
	{
		if(!this.prevValues.hasOwnProperty(sel)) {
			var $elem = jqFind(this.$el, sel);
			var view = this;
			view.prevValues[sel] = $elem.val();
			var hear = function() {
				var val = $elem.val();
				if(val != view.prevValues[sel]) {
					var trgt = view.listenTrgts[sel] || [];
					if(!isArray(trgt))
						trgt = [trgt];
					for(var i = 0; i < trgt.length; i++)
						trgt[i](val);
				}
			}
			$elem.keypress(hear);
			$elem.keydown(hear);
			$elem.keyup(hear);
			$elem.change(hear);
		}
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
	//See README.md and the giant comment a little ways back
	fluid.compileView = function(props) {
		props = props || {};
		function View() {
			this.state = Array.prototype.slice.call(arguments, 0);
		}
		View.prototype = new AbstractView();
		View.prototype.calc = props.calc || function(){return new Object();};
		View.prototype.addControls = props.addControls || function(){};
		View.prototype.updateControls = props.updateControls || function(){};
		View.prototype.listeners = props.listeners || {};
		View.prototype.noMemoize = !!props.noMemoize;
		View.prototype.typeHash = rndStr();
		View.prototype.prevValues = {};
		
		//Modify Template
		View.prototype.valCommands = {};
		View.prototype.attrCommands = {};
		View.prototype.textCommands = {};
		View.prototype.viewCommands = {};
		props.template = props.template || "";
		
		props.template =
			//Value Commands
			props.template.replace(/value={{\s*\w+\s*}}/g, function(match) {
				var vname = match.substr(8, match.length-10).trim();
				if(View.prototype.valCommands[vname] == null)
					View.prototype.valCommands[vname] = [];
				View.prototype.valCommands[vname].push(rndStr());
			//Attribute Commands
			}).replace(/[^\s]+={{\s*\w+\s*}}/g, function(match) {
				var i = match.indexOf("=");
				var aname = match.substr(0, i);
				var vname = match.substr(i+3, match.length-i-5).trim();
				var idAttr = rndStr();
				if(View.prototype.attrCommands[vname] == null)
					View.prototype.attrCommands[vname] = {};
				View.prototype.attrCommands[vname][idAttr] = aname;
				return idAttr;
			//Text Commands
			}).replace(/>\s*{{\s*\w+\s*}}\s*</g, function(match) {
				var vname = match.substr(1, match.length-2).trim();
				vname = vname.substr(2, vname.length-4).trim();
				var idAttr = rndStr();
				if(View.prototype.textCommands[vname] == null)
					View.prototype.textCommands[vname] = [];
				View.prototype.textCommands[vname].push(idAttr);
				return " "+idAttr+"><";
			//View Commands
			}).replace(/\[\[\s*\w+\s*\]\]/g, function(match) {
				var vname = match.substr(2, match.length-4).trim();
				var id = rndStr();
				View.prototype.viewCommands[vname] = id;
				return "<span id='"+id+"' style='display: none'></span>";
			});
		View.prototype.getFreshJQ = function() {return $(props.template);};

		return View;
	};

/*********************\
 *  Fluid.attachView  *
\*********************/

	fluid.attachView = function($elem, ViewClass) {
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

	return fluid;
}));
