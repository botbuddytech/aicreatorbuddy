import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEditing, normalizeEditorSettings } from "@/lib/videoProject";

test("overlay fonts keep a known face and snap an unsupported weight", () => {
  const editing = normalizeEditing({
    textOverlay: {
      text: "Patagonia",
      position: "top",
      fontId: "bebas",
      fontWeight: "700",
      fontSize: 80,
    },
  });

  assert.deepEqual(editing.textOverlay, {
    text: "Patagonia",
    position: "top",
    fontId: "bebas",
    fontWeight: "400",
    fontSize: 80,
  });
});

test("old overlays stay on the system font", () => {
  const editing = normalizeEditing({
    textOverlay: { text: "Hello", position: "bottom" },
  });

  assert.equal(editing.textOverlay?.fontId, null);
  assert.equal(editing.textOverlay?.fontWeight, "600");
  assert.equal(editing.textOverlay?.fontSize, 48);
});

test("unknown caption fonts fall back and sizes stay in range", () => {
  const editor = normalizeEditorSettings({
    captionFontId: "comic-sans",
    captionFontWeight: "700",
    captionFontSize: 12,
  });

  assert.equal(editor.captionFontId, null);
  assert.equal(editor.captionFontWeight, "700");
  assert.equal(editor.captionFontSize, 28);

  const playfair = normalizeEditorSettings({
    captionFontId: "playfair",
    captionFontWeight: "600",
    captionFontSize: 200,
  });
  assert.equal(playfair.captionFontId, "playfair");
  assert.equal(playfair.captionFontWeight, "400");
  assert.equal(playfair.captionFontSize, 96);
});
