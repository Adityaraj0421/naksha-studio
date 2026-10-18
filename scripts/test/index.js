'use strict';

// Entry point so `node --test scripts/test/` works on Node versions that treat a
// directory argument as a module path: loads every *.test.js file beside it.

const fs = require('fs');
const path = require('path');

for (const file of fs.readdirSync(__dirname).sort()) {
  if (file.endsWith('.test.js')) require(path.join(__dirname, file));
}
