var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("MVC", function() {
	describe("#attachView", function() {
		it("should work attaching an empty view", function() {
			var $a = $("<a><trgt></trgt></a>");
			Fluid.attachView($a.find("trgt"), Fluid.compileView());
			assert.equal($a.html(), "");
		});
		it("should work attaching a static view", function() {
			var $a = $("<a><t></t></a>");
			Fluid.attachView($a.find("t"),
					Fluid.compileView({template: "<b></b>"}));
			assert.equal($a.find("t").length, 0);
			assert.equal($a.find("b").length, 1);
		});
	});
	describe("(full)", function() {
		it("should be able to get data from real models", function() {
			var $a = $("<a><t></t></a>");
			var m = Fluid.newModel(1);
			Fluid.attachView($a.find("t"), Fluid.compileView({
				template: "<b m={{m}}></b>",
				calc: function(m) {return {m:m};}
			}), m);
			assert.equal($a.find("b").attr("m"), m.get());
		});
		it("should be able to get update from real models", function() {
			var $a = $("<a><t></t></a>");
			var m = Fluid.newModel(1);
			Fluid.attachView($a.find("t"), Fluid.compileView({
				template: "<b m={{m}}></b>",
				calc: function(m) {return {m:m};}
			}), m);
			assert.equal($a.find("b").attr("m"), m.get());
			m.set(Math.random());
			assert.equal($a.find("b").attr("m"), m.get());
		});
	});
});
