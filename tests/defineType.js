var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("Custome Types", function() {
	describe("#defineType", function() {
		it("should correctly default everything", function() {
			var type = Fluid.defineType("");
			assert.equal(type.attr, "text");
			for(var i = 0; i < 10; i++)
				assert.ok(type.validate(Math.random().toString(36)));
			for(var i = 0; i < 10; i++) {
				var x = Math.random().toString(36).slice(2);
				assert.equal(type.format(x), x);
			}
			for(var i = 0; i < 10; i++)
				assert.ok(type.valChars(
									Math.random().toString(36).slice(2,1)));
		});
		it("should use a typeAttr from the list",function(){
			var type = Fluid.defineType("", {typeAttr: ["radio"]});
			assert.equal(type.attr, "radio");
		});
		it("should use the typename as the default typeAttr", function() {
			var type = Fluid.defineType("radio");
			assert.equal(type.attr, "radio");
		});
		it("should correctly handle a function as a validate", function() {
			var type = Fluid.defineType("", {validate: $});
			assert.strictEqual(type.validate, $);
		});
		it("should correctly handle a RegEx as a validate", function() {
			var type = Fluid.defineType("", {validate: /hello/});
			assert.ok(type.validate("hello"));
			assert.ok(!type.validate("world"));
		});
		it("should correctly pick a validator from an object", function() {
			var type = Fluid.defineType("x", {validate: {x: $}});
			assert.strictEqual(type.validate, $);
		});
		it("should correctly install a formatter", function() {
			var type = Fluid.defineType("", {format: $});
			assert.strictEqual(type.format, $);
		});
		it("should correctly pick a formatter from an object", function() {
			var type = Fluid.defineType("x", {format: {x: $}});
			assert.strictEqual(type.format, $);
		});
		it("should correctly install an valChars function", function() {
			var type = Fluid.defineType("", {valChars: $});
			assert.strictEqual(type.valChars, $);
		});
		it("should correctly install an valChars RegEx", function() {
			var type = Fluid.defineType("", {valChars: /h/});
			assert.ok(type.valChars("h"));
			assert.ok(!type.valChars("w"));
		});
		it("should correctly pick a value character set from obj",function(){
			var type = Fluid.defineType("x", {valChars: {x: $}});
			assert.strictEqual(type.valChars, $);
		});
		it("should correctly create unformat function", function() {
			var type = Fluid.defineType("", {valChars: /h/});
			assert.equal(type.unformat("hello"), "h");
			assert.equal(type.unformat("world"), "");
		});
	});
	describe("(blurred)", function() {
		beforeEach(function() {
			Fluid.defineType("r", {typeAttr: "radio"});
			Fluid.defineType("num", {validate: /^[0-9]*$/});
			Fluid.defineType("num2", {valChars: /^[0-9]*$/});
			Fluid.defineType("ccn", {format: function(x) {
				for(var i = 4; i < x.length; i += 5)
					x = x.slice(0,i)+"-"+x.slice(x);
				return x;
			}, valChars: /[0-9]/});
		});
		it("should actually use the type set in typeAttr", function() {
		});
		it("should allow valid values", function() {
		});
		it("should reject invalid values", function() {
		});
		it("should format initial values", function() {
		});
		it("should unformat unformat values", function() {
		});
		it("should format new values", function() {
		});
		it("should unformat new values", function() {
		});
		it("should push values to listeners", function() {
		});
		it("shouldn't push invalid values to listeners", function() {
		});
		it("should push unformated values to listeners", function() {
		});
	});
	describe("(focused)", function() {
		it("should move cursor to end if new value from model", function() {
		});
		it("should revert selection if invalid value", function() {
		});
		it("should translate selection to new format", function() {
		});
		it("shouldn't crash if tag doesn't support selection", function() {
		});
		it("shouldn't crash if type doesn't support selection", function() {
		});
	});
});
