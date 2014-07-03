var window = require("jsdom").jsdom().parentWindow;
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("Extensions", function() {
	describe("(coverage)", function() {
		it("should work with two extentions", function() {
			Fluid.extendViews({noop: function() {}});
			Fluid.extendViews({noop: function() {}});
		});
	});
});
