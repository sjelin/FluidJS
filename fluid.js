var Fluid = (function($) {
	"use strict";
	var fluid = {};


/**********************\
 *    Compatibility    *
\**********************/

	//Credit to MDN
	var isArray = Array.isArray || function(x) {
		return Object.prototype.toString.call(x) === '[object Array]';
	};

/**********************\
 *     Fluid.model     *
\**********************/

	//See README.md for spec
	fluid.model = function(init) {
		this.val = init;
		this.listeners = [];
	};
	fluid.model.prototype.get = function() {return this.val;};
	fluid.model.prototype.set = function(val) {
		this.val = val;
		this.alert();
		return val;
	};
	fluid.model.prototype.listen = function(fun) {this.listeners.push(fun);};
	fluid.model.prototype.alert = function() {
		for(var i = 0; i < this.listeners.length; i++)
			this.listeners[i]();
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
 *	setControls() - The function passed when the view class was declared  
 *	noMemoize -	A flag saying that the render code for this view should
 *				always be rerun, even if the arguments to the view look from
 *				the outside like they are the same as last time.  Note that
 *				this flag may be turned on  automatically during runtime by
 *				the MVC if the MVC decides it would be more efficient.
 *
 *	getFreshJQ -	Generates a jQuery object based on the template ready to
 *					be updated based on the results of calc()
 *	attrCommands -	map ("varname" -> "idAttr" -> "attrToSet")
 *	textCommands -	map ("varname" -> ["idAttr"])
 *	viewCommands - map ("viewname" -> "id")
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
 *		4.	Call setControls() with the correct params
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

		//Set attributes using the result of calc()
		for(var vname in this.attrCommands) {
			if(!newVals.hasOwnProperty(vname))
				continue;
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val)
				for(var idAttr in this.attrCommands[vname]) {
					var $elem = this.$el.is("["+idAttr+"]") ? this.$el :
								this.$el.find("["+idAttr+"]");
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
					(	this.$el.is("["+idAttrs[i]+"]") ? this.$el :
						this.$el.find("["+idAttrs[i]+"]")).text(val);
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
			var $elem = this.$el.attr("id") == this.viewCommands[vname] ?
						this.$el:this.$el.find("#"+this.viewCommands[vname]);

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
		this.setControls.apply(this, [!inited, this.$el].concat(this.state));


		var updateTime = new Date().getTime() - updateStart;
		this.updateTime = ((this.updateTime || updateTime)*4+updateTime)/5;
	}

	//Generate a random string beginning with an "_".  Collisions should
	//never happen
	function rndStr() {
		//We only use two digits of Math.random().toString(36) because
		//Math.random() has at most 64-bits of entropy
		return "_" +	Math.random().toString(36).substr(2,2) +
						Math.random().toString(36).substr(2,2) +
						Math.random().toString(36).substr(2,2) +
						Math.random().toString(36).substr(2,2);
	}
	//See README.md and the giant comment a little ways back
	fluid.compileView = function(props) {
		function View() {
			this.state = Array.prototype.slice.call(arguments, 0);
		}
		View.prototype = new AbstractView();
		View.prototype.calc = props.calc || function(){return new Object();};
		View.prototype.setControls = props.setControls || function(){};
		View.prototype.noMemoize = !!props.noMemoize;
		View.prototype.typeHash = rndStr();
		
		//Modify Template
		View.prototype.attrCommands = {};
		View.prototype.textCommands = {};
		View.prototype.viewCommands = {};
		props.template = props.template || "";
		
		props.template =
			//Attribute Commands
			props.template.replace(/[^\s]+={{\s*\w+\s*}}/g, function(match) {
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
})(jQuery)
