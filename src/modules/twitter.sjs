/*
 * Oni Apollo 'twitter' module
 * Stratified bindings to the Twitter API.
 *
 * Part of the Oni Apollo client-side SJS library
 * 0.9.1+
 * http://onilabs.com/apollo
 *
 * (c) 2010 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
  @module    twitter
  @summary   Stratified bindings to the Twitter API.
*/
var http = require("http");
var common = require("common");

/**
  @function initAnywhere
  @summary Load Twitter &#0064;Anywhere and install stratified functions for accessing the full RESTful Twitter API.
  @param {optional Object} [settings] Hash of settings
  @return {Object} Twitter API Client object with stratified functions *call* and *waitforEvent*, see below.
  @setting {String} [v=1] Version of API to load.
  @setting {String} [id] API key.
  @desc
    See <http://dev.twitter.com/anywhere/begin> for an introduction to the
    Twitter &#0064;Anywhere library.

    *initAnywhere* returns the **Twitter API Client** object (the object named
    **T** in the &#0064;Anywhere docs).

    Two extra functions will be installed on the API Client:

    - *call(method, params)*: make a (stratified) call to the RESTful Twitter API (see <http://dev.twitter.com/doc>).

    - *waitforEvent(event)*: wait for an &#0064;Anywhere event, such as e.g. "authComplete"
*/
exports.initAnywhere = function(settings) {
  settings = common.mergeSettings(
    { v : "1" },
    settings);
  if (!window['twttr'])
    require("http").script([
      "http://platform.twitter.com/anywhere.js", settings
    ]);
  
  try {
    waitfor(var _t) {
      twttr.anywhere(resume);
    };
  }
  catch (e) {
    // twttr.anywhere throws exceptions as strings, not as 'new
    // Error'. Wrap them here so that they show nicely in the IE
    // console, etc.
    if (!(e instanceof Error))
      e = new Error(e);
    throw e;
  }

  var _tw = twttr.anywhere._instances[_t.version].contentWindow.twttr;
  
  /*
  _tw.klass("twttr.anywhere.proxies.Collection").methods({
    $: function() {
      waitfor(var dummy, rv) {
        _tw.anywhere.api.util.chain.bind(this.event, resume);
      }
      return rv;
    }
  });
  */
  
  _t.call = function(method, params) {
    waitfor(var rv, success) {
      params = params || {};
      _tw.anywhere.remote.call(method, [params], {
        success: function(rv) { resume(rv, true); },
        error: function(rv) { resume(rv, false); } 
      });
    }
    if (!success) throw (rv ? rv : "twitter request error");
    return rv;
  };
  
  _t.waitforEvent = function(name) {
    waitfor(var rv) {
      _t.one(name, resume);
    }
    return rv;
  }
  return _t;
};

/**
  @function  getProfile
  @summary   Retrieve a Twitter profile.
  @param     {String} [name] Twitter profile id.
  @return    {Object}
*/
exports.getProfile = function(id) {
  return http.jsonp("http://api.twitter.com/1/users/show/" + id + ".json");
};

/**
  @function  get
  @summary   Retrieve tweets by the given user.
  @param     {String} [name] The Twitter profile id.
  @param     {optional Integer} [limit=10] Limit on the number of tweets to retrieve
  @return    {Object}
*/
exports.get = function(id, limit) {
  limit = limit || 10;
  return http.jsonp(["http://twitter.com/status/user_timeline/" + id + ".json",{count: limit}]);
};

/**
  @function  search
  @summary   Search the Twitter universe.
  @param     {String} [query] A string containing query arguments.
  @param     {optional Object} [params] Key/value hash with optional request parameters. See <http://apiwiki.twitter.com/Twitter-Search-API-Method:-search>
  @return    {Object}
*/
exports.search = function(query, params) {
  return http.jsonp(["http://search.twitter.com/search.json",{q:query}, params]);
};

