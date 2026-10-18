// Entry point so `node --test scripts/test/` works on Node 22+, which resolves
// a directory argument as a module (this file) instead of scanning it.
// Loads every *.test.js beside it; `node --test scripts/test/*.test.js` also works.
'use strict';

const fs = require('fs');
const path = require('path');

for (const file of fs.readdirSync(__dirname).sort()) {
  if (file.endsWith('.test.js')) require(path.join(__dirname, file));
}
