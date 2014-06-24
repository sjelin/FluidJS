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
			var view = new (Fluid.compileView({fill: function(){cnt++;}}))();
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
	function view12Fact(tmplt) {
		var n = 0;
		var vals = Array.prototype.slice.call(arguments, 1);
		return new (Fluid.compileView({template: tmplt,
			fill: function() {
				var ret = {};
				if(vals.length > n)
					ret.x = vals[n++];
				return ret;
			}, noMemoize: true}))();
	};
	describe("(simple edge cases)", function() {
		it("should work with multiple value cmds per var", function() {
			var view = new (Fluid.compileView({
				template:	"<input value={{val}}></input>"+
							"<input value={{val}}></input>",
				fill: function() {return {val: "val"};}}))();
			view.update();
			assert.equal($(view.$el[0]).val(), "val");
			assert.equal($(view.$el[1]).val(), "val");
		});
		it("should work with multiple attr cmds per var", function() {
			var view = new (Fluid.compileView({
				template: "<a url={{href}} href={{href}}></a>",
				fill: function() {return {href: "www"};}}))();
			view.update();
			assert.equal(view.$el.attr("href"), "www");
			assert.equal(view.$el.attr("url"), "www");
		});
		it("should work with multiple text cmds per var", function() {
			var view = new (Fluid.compileView({
				template: "<a>{{text}}</a><b>{{text}}</b>",
				fill: function() {return {text: "Hello, World!"};}}))();
			view.update();
			assert.equal($(view.$el[0]).text(), "Hello, World!");
			assert.equal($(view.$el[1]).text(), "Hello, World!");
		});
		it("should leave old value if no new one set", function() {
			var view = view12Fact("<input value={{x}}></input>",
							"val");
			view.update();
			assert.equal(view.$el.val(), "val");
			view.update();
			assert.equal(view.$el.val(), "val");
		});
		it("should leave old attr if no new one set", function() {
			var view = view12Fact("<a href={{x}}></a>", "attr");
			view.update();
			assert.equal(view.$el.attr("href"), "attr");
			view.update();
			assert.equal(view.$el.attr("href"), "attr");
		});
		it("should leave old text if no new one set", function() {
			var view = view12Fact("<a>{{x}}</a>", "text");
			view.update();
			assert.equal(view.$el.text(), "text");
			view.update();
			assert.equal(view.$el.text(), "text");
		});
		it("should leave old subview if no new one set", function() {
			var view = view12Fact("<a>[[x]]</a>",
				new (Fluid.compileView({template: "<b></b>"}))());
			view.update();
			assert.equal(view.$el.find("b").length, 1);
			view.update();
			assert.equal(view.$el.find("b").length, 1);
		});
		it("should replace old value with new", function() {
			var view = view12Fact("<input value={{x}}></input>", "v1", "v2");
			view.update();
			assert.equal(view.$el.val(), "v1");
			view.update();
			assert.equal(view.$el.val(), "v2");
		});
		it("should replace old attr with new", function() {
			var view = view12Fact("<a href={{x}}></a>", "a1", "a2");
			view.update();
			assert.equal(view.$el.attr("href"), "a1");
			view.update();
			assert.equal(view.$el.attr("href"), "a2");
		});
		it("should replace old text with new", function() {
			var view = view12Fact("<a>{{x}}</a>", "t1", "t2");
			view.update();
			assert.equal(view.$el.text(), "t1");
			view.update();
			assert.equal(view.$el.text(), "t2");
		});
		it("should ignore repeat values", function() {
			//Unclear how to test this, at least get coverage
			var view = view12Fact("<input value={{x}}></input>", "v1", "v1");
			view.update();
			assert.equal(view.$el.val(), "v1");
			view.update();
			assert.equal(view.$el.val(), "v1");
		});
		it("should ignore repeat attrs", function() {
			//Unclear how to test this, at least get coverage
			var view = view12Fact("<a href={{x}}></a>", "a1", "a1");
			view.update();
			assert.equal(view.$el.attr("href"), "a1");
			view.update();
			assert.equal(view.$el.attr("href"), "a1");
		});
		it("should ignore repeat text", function() {
			//Unclear how to test this, at least get coverage
			var view = view12Fact("<a>{{x}}</a>", "t1", "t1");
			view.update();
			assert.equal(view.$el.text(), "t1");
			view.update();
			assert.equal(view.$el.text(), "t1");
		});
	});
	var vf12 = view12Fact.bind(this, "<div>[[x]]</div>");
	var tag = [];
	var View = [];
	for(var i = 0; i < 26; i++) {
		tag[i] = String.fromCharCode("A".charCodeAt(0)+i);
		View[i] = Fluid.compileView({template: "<"+tag[i]+"></"+tag[i]+">"});
	}
	function vf(i) {return new View[i]()};
	function chk(view, cnts) {
		view.update();
		for(var i = 0; i < 26; i++)
			assert.equal(view.$el.find(tag[i]).length, cnts[i] || 0);
	}
	describe("(complex edge cases)", function() {
		it("should replace a subview with new type", function() {
			var view = vf12(vf(0), vf(1));
			chk(view, {0: 1});
			chk(view, {1: 1});
		});
		it("should replace a subview in a list with new type", function() {
			var view = vf12([vf(0)], [vf(1)]);
			chk(view, {0: 1});
			chk(view, {1: 1});
		});
		it("should replace a subview in an obj with new type", function() {
			var view = vf12({k: vf(0)}, {k: vf(1)});
			chk(view, {0: 1});
			chk(view, {1: 1});
		});
		it("should replace a single element with a list", function() {
			var view = vf12(vf(0), [vf(0), vf(0)]);
			chk(view, {0: 1});
			chk(view, {0: 2});
		});
		it("should replace a single element with an obj", function() {
			var view = vf12(vf(0), {k: vf(0), z: vf(0)});
			chk(view, {0: 1});
			chk(view, {0: 2});
		});
		it("should replace a list with an obj", function() {
			var view = vf12([vf(0), vf(0), vf(0)], {k: vf(0), z: vf(0)});
			chk(view, {0: 3});
			chk(view, {0: 2});
		});
		it("should replace a list with a single element", function() {
			var view = vf12([vf(0), vf(0)], vf(0));
			chk(view, {0: 2});
			chk(view, {0: 1});
		});
		it("should replace an obj with a single element", function() {
			var view = vf12({a: vf(0), b: vf(0), c: vf(0)}, vf(0));
			chk(view, {0: 3});
			chk(view, {0: 1});
		});
		it("should replace an obj with a list", function() {
			var view = vf12({a: vf(0), b: vf(0), c: vf(0)}, [vf(0), vf(0)]);
			chk(view, {0: 3});
			chk(view, {0: 2});
		});
	});
	describe("(primative edge cases)", function() {
		it("should ignore primatives as subviews", function() {
			var view = vf12(1);
			chk(view, {});
		});
		it("should replace privatives with a subviews", function() {
			var view = vf12(1, vf(0));
			chk(view, {});
			chk(view, {0: 1});
		});
		it("should replace privatives with a list", function() {
			var view = vf12(1, [vf(0), vf(0)]);
			chk(view, {});
			chk(view, {0: 2});
		});
		it("should replace privatives with an object", function() {
			var view = vf12(1, {a: vf(0), b: vf(0), c: vf(0)});
			chk(view, {});
			chk(view, {0: 3});
		});
		it("should ignore privatives in objects", function() {
			var view = vf12({a: vf(0), b: 2}, vf(1));
			chk(view, {0: 1});
			chk(view, {1: 1});
			var view = vf12({a: vf(0), b: 2}, [vf(0), vf(1)]);
			chk(view, {0: 1});
			chk(view, {0:1, 1: 1});
			var view = vf12({a: vf(0), b: 2}, {a: vf(0), b: vf(1)});
			chk(view, {0: 1});
			chk(view, {0:1, 1: 1});
		}); 
	});
});
