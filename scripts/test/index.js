'use strict';

// Lets `node --test scripts/test/` work: Node's test runner treats a directory
// argument as a module path, which resolves to this file. It loads every
// *.test.js file here so their tests register with the runner.
// `node --test scripts/test/*.test.js` runs the same tests without this shim.

const fs = require('fs');
const path = require('path');

for (const file of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, file));
}
