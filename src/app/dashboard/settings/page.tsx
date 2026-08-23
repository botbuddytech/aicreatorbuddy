"use client";

import { FormEvent, useState } from "react";
import { Topbar } from "@/components/dashboard/Topbar";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { demoProfile, workspaceChannels } from "@/lib/dashboardContent";

const TIMEZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Kolkata",
  "UTC",
] as const;

export default function SettingsPage() {
  const [name, setName] = useState<string>(demoProfile.name);
  const [timezone, setTimezone] = useState<string>(demoProfile.timezone);
  const [defaultChannelId, setDefaultChannelId] = useState<string>(demoProfile.defaultChannelId);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    window.setTimeout(() => {
      setSaving(false);
      setMessage("Saved — demo only. These settings are not persisted.");
    }, 600);
  }

  return (
    <>
      <Topbar title="Profile settings" subtitle="Dummy account preferences for this demo workspace" />
      <div className="space-y-6 px-6 py-6">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
              {demoProfile.initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">{demoProfile.name}</h2>
                <Badge tone="accent">{demoProfile.plan}</Badge>
                <Badge>{demoProfile.role}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{demoProfile.email}</p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-border bg-surface p-5"
        >
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground">Account</h3>
            <p className="mt-1 text-sm text-muted">Shown in the sidebar and workspace chrome.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" htmlFor="profile-name">
              <Input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </Field>
            <Field label="Email" htmlFor="profile-email" hint="Demo login cannot be changed.">
              <Input id="profile-email" value={demoProfile.email} readOnly />
            </Field>
            <Field label="Timezone" htmlFor="profile-timezone">
              <Select
                id="profile-timezone"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
              >
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default channel" htmlFor="profile-channel">
              <Select
                id="profile-channel"
                value={defaultChannelId}
                onChange={(event) => setDefaultChannelId(event.target.value)}
              >
                <option value="all">All channels</option>
                {workspaceChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Email alerts</p>
              <p className="text-xs text-muted">Render complete, quota warnings, and publish reminders.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailAlerts}
              onClick={() => setEmailAlerts((value) => !value)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                emailAlerts ? "bg-accent" : "bg-white/10"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  emailAlerts ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ActionButton type="submit" loading={saving} loadingLabel="Saving…">
              Save changes
            </ActionButton>
            {message ? <p className="text-sm text-muted">{message}</p> : null}
          </div>
        </form>
      </div>
    </>
  );
}
