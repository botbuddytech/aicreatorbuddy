import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/youtube-mark.png"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(180deg, #0e1118 0%, #0b0d12 55%, #080a0f 100%)",
          padding: 72,
          color: "#f4f6f8",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            width={64}
            height={64}
            style={{ borderRadius: 16 }}
          />
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>
            AI Creator Buddy
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 980 }}>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.6,
            }}
          >
            Faceless YouTube video, across every channel you run.
          </div>
          <div style={{ fontSize: 28, color: "#9aa4b2", lineHeight: 1.35, maxWidth: 860 }}>
            AI voice, scenes, edit, SEO, and multi-channel publish in one workspace.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
