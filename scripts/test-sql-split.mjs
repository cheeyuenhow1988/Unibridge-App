// Unit test for the seed-migration statement splitter (scripts/sql-split.mjs).
// Proves batched delivery reproduces the file statement-for-statement.
// Run: node scripts/test-sql-split.mjs
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { splitStatements } from './sql-split.mjs';

const sql = fs.readFileSync(new URL('../supabase/migrations/0008_seed_catalog.sql', import.meta.url), 'utf8');
const stmts = splitStatements(sql);
let failures = 0;
const ok = (name, pass, extra = '') => {
  console.log([pass ? 'PASS' : 'FAIL', name, extra].filter(Boolean).join(' | '));
  if (!pass) failures++;
};

ok('splits into many statements', stmts.length > 20000, String(stmts.length));
const malformed = stmts.filter((s) => !/^(insert|truncate)\b/i.test(s) || !/;\s*$/.test(s));
ok('every statement starts insert/truncate and ends with ;', malformed.length === 0,
  malformed.length ? JSON.stringify(malformed[0].slice(0, 120)) : '');

// Reassembly must equal the original minus comments and begin/commit lines —
// nothing dropped, nothing duplicated, nothing reordered.
const orig = sql.split('\n')
  .filter((l) => l.trim() && !/^--/.test(l) && !/^(begin|commit);$/.test(l.trim()))
  .join('\n');
ok('roundtrip: joined statements identical to original content', stmts.join('\n') === orig);

const BATCH = 800;
const sizes = [];
for (let i = 0; i < stmts.length; i += BATCH) {
  sizes.push(Buffer.byteLength(`begin;\n${stmts.slice(i, i + BATCH).join('\n')}\ncommit;`));
}
ok('batch payloads stay well under API limits', Math.max(...sizes) < 1_000_000,
  `${sizes.length} batches, max ${Math.max(...sizes)} bytes`);

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
