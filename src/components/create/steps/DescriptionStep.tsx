"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { GenerateBar } from "@/components/create/GenerateBar";
import { usePipelineGeneration } from "@/components/create/useGeneration";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import { summaryPrompt } from "@/lib/mockAi";
import { providersForStep, selectedTitle } from "@/lib/videoProject";

export function DescriptionStep() {
  const { project, dispatch } = useVideoProject();
  const { busy, error, generate: runGenerate } = usePipelineGeneration();
  const provider = project.providerByStep.description ?? "chatgpt";
  const title = selectedTitle(project)?.text;
  const prompt = [summaryPrompt(project.summary), title ? `Selected title: ${title}` : ""]
    .filter(Boolean)
    .join("\n");

  async function generate() {
    const result = await runGenerate(
      "desc",
      "description",
      { prompt, title },
      provider,
      "description",
    );
    if (result) {
      dispatch({
        type: "SET_DESCRIPTION",
        description: result.description,
        tags: result.tags,
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="font-display text-lg font-semibold text-foreground">
          YouTube description
        </h3>
        <p className="mt-1 text-sm text-muted">
          Generate a description plus suggested tags, then edit anything before render.
        </p>
        <div className="mt-4">
          <GenerateBar
            providers={providersForStep("description")}
            provider={provider}
            onProviderChange={(next) =>
              dispatch({ type: "SET_PROVIDER", step: "description", provider: next })
            }
            onGenerate={generate}
            generating={busy === "desc"}
            hasOutput={project.description.length > 0}
            generateLabel="Generate description"
            regenerateLabel="Regenerate description"
            error={error}
          />
        </div>
      </div>

      {busy === "desc" ? (
        <Skeleton className="h-64" />
      ) : project.description ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <Textarea
            rows={14}
            value={project.description}
            onChange={(event) =>
              dispatch({ type: "SET_DESCRIPTION", description: event.target.value })
            }
          />
          <div className="mt-4">
            <p className="mb-1.5 text-sm font-medium text-foreground">Tags</p>
            <Input
              value={project.tags.join(", ")}
              onChange={(event) =>
                dispatch({
                  type: "SET_DESCRIPTION",
                  description: project.description,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                })
              }
              placeholder="youtube growth, faceless, ai video"
            />
          </div>
        </div>
      ) : (
        <EmptyState
          title="No description yet"
          description="Generate copy from the introduction and selected title."
        />
      )}
    </div>
  );
}
