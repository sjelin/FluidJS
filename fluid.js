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

	var fluid = {};

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

/***************************\
 *  Fluid.defineInputType  *
\***************************/
	//NOTE: the real work is done in the view code

	var customTypes = {}
	var ctHashAttr = "__fluid__custom_type_hash";

	function type_unformat(x) {
		return ((x || "") + "").split("").filter(function(x) {
			return !this.formatChars(x)}.bind(this)).join("");
	}
	function type_reformat(x) {
		return this.format(this.unformat(x));
	}
	fluid.defineInputType = function(typeName, props) {
		props = props || {};
		var typeAttr = undefined;
		var typeAttrs = props.typeAttr || typeName;
		if(!isArray(typeAttrs))
			typeAttrs = [typeAttrs];
		var $i = $("<input>");
		for(var i = 0; !typeAttr && (i < typeAttrs.length); i++)
			/* instanbul ignore else */
			if($i.attr("type", typeAttrs[i]).prop("type") == typeAttrs[i])
				typeAttr = typeAttrs[i];
		/* istanbul ignore if */
		if(!typeAttr)
			typeAttr = "text";

		for(var i = 0; i < 3; i++) {
			var k = ["validate", "format", "formatChars"][i];
			if((typeof props[k] == "object")&&!(props[k] instanceof RegExp))
				props[k] = props[k][typeAttr]
		}
		var formatChars=props.formatChars instanceof RegExp ?
							props.formatChars.test.bind(props.formatChars) :
						props.formatChars instanceof Function ?
							props.formatChars : function() {return false;};
		return customTypes[typeName] = { //Return for testing reasons
			attr: typeAttr,
			validate:	props.validate instanceof RegExp ?
							props.validate.test.bind(props.validate) :
						props.validate instanceof Function ? props.validate:
						function() {return true;},
			format:		props.format instanceof Function ? props.format :
						function(x) {return x;},
			formatChars:formatChars,
			unformat:	type_unformat,
			reformat:	type_reformat
		};
	};

	//TODO remove ignore when jsdom fixes get pushed
	/* istanbul ignore next */
	function setCursorPos($elem, start, end, ctHash)
	{
		if(		($elem[0] instanceof window.HTMLInputElement) ||
				($elem[0] instanceof window.HTMLTextAreaElement)) try {
			if(arguments.length == 2)
				end = start;
			start = Math.min(start, end = Math.min(end, $elem.val().length));
			/* istanbul ignore else */
			if(elem.setSelectionRange)
				elem.setSelectionRange(start, end);
			else {
				//IE<=8
				var rng = elem.createTextRange();
				rng.collapse(true);
				rng.moveStart('character', start);
				rng.moveEnd('character', end);
				rng.select()
			}
			if(ctHash)
				view.ctCursorPos[ctHash] = {s: start, e: end};
		} catch(ex) {}
	}

	//TODO remove ignore when jsdom fixes get pushed
	/* istanbul ignore next */
	function getTextSel($elem) {
		var elem = $elem[0];
		if(		(elem instanceof window.HTMLInputElement) ||
				(elem instanceof window.HTMLTextAreaElement)) try {
			/* istanbul ignore else */
			if(elem.setSelectionRange)
				return {s: elem.selectionStart, e: elem.selectionEnd};
			else {
				//IE<=8
				var sel = document.selection.createRange();
				var selLen = sel.text.length;
				sel.moveStart('character', -elem.value.length);
				var end = sel.text.length;
				return {s: end-selLen, e: end};
			}
		} catch(ex) {}
		return {s: 0, e: 0};
	}

	function ctLogCursor(view, hash, $elem) {
		if($elem.is(":focus"))
			view.ctCursorPos[hash] = getTextSel($elem);
	}

	//TODO remove ignore when jsdom fixes get pushed
	/* istanbul ignore next */
	function transIndex(formatChars, index, src, dest) {
		var valCharsToPass = 0;
		var i;
		for(i = 0; i < index; i++)
			if(!formatChars(src[i]))
				valCharsToPass++;
		for(i = 0; (i < dest.length) && (valCharsToPass > 0); i++)
			if(!formatChars(dest[i]))
				valCharsToPass--;
		while((i < dest.length) && formatChars(dest[i]))
			i++;
		return i;
	}

	function needsReformat(curr, frmt, cursor, formatChars) {
		while((cursor > 0) && formatChars(curr[cursor-1]))
			cursor--;
		if(curr.slice(0, cursor) != frmt.slice(0, cursor))
			return true;
		curr = curr.slice(cursor);
		while((curr.length > 0) && formatChars(curr[0]))
			curr = curr.slice(1);
		frmt = frmt.slice(cursor);
		while((frmt.length > 0) && formatChars(frmt[0]))
			frmt = frmt.slice(1);
		return curr != frmt;
	}

	function ctKeyListener(view, hash, $elem) {
		var curr = $elem.val();
		var prev = view.prevValues[hash];
		if(curr != prev) {
			var type = view.ctMap[hash];
			var val = type.unformat(curr);
			if(!type.validate(val)) {
				//Revert
				$elem.val(prev);
				//TODO remove ignore when jsdom fixes get pushed
				/* istanbul ignore if */
				if($elem.is(":focus"))
					setCursorPos($elem,	view.ctCursorPos[hash].s,
										view.ctCursorPos[hash].e);
			} else {
				if(type.unformat(prev) != val) {
					//Call listeners
					var listeners = view.ctListeners[hash];
					for(var i = 0; i < listeners.length; i++)
						listeners[i](val);
				}
				var fVal = type.format(val);
				if(needsReformat($elem.val(), fVal, $elem.is(":focus") ?
						getTextSel($elem).s : $elem.val().length,
						type.formatChars)) {
					//Reformat
					var newTextSel = undefined;
					if($elem.is(":focus")) {
						var sel = getTextSel($elem);
						newTextSel = {
							s: transIndex(type.formatChars,sel.s,curr,fVal),
							e: transIndex(type.formatChars,sel.e,curr,fVal)};
					}
					$elem.val(fVal);
					if(newTextSel != undefined)
						setCursorPos($elem, newTextSel.s, newTextSel.e);
				}
				view.prevValues[hash] = $elem.val();
			}
		}
		ctLogCursor(view, hash, $elem);
	};

/***********************\
 *  Fluid.compileView  *
\***********************/

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
 *	getFreshJQ -	Generates a jQuery object based on the template ready to
 *					be updated based on the results of fill()
 *	valCommands  -	map ("varname" -> ["idAttr"])
 *	attrCommands -	map ("varname" -> "idAttr" -> "attrToSet")
 *	textCommands -	map ("varname" -> ["idAttr"])
 *	viewCommands -	map ("viewname" -> "id")
 *	cmplxAttrCmds -	map ("idAttr" -> cmdObj)
 *						cmdObj has the following properties:
 *							attr: The attribute to set
 *							format:	A description of what to put in the
 *									attribute.  Array of strings.  Even
 *									indexed elements are raw strings, and odd
 *									indexed ones are variable names
 *
 *	ctMap	- A map from hashes to custom type objects
 *	ctListeners	- A map from hashes to functions listening to the element
 *	ctCursorPos - A map from hashes to cursor positions
 *
 *	listeners -	The function or object passed at declaration
 *	listenTrgts -	Map from selectors to places where the data needs to be
 *					pushed.  Either the same as listeners or the result of
 *					calling listeners
 *	prevValues -	Values of elements the last time they were checked.
 *					Formatted, rather than stripped, values are used.  Used
 *					so that a value will only be pushed if it is different
 *					from the last value pushed.
 *					Map from selectors or custom type hashes to values.
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

		var newVals = this.fill.apply(this, this.state);

		//Init
		var inited = this.vals != null;
		if(!inited) {
			this.$el = this.getFreshJQ();
			this.vals = {};
			this.prevValues = {};
			this.ctListeners = {};
			this.ctCursorPos = {};
			for(var hash in this.ctMap) {
				var $elem = jqFind(this.$el, '['+ctHashAttr+'="'+hash+'"]');
				this.prevValues[hash] = $elem.val();
				this.ctListeners[hash] = [];
			}
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

		//Set the text of some elements using the result of fill()
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
						oldView.$el.remove();
						oldView = {};
					} else if(oldView instanceof Object) {
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
			}
		}

		this.vals = newVals;

		//Make sure all the listen stuff is up to date
		this.listenTrgts =	this.listeners instanceof Function ?
								this.listeners.apply(this, this.state) :
								this.listeners;
		for(var sel in this.listenTrgts)
			watch(this, sel);

		//Control code
		if(!inited)
			this.addControls.apply(this, [this.$el].concat(this.state));
		this.updateControls.apply(this,[inited,this.$el].concat(this.state));

		//Self monitoring!
		var updateTime = new Date().getTime() - updateStart;
		this.updateTime = ((this.updateTime || updateTime)*4+updateTime)/5;
	}
	function isCheckable($elem) {
		var inType = ((($elem[0].tagName.toUpperCase() == "INPUT") &&
						$elem.attr("type")) || "").toUpperCase();
		return (inType == "CHECKBOX") || (inType == "RADIO");
	}
	function getValue($elem) {
		return isCheckable($elem) ? $elem[0].checked : $elem.val();
	}
	function setVal(view, $elem, val)
	{
		if(isCheckable($elem))
			$elem[0].checked = val;
		else {
			var ctHash = $elem.attr(ctHashAttr);
			if(ctHash)
				val = view.ctMap[ctHash].reformat(val);
			if($elem.val() != val) {
				$elem.val(val);
				if($elem.is(":focus"))
					setCursorPos($elem, val.length, ctHash);
			}
		}
	}
	function watch(view, sel)
	{
		function send(val) {
			var trgt = view.listenTrgts[sel] || [];
			if(!isArray(trgt))
				trgt = [trgt];
			for(var i = 0; i < trgt.length; i++)
				trgt[i](val);
		}
		if(!view.prevValues.hasOwnProperty(sel)) {
			var $elem = jqFind(view.$el, sel);
			if($elem.is("["+ctHashAttr+"]")) {
				view.prevValues[sel] = undefined;	//We just want to stop
													//more listeners
				view.ctListeners[$elem.attr(ctHashAttr)].push(send);
			} else {
				view.prevValues[sel] = getValue($elem);
				var hear = function() {
					var val = getValue($elem);
					if(val != view.prevValues[sel])
						send(view.prevValues[sel] = val);
				}
				$elem.keypress(hear);
				$elem.keydown(hear);
				$elem.keyup(hear);
				$elem.change(hear);
			}
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
		View.prototype.fill = props.fill || function(){return new Object();};
		View.prototype.addControls = props.addControls || function(){};
		View.prototype.updateControls = props.updateControls || function(){};
		View.prototype.listeners = props.listeners || {};
		View.prototype.noMemoize = !!props.noMemoize;
		View.prototype.typeHash = rndStr();
		
		//Modify Template
		View.prototype.valCommands = {};
		View.prototype.attrCommands = {};
		View.prototype.textCommands = {};
		View.prototype.cmplxAttrCmds = {};
		View.prototype.viewCommands = {};
		View.prototype.ctMap = {};
		var template = props.template || "";

		template =
			//Value Commands
			template.replace(/[^\s]+=['"]{{\s*\w+\s*}}['"]/g,function(match){
				var i = match.lastIndexOf('"{{');
				if(i == -1)
					i = match.lastIndexOf("'{{");
				return match.slice(0,i) + match.slice(i+1, -1);
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
			//Text Commands
			}).replace(/>\s*{{\s*\w+\s*}}\s*</g, function(match) {
				var vname = match.slice(1, -1).trim().slice(2, -2).trim();
				var idAttr = rndStr();
				if(View.prototype.textCommands[vname] == null)
					View.prototype.textCommands[vname] = [];
				View.prototype.textCommands[vname].push(idAttr);
				return " "+idAttr+"><";
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
			//View Commands
			}).replace(/\[\[\s*\w+\s*\]\]/g, function(match) {
				var vname = match.slice(2, -2).trim();
				var id = rndStr();
				View.prototype.viewCommands[vname] = id;
				return "<span id='"+id+"' style='display: none'></span>";
			//Type Commands
			}).replace(/type=["']\s*\w*\s*["']/g, function(match) {
				var typeStr = match.slice(6, -1).trim();
				if(customTypes[typeStr]) {
					var type = customTypes[typeStr];
					var hash = rndStr();
					View.prototype.ctMap[hash] = type;
					var q = match.slice(-1);
					return ctHashAttr+"="+q+hash+q+" type="+q+type.attr+q;
				} else
					return match;
			});
		View.prototype.getFreshJQ = function() {
			var $view = $(template);
			for(var hash in this.ctMap) {
				var $el = jqFind($view, "["+ctHashAttr+"='"+hash+"']");
				$el.val(this.ctMap[hash].reformat($el.val()));
				var keyListener = ctKeyListener.bind(null,this,hash,$el);
				var clickListener = ctLogCursor.bind(null,this,hash,$el);
				$el.keypress(keyListener);
				$el.keydown(keyListener);
				$el.keyup(keyListener);
				$el.change(keyListener);
				$el.click(clickListener);
				$el.mouseup(clickListener);
				$el.mousedown(clickListener);
				$el.focus(clickListener);
			}
			return $view;
		};

		return View;
	};

/**********************\
 *  Fluid.attachView  *
\**********************/

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
