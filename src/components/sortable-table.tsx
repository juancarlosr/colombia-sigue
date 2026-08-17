"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SortableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean; // default true
};

export type SortableCell = {
  node: ReactNode;
  // Plain value used only for ordering; null sorts last.
  value: string | number | null;
};

export type SortableRow = {
  id: string;
  cells: Record<string, SortableCell>;
};

export function compareSortValues(
  a: string | number | null,
  b: string | number | null,
): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { sensitivity: "base", numeric: true });
}

export function SortableTable({
  columns,
  rows,
}: {
  columns: SortableColumn[];
  rows: SortableRow[];
}) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const direction = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const result = compareSortValues(
        a.cells[sort.key]?.value ?? null,
        b.cells[sort.key]?.value ?? null,
      );
      // nulls stay last regardless of direction
      const aNull = (a.cells[sort.key]?.value ?? null) === null;
      const bNull = (b.cells[sort.key]?.value ?? null) === null;
      if (aNull || bNull) return result;
      return result * direction;
    });
  }, [rows, sort]);

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {columns.map((column) => {
              const isActive = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  className={cn("p-0", column.align === "right" && "text-right")}
                  aria-sort={
                    isActive ? (sort.dir === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  {column.sortable === false ? (
                    <span className="block px-3 py-2 font-bold tracking-wider uppercase">
                      {column.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-1 px-3 py-2 font-bold tracking-wider uppercase transition-colors hover:text-foreground",
                        column.align === "right" && "justify-end",
                        isActive && "text-foreground",
                      )}
                    >
                      {column.label}
                      <span aria-hidden="true" className="w-3 text-[0.6rem]">
                        {isActive ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.id} className="border-b align-top last:border-0">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn("px-3 py-2", column.align === "right" && "text-right")}
                >
                  {row.cells[column.key]?.node}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
