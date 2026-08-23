export function PaginationBar({
  page,
  pageCount,
  showing,
  onChange,
}: {
  page: number;
  pageCount: number;
  showing: string;
  onChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted">{showing}</p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          ‹
        </button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`h-8 w-8 rounded-lg text-sm font-semibold ${
              item === page
                ? "bg-accent text-white"
                : "border border-border text-muted hover:text-foreground"
            }`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-border px-2 py-1 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}
