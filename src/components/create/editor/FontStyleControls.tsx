"use client";

import {
  googleFontsStylesheetHref,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  VIDEO_FONTS,
  weightsForFont,
  type VideoFontId,
  type VideoFontWeight,
} from "@/remotion/fontCatalog";

export type FontStyleValue = {
  fontId: VideoFontId | null;
  fontWeight: VideoFontWeight;
  fontSize: number;
};

function choiceClass(selected: boolean) {
  return `rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
    selected
      ? "border-accent/50 bg-accent/10 text-accent"
      : "border-border text-muted hover:text-foreground"
  }`;
}

export function FontStyleControls({
  value,
  disabled,
  onChange,
}: {
  value: FontStyleValue;
  disabled?: boolean;
  onChange: (next: FontStyleValue) => void;
}) {
  const weights = weightsForFont(value.fontId);

  return (
    <div className="space-y-3">
      <link rel="stylesheet" href={googleFontsStylesheetHref()} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Font</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange({ ...value, fontId: null })}
            className={choiceClass(value.fontId === null)}
          >
            System
          </button>
          {VIDEO_FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...value,
                  fontId: font.id,
                  fontWeight: font.weights.includes(value.fontWeight)
                    ? value.fontWeight
                    : font.weights[0],
                })
              }
              className={choiceClass(value.fontId === font.id)}
              style={{ fontFamily: font.family }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Weight</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {weights.map((weight) => (
            <button
              key={weight}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ ...value, fontWeight: weight })}
              className={choiceClass(value.fontWeight === weight)}
            >
              {weight}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Size</span>
        <input
          type="range"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          step={2}
          disabled={disabled}
          className="mt-2 w-full"
          value={value.fontSize}
          onChange={(event) => onChange({ ...value, fontSize: Number(event.target.value) })}
        />
        <span className="mt-1 block text-xs tabular-nums text-muted">{value.fontSize}px</span>
      </label>
    </div>
  );
}
