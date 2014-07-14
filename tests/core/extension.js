var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var assert = require("assert");

describe("Extensions", function() {
	describe("#extendModels", function() {
		it("all models init to 1 ext", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendModels({compile: function() {return 1}});
			assert.equal(Fluid.newModel().get(), 1);
			assert.equal(Fluid.newModel(2).get(), 1);
		});
		it("should allow attaching listeners in init", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendModels({init: function(m) {
				m.listen(done);
			}});
			Fluid.newModel().set();
		});
		it("should run alert extensions", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendModels({alert: function(){done()}});
			Fluid.newModel().set();
		});
		it("should keep track of internal variables", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendModels({
				compile: function(val) {return this.val = val;},
				init: function() {this.val++;},
				alert: function(m) { assert.equal(this.val++, m.get()); }});
			var m1 = Fluid.newModel(2);
			var m2 = Fluid.newModel(-100);
			m1.set(m1.get()+1);
			m1.set(m1.get()+1);
			m1.set(m1.get()+1);
			m1.set(m1.get()+1);
			m2.set(m2.get()+1);
			m2.set(m2.get()+1);
			m1.set(m1.get()+1);
			m2.set(m2.get()+1);
			m1.set(m1.get()+1);
		});
		it("should work with two extentions", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendModels({noop: function() {}});
			Fluid.extendModels({noop: function() {}});
			Fluid.newModel();
		});
	});
	describe("#extendViews", function() {
		it("should run compile()", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				compile: function() {done();}
			});
			Fluid.compileView();
		});
		it("should run modifyTemplate()", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				modifyTemplate: function(x) {done(); return x;}
			});
			Fluid.compileView();
		});
		it("should keep track of internal variables", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				compile: function() {this.HELLO = "WORLD";},
				modifyTemplate: function(x) {assert(this.HELLO, "WORLD");
											return x;}
			});
			Fluid.compileView();
		});
		it("should run init()", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				init: function() {done();}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView());
		});
		it("should be able use find() in init()", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				init: function() {	assert.equal(this.find("").length, 1);
									assert.equal(this.find("b").length, 1);}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView({
				template: "<a><b></b></a>"
			}));
		});
		it("should be able use getState() in init()", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				init: function() {
					var state = this.getState();
					assert.equal(state.length, 1);
					assert.equal(state[0], 1);
				}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView({
				template: "<a><b></b></a>"
			}), Fluid.newModel(1));
		});
		it("should be able to replace compile info in compile()", function(){
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				compile: function(x) {x.template = "<a></a>";},
				init: function() {assert.equal(this.find("a").length, 1);}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView());
		});
		it("should use return value of modifyTemplate()", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				modifyTemplate: function() {return "<a></a>";},
				init: function() {assert.equal(this.find("a").length, 1);}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView());
		});
		it("should run control() on update", function(done) {
			var Fluid = require("../../fluid.js")(window);
			var m = Fluid.newModel();
			Fluid.extendViews({
				control: function() {if(m.get() == 1) done();}
			});
			Fluid.attachView($("<a></a>"), Fluid.compileView(), m);
			m.set(1);
		});
		it("should run preprocessValue()", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				preprocessValue: function() {done();}
			});
			Fluid.attachView($("<input></input>"), Fluid.compileView({
				template: "<input value={{x}}></input>",
				fill: function() {return {x: 1};}
			}));
		});
		it("should run postValueProcessing()", function(done) {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				postValueProcessing: function() {done();}
			});
			Fluid.attachView($("<input></input>"), Fluid.compileView({
				template: "<input value={{x}}></input>",
				fill: function() {return {x: 1};}
			}));
		});
		it("should use value from preprocessValue()", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({
				preprocessValue: function() {return 2;},
				postValueProcessing: function() {
					assert.equal(this.find("input").val(), 2);}
			});
			Fluid.attachView($("<input></input>"), Fluid.compileView({
				template: "<input value={{x}}></input>",
				fill: function() {return {x: 1};}
			}));
		});
		it("should work with two extentions", function() {
			var Fluid = require("../../fluid.js")(window);
			Fluid.extendViews({noop: function() {}});
			Fluid.extendViews({noop: function() {}});
			Fluid.compileView();
		});
		it("should allow control() to call update()", function() {
			var Fluid = require("../../fluid.js")(window);
			var EmptyView;
			var view;
			Fluid.extendViews({control: function() {
				if(nCalls++ == 0) {
					view.update(new EmptyView(1));
				}
			}});
			EmptyView = Fluid.compileView();
			view = new EmptyView(0);
			var nCalls = 0;
			view.update();
			assert.equal(nCalls, 2);
		});
	});
});
