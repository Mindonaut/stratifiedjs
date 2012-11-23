/*
 * Oni Rocket Web Application Server
 * Main application module
 *
 * Part of Oni Apollo
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2011 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the GPL v2, see
 * http://www.gnu.org/licenses/gpl-2.0.html
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

var fs = require('apollo:nodejs/fs');
var common = require('apollo:common');
var http = require('apollo:http');
var serverfs = require('./serverfs');
var path = require('path');
var print = function(s) { process.stdout.write(s+"\n") };
var stream = require('apollo:nodejs/stream');

//----------------------------------------------------------------------

function usage() {
  print("Usage: rocket [options]");
  print("");
  print("Options:");
  print("  -h, --help         display this help message");
  print("      --port PORT    server port (default: "+port+")");
  print("      --host IPADDR  server host (default: "+host+"; use 'any' for INADDR_ANY)");
  print("      --root DIR     server root (default: "+root+")");
  print("      --cors         allow full cross-origin access (adds ");
  print("                     'Access-Control-Allow-Origin: *' headers)");
  print("");
}

//----------------------------------------------------------------------

var apollo_root = http.canonicalizeURL('../', module.id).substr(7);
var root = apollo_root;
var port = "7070";
var host = "localhost";
var cors = false;

for (var i=1; i<process.argv.length; ++i) {
  var flag = process.argv[i];
  switch (flag) {
  case "-h":
  case "--help":
    return usage();
    break;
  case "--port":
    port = process.argv[++i];
    break;
  case "--host":
    host = process.argv[++i];
    if (host == "any") host = undefined;
    break;
  case "--root":
    root = process.argv[++i];
    break;
  case "--cors":
    cors = true;
    break;
  default:
    return usage();
  }
}

//----------------------------------------------------------------------
// File format filter maps

// helper filter to wrap a file in a jsonp response:
function json2jsonp(src, dest, req) {
  var callback = req.parsedUrl.queryKey['callback'];
  if (!callback) callback = "callback";
  dest.write(callback + "(");
  stream.pump(src, dest);
  dest.write(")");
}

// filter that wraps a module as 'modp':
function modp(src, dest) {
  src = stream.readAll(src);
  dest.write("module("+require("../tmp/c1jsstr.js").compile(src, {keeplines:true})+");");
}

// filter that compiles sjs into '__oni_compiled_sjs_1' format:
function sjscompile(src, dest, req, etag) {
  src = stream.readAll(src);
  try {
    src = __oni_rt.c1.compile(src, {globalReturn:true, filename:"__onimodulename"});
  }
  catch (e) {
    console.log("sjscompiler: #{req.url} failed to compile at line #{e.compileError.line}: #{e.compileError.message}");
    // communicate the compilation error to the caller in a little bit
    // of a round-about way: We create a compiled SJS file that throws
    // our compile error as an exception on execution
    var error_message = 
      "'SJS syntax error in \\''+__onimodulename+'\\' at line #{e.compileError.line}: #{e.compileError.message.toString().replace(/\'/g, '\\\'')}'";
    src = __oni_rt.c1.compile("throw new Error(#{error_message});", {globalReturn:true, filename:"'compilation@rocket_server'"});
  }

  dest.write("/*__oni_compiled_sjs_1*/"+src);
}

// filter that generates the html boilerplate for *.app files:
function gen_app_html(src, dest, req, etag) {
  var app_name = req.parsedUrl.file || "index.app";
  dest.write(
    "<!DOCTYPE html>
     <html>
       <head>
         <meta http-equiv='Content-Type' content='text/html; charset=UTF-8'>
         <meta name='viewport' content='width=device-width, initial-scale=1.0'>
         <script src='/__oni/apollo/oni-apollo.js'></script>
         <script type='text/sjs'>
           require('#{app_name}!sjs');
         </script>
       </head>
       <body></body>
     </html>");
}

var SJSCache = require('apollo:lru-cache').makeCache(10*1000*1000); // 10MB

function BaseFileFormatMap() { }
BaseFileFormatMap.prototype = {
  html : { none : { mime: "text/html" },
           src  : { mime: "text/plain" }
         },
  js   : { none : { mime: "text/javascript" },
           src  : { mime: "text/plain" }
         },
  json : { none : { mime: "application/json" },
           src  : { mime: "text/plain" },
           jsonp: { mime: "text/javascript",
                    filter: json2jsonp }
         },
  sjs  : { none     : { mime: "text/plain" }, 
           compiled : { mime: "text/plain",
                        filter: sjscompile,
                        // filterETag() returns a tag that will be added onto 
                        // the base file's modification date to derive an etag for
                        // the filtered file.
                        filterETag() { "c1-3" /* xxx could maybe derive this from some 
                                               modification dates; now it needs to be 
                                               changed manually when our compiler or 
                                               compilation format changes */ },
                        // cache is an lru-cache object which caches requests to filtered
                        // files (requires presence of filterETag() ):
                        cache: SJSCache
                      },
           src      : { mime: "text/plain" },
           modp     : { mime: "text/javascript",
                        filter: modp
                      }
         },
  xml  : { none : { mime: "text/xml" },
           src  : { mime: "text/plain" }
         },
  mp4  : { none : { mime: "video/mp4" } },
  wav  : { none : { mime: "audio/wav" } },
  svg  : { none : { mime: "image/svg+xml" } },
  txt  : { none : { mime: "text/plain" } },
  css  : { none : { mime: "text/css" }},
  "*"  : { none : { /* serve without mimetype */ }
         },
  app  : { none     : { mime: "text/html",
                        filter: gen_app_html
                      },
           sjs      : { mime: "text/plain",
                        filter: sjscompile,
                        filterETag() { "c1-3" },
                        cache: SJSCache
                      },
           src      : { mime: "text/plain" }
         }
};

var PublicFileFormatMap = new BaseFileFormatMap();
// serve sjs files only as js, never as source:
//PublicFileFormatMap.sjs = {
//  none : { mime: "text/javascript", filter: sjs2js }
//};

//----------------------------------------------------------------------
// API Bridge

// load in api modules just like normal sjs modules:
require.extensions['api'] = require.extensions['sjs'];
        
function getBridgeAPI(name) {
  var api_module = "file://"+path.join(root, name+".api");
  console.log("API #{api_module} requested");
  var api = require(api_module);
  return require('apollo:rpc/bridge').API(api);
}


//----------------------------------------------------------------------

var pathMap = [
  // we map the apollo client lib + modules under __oni/apollo:
  {
    pattern: /__oni\/apollo(\/.*)$/,
    handler: serverfs.createMappedDirectoryHandler(
      apollo_root,
      PublicFileFormatMap,
      { allowDirListing: true,
        mapIndexToDir: true
      }
    )      
  },
  {
    // bridge-over-aat endpoint:
    pattern: /__oni\/aat\/(.*)$/,
    handler: require('apollo:rpc/aat-server').createTransportHandler(
      function(transport) {
        require('apollo:rpc/bridge').accept(getBridgeAPI, transport);
      }
    )
  },
  {
    // main server root
    pattern: /(\/.*)$/,
    handler: serverfs.createMappedDirectoryHandler(
      root,
      PublicFileFormatMap,
      { allowDirListing: true,
        mapIndexToDir: true }
    )
  }
];

//----------------------------------------------------------------------


waitfor {
  serverfs.setStaticPathMap(pathMap);
  require('apollo:nodejs/http').runSimpleServer(requestHandler, port, host);
}
and {
  print("");
  print("   ^    Oni Rocket Server");
  print("  | |");
  print("  |O|   * Version: 'unstable'");
  print("  | |");
  print(" | _ |  * Launched with root directory");
  print("/_| |_\\   '"+root+"'");
  print(" |||||");
  print("  |||   * Running on http://"+(host ? host : "INADDR_ANY")+":"+port+"/");
  print("  |||");
  print("   |");
}

//----------------------------------------------------------------------

function requestHandler(req, res) {
  try {
    req.parsedUrl = http.parseURL("http://"+req.headers.host+req.url);
    res.setHeader("Server", "OniRocket"); // XXX version
    if (cors)
      res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.method == "GET" || req.method == "HEAD") {
      if (!serverfs.handle_get(req, res)) throw "Unknown request";
    }
    else if (req.method == "POST") {
      if (!serverfs.handle_post(req, res)) throw "Unknown request";
    }
    else
      throw "Unknown method";
  }
  catch (e) {
    try {
      res.writeHead(400);
      res.end(e.toString());
      process.stderr.write("error handling request to #{req.url}; written 400 response: #{e}\n");
    } catch (writeErr) {
      // ending up here means that we probably already sent headers to the clients...
      process.stderr.write(writeErr + "\n");
      // throw the original exception, it's more important
      throw e;
    }
  }
}

