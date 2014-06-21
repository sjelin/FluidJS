var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("View Coverage", function() {
	describe("(momoization)", function() {
		it("shouldn't memoize if it is slower than running", function() {
			var l = {x: Math.random()};
			var bigObj = ((function(recFun) {
					return recFun(recFun, 15);
				})(function(me, n) {
					return n ? {a: me(me,n-1), b: me(me,n-1)} : l;
				}));
			var cnt = 0;
			var view = new (Fluid.compileView({calc: function(){cnt++;}}))();
			view.state = [bigObj];
			for(var i = 0; i < 10; i++) {
				view.update();
				l.x = Math.random();
			}
			for(var i = 0; i < 10; i++)
				view.update();
			assert.equal(cnt, 20);
		});
	});
	describe("(listener)", function() {
		it("should see \"\" as root elem", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"": $.noop}}))();
			view.update();
			assert.equal(view.prevValues[""], "val");
		});
		it("should allow listening with null", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"": null}}))();
			view.update();
			assert.equal(view.prevValues[""], "val");
			view.$el.val("newVal");
			view.$el.keydown();
			assert.equal(view.prevValues[""], "newVal");
		});
	})
	describe("(simple edge cases)", function() {
		it("should work with multiple value cmds per var", function() {
			var view = new (Fluid.compileView({
				template:	"<input value={{val}}></input>"+
							"<input value={{val}}></input>",
				calc: function() {return {val: "val"};}}))();
			view.update();
			assert.equal($(view.$el[0]).val(), "val");
			assert.equal($(view.$el[1]).val(), "val");
		});
		it("should work with multiple attr cmds per var", function() {
			var view = new (Fluid.compileView({
				template: "<a url={{href}} href={{href}}></a>",
				calc: function() {return {href: "www"};}}))();
			view.update();
			assert.equal(view.$el.attr("href"), "www");
			assert.equal(view.$el.attr("url"), "www");
		});
		it("should work with multiple text cmds per var", function() {
			var view = new (Fluid.compileView({
				template: "<a>{{text}}</a><b>{{text}}</b>",
				calc: function() {return {text: "Hello, World!"};}}))();
			view.update();
			assert.equal($(view.$el[0]).text(), "Hello, World!");
			assert.equal($(view.$el[1]).text(), "Hello, World!");
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
