var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("View Coverage", function() {
	describe("(momoization)", function() {
		it("shouldn't memoize if it is slower than running", function() {
			//TODO
		});
	});
	describe("(selector)", function() {
		it("should see \"\" as root elem", function() {
			//TODO
		});
	})
	describe("(simple edge cases)", function() {
		it("should work with multiple value cmds", function() {
			//TODO
		});
		it("should work with multiple attr cmds", function() {
			//TODO
		});
		it("should work with multiple text cmds", function() {
			//TODO
		});
		it("should work with multiple view cmds", function() {
			//TODO
		});
		it("should leave old value if no new one set", function() {
			//TODO
		});
		it("should leave old attr if no new one set", function() {
			//TODO
		});
		it("should leave old text if no new one set", function() {
			//TODO
		});
		it("should leave old subview if no new one set", function() {
			//TODO
		});
		it("should replace old value with new", function() {
			//TODO
		});
		it("should replace old text with new", function() {
			//TODO
		});
		it("should replace old attr with new", function() {
			//TODO
		});
		it("should ignore repeat values", function() {
			//TODO
		});
		it("should ignore repeat attrs", function() {
			//TODO
		});
		it("should ignore repeat text", function() {
			//TODO
		});
	});
	describe("(complex edge cases)", function() {
		it("should replace a subview with new type", function() {
			//TODO
		});
		it("should replace a subview in a list with new type", function() {
			//TODO
		});
		it("should replace a subview in an obj with new type", function() {
			//TODO
		});
		it("should replace a list with a single element", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var once = false;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
				calc: function() {
					return {s: once ? new SubView() : [new SubView(),
						new SubView(), new SubView(), new SubView()]}},
				noMemoize: true}))();
			view.update();
			assert.equal(view.$el.find("s").length, 4);
			once = true;
			view.update();
			assert.equal(view.$el.find("s").length, 1);
		});
		it("should replace a single element with a list", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var once = false;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
				calc: function() {
					return {s: !once ? new SubView() : [new SubView(),
						new SubView(), new SubView(), new SubView()]}},
				noMemoize: true}))();
			view.update();
			assert.equal(view.$el.find("s").length, 1);
			once = true;
			view.update();
			assert.equal(view.$el.find("s").length, 4);
		});
		it("should replace a single element with an obj", function() {
			//TODO
		});
		it("should replace an obj with a single element", function() {
			//TODO
		});
		it("should replace a list with an obj", function() {
			//TODO
		});
		it("should replace an obj with a list", function() {
			//TODO
		});
	});
});
