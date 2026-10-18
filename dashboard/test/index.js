'use strict';
// Entry point so `node --test dashboard/test/` works on Node 18–22, which
// resolve a directory argument as a module (→ this index.js) rather than
// scanning it. Loads every *.test.js in this folder.
// `node --test dashboard/test/*.test.js` works too.
const fs = require('fs');
const path = require('path');

for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.test.js')).sort()) {
  require(path.join(__dirname, f));
}
