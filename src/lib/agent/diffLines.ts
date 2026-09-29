export type DiffRow = {
  kind: "same" | "add" | "del";
  text: string;
};

export function diffLines(before: string, after: string): DiffRow[] {
  const oldLines = before.length > 0 ? before.split("\n") : [];
  const newLines = after.length > 0 ? after.split("\n") : [];
  const rows: DiffRow[] = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let index = 0; index < max; index += 1) {
    const previous = oldLines[index];
    const next = newLines[index];
    if (previous === next && previous !== undefined) {
      rows.push({ kind: "same", text: previous });
      continue;
    }
    if (previous !== undefined) rows.push({ kind: "del", text: previous });
    if (next !== undefined) rows.push({ kind: "add", text: next });
  }
  if (rows.length === 0) rows.push({ kind: "same", text: "" });
  return rows;
}
