function hueFrom(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 360;
  }
  return h;
}

export function PlaceholderImage({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  const hue = hueFrom(label);
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className || "aspect-video w-full"}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 42% 24%), hsl(${(hue + 46) % 360} 48% 12%))`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_45%)]" />
      <p className="absolute inset-x-3 bottom-3 line-clamp-3 text-left text-xs font-semibold leading-snug text-white/90">
        {label}
      </p>
    </div>
  );
}
