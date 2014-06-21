var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("Views", function() {
	describe("#compileView", function() {
		it("shouldn't crash making empty view", function() {
			Fluid.compileView();
		});
		it("shouldn't crash compiling a template", function() {
			Fluid.compileView({template: "<a></a>"});
		});
		it("shouldn't crash compiling a template w/ an attr", function() {
			Fluid.compileView({template: "<a href={{href}}></a>"});
		});
		it("shouldn't crash compiling a template w/ text", function() {
			Fluid.compileView({template: "<a>{{text}}</a>"});
		});
		it("shouldn't crash compiling a template w/ a sub-view", function() {
			Fluid.compileView({template: "<a>[[subview]]</a>"});
		});
		it("shouldn't crash compiling w/ calc() fun", function() {
			Fluid.compileView({calc: function(){return {hello: "world"};}});
		});
		it("shouldn't crash compiling w/ listeners", function() {
			Fluid.compileView({	listeners: {"input" : $.noop},
								template: "<input></input>"});
		}); 
		it("shouldn't crash compiling w/ noMemoize", function() {
			Fluid.compileView({noMemoize: true});
		}); 
	});
	describe("#attachView", function() {
		it("shouldn't crash attaching an empty view", function() {
			Fluid.attachView($("<a></a>"), Fluid.compileView());
		});
		it("shouldn't crash attaching a static view", function() {
			Fluid.attachView($("<a></a>"), Fluid.compileView({
				template: "<a></a>"}));
		});
	});
	//----------------------------------------------------------
	// The following tests use internal properties
	//----------------------------------------------------------
	describe("(fill in template)", function() {
		it("should correctly make a static tag", function() {
			var view = new (Fluid.compileView({template: "<a></a>"}))();
			view.update();
			assert.equal(view.$el.prop("tagName").toUpperCase(), "A");
			assert.equal(view.$el.html(), "");
		});
		it("should correctly set a property", function() {
			var view = new (Fluid.compileView({
				template: "<a href={{href}}></a>",
				calc: function() {return {href: "www"};}}))();
			view.update();
			assert.equal(view.$el.attr("href"), "www");
		});
		it("should correctly set text", function() {
			var view = new (Fluid.compileView({
				template: "<a>{{text}}</a>",
				calc: function() {return {text: "Hello, World!"};}}))();
			view.update();
			assert.equal(view.$el.text(), "Hello, World!");
		});
		it("should correctly set a sub view", function() {
			var view = new (Fluid.compileView({
				template: "<a>[[sub]]</a>",
				calc: function() {return {sub: 
					new (Fluid.compileView({template: "<br></br>"}))()};}
			}))();
			view.update();
			assert.equal(view.$el.find("br").length, 1);
		});
		it("should update with new info", function() {
			var View = Fluid.compileView({template: "<a href={{href}}></a>",
				calc: function(href) {return {href: href};}});
			var view = new View("yahoo.com");
			view.update();
			assert.equal(view.$el.attr("href"), "yahoo.com");
			view.update(new View("google.com"));
			assert.equal(view.$el.attr("href"), "google.com");
		});
	});
	describe("(memoization)", function() {
		it("should use memoization in most basic case", function() {
			var n = 0;
			var view = new (Fluid.compileView({calc: function() {
				if(++n == 2)
					assert.fail(1, 2, "called calc() twice", "==");
			}}))();
			view.update();
			view.update();
		});
		it("should respect noMemoize", function(done) {
			var n = 0;
			var view = new (Fluid.compileView({calc: function() {
				if(++n == 2)
					done();
			}, noMemoize: true}))();
			view.update();
			view.update();
		});
		it("should not memoize at incorrect times", function(done) {
			var n = 0;
			var View = Fluid.compileView({calc: function() {
				if(++n == 2)
					done();
			}});
			var view = new View()
			view.update();
			view.update(new View(1));
		});
	});
	describe("(controls)", function() {
		it("should call addControls", function(done) {
			new (Fluid.compileView({addControls: function()
									{done();}}))().update();
		});
		it("should call updateControls", function(done) {
			new (Fluid.compileView({updateControls: function()
									{done();}}))().update();
		});
		it("should only call addControls once", function() {
			var inited = false;
			var view = new (Fluid.compileView({addControls: function() {
				if(inited)
					assert.fail(1, 2, "called addControls twice", "==");
				inited = true;
			}, noMemoize: true}))();
			view.update();
			view.update();
		});
		it("should call updateControls with inited correct", function(done) {
			var inited = false;
			var view = new (Fluid.compileView({updateControls: function(i) {
				assert.equal(i, inited);
				if(inited)
					done();
				else
					inited = true;
			}, noMemoize: true}))();
			view.update();
			view.update();
		});
	});
	describe("(listeners)", function() {
		it("should log initial value", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"input": $.noop}}))();
			view.update();
			assert.equal(view.prevValues["input"], "val");
		});
		it("should note new value", function(done) {
			var view = new (Fluid.compileView({
				template: '<input value=""></input>',
				listeners: {"input": function(val) {
					assert.equal(val, "val");
					done();
			}}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
	});
	describe("(complex subviews)", function() {
		it("should add new list elements to the view", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var n = -1;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					calc: function() {
						var s = [];
						n++;
						while(s.length < n)
							s.push(new SubView());
						return {s:s};
					}, noMemoize: true}))();
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
		});
		it("should remove old list elements from the view", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var n = 4;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					calc: function() {
						var s = [];
						n--;
						while(s.length < n)
							s.push(new SubView());
						return {s:s};
					}, noMemoize: true}))();
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
			view.update();
			assert.equal(view.$el.find("s").length, n);
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
	});
});
