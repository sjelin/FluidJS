var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../../fluid.js")(window);
Fluid = require("../../fluid-forms.js")(window, $, Fluid);
var assert = require("assert");

describe("Views", function() {
	describe("#compileView", function() {
		it("shouldn't crash compiling w/ listeners", function() {
			Fluid.compileView({	listeners: {"input" : $.noop},
								template: "<input></input>"});
		}); 
	});
	//----------------------------------------------------------
	// The following tests use internal properties
	//----------------------------------------------------------
	describe("(listeners)", function() {
		function getPrevVal(view, key) {
			for(var k in view)
				if((view[k] != null) && (view[k].prevValues != null))
					return view[k].prevValues[key];
			throw new Error("No Prev Values!");
		}
		it("should log initial value", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"input": $.noop}}))();
			view.update();
			assert.equal(getPrevVal(view, "input"), "val");
		});
		it("should convert value of checkable inputs to bools", function() {
			var view = new (Fluid.compileView({
				template: '<input type="radio"></input>',
				listeners: {"input": $.noop}}))();
			view.update();
			assert.equal(getPrevVal(view, "input"), false);
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
			assert.equal(getPrevVal(view, "input"), "val");
		});
		it("should call listener on init", function() {
			var called = false;
			var view = new (Fluid.compileView({
				template: '<input value="init"></input>',
				listeners: {"input": function(val) {
					assert.equal(val, "init");
					called = true;
			}}}))();
			view.update();
			assert.ok(called);
			assert.equal(getPrevVal(view, "input"), "init");
		});
		it("should note new value", function() {
			var nCalls = 0;
			var view = new (Fluid.compileView({
				template: '<input value=""></input>',
				listeners: {"input": function(val) {
					assert.equal(val, nCalls ? "val" : "");
					nCalls++;
			}}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
			assert.equal(nCalls, 2);
			assert.equal(getPrevVal(view, "input"), "val");
		});
		it("should allow multiple listeners to one value", function(done) {
			var cnt = 0;
			function lstn(val) {
				assert.equal(val, cnt < 2 ? "init" : "val");
				if(++cnt == 4)
					done();
			}
			var view = new (Fluid.compileView({
				template: '<input value="init"></input>',
				listeners: {"input": [lstn, lstn]}}))();
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
		it("should not alert anyone if the value has not changed",function(){
			var init = false;
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"input": function(val) {
					if(init)
						assert.fail(1, 0, "called listeners at wrong time",
																	"==");
					else
						init = true;
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
					if(++cnt == 3)
						assert.fail(3, 2, "called listeners twice","==");
			}}}))();
			view.update();
			view.state = [1];
			view.update();
			view.$el.val("val");
			view.$el.keypress();
		});
		it("should see \"\" as root elem", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"": $.noop}}))();
			view.update();
			assert.equal(getPrevVal(view, ""), "val");
		});
		it("should allow listening with null", function() {
			var view = new (Fluid.compileView({
				template: '<input value="val"></input>',
				listeners: {"": null}}))();
			view.update();
			assert.equal(getPrevVal(view, ""), "val");
			view.$el.val("newVal");
			view.$el.keydown();
			assert.equal(getPrevVal(view, ""), "newVal");
		});
	})
});
