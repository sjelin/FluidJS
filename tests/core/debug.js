var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../../fluid.js")(window);
var assert = require("assert");

describe("Debug", function() {
	describe("#compileTemplate", function() {
		it("should not allow subview-injections in the root", function() {
			assert.throws(function() {
				Fluid.compileView({template: "<h1>Header</h1> [[content]]"});
			});
		});
	});
	describe("#fill", function() {
		var EmptyView = Fluid.compileView();
		var ViewWithKids = Fluid.compileView({
			template: "<p>[[kids]]</p>",
			fill: function(kids) {return {kids: kids};}});
		it("should ensure that child views are actually views", function() {
			var m = Fluid.newModel(new EmptyView());
			Fluid.attachView($("<p></p>"), ViewWithKids, m);
			assert.throws(function() {m.set("NOT A VIEW");});
		});
		it("should ensure that arrays contain only views", function() {
			var m = Fluid.newModel(new EmptyView());
			Fluid.attachView($("<p></p>"), ViewWithKids, m);
			assert.throws(function() {m.set([new EmptyView(), "NOT"]);});
		});
	});
});
