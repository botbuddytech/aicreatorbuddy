import type { ReactNode } from "react";

export function SimpleTable({
  columns,
  rows,
}: {
  columns: readonly { key: string; label: string; align?: "left" | "right" }[];
  rows: readonly Record<string, ReactNode>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`pb-3 font-medium ${column.align === "right" ? "text-right" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-border/60 last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-3 ${column.align === "right" ? "text-right" : ""} ${
                    index % 2 === 1 ? "" : ""
                  }`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
