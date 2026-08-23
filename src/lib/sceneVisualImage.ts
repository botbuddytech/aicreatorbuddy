function hueFrom(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) % 360;
  }
  return h;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function sceneVisualImageUrl(label: string): string {
  const source = label.trim() || "Scene visual";
  const hue = hueFrom(source);
  const hue2 = (hue + 46) % 360;
  const caption = escapeXml(source.slice(0, 140));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 42% 24%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 48% 12%)"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="1040" cy="160" r="180" fill="rgba(255,255,255,0.08)"/>
  <text x="64" y="640" fill="rgba(255,255,255,0.92)" font-size="32" font-family="Georgia,serif">${caption}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function sceneVisualPreviewSrc(visuals: {
  thumbnailUrl: string | null;
  description: string;
}): string | null {
  if (visuals.thumbnailUrl) return visuals.thumbnailUrl;
  if (visuals.description.trim()) return sceneVisualImageUrl(visuals.description);
  return null;
}
