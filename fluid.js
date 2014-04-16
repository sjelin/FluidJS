var Fluid = (function($) {
	"use strict";
	var fluid = {};


/**********************\
 *    Compatibility    *
\**********************/

	//Credit to John Resig for his implementation of Object.getPrototypeOf
	function sameProto(x,y) {
		if(typeof Object.getPrototypeOf === "function")
			return Object.getPrototypeOf(x) == Object.getPrototypeOf(y);
		else if(typeof "test".__proto__ === "object")
			return x.__proto__ == y.__proto__;
		else
			return x.constructor.prototype == y.constructor.prototype;
	}

	//Credit to MDN
	var isArray = Array.isArray || function(x) {
		return Object.prototype.toString.call(x) === '[object Array]';
	};

/**********************\
 *     Fluid.model     *
\**********************/

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

/*	View instances have the following properties & method:
 *
 *
 *	calc() -	The function passed when the view class was declared
 *	setControls() - The function passed when the view class was declared  
 *
 *
 *	getFreshJQ -	Generates a jQuery object based on the template ready to
 *					be updated based on the results of calc()
 *	attrCommands -	map ("varname" -> "idAttr" -> "attrToSet")
 *	textCommands -	map ("varname" -> ["idAttr"])
 *	viewCommands - map ("viewname" -> "id")
 *
 *
 *	state -	The array which was last used as arguments for the calc()
 *			function.  Or, if the calc function hasn't been called yet, the
 *			array of arguments passed into the constructor.
 *	vals -	The last result of the calc() function, undefined if calc()
 *			hasn't been called yet
 *
 *
 *	$el -	The jQuery object which is the markup for the view.  Is undefined
 *			until update is called for the first time.
 *	update([view]) - Does the following:
 *		1.	If the view parameter was specified, this.state = view.state
 *		2.	Run calc()
 *		3.	Use the result of the calc function to update this.$el
 *		4.	Call setControls() with the correct params
 */
	function AbstractView() {}
	AbstractView.prototype.update = function(view)
	{
		this.state = (view || {}).state || this.state;
		var newVals = this.calc.apply(this, this.state);

		var inited = this.vals != null;
		if(!inited) {
			this.$el = this.getFreshJQ();
			this.vals = {};
		}

		//Attrs
		for(var vname in this.attrCommands) {
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val)
				for(var idAttr in this.attrCommands[vname]) {
					var $elem = this.$el.is("["+idAttr+"]") ? this.$el :
								this.$el.find("["+idAttr+"]");
					$elem.attr(this.attrCommands[vname][idAttr], val);
				}
		}

		//Text
		for(var vname in this.textCommands) {
			var val = newVals[vname];
			if(!inited || this.vals[vname] != val) {
				var idAttrs = this.textCommands[vname];
				for(var i = 0; i < idAttrs.length; i++)
					(	this.$el.is("["+idAttrs[i]+"]") ? this.$el :
						this.$el.find("["+idAttrs[i]+"]")).text(val);
			}
		}

		//Views
		for(var vname in this.viewCommands) {
			var view = newVals[vname];
			var oldView = this.vals[vname];
			var $elem = this.$el.attr("id") == this.viewCommands[vname] ?
						this.$el:this.$el.find("#"+this.viewCommands[vname]);

			if(isArray(view)) {
				if(isArray(oldView)) {
					var numToKeep = Math.min(view.length, oldView.length);
					if((numToKeep > 0) && !sameProto(oldView[0], view[0]))
						numToKeep = 0;
					while(oldView.length > numToKeep) {
						oldView[oldView.length-1].$el.remove();
						oldView.length--;
					}
				} else {
					if(inited)
						oldView.$el.remove();
					oldView = [];
				}
				for(var i = 0; i < oldView.length; i++) {
					oldView[i].update(view[i]);
					view[i] = oldView[i];
				}
				for(var i = oldView.length; i < view.length; i++) {
					view[i].update();
					$elem.before(view[i].$el);
				}
			} else {
				var insertFresh = true;
				if(inited) {
					if(isArray(oldView)) {
						for(var i = 0; i < oldView.length; i++)
							oldView[i].$el.remove();
					} else if(!sameProto(oldView, view)) {
						oldView.$el.remove();
					} else {
						insertFresh = false;
						oldView.update(view);
						newVals[vname] = oldView;
					}
				}
				if(insertFresh) {
					view.update();
					$elem.before(view.$el);
				}
			}
		}

		this.vals = newVals;
		this.setControls.apply(this, [!inited, this.$el].concat(this.state));
	}

	fluid.compileView = function(props) {
		function View() {
			this.state = Array.prototype.slice.call(arguments, 0);
		}
		View.prototype = new AbstractView();
		View.prototype.calc = props.calc || function(){return new Object();};
		View.prototype.setControls = props.setControls || function(){};
		
		//Template
		function getNewIDAttr() {
			return "_"+Math.random().toString(36).substr(2);
		}

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
				var idAttr = getNewIDAttr();
				if(View.prototype.attrCommands[vname] == null)
					View.prototype.attrCommands[vname] = {};
				View.prototype.attrCommands[vname][idAttr] = aname;
				return idAttr;
			//Text Commands
			}).replace(/>\s*{{\s*\w+\s*}}\s*</g, function(match) {
				var vname = match.substr(1, match.length-2).trim();
				vname = vname.substr(2, vname.length-4).trim();
				var idAttr = getNewIDAttr();
				if(View.prototype.textCommands[vname] == null)
					View.prototype.textCommands[vname] = [];
				View.prototype.textCommands[vname].push(idAttr);
				return " "+idAttr+"><";
			//View Commands
			}).replace(/\[\[\s*\w+\s*\]\]/g, function(match) {
				var vname = match.substr(2, match.length-4).trim();
				var id = getNewIDAttr();
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
