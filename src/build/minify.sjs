#!/usr/bin/env apollo

function usage() {
  process.stdout.write("SJS minifier\n\n");
  process.stdout.write("Usage: minify.sjs source\n\n");
  process.exit(0);
}

if (process.argv.length !== 2) usage();

var src = require('apollo:node/fs').readFile(process.argv[1]);
var compiler = require('../../tmp/c1jsmin.js');
process.stdout.write(compiler.compile(src, {}));
