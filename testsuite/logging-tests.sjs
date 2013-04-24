// We can't easily test the actual logging (output),
// but we can at least test the logic & formatting.

var testUtil = require('./lib/testUtil');
var test = require('./lib/testUtil').test;
var logging = require('sjs:logging');

test('default format', 'DEBUG: msg', function() {
  return logging.formatMessage(logging.DEBUG, 'msg');
});

test('value substitution (/ string interpolation)', 'INFO: hello world', function() {
  var who = "world";
  return logging.formatMessage(logging.INFO, "hello #{who}");
});

test('print all log levels and revert', logging.getLevel(), function() {
  logging.print(' ------ test output: ----');
  using(logging.logContext({
    level: logging.DEBUG,
    format: ' (test) {level}: {message}'
  })) {
    logging.debug('debug');
    logging.verbose('verbose');
    logging.info('info');
    logging.warn('warn');
    logging.error('error with JSON object: ', {error: "some error!"});
  }
  return logging.getLevel();
});

test('custom format', 'custom: msg // INFO', function() {
  using(logging.logContext({format: 'custom: {message} // {level}'})) {
    return logging.formatMessage(logging.INFO, "msg");
  }
});

test('defining a custom field function', 'INFO: message!', function() {
  logging.defineField('excited_message', function() {
    return this.message + '!';
  });
  using(logging.logContext({format: '{level}: {excited_message}'})) {
    return logging.formatMessage(logging.INFO, 'message');
  }
});

test('enabled levels at INFO', {DEBUG: false, VERBOSE:false, INFO:true, WARN:true, ERROR:true}, function() {
  var levels = ['DEBUG', 'VERBOSE', 'INFO', 'WARN', 'ERROR'];
  var enabled = {};
  for(var i=0; i<levels.length; i++) {
    var level = levels[i];
    enabled[level] = logging.isEnabled(logging[level]);
  }
  return enabled;
});

//--------------------------------------------------------------------------------
test('logging to debug.console objects',
    {log1: ["INFO: message 1"],
     log2: ["INFO: message 1", "INFO: message 2"],
     nologs: []
    }, function() {
  var debug = require('sjs:xbrowser/console');
  function mkConsole(receivelog) {
    var c = debug.console({receivelog: receivelog});
    // make a console that records log messages
    c.loggedMessages = [];
    c.log = function(msg) {
      this.loggedMessages.push(msg);
    };
    return c;
  };

  var noLogging = mkConsole(false);
  var logging1 = mkConsole(true);
  var logging2 = mkConsole(true);

  logging.info("message 1");

  logging1.shutdown();

  logging.info("message 2");

  logging2.shutdown();

  logging.info("message 3 - should appear in browser console");

  noLogging.shutdown();

  return {
    log1: logging1.loggedMessages,
    log2: logging2.loggedMessages,
    nologs: noLogging.loggedMessages
  };
}).browserOnly();

if (testUtil.at_least_IE(8)) {
  test("formatting quasis", "INFO: Hello " + require("sjs:debug").inspect({'subject':'world'}), function() {
    var obj = {subject: "world"};
    return logging.formatMessage(logging.INFO, `Hello ${obj}`);
  });
} else {
  test("formatting quasis").skip("JSON not available in IE<8");
}
  
