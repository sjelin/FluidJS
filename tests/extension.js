var window = require("jsdom").jsdom().parentWindow;
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("Extensions", function() {
	describe("#extendModels", function() {
		it("all models are 1 ext", function() {
			Fluid.extendModels({compile: function() {return 1}});
			assert.equal(Fluid.newModel(2).get(), 1);
		});
		it("should work with two extentions", function() {
			Fluid.extendModels({noop: function() {}});
			Fluid.extendModels({noop: function() {}});
		});
	});
	describe("#extendViews", function() {
		it("should work with two extentions", function() {
			Fluid.extendViews({noop: function() {}});
			Fluid.extendViews({noop: function() {}});
		});
	});
});
