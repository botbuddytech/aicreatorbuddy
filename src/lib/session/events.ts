import type { ProjectAction } from "@/components/create/VideoProjectProvider";
import type { StepId, VideoProject } from "@/lib/videoProject";

export type SessionEventType =
  | "session.created"
  | "session.duplicated"
  | "session.deleted"
  | "session.opened"
  | "step.entered"
  | "step.approved"
  | "step.state_changed"
  | "channel.selected"
  | "summary.changed"
  | "summary.reference_added"
  | "summary.reference_removed"
  | "summary.transcript_fetched"
  | "summary.transcript_failed"
  | "generation.completed"
  | "api.call"
  | "asset.clip_added"
  | "asset.clip_removed"
  | "scene.added"
  | "scene.deleted"
  | "scene.moved"
  | "scene.split"
  | "scene.duplicated"
  | "render.completed"
  | "editor.confirmed"
  | "export.started"
  | "export.succeeded"
  | "export.failed"
  | "export.cancelled";

export type PendingSessionEvent = {
  type: SessionEventType;
  step?: StepId | null;
  payload?: Record<string, unknown>;
};

function event(
  type: SessionEventType,
  step: StepId | null,
  payload: Record<string, unknown> = {},
): PendingSessionEvent {
  return { type, step, payload };
}

export function mapActionToEvents(
  action: ProjectAction,
  before: VideoProject,
): PendingSessionEvent[] {
  switch (action.type) {
    case "HYDRATE":
      return [];
    case "SET_CHANNEL":
      return [
        event("channel.selected", "summary", {
          channelId: action.channelId || null,
          previousChannelId: before.channelId || null,
        }),
      ];
    case "UPDATE_SUMMARY": {
      const previousReferences = before.summary.references.length;
      const nextReferences = action.patch.references?.length ?? previousReferences;
      const events = [
        event("summary.changed", "summary", {
          fields: Object.keys(action.patch),
          format: action.patch.format,
          intent: action.patch.intent,
          durationSeconds: action.patch.durationSeconds,
        }),
      ];
      if (nextReferences > previousReferences) {
        events.push(event("summary.reference_added", "summary"));
      } else if (nextReferences < previousReferences) {
        events.push(event("summary.reference_removed", "summary"));
      }
      return events;
    }
    case "SET_STEP_STATUS":
      return [
        event(
          action.status === "approved" ? "step.approved" : "step.state_changed",
          action.step,
          { status: action.status, previousStatus: before.stepStatus[action.step] },
        ),
      ];
    case "RECORD_API_COST":
      return [
        event("api.call", action.entry.step, {
          clientCallId: action.entry.id,
          provider: action.entry.provider,
          kind: action.entry.kind,
          estimatedUsd: action.entry.usd,
        }),
        event("generation.completed", action.entry.step, {
          provider: action.entry.provider,
          kind: action.entry.kind,
          regenerated: before.apiCosts.some(
            (entry) => entry.step === action.entry.step && entry.kind === action.entry.kind,
          ),
        }),
      ];
    case "ADD_SCENE":
      return [event("scene.added", "timeline")];
    case "DELETE_SCENE":
      return [event("scene.deleted", "timeline", { sceneKey: action.id })];
    case "MOVE_SCENE":
      return [
        event("scene.moved", "timeline", { sceneKey: action.id, direction: action.direction }),
      ];
    case "SPLIT_SCENE":
      return [
        event("scene.split", "timeline", { sceneKey: action.id, atSeconds: action.atSeconds }),
      ];
    case "DUPLICATE_SCENE":
      return [event("scene.duplicated", "timeline", { sceneKey: action.id })];
    case "PATCH_SCENE": {
      const previous = before.scenes.find((scene) => scene.id === action.id);
      const clipPatch = action.patch.visuals?.uploadedClipId;
      if (clipPatch !== undefined && clipPatch !== previous?.visuals.uploadedClipId) {
        // Additions are emitted at the upload call site where File metadata is available.
        if (clipPatch) return [];
        return [
          event("asset.clip_removed", "timeline", {
            sceneKey: action.id,
            localClipId: clipPatch,
            previousLocalClipId: previous?.visuals.uploadedClipId ?? null,
          }),
        ];
      }
      return [];
    }
    case "MARK_RENDERED":
      return [event("render.completed", "render")];
    case "CONFIRM_EDIT":
      return [event("editor.confirmed", "editor")];
    default:
      return [];
  }
}
