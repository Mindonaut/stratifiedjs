var {context, test, assert} = require("sjs:test/suite");
var runner = require("sjs:test/runner");
var {Runner} = runner;
var {each} = require("sjs:sequence");
var logging = require("sjs:logging");
var debug = require("sjs:debug");

context("hooks") {||
  test("runs all before / after hooks") {||
    var runner = new Runner();
    var events = [];

    runner.collect {||
      context("ctx") {||
        test.beforeAll( -> events.push("before all"));
        test.beforeEach( -> events.push("before each 1"));
        test.beforeEach( -> events.push("before each 2"));
        test.afterEach( -> events.push("after each"));
        test.afterAll( -> events.push("after all 1"));
        test.afterAll( -> events.push("after all 2"));
        test("1", -> events.push("test 1"));
        test("1", -> events.push("test 2"));
      }
    }
    var results = runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(events, [
      'before all',
        'before each 1',
        'before each 2',
          'test 1',
        'after each',

        'before each 1',
        'before each 2',
          'test 2',
        'after each',
      'after all 1',
      'after all 2',
    ]);
  }

  test("runs nested before / after hooks") {||
    var runner = new Runner();
    var events = [];

    runner.collect {||
      context("parent") {||
        test.beforeAll( -> events.push("parent before all"));
        test.beforeEach( -> events.push("parent before each"));
        test.afterEach( -> events.push("parent after each"));
        test.afterAll( -> events.push("parent after all"));
        test("parent test", -> events.push("parent test"));

        context("child") {||
          test.beforeAll( -> events.push("child before all"));
          test.beforeEach( -> events.push("child before each"));
          test.afterEach( -> events.push("child after each"));
          test.afterAll( -> events.push("child after all"));
          test("child test", -> events.push("child test"));
        }
      }
    }
    var results = runner.run();
    assert.ok(results.ok())
    assert.equal(results.count(), 2)
    assert.equal(events, [
      'parent before all',
        'parent before each',
          'parent test',
        'parent after each',

        'child before all',
          'child before each',
            'child test',
          'child after each',
        'child after all',
        
      'parent after all',
    ]);
  }
}

context("filtering") {||
  var runWithFilter = function (filters) {
    var loaded = [];
    var tests_run = [];
    var contexts_run = [];
    var reporter = {
      loading: (mod) -> loaded.push(mod.split("/")[1]),
      run: function(results) {
        waitfor {
          while(true) {
            var testResult = results.testFinished.wait();
            tests_run.push(testResult.test.fullDescription());
          }
        } or {
          while(true) {
            var ctx = results.contextStart.wait();
            contexts_run.push(ctx.fullDescription());
          }
        } or {
          results.end.wait();
        }
      }
    };
    var opts = {
      reporter: reporter,
      base: module.id,
      modules: [
        'fixtures/test_1.sjs',
        'fixtures/test_12.sjs',
        'fixtures/test_2.sjs',
      ],
      defaults: {
        logCapture: false,
        logLevel: logging.VERBOSE,
        testSpecs: filters,
      }
    }
    var results = Runner.run(opts, []);
    return {
      files: loaded,
      results: results,
      tests: tests_run,
      contexts: contexts_run,
    };
  }

  test("on exact relative path") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
    run.results.ok() .. assert.ok("result failed");
  }

  test("on parent directory") {||
    var run = runWithFilter([{file: "fixtures"}]);
    run.files .. assert.eq(["test_1.sjs", "test_12.sjs", "test_2.sjs"]);
  }

  test("unions filters") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_2.sjs"}]);
    run.files .. assert.eq(["test_1.sjs", "test_2.sjs"]);
  }

  test("supports paths relative to cwd()") {||
    // assumes cwd is apollo root
    var run = runWithFilter([{file: "testsuite/test/fixtures/test_1.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
  }.serverOnly("meaningless in a browser");

  test("requires exact match") {||
    var run = runWithFilter([{file: "test_1"}]);
    run.files .. assert.eq([]);

    var run = runWithFilter([{file: "fixtures/test"}]);
    run.files .. assert.eq([]);
  }

  test("fails suite if not all file filters were used") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs"}, {file: "fixtures/test_34.sjs"}]);
    run.files .. assert.eq(["test_1.sjs"]);
    run.results.ok() .. assert.notOk();
  }

  test("on test name substring") {||
    var run = runWithFilter([{test: "test o"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_2:test one",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("on context + test name substring") {||
    var run = runWithFilter([{test: "context_1:test one"}]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_2.sjs:test_2 context_1:test one",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("on both module and test") {||
    var run = runWithFilter([{file: "fixtures/test_1.sjs", test: "test one"},{file: "fixtures/test_2.sjs", test: "test two"},]);
    run.tests .. assert.eq([
      "fixtures/test_1.sjs:test_1 context_1:test one",
      "fixtures/test_1.sjs:test_1 context_2:test one",
      "fixtures/test_2.sjs:test_2 context_1:test two",
      "fixtures/test_2.sjs:test_2 context_2:test two",
    ]);
    run.results.ok() .. assert.ok();
  }

  test("fails suite if unused") {||
    var run = runWithFilter([{test: "test three"}]);
    run.results.ok() .. assert.notOk();
  }
}

context("logging") {||
  test("sets log level during tests (and reverts afterwards)") {||
    var original_level = logging.getLevel();
    var new_level = original_level + 10;

    var runner = new Runner({
      defaults: { logLevel: new_level }
    });

    var test_log_level = null;
    runner.collect() {||
      context("test") {||
        test("1") {||
          test_log_level = logging.getLevel();
        }
      }
    }
    var results = runner.run();
    assert.ok(results.ok());

    assert.ok(logging.getLevel(), original_level);
    assert.ok(test_log_level, new_level);
  }
}

context("test state") {||
  test("before / after shares state") {||
    var runner = new Runner();
    var before_all_state = null;
    var after_all_state = null;
    var before_each_state = [];
    var after_each_state = [];
    var test_state = [];

    runner.collect() {||
      context("ctx") {||

        test.beforeAll { |state|
          state.contextLevel = true;
          before_all_state = state;
        }
        test.afterAll { |state|
          after_all_state = state;
        }

        test.beforeEach { |state|
          state.testLevel = true;
          before_each_state.push(state);
        }

        test.afterEach { |state|
          after_each_state.push(state);
        }

        test("test 1") { |state|
          state.test1 = true;
          test_state.push(state);
        }
        test("test 1") { |state|
          state.test2 = true;
          test_state.push(state);
        }
      }
    }
    var results = runner.run();
    results.ok() .. assert.ok(debug.inspect(results));
    
    // context level states
    assert.ok(before_all_state.contextLevel);
    assert.ok(before_all_state === before_all_state);

    assert.eq(before_each_state.length, 2);
    assert.eq(after_each_state.length, 2);
    assert.eq(test_state.length, 2);

    var first_test_state = test_state[0];
    var second_test_state = test_state[1];

    // first test should have test1 and not property
    assert.ok(first_test_state.hasOwnProperty('test1'));
    assert.notOk('test2' in first_test_state);

    // each test state should inherit from the context level state
    assert.notOk(first_test_state.hasOwnProperty('contextLevel'));
    assert.ok(first_test_state.contextLevel);
    assert.ok(first_test_state.test1);
    assert.ok(before_all_state.isPrototypeOf(first_test_state));
    assert.ok(before_all_state.isPrototypeOf(second_test_state));

    [before_each_state, after_each_state] .. each { |list|
      assert.ok(list[0] === first_test_state);
      assert.ok(list[1] === second_test_state);
    }
  }

  test("context level state inherits from parent context") {||
    var runner = new Runner();
    var parent_state = null;
    var ctx_state = null;

    runner.collect() {||
      context("parent ctx") {||
        test.beforeAll {|state|
          parent_state = state;
        }
        context("ctx") {||
          test.beforeAll {|state|
            ctx_state = state;
          }
          test("test", -> null);
        }
      }
    }

    var results = runner.run();
    results.ok() .. assert.ok(debug.inspect(results));
    
    // context level states
    assert.notOk(ctx_state == parent_state);
    assert.ok(parent_state.isPrototypeOf(ctx_state), "parent is not prototype of ctx");
  }
}
