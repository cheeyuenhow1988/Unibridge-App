// Splits the GENERATED seed migration into whole statements for batched
// delivery through the Supabase Management API (which caps request sizes).
// Works because gen-seed.mjs starts every statement at column 0 with one of
// these keywords and indents continuation lines — and no string literal in
// the datasets begins a line that way.
export function splitStatements(sql) {
  const stmts = [];
  let current = [];
  for (const line of sql.split('\n')) {
    if (/^(insert|truncate|begin|commit)\b/i.test(line)) {
      if (current.length) stmts.push(current.join('\n'));
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) stmts.push(current.join('\n'));
  return stmts.filter((s) => !/^(begin|commit)\s*;?\s*$/i.test(s.trim()));
}
