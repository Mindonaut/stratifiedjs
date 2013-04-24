var testUtil = require('./lib/testUtil');
var test = testUtil.test;
var relativeURL = require("./lib/testContext").getHttpURL;

if(testUtil.isBrowser) {
  var dom = require('sjs:xbrowser/dom');
  function synthesizeClick(elem) {
    elem = elem || document;
    if (document.createEvent) {
      var click = document.createEvent("MouseEvents");
      click.initEvent("click", true, true);
      elem.dispatchEvent(click);
    }
    else // IE
      elem.fireEvent("onclick");
  }

  test('waitforEvent', true, function() {
    waitfor {
      dom.waitforEvent(document, 'click');
      return true;
    }
    or {
      hold(0);
      synthesizeClick();
      hold();
    }
    or {
      // timeout
      hold(1000);
    }
    return false;
  });

  test('eventQueue', true, function() {
    waitfor {
      using (var Q = dom.eventQueue(document, "click")) {
        for (var i=0; i<10; ++i) {
          hold(Math.random()*100);
          Q.get();
        }
      }
    }
    and {
      for (var j=0; j<10; ++j) {
        hold(Math.random()*100);
        synthesizeClick();
      }
    }
    if (Q.count() != 0) throw "Not all events consumed";
    synthesizeClick();
    if (Q.count() != 0) throw "Queue still listening when it shouldn't";
    return true;
  });

  test('cookies', true, function() {
    var data = "  "+Math.random()+"\n\n\tfoo";
    dom.setCookie("testcookie", data);
    hold(100);
    if (data != dom.getCookie("testcookie")) throw "Cookie data corrupted";
    dom.removeCookie("testcookie");
    hold(100);
    if (dom.getCookie("testcookie") != "") throw "Can't clear cookie";
    return true;
  });

  var webserverJsonpTimeout = 5000;

  test("dom.script", 77, function() {
    waitfor {
      waitfor {
        dom.script(relativeURL("data/testscript.js"));
      }
      and {
        dom.script(relativeURL("data/testscript.js"));
      }
    }
    or { hold(webserverJsonpTimeout); return "timeout"; }
    // testscript_var should have been set by the testscript
    return testscript_var;
  });

  test("dom.script throwing", true, function() {
    waitfor {
      try {
        dom.script(relativeURL("data/nonexistant.js"));
      }
      catch (e) {
      }
    }
    or { hold(webserverJsonpTimeout); return "timeout"; }
    return true;
  });

  test("matchesSelector", true, function() {
    var elem = document.createElement('div');
    elem.innerHTML = "<div class='foo'><div id='bar'></div></div>";
    return dom.matchesSelector(elem.firstChild.firstChild, '.foo #bar');
  });

  test("~matchesSelector", false, function() {
    var elem = document.createElement('div');
    elem.innerHTML = "<div class='foo'><div id='barx'></div></div>";
    return dom.matchesSelector(elem.firstChild.firstChild, '.foo #bar');
  });

  test("traverseDOM", true, function() {
    var elem = document.createElement('div');
    elem.innerHTML = "<div data-x='foo'><div id='bar'></div></div>";
    dom.traverseDOM(elem.firstChild.firstChild, elem) { 
      |e|
      if (e.hasAttribute('data-x')) return true;
    }
    return false;
  });

  test("findNode", 'bar', function() {
    var elem = document.createElement('div');
    elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
    var node = dom.findNode('.foo [data-x]',elem.firstChild.firstChild.firstChild, elem);
    return node ? node.getAttribute('data-x') : null;
  });

  test("findNode exclusive", 'not found', function() {
    var elem = document.createElement('div');
    elem.setAttribute('class', 'xyz');
    elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
    var node = dom.findNode('.xyz',elem.firstChild.firstChild.firstChild, elem);
    return node ? 'found' : 'not found';
  });

  test("findNode inclusive", 'found', function() {
    var elem = document.createElement('div');
    elem.setAttribute('class', 'xyz');
    elem.innerHTML = "<div class='foo'><div data-x='bar'><div id='baz'></div></div></div>";
    var node = dom.findNode('.xyz',elem.firstChild.firstChild.firstChild, elem, true);
    return node ? 'found' : 'not found';
  });

}

