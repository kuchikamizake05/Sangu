"use client";

export type NumpadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "del";

const rows: NumpadKey[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "del"],
];

function DeleteGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-6-6 6-6Z" />
      <path d="M13 10l4 4M17 10l-4 4" />
    </svg>
  );
}

/** Numpad presentasional murni — semua logika nominal ada di pemanggil lewat lib/send-flow.ts. */
export function Numpad({ onKey }: { onKey: (key: NumpadKey) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3" role="group" aria-label="Papan angka nominal">
      {rows.flat().map((key) => (
        <button
          type="button"
          key={key}
          onClick={() => onKey(key)}
          aria-label={key === "del" ? "Hapus angka" : `Angka ${key}`}
          className="flex min-h-[56px] items-center justify-center rounded-2xl bg-canvas text-2xl font-extrabold tabular-nums text-ink transition active:scale-95 active:bg-peach"
        >
          {key === "del" ? <DeleteGlyph /> : key}
        </button>
      ))}
    </div>
  );
}
