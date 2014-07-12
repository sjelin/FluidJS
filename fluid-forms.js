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
			global.jQuery && /* istanbul ignore next */ global.Fluid ?
				/* istanbul ignore next */ factory(global, global.jQuery,
															global.Fluid)
				: factory;
	} else {
		return factory(global, jQuery, Fluid);
	}

// Pass this if window is not defined yet
}(typeof window !== "undefined" ?
		/* istanbul ignore next */ window : this, function(window, $, Fluid){
	"use strict";

/****************************************************************************
 *	EXTENTION STATE VARIABLES
 ****************************************************************************
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
 ***************************************************************************/

/*************************************\
 * Helper Functions for Custom Types *
\*************************************/

	//TODO remove ignore when jsdom fixes get pushed
	/* istanbul ignore next */
	function setCursorPos($elem, start, end, ctHash)
	{
		var elem = $elem[0];
		if(		(elem instanceof window.HTMLInputElement) ||
				(elem instanceof window.HTMLTextAreaElement)) try {
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

	//TODO remove ignore when jsdom fixes get pushed
	/* istanbul ignore next */
	function ctSpecialCaseUpdate($elem, type, cursor, curr, prev, hash) {
		//The only special case we have is backspace/delete keys
		if((curr.length != prev.length-1) || (cursor.s != cursor.e))
			return false;
		cursor = cursor.s;

		var bksp = false;
		var del = false;
		if(cursor == 0) {
			if(prev.slice(1) == curr)
				del = true;
			else
				return false;
		} else if(cursor == prev.length) {
			if(prev.slice(0, -1) == curr)
				bksp = true;
			else
				return false;
		} else {
			if(		(prev.substr(0, cursor-1) != curr.substr(0, cursor-1)) ||
					(prev.substr(cursor+1) != curr.substr(cursor)))
				return false;
			var p = prev.substr(cursor-1, 2);
			var c = curr.substr(cursor-1, 1);
			if(p[0] == c)
				del = true;
			else if(p[1] == c)
				bksp = true;
			else
				return false;
		}

		var val = null;
		if(bksp) {
			while((cursor > 0) && type.formatChars(prev[cursor-1]))
				cursor--;
			if(cursor == 0)
				return false;
			val = type.unformat(prev.slice(0, cursor-1)+prev.slice(cursor));
			cursor--;
		} else if(del) {
			var i = cursor;
			while((i < prev.length) && type.formatChars(prev[i]))
				i++;
			if(i == prev.length)
				return false;
			val = type.unformat(prev.slice(0, i) + prev.slice(i+1));
		}

		if((val == null) || !type.validate(val))
			return false;
		$elem.val(type.format(val));
		setCursorPos($elem, cursor, cursor, hash);
		return true;
	}

	function ctReformat($elem, type, curr, fVal, hash) {
		var newTextSel = undefined;
		if($elem.is(":focus")) {
			var sel = getTextSel($elem);
			newTextSel = {
				s: transIndex(type.formatChars, sel.s, curr, fVal),
				e: transIndex(type.formatChars, sel.e, curr, fVal)
			};
		}
		$elem.val(fVal);
		if(newTextSel != undefined)
			setCursorPos($elem, newTextSel.s, newTextSel.e, hash);
	}

	function revertInvalid($elem, prevVal, oldSel) {
		$elem.val(prevVal);
		//TODO remove ignore when jsdom fixes get pushed
		/* istanbul ignore if */
		if($elem.is(":focus"))
			setCursorPos($elem,	oldSel.s, oldSel.e);
	}

	function ctKeyListener(view, hash, $elem) {
		var prev = view.prevValues[hash];
		/* istanbul ignore if */
		if(!($elem[0].validity || {valid:true}).valid)
			return revertInvalid($elem, prev, view.ctCursorPos[hash]);
		var curr = $elem.val();
		if(curr != prev) {
			var oldSel = view.ctCursorPos[hash];
			var type = view.ctMap[hash];
			var val = type.unformat(curr);
			if(!type.validate(val)) {
				revertInvalid($elem, prev, oldSel);
			} else {
				//Reformatting and such
				//TODO remove ignore when jsdom fixes get pushed
				/* istanbul ignore else */
				if(!ctSpecialCaseUpdate($elem,type,oldSel,curr,prev,hash))
					ctReformat($elem,type,curr,type.format(val),hash);

				curr = $elem.val();
				val = type.unformat(curr);

				//Call listeners
				if(type.unformat(prev) != val) {
					var listeners = view.ctListeners[hash];
					for(var i = 0; i < listeners.length; i++)
						listeners[i](val);
				}
				view.prevValues[hash] = curr;
			}
		}
		ctLogCursor(view, hash, $elem);
	};

/**********************************\
 * Helper Functions for Listeners *
\**********************************/

	function getValue($elem) {
		return Fluid.utils.isCheckable($elem) ? $elem[0].checked:$elem.val();
	}
	function watch(view, sel)
	{
		function send(val) {
			var trgt = view.listenTrgts[sel] || [];
			if(typeof trgt == "function")
				trgt = [trgt];
			for(var i = 0; i < trgt.length; i++)
				trgt[i](val);
		}
		if(!view.prevValues.hasOwnProperty(sel)) {
			var $elem = view.find(sel);
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
				$elem.on("input", hear);
				$elem.keypress(hear);
				$elem.keydown(hear);
				$elem.keyup(hear);
				$elem.change(hear);
			}
		}
	}

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
	Fluid.defineInputType = function(typeName, props) {
		props = props || {};
		var typeAttr = undefined;
		var typeAttrs = props.typeAttr || typeName;
		if(typeof typeAttrs == "string")
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

/************\
 *  Extend! *
\************/
	Fluid.extendViews({
		compile: function(props) {
			this.listeners = props.listeners || {};
			this.ctMap = {};
		},
		modifyTemplate: function(tmplt) {
			var view = this;
			return tmplt.replace(/type=["']\s*[^"']*\s*["']/g, function(m) {
					var typeStr = m.slice(6, -1).trim();
					if(customTypes[typeStr]) {
						var type = customTypes[typeStr];
						var hash = Fluid.utils.rndAttrName();
						view.ctMap[hash] = type;
						var q = m.slice(-1);
						return ctHashAttr + "=" + q + hash + q + " type=" +
														q + type.attr + q;
					} else
						return m;
			});
		},
		init: function() {
			this.vals = {};
			this.prevValues = {};
			this.ctListeners = {};
			this.ctCursorPos = {};
			for(var hash in this.ctMap) {
				var $elem = this.find('['+ctHashAttr+'="'+hash+'"]');
				$elem.val(this.ctMap[hash].reformat($elem.val()));
				this.prevValues[hash] = $elem.val();
				this.ctListeners[hash] = [];

				//Add listeners for custom types
				var keyListener = ctKeyListener.bind(null,this, hash, $elem);
				var clickListener = ctLogCursor.bind(null,this, hash, $elem);
				$elem.on("input", keyListener);
				$elem.keypress(keyListener);
				$elem.keydown(keyListener);
				$elem.keyup(keyListener);
				$elem.change(keyListener);
				$elem.click(clickListener);
				$elem.mouseup(clickListener);
				$elem.mousedown(clickListener);
				$elem.focus(clickListener);
			}
		},
		control: function() {
			this.listenTrgts =	this.listeners instanceof Function ?
									this.listeners(this.getState()) :
									this.listeners;
			for(var sel in this.listenTrgts)
				watch(this, sel);
		},
		preprocessValue: function(value, $elem) {
			var ctHash = $elem.attr(ctHashAttr);
			if(ctHash)
				return this.ctMap[ctHash].reformat(value);
			else
				return value;
		},
		postValueProcessing: function(value, $elem) {	
			if($elem.is(":focus"))
				setCursorPos($elem, value.length, value.length,
													$elem.attr(ctHashAttr));
		}
	});

	return Fluid;
}));
