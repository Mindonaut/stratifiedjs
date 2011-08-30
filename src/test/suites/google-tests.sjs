var test = require('file:testutil').test;
var g = require('google');

test('search', true, function() {
  var results = g.search("croczilla");
  return results.responseData.results[0].url != null;
});

test('search(., {start:4})', true, function() {
  var results = g.search("croczilla", {start:4});
  return results.responseData.results[0].url != null;
});

test('siteSearch(., {start:4})', true, function() {
  var results = g.siteSearch("stratified", "http://www.croczilla.com", {start:4});
  return results.responseData.results[0].url != null;
});

test('translate', "hallo", function() {
  return g.translate("hello", "de").responseData.translatedText;
});

test('load', true, function() {
  g.load("language", "1");
  return google.language.isFontRenderingSupported("hi");
});

