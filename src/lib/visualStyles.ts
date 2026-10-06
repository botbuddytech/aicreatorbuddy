export const VISUAL_STYLE_PROMPT_LIMIT = 2_000;

/** Appended after the style on every scene. Kept out of the style text so it is not repeated ten times. */
export const VISUAL_GLOBAL_BLOCK =
  "Narration is voiceover only: the picture illustrates the spoken line through action, objects and environment, with no subtitles of the narration. No character or person looks into the camera or addresses the viewer. When the line names a word, phrase, ticker or number the viewer must read, render that exact text, spelled correctly, large and clearly legible, as part of the scene (sign, label, screen, chart or title). Do not letter a style name, studio name, channel name, or logo anywhere in the picture.";

export const VISUAL_GLOBAL_NEGATIVE =
  "garbled text, misspelled text, gibberish letters, subtitles, captions, watermark, presenter looking at camera";

/** Used when no style is selected, so exclusions stay out of the picture description. */
export const VISUAL_NO_STYLE_NEGATIVE =
  "people, faces, eyes, hands, bodies, silhouettes, presenters, crowds, characters";

const STALE_STYLE_MARKERS = [
  "Do not render the spoken words as readable captions.",
  "When the line names a word, phrase, ticker",
  "The spoken script is voiceover",
  "in the style of Vox",
  "in the style of Pixar",
  "in the style of Studio Ghibli",
  "in the style of Zack D Films",
];

/** A saved style that still carries the old repeated rules, so it can be replaced by the visual-only prompt. */
export function isStaleStylePrompt(prompt: string): boolean {
  return STALE_STYLE_MARKERS.some((marker) => prompt.includes(marker));
}

export const VISUAL_STYLES = [
  {
    id: "vox",
    label: "Vox",
    prompt:
      "Editorial explainer motion graphics. Flat vector design with generous empty space on a clean cream or muted background. Limited palette of 3 to 4 colors (deep navy, warm red-orange, mustard yellow, cream) plus one accent. Bold sans-serif type used as graphic blocks, simplified maps, clean charts, torn newspaper clippings, halftone texture, cut-paper collage illustrations with soft drop shadows, and a yellow highlighter swipe over key words. Objects, icons and data visuals illustrate the line. Stepped animation on twos, as if drawn at 12 fps.",
    negative: "photorealistic, 3D render, gradients, cluttered layout, presenter, anime, host, cartoon characters",
  },
  {
    id: "pixar",
    label: "Pixar",
    prompt:
      "Feature-animation 3D. Rounded, appealing character designs with soft skin, big expressive eyes, and readable facial and body acting. Tactile materials such as fabric weave, felt, painted wood and glossy plastic. Warm global illumination, soft bounce light, gentle rim light, rich harmonious colors, shallow depth of field, cinematic framing. Characters act inside the scene, with their gaze on objects or on each other.",
    negative: "photorealistic, uncanny valley, game cutscene, flat 2D, harsh lighting",
  },
  {
    id: "stickman",
    label: "Stickman",
    prompt:
      "Minimalist stickman animation. Black line figures of uniform thickness with perfect circle heads and straight stick limbs, on a plain light off-white background with lots of empty space. Props are drawn as a few simple outlines. Flat look with no shading and no gradients. Faces are blank or just dot eyes and a line mouth. Clear, exaggerated body poses and strong silhouettes. The figures act out the spoken line.",
    negative: "shading, gradients, realistic faces, detailed background, 3D, filled color areas",
  },
  {
    id: "2d",
    label: "2D",
    prompt:
      "Flat 2D cartoon animation. Clean even outlines, solid color fills with no gradients, and layered cut-out parts that move like a puppet rig. Simple geometric backgrounds in a coherent limited palette. Simple, readable character designs. Limited animation with clear holds between actions.",
    negative: "anime eyes, painterly background, watercolor scenery, marker doodle, infographic, 3D, gradients",
  },
  {
    id: "3d",
    label: "3D",
    prompt:
      "Polished 3D CGI render. Real volume and depth, smooth shading, and physically based materials (metal, glass, rubber, concrete) with accurate reflections and soft shadows. Global illumination, cinematic lighting, shallow depth of field. A virtual camera moves inside a fully built environment, with slow dolly and parallax. Clean, modern, high-end look.",
    negative: "cute cartoon characters, feature-animation style, cutaway diagram, live action, flat 2D, low-poly",
  },
  {
    id: "ghibli",
    label: "Ghibli",
    prompt:
      "Hand-painted animation. Soft watercolor and gouache backgrounds, luminous skies with towering clouds, lush detailed foliage, wind moving grass and hair, dappled light and gentle haze. Gentle round-faced characters with simple eyes and understated acting. Quiet, slow camera moves, warm nostalgic color grade, visible paper and brush texture, thin soft linework.",
    negative: "TV anime, hard cel shading, 3D, neon colors, speed lines, glossy digital look",
  },
  {
    id: "anime",
    label: "Anime",
    prompt:
      "Japanese television anime. Crisp cel shading with hard-edged shadow shapes, clean dark linework, large expressive eyes with highlights, vivid saturated hair colors. Dramatic low and high camera angles, speed lines, impact frames and held poses with limited in-betweens. Strong backlighting and bold color contrast. Characters act the scene.",
    negative: "3D, painterly watercolor backgrounds, realistic, soft airbrushed shading, western cartoon",
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    prompt:
      "Whiteboard explainer. A plain clean white board with a faint marker sheen. Black marker lines are drawn stroke by stroke by a visible hand: simple icons, arrows, boxes, diagrams, and hand-lettered labels. Optionally one spot color (red or blue) used sparingly for emphasis. Line art only, with lots of white space. The drawing builds in time with the spoken line.",
    negative: "color fills, shading, 3D, photos, gradients, textured background, clutter",
  },
  {
    id: "zack-d",
    label: "Zack D Films",
    prompt:
      "Semi-realistic 3D game-cinematic short. Smooth clay or glossy plastic materials, slightly exaggerated proportions, dramatic studio lighting with strong rim light and deep contrast, shallow macro depth of field, cinematic color grade, tight close-ups. Characters perform a curiosity beat, such as leaning in, peeking or reaching. When the line reveals something unseen, cut away to a cross-section view that shows the hidden inner workings.",
    negative: "cute feature animation, flat anime, photoreal skin, 2D, cluttered background",
  },
  {
    id: "short-film",
    label: "Short film",
    prompt:
      "Live-action narrative short film. Motivated practical light, shallow depth of field, real locations, real wardrobe, and one consistent film grade. Characters perform the beat inside the scene. Slow, motivated camera moves.",
    negative: "vlog, talking-head video, 3D animation, cartoon, presenter posing for the camera",
  },
  {
    id: "realistic",
    label: "Realistic",
    prompt:
      "Photorealistic cinematic footage shot on a full-frame cinema camera with a 35mm lens. Real light and natural materials with accurate textures, subtle film grain, believable physics and motion, natural color grade, realistic depth of field, documentary B-roll feel. A person appears only when the spoken line needs someone observed, caught candidly in the middle of an activity.",
    negative: "illustration, cartoon, cel animation, plastic CGI look, oversaturated, over-processed HDR, posing for the camera",
  },
] as const;

export type VisualStyleId = (typeof VISUAL_STYLES)[number]["id"];

export type VisualStylePromptMap = Partial<Record<VisualStyleId, string>>;

const VISUAL_STYLE_IDS = new Set<string>(VISUAL_STYLES.map((style) => style.id));

export function isVisualStyleId(value: string): value is VisualStyleId {
  return VISUAL_STYLE_IDS.has(value);
}

export function visualStyleById(id: VisualStyleId): (typeof VISUAL_STYLES)[number] {
  const style = VISUAL_STYLES.find((item) => item.id === id);
  if (!style) throw new Error(`Unknown visual style: ${id}`);
  return style;
}

/** Exclusions for a style, or for the faceless film when no style is selected. */
export function visualAvoidList(styleId: VisualStyleId | null): string {
  const styleNegative = styleId ? visualStyleById(styleId).negative : VISUAL_NO_STYLE_NEGATIVE;
  return `${VISUAL_GLOBAL_NEGATIVE}, ${styleNegative}`;
}

export function normalizeVisualStyle(value: unknown): VisualStyleId | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return isVisualStyleId(id) ? id : null;
}

export function normalizeVisualStylePrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > VISUAL_STYLE_PROMPT_LIMIT) return null;
  return text;
}

export function normalizeVisualStylePrompts(value: unknown): VisualStylePromptMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const prompts: VisualStylePromptMap = {};
  for (const [key, prompt] of Object.entries(value)) {
    const id = normalizeVisualStyle(key);
    const text = normalizeVisualStylePrompt(prompt);
    if (id && text) prompts[id] = text;
  }
  return prompts;
}

export function sessionVisualStylePrompt(
  styleId: VisualStyleId | null,
  prompts: VisualStylePromptMap | null | undefined,
): string | null {
  if (!styleId || !prompts) return null;
  return prompts[styleId] ?? null;
}
