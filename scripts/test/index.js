'use strict';

// Entry point so `node --test scripts/test/` works on Node versions that treat
// a directory argument as a module path (Node 22 resolves it to this file)
// rather than expanding it. Loads every *.test.js beside it.

const fs = require('fs');
const path = require('path');

for (const file of fs.readdirSync(__dirname).sort()) {
  if (file.endsWith('.test.js')) require(path.join(__dirname, file));
}
