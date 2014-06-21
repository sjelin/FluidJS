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
		it("should correctly set a value", function() {
			var view = new (Fluid.compileView({
				template: "<input value={{val}}></input>",
				calc: function() {return {val: "val"};}}))();
			view.update();
			assert.equal(view.$el.val(), "val");
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
		it("should not memoize if data is new", function(done) {
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
		it("should accept a function which takes in the state", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: function(tag) {
					var ret = {};
					ret[tag] = $.noop;
					return ret;
				}}))("input");
			view.update();
			assert.equal(view.prevValues["input"], "val");
		});
		it("should note new value", function() {
			var called = false;
			var view = new (Fluid.compileView({
				template: '<input value=""></input>',
				listeners: {"input": function(val) {
					assert.equal(val, "val");
					called = true;
			}}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
			assert.ok(called);
			assert.equal(view.prevValues["input"], "val");
		});
		it("should allow multiple listeners to one value", function(done) {
			var cnt = 0;
			function lstn(val) {
				assert.equal(val, "val");
				if(++cnt == 2)
					done();
			}
			var view = new (Fluid.compileView({
				template: '<input value=""></input>',
				listeners: {"input": [lstn, lstn]}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
		it("should not alert anyone if the value has not changed",function(){
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"input": function(val) {
					assert.fail(1,0, "called listeners at wrong time","==");
			}}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
		it("should not install listeners multiple times", function() {
			var cnt = 0;
			var view = new (Fluid.compileView({
				template: '<input value=""></input>',
				listeners: {"input": function(val) {
					if(++cnt == 2)
						assert.fail(2, 1, "called listeners twice","==");
			}}}))();
			view.update();
			view.state = [1];
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
	});
	describe("(complex subviews)", function() {
		it("should update single subviews", function() {
			var SubView = Fluid.compileView({template: "<s>{{text}}</s>",
							calc: function(t) {return {text:t};}});
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					calc: function(t) {return {s: new SubView(t)};}}))("");
			view.update();
			assert.equal(view.$el.find("s").text(), "");
			view.state = ["txt"];
			view.update();
			assert.equal(view.$el.find("s").text(), "txt");
		});
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
		it("should add new subviews from an object", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var n = -1;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					calc: function() {
						var s = {};
						n++;
						while(Object.keys(s).length < n)
							s[97+Object.keys(s).length] = new SubView();
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
		it("should remove old subviews no longer in an object", function() {
			var SubView = Fluid.compileView({template: "<s></s>"});
			var n = 4;
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					calc: function() {
						var s = {};
						n--;
						while(Object.keys(s).length < n)
							s[97+Object.keys(s).length] = new SubView();
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
		it("should sort obj w/o function", function() {
			function SubViewFact(t) {
				return new (Fluid.compileView({template:
											"<"+t+"></"+t+">"}))();
			}
			var subViews = {__SORT__: true};
			subViews.e = SubViewFact("e");
			subViews.a = SubViewFact("a");
			subViews.z = SubViewFact("z");
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
						calc: function() { return {s: subViews}; }}))();
			view.update();
			assert.equal(view.$el.children()[0].tagName.toUpperCase(), "A");
			assert.equal(view.$el.children()[1].tagName.toUpperCase(), "E");
			assert.equal(view.$el.children()[2].tagName.toUpperCase(), "Z");
		});
		it("should sort obj w/ function", function() {
			function SubViewFact(t) {
				return new (Fluid.compileView({template:
											"<"+t+"></"+t+">"}))();
			}
			var subViews = {__SORT__: function(x,y) {
				return y.charCodeAt(0) - x.charCodeAt(0);}};
			subViews.e = SubViewFact("e");
			subViews.a = SubViewFact("a");
			subViews.z = SubViewFact("z");
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
						calc: function() { return {s: subViews}; }}))();
			view.update();
			assert.equal(view.$el.children()[0].tagName.toUpperCase(), "Z");
			assert.equal(view.$el.children()[1].tagName.toUpperCase(), "E");
			assert.equal(view.$el.children()[2].tagName.toUpperCase(), "A");
		});
	});
});
