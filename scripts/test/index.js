'use strict';
// Entry point so `node --test scripts/test/` works on Node versions that treat a
// directory argument as a module path: loads every *.test.js file in this folder.
// (`node --test scripts/test/*.test.js` runs the same tests.)

const fs = require('fs');
const path = require('path');

for (const f of fs.readdirSync(__dirname).sort()) {
  if (f.endsWith('.test.js')) require(path.join(__dirname, f));
}
