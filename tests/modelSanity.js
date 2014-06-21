var window = require("jsdom").jsdom().parentWindow;
var Fluid = require("../fluid.js")(window);
var assert = require("assert");

describe("Models", function() {
	describe("(Init, #get, #set)", function() {
		it("should init to undefined", function() {
			assert.equal(undefined, Fluid.newModel().get());	
		});
		for(var i = 0; i < 3; i++) {
			var x = Math.random();
			it("should init to "+x, function() {
				assert.equal(Fluid.newModel(x).get(), x);
			});
			it("should be set to "+x, function() {
				var m = Fluid.newModel();
				assert.notEqual(x, m.get());
				m.set(x);
				assert.equal(m.get(), x);
			});
		}
	});
	describe("(#listen)", function() {
		it("should call listener", function(done) {
			var m = Fluid.newModel();
			m.listen(done);
			m.set();
		});
	});
	describe("(#alert)", function() {
		it("should alert listener", function(done) {
			var m = Fluid.newModel();
			m.listen(done);
			m.alert();
		});
	});
	describe("(#sub, #get, #set)", function() {
		it("should be able to get value from super", function() {
			var m = Fluid.newModel({hello: "world"});
			assert.equal(m.sub("hello").get(), "world");
		});
		it("should get changes from super's change", function() {
			var m = Fluid.newModel({hello: "world"});
			var s = m.sub("hello");
			m.set({hello: "planet"});
			assert.equal(s.get(), "planet");
		});
		it("should change super's object", function() {
			var m = Fluid.newModel({});
			var s = m.sub("hello");
			s.set("world");
			assert.equal(m.get().hello, "world");
		});
	});
	describe("(#sub, #listen, #alert)", function() {
		it("should alert super", function(done) {
			var m = Fluid.newModel();
			var s = m.sub();
			m.listen(done);
			s.alert();
		});
		it("should alert sub", function(done) {
			var m = Fluid.newModel();
			m.sub().listen(done);
			m.alert();
		});
	});
	describe("(alernate syntax)", function() {
		it("should work with function syntax", function() {
			var m = Fluid.newModel();
			m("x");
			assert.equal(m.get(), "x");
			assert.equal(m(), "x");
		});
		it("should work with .val syntax", function() {
			var m = Fluid.newModel();
			m.val = "x";
			assert.equal(m.get(), "x");
			assert.equal(m.val, "x");
		});
	});
});
