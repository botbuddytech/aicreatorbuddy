import {
  totalTimelineSeconds,
  type LowEffortFinding,
  type LowEffortReport,
  type LowEffortStep,
  type LowEffortVerdict,
  type Scene,
  type VideoProject,
} from "@/lib/videoProject";

const WORDS_PER_MINUTE = 140;
const FAIL_PENALTY = 22;
const WARN_PENALTY = 10;

const FILLER_PHRASES = [
  "in this video",
  "in today's video",
  "in todays video",
  "let's dive in",
  "lets dive in",
  "without further ado",
  "don't forget to like",
  "dont forget to like",
  "smash that like",
  "like and subscribe",
  "welcome back",
  "what's going on guys",
  "whats going on guys",
];

function hashString(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter(Boolean);
}

function sentenceList(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((part) => part.trim().toLowerCase().replace(/\s+/g, " "))
    .filter((part) => part.length > 20);
}

function wordSet(text: string): Set<string> {
  return new Set(words(text).filter((word) => word.length >= 3));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }
  const union = a.size + b.size - overlap;
  return union === 0 ? 0 : overlap / union;
}

function countPhrase(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (from <= haystack.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    count += 1;
    from = at + needle.length;
  }
  return count;
}

function finding(
  id: string,
  severity: "warn" | "fail",
  title: string,
  detail: string,
): LowEffortFinding {
  return { id, severity, title, detail };
}

function scriptFindings(project: VideoProject): LowEffortFinding[] {
  const script = project.fullScript.trim();
  const out: LowEffortFinding[] = [];
  const tokens = words(script);
  const targetWords = Math.max(1, (project.summary.durationSeconds / 60) * WORDS_PER_MINUTE);

  if (tokens.length === 0) {
    out.push(finding("empty-script", "fail", "Empty script", "There is no spoken draft to scan."));
    return out;
  }

  if (tokens.length < targetWords * 0.7) {
    out.push(
      finding(
        "thin-script",
        "fail",
        "Script is too thin",
        `${tokens.length} words vs ~${Math.round(targetWords)} needed for a ${Math.round(project.summary.durationSeconds / 60)}m read at ${WORDS_PER_MINUTE} wpm.`,
      ),
    );
  } else if (tokens.length < targetWords * 0.9) {
    out.push(
      finding(
        "short-script",
        "warn",
        "Script may run short",
        `${tokens.length} words is under 90% of the ~${Math.round(targetWords)}-word target.`,
      ),
    );
  }

  const sentences = sentenceList(script);
  const sentenceCounts = new Map<string, number>();
  for (const sentence of sentences) {
    sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
  }
  const maxDup = Math.max(0, ...sentenceCounts.values());
  if (maxDup >= 3) {
    out.push(
      finding(
        "repeated-lines",
        "fail",
        "Repeated lines",
        "The same sentence appears three or more times — that reads as reused / templated copy.",
      ),
    );
  } else if (maxDup >= 2) {
    out.push(
      finding(
        "repeated-lines",
        "warn",
        "Duplicated sentence",
        "A sentence is repeated. Trim the copy-paste so each beat is unique.",
      ),
    );
  }

  const gramCounts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - 5; i += 1) {
    const gram = tokens.slice(i, i + 5).join(" ");
    gramCounts.set(gram, (gramCounts.get(gram) ?? 0) + 1);
  }
  const maxGram = Math.max(0, ...gramCounts.values());
  if (maxGram >= 4) {
    out.push(
      finding(
        "repeated-phrases",
        "fail",
        "Repeated phrases",
        "A five-word phrase repeats often enough to look mass-produced.",
      ),
    );
  } else if (maxGram >= 3) {
    out.push(
      finding(
        "repeated-phrases",
        "warn",
        "Repeated phrasing",
        "The same five-word stretch shows up multiple times.",
      ),
    );
  }

  const scriptSet = wordSet(script);
  const refTokens = new Set<string>();
  for (const ref of project.summary.references) {
    for (const token of wordSet(ref.transcript)) refTokens.add(token);
  }
  if (scriptSet.size > 0 && refTokens.size > 0) {
    let overlap = 0;
    for (const token of scriptSet) {
      if (refTokens.has(token)) overlap += 1;
    }
    const ratio = overlap / scriptSet.size;
    if (ratio > 0.4) {
      out.push(
        finding(
          "reference-overlap",
          "fail",
          "Too close to references",
          `${Math.round(ratio * 100)}% of script tokens also appear in reference transcripts.`,
        ),
      );
    } else if (ratio > 0.25) {
      out.push(
        finding(
          "reference-overlap",
          "warn",
          "Heavy reference overlap",
          `${Math.round(ratio * 100)}% of script tokens overlap reference transcripts — add original commentary.`,
        ),
      );
    }
  }

  const lower = script.toLowerCase();
  const fillerHits = FILLER_PHRASES.reduce((sum, phrase) => sum + countPhrase(lower, phrase), 0);
  if (fillerHits >= 5) {
    out.push(
      finding(
        "generic-filler",
        "fail",
        "Generic filler",
        "The draft leans on stock YouTuber phrases (dive in, like and subscribe, in this video).",
      ),
    );
  } else if (fillerHits >= 3) {
    out.push(
      finding(
        "generic-filler",
        "warn",
        "Filler phrases",
        "A few templated openers/CTAs showed up. Swap them for a specific hook.",
      ),
    );
  }

  const opening = tokens.slice(0, 50).join(" ");
  const openingRaw = script.split(/\s+/).slice(0, 50).join(" ");
  const hasQuestion = openingRaw.includes("?");
  const hasNumber = /\d/.test(opening);
  const hasYou = /\byou\b/.test(opening);
  if (!hasQuestion && !hasNumber && !hasYou) {
    out.push(
      finding(
        "weak-hook",
        "warn",
        "Weak opening",
        "The first ~50 words lack a question, a number, or “you” — easy to skip in the first seconds.",
      ),
    );
  }

  return out;
}

function timelineFindings(project: VideoProject): LowEffortFinding[] {
  const scenes = project.scenes;
  const out: LowEffortFinding[] = [];
  if (scenes.length === 0) {
    out.push(
      finding("no-scenes", "fail", "No scenes", "Break the script into a timeline before this check."),
    );
    return out;
  }

  const stocked = scenes.filter((scene) => scene.visuals.stockFootageId);
  if (stocked.length > 0) {
    const counts = new Map<string, number>();
    for (const scene of stocked) {
      const id = scene.visuals.stockFootageId as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const top = Math.max(...counts.values());
    const share = top / stocked.length;
    if (share >= 0.5) {
      out.push(
        finding(
          "reused-stock",
          "fail",
          "Reused stock clip",
          `One stock clip covers ${Math.round(share * 100)}% of scenes that have footage.`,
        ),
      );
    } else if (share >= 0.3) {
      out.push(
        finding(
          "reused-stock",
          "warn",
          "Repeated stock clip",
          `One stock clip is used on ${Math.round(share * 100)}% of stocked scenes.`,
        ),
      );
    }
  }

  const emptyScripts = scenes.filter((scene) => !scene.finalScript.trim()).length;
  if (emptyScripts > scenes.length * 0.5) {
    out.push(
      finding(
        "empty-scripts",
        "fail",
        "Most scenes have no script",
        `${emptyScripts} of ${scenes.length} scenes are missing spoken copy.`,
      ),
    );
  } else if (emptyScripts > 0) {
    out.push(
      finding(
        "empty-scripts",
        "warn",
        "Empty scene scripts",
        `${emptyScripts} scene${emptyScripts === 1 ? "" : "s"} still have no spoken copy.`,
      ),
    );
  }

  const emptyVisuals = scenes.filter(
    (scene) => !scene.visuals.description.trim() && !scene.visuals.stockFootageId,
  ).length;
  if (emptyVisuals > scenes.length * 0.5) {
    out.push(
      finding(
        "empty-visuals",
        "fail",
        "Most scenes have no visuals",
        `${emptyVisuals} of ${scenes.length} scenes have neither a description nor stock footage.`,
      ),
    );
  } else if (emptyVisuals > 0) {
    out.push(
      finding(
        "empty-visuals",
        "warn",
        "Empty visuals",
        `${emptyVisuals} scene${emptyVisuals === 1 ? "" : "s"} have no description and no stock clip.`,
      ),
    );
  }

  const sets = scenes.map((scene) => ({
    scene,
    set: wordSet(scene.finalScript),
    text: scene.finalScript.trim().toLowerCase().replace(/\s+/g, " "),
  }));
  let clonePairs = 0;
  for (let i = 0; i < sets.length; i += 1) {
    const left = sets[i];
    if (!left || left.text.length < 20) continue;
    for (let j = i + 1; j < sets.length; j += 1) {
      const right = sets[j];
      if (!right || right.text.length < 20) continue;
      if (left.text === right.text || jaccard(left.set, right.set) > 0.85) clonePairs += 1;
    }
  }
  if (clonePairs > 0) {
    out.push(
      finding(
        "clone-scripts",
        "fail",
        "Near-duplicate scenes",
        `${clonePairs} scene pair${clonePairs === 1 ? "" : "s"} share almost the same spoken script.`,
      ),
    );
  }

  const durationMinutes = project.summary.durationSeconds / 60;
  const minScenes = Math.max(3, durationMinutes);
  if (scenes.length < minScenes) {
    out.push(
      finding(
        "too-few-scenes",
        "warn",
        "Too few scenes",
        `${scenes.length} scene${scenes.length === 1 ? "" : "s"} for a ${Math.round(durationMinutes * 10) / 10}m target — the cut may feel like a slideshow.`,
      ),
    );
  }

  const uniqueStock = new Set(
    scenes.map((scene) => scene.visuals.stockFootageId).filter((id): id is string => Boolean(id)),
  );
  if (scenes.length >= 6 && uniqueStock.size > 0 && uniqueStock.size <= 2) {
    out.push(
      finding(
        "slideshow",
        "fail",
        "Stock slideshow",
        `${scenes.length} scenes rest on only ${uniqueStock.size} unique stock clip${uniqueStock.size === 1 ? "" : "s"}.`,
      ),
    );
  } else if (scenes.length >= 4 && uniqueStock.size > 0 && uniqueStock.size <= 2) {
    out.push(
      finding(
        "slideshow",
        "warn",
        "Limited stock variety",
        `${scenes.length} scenes use only ${uniqueStock.size} unique stock clip${uniqueStock.size === 1 ? "" : "s"}.`,
      ),
    );
  }

  return out;
}

function renderFindings(project: VideoProject): LowEffortFinding[] {
  const out: LowEffortFinding[] = [];
  const missing: string[] = [];
  if (!project.selectedTitleId) missing.push("title");
  if (!project.selectedThumbnailId) missing.push("thumbnail");
  if (!project.description.trim()) missing.push("description");
  if (missing.length > 0) {
    out.push(
      finding(
        "missing-packaging",
        "warn",
        "Packaging gaps",
        `Missing ${missing.join(", ")} — a thin metadata pack reads as low-effort on upload.`,
      ),
    );
  }

  const target = project.summary.durationSeconds;
  const runtime = totalTimelineSeconds(project.scenes);
  if (target > 0 && runtime > 0 && Math.abs(runtime - target) / target > 0.35) {
    out.push(
      finding(
        "runtime-gap",
        "warn",
        "Runtime misses the target",
        `Timeline is ${Math.round(runtime)}s vs a ${target}s target (more than 35% off).`,
      ),
    );
  }

  if (
    project.scenes.length > 0 &&
    project.scenes.every((scene) => scene.voiceover.status === "empty" || !scene.voiceover.audioUrl)
  ) {
    out.push(
      finding(
        "no-voiceover",
        "warn",
        "No voiceovers",
        "Every scene still has an empty voiceover — a silent stock cut is a common low-effort pattern.",
      ),
    );
  }

  if (
    project.scenes.length > 0 &&
    project.scenes.every((scene) => scene.visuals.stockFootageId) &&
    project.scenes.every((scene) => !scene.visuals.needsCustomFootage)
  ) {
    out.push(
      finding(
        "stock-only",
        "warn",
        "Stock-only cut",
        "Every scene is stock footage with no custom-footage flag. Mix in original stills or b-roll.",
      ),
    );
  }

  return out;
}

function findingsForScope(project: VideoProject, scope: LowEffortStep): LowEffortFinding[] {
  if (scope === "script") return scriptFindings(project);
  if (scope === "timeline") return timelineFindings(project);
  return [...scriptFindings(project), ...timelineFindings(project), ...renderFindings(project)];
}

function scoreFromFindings(findings: LowEffortFinding[]): number {
  const deducted = findings.reduce(
    (sum, item) => sum + (item.severity === "fail" ? FAIL_PENALTY : WARN_PENALTY),
    0,
  );
  return Math.min(100, Math.max(0, 100 - deducted));
}

function verdictFrom(findings: LowEffortFinding[], score: number): LowEffortVerdict {
  if (findings.some((item) => item.severity === "fail") || score < 40) return "fail";
  if (findings.length > 0 || score < 70) return "warn";
  return "pass";
}

export function lowEffortSourceHash(project: VideoProject, scope: LowEffortStep): string {
  const sceneKey = (scenes: Scene[]) =>
    scenes
      .map((scene) =>
        [
          scene.id,
          scene.finalScript,
          scene.visuals.description,
          scene.visuals.stockFootageId ?? "",
          scene.visuals.needsCustomFootage ? "1" : "0",
          scene.voiceover.status,
          scene.voiceover.audioUrl ?? "",
        ].join("|"),
      )
      .join("||");

  if (scope === "script") {
    return hashString(`script:${project.summary.durationSeconds}:${project.fullScript}`);
  }
  if (scope === "timeline") {
    return hashString(
      `timeline:${project.summary.durationSeconds}:${sceneKey(project.scenes)}`,
    );
  }
  return hashString(
    [
      "render",
      project.summary.durationSeconds,
      project.fullScript,
      sceneKey(project.scenes),
      project.selectedTitleId ?? "",
      project.selectedThumbnailId ?? "",
      project.description,
    ].join(":"),
  );
}

export function canRunLowEffortCheck(project: VideoProject, scope: LowEffortStep): boolean {
  if (scope === "script") return project.fullScript.trim().length > 0;
  return project.scenes.length > 0;
}

export function runLowEffortCheck(project: VideoProject, scope: LowEffortStep): LowEffortReport {
  const findings = findingsForScope(project, scope);
  const score = scoreFromFindings(findings);
  return {
    checkedAt: new Date().toISOString(),
    scope,
    sourceHash: lowEffortSourceHash(project, scope),
    score,
    verdict: verdictFrom(findings, score),
    findings,
  };
}
