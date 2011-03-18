/*
 * Oni Apollo SJS bootstrap code
 *
 * Part of the Oni Apollo Cross-Browser StratifiedJS Runtime
 * 0.11.0+
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

//----------------------------------------------------------------------
// sjs library functions required by bootstrap code

/**
  @function xhr
  @summary Performs an XMLHttpRequest.
  @param {URLSPEC} [url] Request URL (in the same format as accepted by [http.constructURL](#http/constructURL))
  @param {optional Object} [settings] Hash of settings (or array of hashes)
  @return {String}
  @setting {String} [method="GET"] Request method.
  @setting {QUERYHASHARR} [query] Additional query hash(es) to append to url. Accepts same format as [http.constructQueryString](#http/constructQueryString).
  @setting {String} [body] Request body.
  @setting {Object} [headers] Hash of additional request headers.
  @setting {String} [username] Username for authentication.
  @setting {String} [password] Password for authentication.
  @setting {String} [mime] Override mime type.
  @setting {Boolean} [throwing=true] Throw exception on error.
  @desc
    ### Cross-site requests:

    The success of cross-site requests depends on whether the
    server allows the access (see <http://www.w3.org/TR/cors/>) and on whether
    the browser is capable of issuing cross-site requests. This can be checked with
    [http.isCORSCapable](#http/isCORSCapable).

    The standard XMLHttpRequest can handle cross-site requests on compatible
    browsers (any recent Chrome, Safari, Firefox). On IE8+, xhr will
    automatically fall back to using MS's XDomainRequest object for
    cross-site requests. 

    ### Request failure:

    If the request is unsuccessful, and the call is configured to
    throw exceptions (setting {"throwing":true}; the default), an
    exception will be thrown which has a 'status' member set to the
    request status. If the call is configured to not throw, an empty
    string will be returned.

    ###Example:

        try { 
          alert(http.xhr("foo.txt"));
        }
        catch (e) {
          alert("Error! Status="+e.status);
        }

*/
__oni_rt.xhr = function xhr(url, settings) {
  var opts = __oni_rt.accuSettings({},
                                   [
                                     {
                                       method   : "GET",
                                       //    query    : undefined,
                                       body     : null,
                                       //    headers  : undefined,
                                       //    username : undefined,
                                       //    password : undefined,
                                       throwing   : true
                                     },
                                     settings
                                   ]);
  url = __oni_rt.constructURL(url, opts.query);

  var caps = __oni_rt.getXHRCaps();
  if (!caps.XDR || __oni_rt.isSameOrigin(url, document.location)) {
    var req = caps.XHR_ctor();
    req.open(opts.method, url, true, opts.username || "", opts.password || "");
  }
  else {
    // A cross-site request on IE, where we have to use XDR instead of XHR:
    req = new XDomainRequest();
    req.open(opts.method, url);
  }
  
  waitfor(var error) {
    if (req.onerror !== undefined) {
      req.onload = function() { resume(); };
      req.onerror = function() { resume(true); };
    }
    else { // IE
      req.onreadystatechange = function(evt) {
        if (req.readyState != 4)
          return;
        else
          resume();
      };
    }

    if (opts.headers)
      for (var h in opts.headers)
        req.setRequestHeader(h, opts.headers[h]);
    if (opts.mime && req.overrideMimeType)
      req.overrideMimeType(opts.mime);
    req.send(opts.body);
  }
  retract {
    req.abort();
  }

  // file urls will return a success code '0', not '2'!
  if (error ||
      (req.status !== undefined && // req.status is undefined for IE XDR objs
       !(req.status.toString().charAt(0) in {'0':1,'2':1}))) {
    if (opts.throwing) {
      var txt = "Failed " + opts.method + " request to '"+url+"'";
      if (req.statusText) txt += ": "+req.statusText;
      if (req.status) txt += " ("+req.status+")";
      var err = new Error(txt);
      err.status = req.status;
      throw err;
    }
    else
      return "";
  }
  return req.responseText;
};

//----------------------------------------------------------------------
// $eval
var $eval;

if (__oni_rt.UA == "msie" && window.execScript) {
  // IE hack. On IE, 'eval' doesn't fill the global scope.
  // And execScript doesn't return a value :-(
  // We use waitfor/resume & catchall foo to get things working anyway.
  // Note: it is important to check for msie above. Other browsers (chrome)
  // implement execScript too, and we don't want them to take this suboptimal
  // path.
  __oni_rt.IE_resume_counter = 0;
  __oni_rt.IE_resume = {};
  
  $eval = function(code, settings) {
    var filename = (settings && settings.filename) || "'$eval code'";
    var mode = (settings && settings.mode) || "balanced";
    try {
      waitfor(var rv, isexception) {
        var rc = ++__oni_rt.IE_resume_counter;
        __oni_rt.IE_resume[rc]=resume;
        var js = __oni_rt.c1.compile(
          "try{"+code+
            "\n}catchall(rv) { spawn(hold(0),__oni_rt.IE_resume["+rc+"](rv[0],rv[1])) }", {filename:filename, mode:mode});
        window.execScript(js);
      }
      if (isexception) throw rv;
    }
    finally {
      delete __oni_rt.IE_resume[rc];
    }
    return rv;
  };
}
else {
  // normal, sane eval
  $eval = function(code, settings) {
    var filename = (settings && settings.filename) || "'$eval code'";
    var mode = (settings && settings.mode) || "balanced";
    var js = __oni_rt.c1.compile(code, {filename:filename, mode:mode});
    return window.eval(js);
  };
}

//----------------------------------------------------------------------
// require mechanism

__oni_rt.pendingLoads = {};


// require.alias, require.path are different for each
// module. makeRequire is a helper to construct a suitable require
// function that has access to these variables:
__oni_rt.makeRequire = function(parent) {
  // make properties of this require function accessible in requireInner:
  var rf = function(module) {
    return __oni_rt.requireInner(module, rf, parent);
  };
  rf.path = ""; // default path is empty
  rf.alias = {};
  return rf;
}

// helper to resolve aliases
__oni_rt.resolveAliases = function(module, aliases) {
  var ALIAS_REST = /^([^:]+):(.*)$/;
  var alias_rest, alias;
  var rv = module;
  var level = 10; // we allow 10 levels of aliasing
  while ((alias_rest=ALIAS_REST.exec(rv)) &&
         (alias=aliases[alias_rest[1]])) {
    if (--level == 0)
      throw "Too much aliasing in modulename '"+module+"'";
    rv = alias + alias_rest[2];
  }
  return rv;
};

// helper to resolve hubs
__oni_rt.resolveHubs = function(module, hubs) {
  var path = module;
  var loader = __oni_rt.default_loader;
  var level = 10; // we allow 10 levels of rewriting indirection
  for (var i=0,hub; hub=hubs[i++]; ) {
    if (path.indexOf(hub[0]) == 0) {
      // we've got a match
      if (typeof hub[1] == "string") {
        path = hub[1] + path.substring(hub[0].length);
        i=0; // start resolution from beginning again
        if (--level == 0)
          throw "Too much indirection in hub resolution for module '"+module+"'";
      }
      else {
        // assert(typeof hub[1] == "function")
        loader = hub[1];
        // that's it; no more indirection
        break;
      }
    }
  }
  return {path:path, loader:loader};
};

// default module loader
__oni_rt.default_loader = function(path) {
  if (__oni_rt.getXHRCaps().CORS ||
      __oni_rt.isSameOrigin(path, document.location))
    src = __oni_rt.xhr(path, {mime:"text/plain"});
  else {
    // browser is not CORS capable. Attempt modp:
    path += "!modp";
    src = require('__builtin:__sys_xbrowser').jsonp(path,
                                                    {forcecb:"module",
                                                     cbfield:null});
  }
  return { src: src, loaded_from: path };
};

// loader that loads directly from github
__oni_rt.github_loader = function(path) {
  var user, repo, tag;
  try {
    [,user,repo,tag,path] = /github:([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)/.exec(path);
  } catch(e) { throw "Malformed module id '"+path+"'"; }
  
  var github_api = "http://github.com/api/v2/json/";
  var github_opts = {cbfield:"callback"};
  // XXX maybe some caching here
  var tree_sha;
  var sys = require('__builtin:__sys_xbrowser');
  waitfor {
    (tree_sha = sys.jsonp([github_api, 'repos/show/', user, repo, '/tags'],
                          github_opts).tags[tag]) || hold();
  }
  or {
    (tree_sha = sys.jsonp([github_api, 'repos/show/', user, repo, '/branches'],
                          github_opts).branches[tag]) || hold();
  }
  or {
    hold(5000);
    throw new Error("Github timeout");
  }

  waitfor {
  var src = sys.jsonp([github_api, 'blob/show/', user, repo, tree_sha, path],
                      github_opts).blob.data;
  }
  or {
    hold(5000);
    throw new Error("Github timeout");
  }
  
  return {
    src: src,
    loaded_from: "http://github.com/"+user+"/"+repo+"/blob/"+tree_sha+"/"+path
  };
};

// requireInner: workhorse for require
__oni_rt.requireInner = function(module, require_obj, parent) {
  var path;
  // apply path if module is relative
  if (module.indexOf(":") == -1) {
    if (require_obj.path && require_obj.path.length)
      path = __oni_rt.constructURL(require_obj.path, module);
    else
      path = module;
    path = __oni_rt.canonicalizeURL(path, parent ? parent : document.location);
  }
  else
    path = module;

  if (parent == window.__oni_rt_require_base)
    parent = "[toplevel]";

  // apply default extension; determine if path points to js file
  var matches, is_js = false;
  if (!(matches=/.*\.(js|sjs)$/.exec(path)))
    path += ".sjs";
  else if (matches[1] == "js")
    is_js = true;
  
  // apply local aliases
  path = __oni_rt.resolveAliases(path, require_obj.alias);
  // apply global aliases
  var loader;
  ({path,loader}) = __oni_rt.resolveHubs(path, window.require.hubs);
  
  var descriptor;
  if (!(descriptor = window.require.modules[path])) {
    // we don't have this module cached -> load it
    var pendingHook = __oni_rt.pendingLoads[path];
    if (!pendingHook) {
      pendingHook = __oni_rt.pendingLoads[path] = spawn (function() {
        var src, loaded_from;
        try {
          if (path in __oni_rt.modsrc) {
            // a built-in module
            loaded_from = "[builtin]";
            src = __oni_rt.modsrc[path];
            delete __oni_rt.modsrc[path];
            // xxx support plain js modules for built-ins?
          }
          else {
            ({src, loaded_from}) = loader(path);
          }
          var f;
          var descriptor = {
            id: path,
            exports: {},
            loaded_from: loaded_from,
            loaded_by: parent,
            required_by: {}
          };
          if (is_js) {
            f = new Function("module", "exports", src);
            f(descriptor, descriptor.exports);
          }
          else {
            f = $eval("(function(module, exports, require){"+src+"})",
                      {filename:"module '"+path+"'"});
            f(descriptor, descriptor.exports, __oni_rt.makeRequire(path));
          }
          // It is important that we only set window.require.modules[module]
          // AFTER f finishes, because f might block, and we might get
          // reentrant calls to require() asking for the module that is
          // still being constructed.
          window.require.modules[path] = descriptor;
        }
        catch (e) {
          var mes = "Cannot load module '"+path+"'. "+
            "(Underlying exception: "+e+")";
          throw new Error(mes);
        }
        finally {
          delete __oni_rt.pendingLoads[path];
        }
        return descriptor;
      })();
    }
    var descriptor = pendingHook.waitforValue();
  }
  
  if (!descriptor.required_by[parent])
    descriptor.required_by[parent] = 1;
  else
    ++descriptor.required_by[parent];
  
  return descriptor.exports;  
};

// global require function:
var require = __oni_rt.makeRequire(window.__oni_rt_require_base);

require.hubs = [
  ["sjs:__sys.sjs", "__builtin:__sys_xbrowser.sjs" ],
  ["apollo:", "http://code.onilabs.com/apollo/0.11.0+/modules/" ],
  ["github:", __oni_rt.github_loader ]
];
require.modules = {};

// require.APOLLO_LOAD_PATH: path where this oni-apollo.js lib was
// loaded from, or "" if it can't be resolved:
require.APOLLO_LOAD_PATH = "";

//----------------------------------------------------------------------
// script loading:

__oni_rt.runScripts = function() {
  var scripts = document.getElementsByTagName("script");
  
  // if there is something like a require('google').load() call in
  // one of the scripts, our 'scripts' variable will change. In some
  // circumstances this can lead to scripts being executed twice. To
  // prevent this, we select text/sjs scripts and eval them in two passes:
  
  // this doesn't work on IE: ("JScript object expected")
  //var ss = Array.prototype.slice.call(scripts, 0);
  var ss = [];
  for (var i=0; i<scripts.length; ++i) {
    var matches;
    if (scripts[i].getAttribute("type") == "text/sjs") {
      var s = scripts[i];
      ss.push(s);
    }
    else if ((matches = /(.*)oni-apollo.js$/.exec(scripts[i].src)))
      require.APOLLO_LOAD_PATH = matches[1];
  }
  
  for (var i=0; i<ss.length; ++i) {
    var s = ss[i];
    var m = s.getAttribute("module");
    // textContent is for XUL compatibility:
    var content = s.textContent || s.innerHTML;
    if (m)
      __oni_rt.modsrc[m] = content;
    else
      $eval(content, {filename:"inline script "+(i+1)});
  }
};
