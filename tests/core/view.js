var window = require("jsdom").jsdom().parentWindow;
var $ = window.jQuery = require("jquery")(window);
var Fluid = require("../../fluid.js")(window);
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
		it("shouldn't crash compiling w/ fill() fun", function() {
			Fluid.compileView({fill: function(){return {hello: "world"};}});
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
				fill: function() {return {val: "val"};}}))();
			view.update();
			assert.equal(view.$el.val(), "val");
		});
		it("should correctly set radio's boolean a value", function() {
			var view = new (Fluid.compileView({
				template: "<input value={{val}} type='radio'></input>",
				fill: function() {return {val: true};}}))();
			view.update();
			assert.equal(view.$el[0].checked, true);
		});
		it("should correctly set a property", function() {
			var view = new (Fluid.compileView({
				template: "<a href={{href}}></a>",
				fill: function() {return {href: "www"};}}))();
			view.update();
			assert.equal(view.$el.attr("href"), "www");
		});
		it("should correctly set a complex property", function() {
			var view = new (Fluid.compileView({
				template: "<a href='http://{{sub}}.{{domain}}.{{tld}}'></a>",
				fill: function() {return {	sub: "www", domain: "google",
											tld: "com"};}}))();
			view.update();
			assert.equal(view.$el.attr("href"), "http://www.google.com");
		});
		it("should correctly set a complex value", function() {
			var view = new (Fluid.compileView({
				template:'<a value="http://{{sub}}.{{domain}}.{{tld}}"></a>',
				fill: function() {return {	sub: "www", domain: "google",
											tld: "com"};}}))();
			view.update();
			assert.equal(view.$el.val(), "http://www.google.com");
		});
		it("should correctly set text", function() {
			var view = new (Fluid.compileView({
				template: "<a>{{text}}</a>",
				fill: function() {return {text: "Hello, World!"};}}))();
			view.update();
			assert.equal(view.$el.text(), "Hello, World!");
		});
		it("should correctly set a sub view", function() {
			var view = new (Fluid.compileView({
				template: "<a>[[sub]]</a>",
				fill: function() {return {sub: 
					new (Fluid.compileView({template: "<br></br>"}))()};}
			}))();
			view.update();
			assert.equal(view.$el.find("br").length, 1);
		});
		it("should update with new info", function() {
			var View = Fluid.compileView({template: "<a href={{href}}></a>",
				fill: function(href) {return {href: href};}});
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
			var view = new (Fluid.compileView({fill: function() {
				var loopUntil = new Date()+10;
				while(loopUntil > new Date())
					;
				if(++n == 2)
					assert.fail(1, 2, "called fill() twice", "==");
				return {};
			}}))();
			view.update();
			view.update();
		});
		it("should respect noMemoize", function(done) {
			var n = 0;
			var view = new (Fluid.compileView({fill: function() {
				if(++n == 2)
					done();
				return {};
			}, noMemoize: true}))();
			view.update();
			view.update();
		});
		it("should not memoize if data is new", function(done) {
			var n = 0;
			var View = Fluid.compileView({fill: function() {
				if(++n == 2)
					done();
				return {};
			}});
			var view = new View()
			view.update();
			view.update(new View(1));
		});
		it("shouldn't memoize if it is slower than running", function() {
			var l = {x: Math.random()};
			var bigObj = ((function(recFun) {
					return recFun(recFun, 15);
				})(function(me, n) {
					return n ? {a: me(me,n-1), b: me(me,n-1)} : l;
				}));
			var cnt = 0;
			var view = new (Fluid.compileView({fill: function(){cnt++;
												return new Object();}}))();
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
	describe("(complex subviews)", function() {
		it("should update single subviews", function() {
			var SubView = Fluid.compileView({template: "<s>{{text}}</s>",
							fill: function(t) {return {text:t};}});
			var view = new (Fluid.compileView({template: "<v>[[s]]</v>",
					fill: function(t) {return {s: new SubView(t)};}}))("");
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
					fill: function() {
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
					fill: function() {
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
					fill: function() {
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
					fill: function() {
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
						fill: function() { return {s: subViews}; }}))();
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
						fill: function() { return {s: subViews}; }}))();
			view.update();
			assert.equal(view.$el.children()[0].tagName.toUpperCase(), "Z");
			assert.equal(view.$el.children()[1].tagName.toUpperCase(), "E");
			assert.equal(view.$el.children()[2].tagName.toUpperCase(), "A");
		});
	});
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
		it("should rewrite complex command (\") if possible", function() {
			var view = new (Fluid.compileView({
				template: "<a href=\"{{href}}\"></a>",
				fill: function() {return {href: "www"};}}))();
			assert.equal(Object.keys(view.attrCommands).length, 1);	
			assert.equal(Object.keys(view.cmplxAttrCmds).length, 0);	
			view.update();
			assert.equal(view.$el.attr("href"), "www");
		});
		it("should rewrite complex command (') if possible", function() {
			var view = new (Fluid.compileView({
				template: "<a href='{{href}}'></a>",
				fill: function() {return {href: "www"};}}))();
			assert.equal(Object.keys(view.attrCommands).length, 1);	
			assert.equal(Object.keys(view.cmplxAttrCmds).length, 0);	
			view.update();
			assert.equal(view.$el.attr("href"), "www");
		});
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
		it("should leave old complex attr if no new one set", function() {
			var view = view12Fact("<a href='{{x}}.com'></a>", "google");
			view.update();
			assert.equal(view.$el.attr("href"), "google.com");
			view.update();
			assert.equal(view.$el.attr("href"), "google.com");
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
