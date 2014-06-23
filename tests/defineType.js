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
		it("should correctly install a formatter", function() {
			var type = Fluid.defineType("", {format: $});
			assert.strictEqual(type.format, $);
		});
		it("should correctly install an valChars RegEx", function() {
			var type = Fluid.defineType("", {valChars: $});
			assert.strictEqual(type.valChars, $);
		});
		it("should correctly install an valChars function", function() {
			var type = Fluid.defineType("", {valChars: /h/});
			assert.ok(type.valChars("h"));
			assert.ok(!type.valChars("w"));
		});
	});
});
