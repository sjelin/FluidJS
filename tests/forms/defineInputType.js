var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../../fluid.js")(window);
Fluid = require("../../fluid-forms.js")(window, $, Fluid);
var assert = require("assert");

describe("Custome Types", function() {
	describe("#defineInputType", function() {
		it("shouldn't do anything if no custom types are used", function() {
			Fluid.attachView($("<a></a>"), Fluid.compileView({
				template: "<input value={{x}}></input>",
				fill: function() {return {x:1};}
			}));
		});
		it("should correctly default everything", function() {
			var type = Fluid.defineInputType("");
			assert.equal(type.attr, "text");
			for(var i = 0; i < 10; i++)
				assert.ok(type.validate(Math.random().toString(36)));
			for(var i = 0; i < 10; i++) {
				var x = Math.random().toString(36).slice(2);
				assert.equal(type.format(x), x);
			}
			for(var i = 0; i < 10; i++)
				assert.ok(!type.formatChars(
									Math.random().toString(36).slice(2,1)));
		});
		it("should use a typeAttr from the list",function(){
			var type = Fluid.defineInputType("", {typeAttr: ["radio"]});
			assert.equal(type.attr, "radio");
		});
		it("should use the typename as the default typeAttr", function() {
			var type = Fluid.defineInputType("radio");
			assert.equal(type.attr, "radio");
		});
		it("should correctly handle a function as a validate", function() {
			var type = Fluid.defineInputType("", {validate: $});
			assert.strictEqual(type.validate, $);
		});
		it("should correctly handle a RegEx as a validate", function() {
			var type = Fluid.defineInputType("", {validate: /hello/});
			assert.ok(type.validate("hello"));
			assert.ok(!type.validate("world"));
		});
		it("should correctly pick a validator from an object", function() {
			var type = Fluid.defineInputType("x", {validate: {x: $}});
			assert.strictEqual(type.validate, $);
		});
		it("should correctly install a formatter", function() {
			var type = Fluid.defineInputType("", {format: $});
			assert.strictEqual(type.format, $);
		});
		it("should correctly pick a formatter from an object", function() {
			var type = Fluid.defineInputType("x", {format: {x: $}});
			assert.strictEqual(type.format, $);
		});
		it("should correctly install an formatChars function", function() {
			var type = Fluid.defineInputType("", {formatChars: $});
			assert.strictEqual(type.formatChars, $);
		});
		it("should correctly install an formatChars RegEx", function() {
			var type = Fluid.defineInputType("", {formatChars: /h/});
			assert.ok(type.formatChars("h"));
			assert.ok(!type.formatChars("w"));
		});
		it("should correctly pick a value character set from obj",function(){
			var type = Fluid.defineInputType("x", {formatChars: {x: $}});
			assert.strictEqual(type.formatChars, $);
		});
		it("should correctly create unformat function", function() {
			var type = Fluid.defineInputType("", {formatChars: /[^h]/});
			assert.equal(type.unformat("hello"), "h");
			assert.equal(type.unformat("world"), "");
		});
	});
	describe("(blurred)", function() {
		beforeEach(function() {
			Fluid.defineInputType("r", {typeAttr: "radio"});
			Fluid.defineInputType("num", {validate: /^[0-9]*$/});
			Fluid.defineInputType("num2", {formatChars: /[^0-9]/});
			Fluid.defineInputType("ccn", {format: function(x) {
				for(var i = 4; i < x.length; i += 5)
					x = x.slice(0,i)+"-"+x.slice(i);
				return x;
			}, formatChars: /-/});
		});
		function makeView(type, val, listen) {
			var props = {template: "<input"+
				(type ? " type='"+type+"'" : "") +
				(val ? " value='"+val+"'" : "") + "></input>"};
			if(listen)
				props.listeners = {input: listen};
			var view = new (Fluid.compileView(props))();
			view.update();
			return view;
		};
		it("should not mess with normal types", function() {
			var view = new (Fluid.compileView({
					template: "<input type='text'></input>"}))();
			view.update();
			assert.ok(!view.$el.is("[__fluid__custom_type_hash]"));
		});
		it("should actually use the type set in typeAttr", function() {
			assert.equal(makeView("r").$el.attr("type"), "radio");
		});
		it("should allow valid values", function() {
			var view = makeView("num", "");
			assert.equal(view.$el.val(), "");
			view.$el.val("123");
			view.$el.keypress();
			assert.equal(view.$el.val(), "123");
		});
		it("should reject invalid values", function() {
			var view = makeView("num", "123");
			view.$el.val("abc");
			view.$el.keypress();
			assert.equal(view.$el.val(), "123");
		});
		it("should format initial values", function() {
			assert.equal(makeView("ccn", "12345").$el.val(), "1234-5");
		});
		it("should unformat initial values", function() {
			assert.equal(makeView("num2", "1234-5").$el.val(), "12345");
		});
		it("should format new values", function() {
			var view = makeView("ccn", "12345");
			view.$el.val("1234");
			view.$el.change();
			assert.equal(view.$el.val(), "1234");
			view.$el.val("123456789");
			view.$el.change();
			assert.equal(view.$el.val(), "1234-5678-9");
		});
		it("should format values from fill", function() {
			var view = new (Fluid.compileView({
					template: "<input type='ccn' value={{val}}></input>",
					fill: function() {return {val: "12345"}}}))();
			view.update();	
			assert.equal(view.$el.val(), "1234-5");
		});
		it("should unformat new values", function() {
			var view = makeView("num2", "12345");
			view.$el.val("12,34,5-6--7!!ac89");
			view.$el.change();
			assert.equal(view.$el.val(), "123456789");
		});
		it("should push init values to listeners", function(done) {
			var view = makeView("num", "123", function(num) {
				assert.equal(num, "123");
				done();
			});
		});
		it("should push new values to listeners", function() {
			var nCalls = 0;
			var view = makeView("num", "", function(num) {
				assert.equal(num, nCalls++ ? "123" : "");
			});
			view.$el.val("123");
			view.$el.change();
			assert.equal(nCalls, 2);
		});
		it("shouldn't push invalid values to listeners", function() {
			var view = makeView("num", "", function(num) {
				if(num.length != 0)
					assert.fail(1, 0, "Pushed invalid value", "==");
			});
			view.$el.val("abc");
			view.$el.change();
		});
		it("should push unformated values to listeners", function() {
			var view = makeView("ccn", "12-345", function(num) {
				assert.equal(num, "12345");
			});
			assert.equal(view.$el.val(), "1234-5");
		});
		it("shouldn't push a value if unformatted it's the same", function(){
			var cnt = 0;
			var view = makeView("num2", "", function(num) {
				assert.equal(cnt++, 0);
			});
			view.$el.val("abc");
			view.$el.change();
		});
	});
	describe("(focused)", function() {
		it("should log cursor position");
		it("should move cursor to end if new value from model");
		it("should revert selection if invalid value");
		it("should translate selection to new format");
		it("shouldn't crash if tag doesn't support selection", function() {
			var val = "";
			var view = new (Fluid.compileView({
					template: "<select type='ccn' value={{val}}></select>",
					fill: function() {return {val:val};},
					noMemoize: true}))();
			view.update();
			$(window.document.body).append(view.$el);
			view.$el.focus();//Log
			val = "12345";//From fill
			view.update();
			view.$el.val("LOL");//INVALID
			view.$el.change();
			view.$el.val("123456789");//New
			view.$el.change();
		});
		it("shouldn't crash if type doesn't support selection", function() {
			var val = "";
			var view = new (Fluid.compileView({
					template: "<input type='ccn' value={{val}}></input>",
					fill: function() {return {val:val};},
					noMemoize: true}))();
			view.update();
			$(window.document.body).append(view.$el);
			view.$el.focus();//Log
			val = "12345";//From fill
			view.update();
			view.$el.val("LOL");//INVALID
			view.$el.change();
			view.$el.val("123456789");//New
			view.$el.change();
		});
	});
});
