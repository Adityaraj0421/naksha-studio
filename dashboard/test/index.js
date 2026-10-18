'use strict';

// Lets `node --test scripts/test/ dashboard/test/` work on Node 22, which runs a
// directory argument as a module (this index.js) instead of expanding it.
// When a test runner globs this file directly, the sibling *.test.js files run
// on their own, so nothing is loaded twice.

const fs = require('fs');
const path = require('path');

if (path.basename(process.argv[1] || '') !== 'index.js') {
  for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js')).sort()) {
    require(path.join(__dirname, f));
  }
}
