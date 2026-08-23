export const AUTH_STORAGE_KEY = "yb_auth";
export const SIDEBAR_COLLAPSED_KEY = "yb_sidebar_collapsed";

export const demoAuth = {
  email: "demo@aicreatorbuddy.app",
  password: "demo1234",
} as const;

export const demoProfile = {
  name: "Demo User",
  initials: "DU",
  email: demoAuth.email,
  role: "Owner",
  workspace: "AI Creator Buddy",
  plan: "Studio",
  timezone: "America/New_York",
  defaultChannelId: "all",
} as const;

export type ChannelStatus = {
  id: string;
  name: string;
  initials: string;
  color: string;
  subscribers: string;
  views: string;
  revenue: string;
  connected: boolean;
  lastSync: string;
};

export const workspaceChannels: ChannelStatus[] = [
  {
    id: "gt",
    name: "Growth Lab",
    initials: "GT",
    color: "bg-[#ff3b4e]",
    subscribers: "482K",
    views: "1.2M",
    revenue: "$1,840",
    connected: true,
    lastSync: "2 min ago",
  },
  {
    id: "vl",
    name: "Viral Cuts",
    initials: "VL",
    color: "bg-[#3b82f6]",
    subscribers: "291K",
    views: "860K",
    revenue: "$980",
    connected: true,
    lastSync: "5 min ago",
  },
  {
    id: "sc",
    name: "Studio Core",
    initials: "SC",
    color: "bg-[#22c55e]",
    subscribers: "158K",
    views: "420K",
    revenue: "$620",
    connected: true,
    lastSync: "12 min ago",
  },
  {
    id: "nx",
    name: "NextWave",
    initials: "NX",
    color: "bg-[#a855f7]",
    subscribers: "94K",
    views: "210K",
    revenue: "$400",
    connected: false,
    lastSync: "Never",
  },
];

export const overviewStats = [
  {
    label: "Subscribers",
    value: "1.03M",
    delta: "+4.2%",
    positive: true,
    accent: "accent" as const,
  },
  {
    label: "Watch time",
    value: "480.5 hrs",
    delta: "+11%",
    positive: true,
    accent: "chart-blue" as const,
  },
  {
    label: "Revenue",
    value: "$3,840",
    delta: "+23%",
    positive: true,
    accent: "success" as const,
  },
  {
    label: "Avg. view duration",
    value: "4m 12s",
    delta: "-2.1%",
    positive: false,
    accent: "chart-purple" as const,
  },
] as const;

export const trafficSources = [
  { label: "Search", value: 42, color: "bg-accent" },
  { label: "Browse", value: 28, color: "bg-chart-blue" },
  { label: "Suggested", value: 18, color: "bg-chart-purple" },
  { label: "External", value: 8, color: "bg-chart-amber" },
  { label: "Direct", value: 4, color: "bg-muted" },
] as const;

export type OverviewPrimaryIcon = "views" | "subs" | "watch" | "revenue";

export type OverviewPrimaryStat = {
  id: string;
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: OverviewPrimaryIcon;
  accent: "accent" | "chart-blue" | "success" | "chart-purple";
  sparkline: readonly number[];
};

export const overviewPrimaryStats: OverviewPrimaryStat[] = [
  {
    id: "views",
    label: "Views",
    value: "2.4M",
    delta: "+12.4%",
    positive: true,
    icon: "views",
    accent: "accent",
    sparkline: [42, 48, 44, 61, 58, 72, 68, 80, 76, 88, 84, 96],
  },
  {
    id: "subs",
    label: "Subscribers",
    value: "184.2K",
    delta: "+3.1%",
    positive: true,
    icon: "subs",
    accent: "chart-blue",
    sparkline: [52, 54, 53, 58, 57, 62, 61, 66, 65, 70, 69, 74],
  },
  {
    id: "watch",
    label: "Watch time",
    value: "96.8K hrs",
    delta: "+8.7%",
    positive: true,
    icon: "watch",
    accent: "success",
    sparkline: [36, 40, 38, 50, 47, 58, 55, 64, 61, 72, 70, 78],
  },
  {
    id: "revenue",
    label: "Revenue",
    value: "$12,480",
    delta: "-2.4%",
    positive: false,
    icon: "revenue",
    accent: "chart-purple",
    sparkline: [70, 74, 72, 80, 78, 76, 82, 79, 75, 73, 71, 68],
  },
];

export const overviewSecondaryStats = [
  { label: "Likes", value: "186K", delta: "+6.2%", positive: true },
  { label: "Comments", value: "12.4K", delta: "+4.1%", positive: true },
  { label: "Shares", value: "8.9K", delta: "+9.8%", positive: true },
  { label: "Avg. CTR", value: "5.8%", delta: "-0.3%", positive: false },
  { label: "Impressions", value: "18.2M", delta: "+11%", positive: true },
  { label: "Unique viewers", value: "940K", delta: "+2.4%", positive: true },
] as const;

export const topCountries = [
  { label: "United States", value: 38, color: "bg-success", flag: "🇺🇸" },
  { label: "India", value: 16, color: "bg-success", flag: "🇮🇳" },
  { label: "United Kingdom", value: 11, color: "bg-success", flag: "🇬🇧" },
  { label: "Brazil", value: 9, color: "bg-success", flag: "🇧🇷" },
  { label: "Germany", value: 7, color: "bg-success", flag: "🇩🇪" },
] as const;

export type UploadStatus = "published" | "live" | "scheduled" | "draft";

export type RecentUpload = {
  id: string;
  title: string;
  duration: string;
  status: UploadStatus;
  meta: string;
  views?: string;
  likes?: string;
  comments?: string;
  vsAvg?: string;
  vsAvgPositive?: boolean;
  watching?: string;
  peak?: string;
  scheduledFor?: string;
  draftProgress?: number;
};

export const recentUploads: RecentUpload[] = [
  {
    id: "u1",
    title: "I Tried Every AI Video Tool in 2026",
    duration: "14:22",
    status: "published",
    meta: "Published 2 days ago",
    views: "248K",
    likes: "18K",
    comments: "1.2K",
    vsAvg: "+34%",
    vsAvgPositive: true,
  },
  {
    id: "u2",
    title: "Live: Faceless Channel Q&A",
    duration: "LIVE",
    status: "live",
    meta: "Streaming now",
    watching: "1.8K",
    peak: "2.4K peak",
  },
  {
    id: "u3",
    title: "Thumbnail Psychology: 7 Hooks That Work",
    duration: "11:05",
    status: "published",
    meta: "Published 5 days ago",
    views: "91K",
    likes: "6.4K",
    comments: "420",
    vsAvg: "+12%",
    vsAvgPositive: true,
  },
  {
    id: "u4",
    title: "Script to Publish in 20 Minutes",
    duration: "09:48",
    status: "scheduled",
    meta: "Goes live in 2 days",
    scheduledFor: "Tue 10:00 AM",
  },
  {
    id: "u5",
    title: "Why Your Retention Drops at 0:08",
    duration: "08:12",
    status: "published",
    meta: "Published 1 week ago",
    views: "176K",
    likes: "14K",
    comments: "890",
    vsAvg: "-6%",
    vsAvgPositive: false,
  },
  {
    id: "u6",
    title: "Untitled draft — growth teardown",
    duration: "—",
    status: "draft",
    meta: "Edited 3 hours ago",
    draftProgress: 62,
  },
];

export type ScheduledVideoStatus = "scheduled" | "processing";
export type AiScoreLabel = "Excellent" | "Good";

export type ScheduledVideo = {
  id: string;
  title: string;
  duration: string;
  date: string;
  time: string;
  status: ScheduledVideoStatus;
  aiScore: number;
  aiLabel: AiScoreLabel;
};

export const scheduledVideos: ScheduledVideo[] = [
  {
    id: "s1",
    title: "The Algorithm Change Nobody Noticed",
    duration: "12:40",
    date: "Aug 25",
    time: "10:00 AM EST",
    status: "scheduled",
    aiScore: 92,
    aiLabel: "Excellent",
  },
  {
    id: "s2",
    title: "Faceless Niche: 30-Day Case Study",
    duration: "16:05",
    date: "Aug 27",
    time: "9:00 AM EST",
    status: "scheduled",
    aiScore: 88,
    aiLabel: "Excellent",
  },
  {
    id: "s3",
    title: "B-Roll Pack: Desk to Skyline",
    duration: "08:18",
    date: "Aug 29",
    time: "2:00 PM EST",
    status: "processing",
    aiScore: 76,
    aiLabel: "Good",
  },
  {
    id: "s4",
    title: "Shorts Sprint: 5 Hooks, 1 Topic",
    duration: "00:52",
    date: "Sep 1",
    time: "11:30 AM EST",
    status: "scheduled",
    aiScore: 81,
    aiLabel: "Good",
  },
];

export type SchedulerBadgeTone = "accent" | "chart-blue" | "chart-purple" | "chart-amber" | "success";
export type SchedulerStatIcon =
  | "calendar"
  | "camera"
  | "broadcast"
  | "shorts"
  | "upload"
  | "check"
  | "processing"
  | "clock"
  | "day"
  | "time"
  | "eye"
  | "ai";

export type SchedulerStatCardData = {
  id: string;
  label: string;
  value: string;
  icon: SchedulerStatIcon;
  badge: { text: string; tone: SchedulerBadgeTone };
  sub?: string;
};

export const calendarStatCards: SchedulerStatCardData[] = [
  {
    id: "scheduled",
    label: "Scheduled Videos",
    value: "12",
    icon: "calendar",
    badge: { text: "This Week", tone: "accent" },
  },
  {
    id: "premieres",
    label: "Premieres",
    value: "3",
    icon: "camera",
    badge: { text: "Upcoming", tone: "chart-purple" },
  },
  {
    id: "lives",
    label: "Live Streams",
    value: "2",
    icon: "broadcast",
    badge: { text: "Live", tone: "chart-amber" },
  },
  {
    id: "shorts",
    label: "Shorts Scheduled",
    value: "8",
    icon: "shorts",
    badge: { text: "Shorts", tone: "chart-blue" },
  },
];

export type CalendarEventKind = "scheduled" | "premiere" | "live";

export type CalendarEvent = {
  id: string;
  year: number;
  month: number;
  day: number;
  title: string;
  time: string;
  kind: CalendarEventKind;
  panel?: boolean;
};

export const calendarEvents: CalendarEvent[] = [
  { id: "e1", year: 2026, month: 7, day: 5, title: "Hook Teardown Shorts Batch", time: "11:00 AM", kind: "scheduled" },
  { id: "e2", year: 2026, month: 7, day: 8, title: "Thumbnail A/B Premiere", time: "4:00 PM", kind: "premiere" },
  { id: "e3", year: 2026, month: 7, day: 12, title: "Growth Lab Live Office Hours", time: "7:00 PM", kind: "live" },
  { id: "e4", year: 2026, month: 7, day: 15, title: "Script to Publish in 20 Minutes", time: "10:00 AM", kind: "scheduled" },
  { id: "e5", year: 2026, month: 7, day: 18, title: "Retention Drop Autopsy", time: "2:00 PM", kind: "scheduled" },
  { id: "e6", year: 2026, month: 7, day: 20, title: "Faceless Channel AMA", time: "6:30 PM", kind: "live" },
  { id: "e7", year: 2026, month: 7, day: 23, title: "AI Tools Review 2025", time: "3:00 PM", kind: "scheduled", panel: true },
  { id: "e8", year: 2026, month: 7, day: 24, title: "Tech Talk Premiere", time: "8:00 PM", kind: "premiere", panel: true },
  { id: "e9", year: 2026, month: 7, day: 25, title: "The Algorithm Change Nobody Noticed", time: "10:00 AM", kind: "scheduled" },
  { id: "e10", year: 2026, month: 7, day: 27, title: "Faceless Niche: 30-Day Case Study", time: "9:00 AM", kind: "scheduled" },
  { id: "e11", year: 2026, month: 7, day: 29, title: "Live Q&A Session", time: "7:00 PM", kind: "live", panel: true },
  { id: "e12", year: 2026, month: 7, day: 31, title: "B-Roll Pack: Desk to Skyline", time: "2:00 PM", kind: "scheduled" },
  { id: "e13", year: 2026, month: 8, day: 1, title: "Shorts Sprint: 5 Hooks, 1 Topic", time: "11:30 AM", kind: "scheduled" },
];

export const bestTimeBars = [
  { label: "3:00 PM", value: 95, color: "bg-accent" },
  { label: "4:00 PM", value: 95, color: "bg-success" },
  { label: "6:00 PM", value: 95, color: "bg-chart-blue" },
  { label: "7:00 PM", value: 95, color: "bg-chart-amber" },
] as const;

export const upcomingUploadsStatCards: SchedulerStatCardData[] = [
  {
    id: "scheduled",
    label: "Scheduled Videos",
    value: "12",
    icon: "upload",
    badge: { text: "+12%", tone: "chart-blue" },
    sub: "vs last week",
  },
  {
    id: "ready",
    label: "Ready to Publish",
    value: "8",
    icon: "check",
    badge: { text: "Ready", tone: "success" },
  },
  {
    id: "processing",
    label: "Being Processed",
    value: "3",
    icon: "processing",
    badge: { text: "Processing", tone: "chart-amber" },
  },
  {
    id: "next-up",
    label: "Until Next Upload",
    value: "",
    icon: "clock",
    badge: { text: "Next Up", tone: "accent" },
  },
];

export const nextUploadOffsetMs = ((2 * 60 + 34) * 60 + 12) * 1000;

export type UpcomingUploadStatus = "scheduled" | "processing" | "ready";

export type UpcomingUpload = {
  id: string;
  title: string;
  duration: string;
  status: UpcomingUploadStatus;
  scheduledLabel: string;
};

export const upcomingUploads: UpcomingUpload[] = [
  {
    id: "u1",
    title: "Complete React Tutorial for Beginners 2024",
    duration: "12:45",
    status: "scheduled",
    scheduledLabel: "Today, 3:00 PM",
  },
  {
    id: "u2",
    title: "AI Tools Review 2025",
    duration: "14:22",
    status: "scheduled",
    scheduledLabel: "Today, 3:00 PM",
  },
  {
    id: "u3",
    title: "The Algorithm Change Nobody Noticed",
    duration: "12:40",
    status: "scheduled",
    scheduledLabel: "Tue, 10:00 AM",
  },
  {
    id: "u4",
    title: "Tech Talk Premiere",
    duration: "18:05",
    status: "scheduled",
    scheduledLabel: "Tomorrow, 8:00 PM",
  },
  {
    id: "u5",
    title: "Faceless Niche: 30-Day Case Study",
    duration: "16:05",
    status: "scheduled",
    scheduledLabel: "Thu, 9:00 AM",
  },
  {
    id: "u6",
    title: "Shorts Sprint: 5 Hooks, 1 Topic",
    duration: "00:52",
    status: "scheduled",
    scheduledLabel: "Sep 1, 11:30 AM",
  },
  {
    id: "u7",
    title: "B-Roll Pack: Desk to Skyline",
    duration: "08:18",
    status: "processing",
    scheduledLabel: "Rendering voiceover",
  },
  {
    id: "u8",
    title: "Thumbnail Psychology: 7 Hooks That Work",
    duration: "11:05",
    status: "processing",
    scheduledLabel: "Mixing captions",
  },
  {
    id: "u9",
    title: "Voiceover Mix Pass — Growth Teardown",
    duration: "09:12",
    status: "processing",
    scheduledLabel: "Generating visuals",
  },
  {
    id: "u10",
    title: "Script to Publish in 20 Minutes",
    duration: "09:48",
    status: "ready",
    scheduledLabel: "Ready to publish",
  },
  {
    id: "u11",
    title: "Why Your Retention Drops at 0:08",
    duration: "08:12",
    status: "ready",
    scheduledLabel: "Ready to publish",
  },
  {
    id: "u12",
    title: "I Tried Every AI Video Tool in 2026",
    duration: "14:22",
    status: "ready",
    scheduledLabel: "Ready to publish",
  },
];

export const upcomingProcessingCount = upcomingUploads.filter((item) => item.status === "processing").length;

export const bestTimeStatCards: SchedulerStatCardData[] = [
  {
    id: "best-day",
    label: "Best Day",
    value: "Saturday",
    icon: "day",
    badge: { text: "Optimal", tone: "success" },
    sub: "32% higher engagement",
  },
  {
    id: "best-time",
    label: "Best Time",
    value: "3:00 PM",
    icon: "time",
    badge: { text: "Peak Hour", tone: "chart-blue" },
    sub: "847K avg. active viewers",
  },
  {
    id: "online-now",
    label: "Audience Online Now",
    value: "124,582",
    icon: "eye",
    badge: { text: "Live", tone: "accent" },
    sub: "18% vs last hour",
  },
  {
    id: "confidence",
    label: "AI Confidence",
    value: "94.7%",
    icon: "ai",
    badge: { text: "AI", tone: "chart-purple" },
    sub: "Based on 2.4M data points",
  },
];

export const heatmapHours = [
  "12AM",
  "2AM",
  "4AM",
  "6AM",
  "8AM",
  "10AM",
  "12PM",
  "2PM",
  "4PM",
  "6PM",
  "8PM",
  "10PM",
] as const;

export const heatmapDays = [
  { key: "mon", label: "Mon", best: false },
  { key: "tue", label: "Tue", best: false },
  { key: "wed", label: "Wed", best: false },
  { key: "thu", label: "Thu", best: false },
  { key: "fri", label: "Fri", best: false },
  { key: "sat", label: "Sat", best: true },
  { key: "sun", label: "Sun", best: false },
] as const;

export type HeatmapDayKey = (typeof heatmapDays)[number]["key"];

export const activityHeatmap: Record<HeatmapDayKey, number[]> = {
  mon: [0, 0, 0, 0, 1, 1, 2, 2, 3, 2, 1, 1],
  tue: [0, 0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1],
  wed: [0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 2, 1],
  thu: [0, 0, 0, 1, 1, 2, 3, 3, 3, 3, 2, 1],
  fri: [0, 0, 1, 1, 1, 2, 3, 3, 4, 3, 4, 2],
  sat: [0, 0, 0, 1, 2, 3, 4, 4, 4, 4, 3, 2],
  sun: [0, 0, 0, 1, 2, 3, 4, 4, 4, 3, 3, 2],
};

export type InsightTone = "success" | "chart-blue" | "chart-amber";

export type AiInsight = {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
};

export const aiInsights: AiInsight[] = [
  {
    id: "optimal",
    tone: "success",
    title: "Optimal Posting Window",
    body: "Saturday 2PM - 8PM shows 45% higher first-hour engagement.",
  },
  {
    id: "pattern",
    tone: "chart-blue",
    title: "Audience Pattern",
    body: "Your audience is 62% more active on weekends.",
  },
  {
    id: "avoid",
    tone: "chart-amber",
    title: "Avoid Posting",
    body: "Monday 2AM - 6AM has the lowest engagement rate.",
  },
];

export type TopTimeSlot = {
  rank: number;
  day: string;
  time: string;
  viewers: string;
  tone: SchedulerBadgeTone;
};

export const topTimeSlots: TopTimeSlot[] = [
  { rank: 1, day: "Sat", time: "3:00 PM", viewers: "195K", tone: "success" },
  { rank: 2, day: "Sat", time: "5:00 PM", viewers: "185K", tone: "chart-blue" },
  { rank: 3, day: "Sun", time: "4:00 PM", viewers: "175K", tone: "chart-amber" },
  { rank: 4, day: "Fri", time: "8:00 PM", viewers: "168K", tone: "accent" },
];

export type ChartRange = "7d" | "28d" | "90d" | "1y";
export type ChartMetric = "views" | "engagement" | "revenue";

export const chartRangeOptions: { id: ChartRange; label: string; short: string }[] = [
  { id: "7d", label: "Last 7 days", short: "7D" },
  { id: "28d", label: "Last 28 days", short: "28D" },
  { id: "90d", label: "Last 90 days", short: "90D" },
  { id: "1y", label: "Last 12 months", short: "1Y" },
];

export const engagementSeries: Record<
  ChartMetric,
  Record<ChartRange, { labels: string[]; values: number[] }>
> = {
  views: {
    "7d": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [42, 55, 48, 70, 64, 88, 96] },
    "28d": { labels: ["W1", "W2", "W3", "W4"], values: [210, 246, 228, 312] },
    "90d": { labels: ["Jun", "Jul", "Aug"], values: [640, 720, 810] },
    "1y": {
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      values: [42, 48, 51, 58, 54, 62, 70, 68, 76, 82, 88, 96],
    },
  },
  engagement: {
    "7d": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [22, 28, 25, 36, 33, 44, 48] },
    "28d": { labels: ["W1", "W2", "W3", "W4"], values: [110, 128, 119, 154] },
    "90d": { labels: ["Jun", "Jul", "Aug"], values: [310, 348, 372] },
    "1y": {
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      values: [18, 22, 24, 28, 26, 30, 34, 32, 36, 40, 44, 48],
    },
  },
  revenue: {
    "7d": { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], values: [12, 14, 13, 18, 16, 21, 19] },
    "28d": { labels: ["W1", "W2", "W3", "W4"], values: [48, 52, 45, 58] },
    "90d": { labels: ["Jun", "Jul", "Aug"], values: [142, 156, 148] },
    "1y": {
      labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
      values: [8, 9, 11, 14, 12, 13, 16, 15, 17, 18, 20, 19],
    },
  },
};

export const audienceAge = {
  total: "184K",
  segments: [
    { label: "18–24", value: 34, color: "#3b82f6" },
    { label: "25–34", value: 41, color: "#a855f7" },
    { label: "35–44", value: 18, color: "#fb7185" },
    { label: "45+", value: 7, color: "#22c55e" },
  ],
} as const;

export const weeklyTrend = [38, 46, 42, 58, 52, 68, 74, 70, 82, 78, 90, 86] as const;

export const competitorIntel = {
  total: "2.8K",
  segments: [
    { label: "Your channels", value: 980, color: "#ff3b4e" },
    { label: "Rising competitor", value: 720, color: "#3b82f6" },
    { label: "Established competitor", value: 640, color: "#a855f7" },
    { label: "Other", value: 460, color: "#f59e0b" },
  ],
  summaries: [
    { label: "Active alerts", value: "12" },
    { label: "New uploads tracked", value: "47" },
  ],
} as const;

export type PipelineStatus = "done" | "active" | "queued";

export type PipelineStep = {
  id: string;
  title: string;
  tool: string;
  description: string;
  status: PipelineStatus;
  previewTitle: string;
  previewBody: string;
  editHint: string;
};

export const pipelineSteps: PipelineStep[] = [
  {
    id: "script",
    title: "Idea & Script",
    tool: "ChatGPT",
    description: "Generate titles, hooks, and a full retention-focused script.",
    status: "done",
    previewTitle: "Script preview",
    previewBody:
      "HOOK: Most creators burn 6 hours stitching faceless clips by hand.\n\nBODY: In this video we'll show a 6-step workspace that goes from brief to published YouTube upload — with edit and preview on every stage.\n\nCTA: Subscribe if you run more than one channel.",
    editHint: "Tweak hooks, section breaks, and CTA wording.",
  },
  {
    id: "voice",
    title: "Voiceover",
    tool: "ElevenLabs",
    description: "Create a natural AI voice track and preview the read.",
    status: "active",
    previewTitle: "Voice preview",
    previewBody:
      "Voice: Adam · Conversational\nDuration: 2:14\nTone: Clear, mid-energy\n\n“Most creators burn six hours stitching faceless clips by hand. Here's the pipeline that cuts that to minutes…”",
    editHint: "Change voice, stability, or regenerate a section.",
  },
  {
    id: "visuals",
    title: "Visual scenes",
    tool: "Seedance",
    description: "Generate visual clips and scenes from the script.",
    status: "queued",
    previewTitle: "Scene board",
    previewBody:
      "1. Desk + laptop B-roll (0:00–0:18)\n2. Kinetic text: “6 hours → minutes” (0:18–0:32)\n3. Pipeline diagram animation (0:32–1:05)\n4. Channel switcher UI close-ups (1:05–1:40)\n5. End screen + subscribe (1:40–2:14)",
    editHint: "Swap scenes, regenerate a beat, or lock favorites.",
  },
  {
    id: "edit",
    title: "Edit & Render",
    tool: "Remotion",
    description: "Compose captions, timing, branding, and export the render.",
    status: "queued",
    previewTitle: "Edit timeline",
    previewBody:
      "Captions: Bold white / accent underline\nIntro sting: 1.2s\nOutro: Brand + end screen\nExport: 1080p · 30fps · H.264\nStatus: Ready to render (demo)",
    editHint: "Adjust caption style, intro/outro, and export preset.",
  },
  {
    id: "seo",
    title: "SEO Tagging",
    tool: "VidIQ",
    description: "Optimize title, description, tags, and thumbnail CTR.",
    status: "queued",
    previewTitle: "SEO package",
    previewBody:
      "Title: From Script to Publish: Faceless Videos for Every Channel\nScore: 84 / 100\nTags: faceless youtube, ai voiceover, multi channel, remotion\nDescription: first 120 chars optimized for search + chapters.",
    editHint: "Edit title/tags and re-score before publish.",
  },
  {
    id: "publish",
    title: "Publish",
    tool: "YouTube",
    description: "Schedule or publish to the selected channel via OAuth.",
    status: "queued",
    previewTitle: "Publish settings",
    previewBody:
      "Channel: Growth Lab\nVisibility: Public\nSchedule: Tomorrow 9:00 AM local\nPlaylist: Faceless Systems\nNotify subscribers: On",
    editHint: "Change channel, schedule, or visibility.",
  },
];

export type IntegrationStatus =
  | "operational"
  | "degraded"
  | "rate-limited"
  | "disconnected";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type IntegrationQuota = {
  used: number;
  limit: number;
  unit: string;
  resetsOn: string;
  window: string;
};

export type IntegrationCost = {
  monthToDate: number;
  projected: number;
  perUnitLabel: string;
  currency: "USD";
};

export type IntegrationHealth = {
  successRate: number;
  errorRate: number;
  p95Latency: number;
  avgLatency: number;
  rateLimitEvents: number;
  uptime: number;
};

export type IntegrationBreakdownItem = {
  label: string;
  value: number;
  color: string;
};

export type IntegrationEndpoint = {
  method: HttpMethod;
  path: string;
  calls: number;
  avgLatency: number;
  errorRate: number;
};

export type IntegrationCallLog = {
  id: string;
  time: string;
  method: HttpMethod;
  path: string;
  status: number;
  latency: number;
  units: number;
  channel: string;
  step: string;
};

export type Integration = {
  id: string;
  name: string;
  initials: string;
  color: string;
  chartColor: string;
  description: string;
  connected: boolean;
  maskedKey: string;
  revealedKey: string;
  lastUsed: string;
  category: string;
  docsUrl: string;
  plan: string;
  environment: "Production" | "Sandbox";
  keyCreated: string;
  owner: string;
  scopes: string[];
  status: IntegrationStatus;
  statusNote: string;
  quota: IntegrationQuota;
  cost: IntegrationCost;
  health: IntegrationHealth;
  trend: readonly number[];
  stepBreakdown: IntegrationBreakdownItem[];
  channelBreakdown: IntegrationBreakdownItem[];
  endpoints: IntegrationEndpoint[];
  recentCalls: IntegrationCallLog[];
};

export const INTEGRATION_TREND_DATES = [
  "Jul 24",
  "Jul 25",
  "Jul 26",
  "Jul 27",
  "Jul 28",
  "Jul 29",
  "Jul 30",
  "Jul 31",
  "Aug 1",
  "Aug 2",
  "Aug 3",
  "Aug 4",
  "Aug 5",
  "Aug 6",
  "Aug 7",
  "Aug 8",
  "Aug 9",
  "Aug 10",
  "Aug 11",
  "Aug 12",
  "Aug 13",
  "Aug 14",
  "Aug 15",
  "Aug 16",
  "Aug 17",
  "Aug 18",
  "Aug 19",
  "Aug 20",
  "Aug 21",
  "Aug 22",
] as const;

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  "rate-limited": "Rate limited",
  disconnected: "Disconnected",
};

export const INTEGRATION_STATUS_PILL: Record<IntegrationStatus, string> = {
  operational: "bg-success/15 text-success",
  degraded: "bg-chart-amber/15 text-chart-amber",
  "rate-limited": "bg-accent/15 text-accent",
  disconnected: "bg-white/5 text-muted",
};

export const INTEGRATION_STATUS_DOT: Record<IntegrationStatus, string> = {
  operational: "bg-success",
  degraded: "bg-chart-amber",
  "rate-limited": "bg-accent",
  disconnected: "bg-muted",
};

const ZERO_TREND = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
] as const;

export const integrations: Integration[] = [
  {
    id: "youtube",
    name: "YouTube Data API",
    initials: "YT",
    color: "bg-[#ff3b4e]",
    chartColor: "#ff3b4e",
    description: "Connect channels, upload videos, and pull analytics.",
    connected: true,
    maskedKey: "yt_••••••••••••a9f2",
    revealedKey: "yt_live_a9f2c81e4b77d03a",
    lastUsed: "2 min ago",
    category: "Publishing & analytics",
    docsUrl: "https://developers.google.com/youtube/v3",
    plan: "YouTube Data API v3",
    environment: "Production",
    keyCreated: "Mar 4, 2026",
    owner: "demo@aicreatorbuddy.app",
    scopes: [
      "youtube.upload",
      "youtube.readonly",
      "yt-analytics.readonly",
      "youtube.force-ssl",
    ],
    status: "rate-limited",
    statusNote: "Daily quota at 96% — uploads paused until midnight PT reset.",
    quota: {
      used: 9610,
      limit: 10000,
      unit: "quota units",
      resetsOn: "Aug 23, 00:00 PT",
      window: "Daily",
    },
    cost: {
      monthToDate: 12.4,
      projected: 16.8,
      perUnitLabel: "$0.001 / extra quota unit",
      currency: "USD",
    },
    health: {
      successRate: 97.4,
      errorRate: 2.6,
      p95Latency: 420,
      avgLatency: 186,
      rateLimitEvents: 14,
      uptime: 99.2,
    },
    trend: [
      18, 14, 22, 19, 28, 6, 4, 24, 26, 21, 31, 27, 8, 5, 33, 29, 25, 32, 36, 9, 6, 38, 30,
      27, 34, 37, 11, 7, 41, 35,
    ],
    stepBreakdown: [
      { label: "Render", value: 280, color: "bg-accent" },
      { label: "Description", value: 210, color: "bg-chart-blue" },
      { label: "Thumbnail", value: 110, color: "bg-chart-purple" },
      { label: "Title", value: 83, color: "bg-chart-amber" },
    ],
    channelBreakdown: [
      { label: "Growth Lab", value: 310, color: "bg-accent" },
      { label: "Viral Cuts", value: 198, color: "bg-chart-blue" },
      { label: "Studio Core", value: 145, color: "bg-chart-purple" },
      { label: "NextWave", value: 30, color: "bg-chart-amber" },
    ],
    endpoints: [
      { method: "GET", path: "/youtube/v3/channels", calls: 214, avgLatency: 142, errorRate: 0.4 },
      { method: "GET", path: "/youtube/v3/videos", calls: 168, avgLatency: 188, errorRate: 1.1 },
      { method: "POST", path: "/upload/youtube/v3/videos", calls: 96, avgLatency: 1840, errorRate: 6.2 },
      { method: "GET", path: "/youtube/v3/search", calls: 205, avgLatency: 210, errorRate: 1.8 },
    ],
    recentCalls: [
      {
        id: "yt-1",
        time: "2 min ago",
        method: "GET",
        path: "/youtube/v3/channels",
        status: 200,
        latency: 128,
        units: 1,
        channel: "Growth Lab",
        step: "Description",
      },
      {
        id: "yt-2",
        time: "8 min ago",
        method: "POST",
        path: "/upload/youtube/v3/videos",
        status: 403,
        latency: 94,
        units: 1600,
        channel: "Viral Cuts",
        step: "Render",
      },
      {
        id: "yt-3",
        time: "14 min ago",
        method: "GET",
        path: "/youtube/v3/videos",
        status: 200,
        latency: 176,
        units: 1,
        channel: "Studio Core",
        step: "Description",
      },
      {
        id: "yt-4",
        time: "32 min ago",
        method: "GET",
        path: "/youtube/v3/search",
        status: 200,
        latency: 204,
        units: 100,
        channel: "Growth Lab",
        step: "Title",
      },
      {
        id: "yt-5",
        time: "51 min ago",
        method: "POST",
        path: "/upload/youtube/v3/videos",
        status: 429,
        latency: 62,
        units: 1600,
        channel: "Growth Lab",
        step: "Render",
      },
      {
        id: "yt-6",
        time: "1 hour ago",
        method: "GET",
        path: "/youtube/v3/channels",
        status: 200,
        latency: 119,
        units: 1,
        channel: "Viral Cuts",
        step: "Description",
      },
      {
        id: "yt-7",
        time: "2 hours ago",
        method: "GET",
        path: "/youtube/v3/videos",
        status: 200,
        latency: 201,
        units: 1,
        channel: "Studio Core",
        step: "Thumbnail",
      },
      {
        id: "yt-8",
        time: "3 hours ago",
        method: "POST",
        path: "/upload/youtube/v3/videos",
        status: 200,
        latency: 2140,
        units: 1600,
        channel: "Studio Core",
        step: "Render",
      },
      {
        id: "yt-9",
        time: "5 hours ago",
        method: "GET",
        path: "/youtube/v3/search",
        status: 500,
        latency: 3100,
        units: 100,
        channel: "NextWave",
        step: "Title",
      },
      {
        id: "yt-10",
        time: "Yesterday",
        method: "GET",
        path: "/youtube/v3/channels",
        status: 200,
        latency: 133,
        units: 1,
        channel: "Growth Lab",
        step: "Description",
      },
    ],
  },
  {
    id: "vidiq",
    name: "VidIQ API",
    initials: "VQ",
    color: "bg-[#3b82f6]",
    chartColor: "#3b82f6",
    description: "Keyword research, SEO scores, and competitor signals.",
    connected: true,
    maskedKey: "vq_••••••••••••c31b",
    revealedKey: "vq_live_c31b90aa12ef44d1",
    lastUsed: "1 hour ago",
    category: "SEO & research",
    docsUrl: "https://vidiq.com/blog/post/vidiq-api/",
    plan: "Creator Pro",
    environment: "Production",
    keyCreated: "Jan 18, 2026",
    owner: "demo@aicreatorbuddy.app",
    scopes: ["keywords.read", "scores.read", "competitors.read"],
    status: "operational",
    statusNote: "All SEO endpoints responding within SLA.",
    quota: {
      used: 1840,
      limit: 5000,
      unit: "requests",
      resetsOn: "Sep 1, 00:00 UTC",
      window: "Monthly",
    },
    cost: {
      monthToDate: 57.2,
      projected: 62.0,
      perUnitLabel: "$49 plan + $0.008 / extra request",
      currency: "USD",
    },
    health: {
      successRate: 99.1,
      errorRate: 0.9,
      p95Latency: 310,
      avgLatency: 142,
      rateLimitEvents: 2,
      uptime: 99.8,
    },
    trend: [
      24, 18, 31, 27, 36, 8, 5, 33, 38, 29, 42, 39, 11, 7, 44, 41, 35, 40, 47, 12, 8, 49, 43,
      36, 45, 48, 14, 9, 52, 46,
    ],
    stepBreakdown: [
      { label: "Title", value: 340, color: "bg-accent" },
      { label: "Description", value: 290, color: "bg-chart-blue" },
      { label: "Thumbnail", value: 187, color: "bg-chart-purple" },
      { label: "Script", value: 100, color: "bg-chart-amber" },
    ],
    channelBreakdown: [
      { label: "Growth Lab", value: 390, color: "bg-accent" },
      { label: "Viral Cuts", value: 268, color: "bg-chart-blue" },
      { label: "Studio Core", value: 184, color: "bg-chart-purple" },
      { label: "NextWave", value: 75, color: "bg-chart-amber" },
    ],
    endpoints: [
      { method: "GET", path: "/v1/keywords", calls: 412, avgLatency: 128, errorRate: 0.5 },
      { method: "GET", path: "/v1/scores", calls: 298, avgLatency: 156, errorRate: 0.8 },
      { method: "GET", path: "/v1/competitors", calls: 207, avgLatency: 188, errorRate: 1.6 },
    ],
    recentCalls: [
      {
        id: "vq-1",
        time: "1 hour ago",
        method: "GET",
        path: "/v1/scores",
        status: 200,
        latency: 144,
        units: 1,
        channel: "Growth Lab",
        step: "Title",
      },
      {
        id: "vq-2",
        time: "1 hour ago",
        method: "GET",
        path: "/v1/keywords",
        status: 200,
        latency: 119,
        units: 1,
        channel: "Growth Lab",
        step: "Title",
      },
      {
        id: "vq-3",
        time: "3 hours ago",
        method: "GET",
        path: "/v1/competitors",
        status: 200,
        latency: 176,
        units: 1,
        channel: "Viral Cuts",
        step: "Description",
      },
      {
        id: "vq-4",
        time: "5 hours ago",
        method: "GET",
        path: "/v1/keywords",
        status: 200,
        latency: 132,
        units: 1,
        channel: "Studio Core",
        step: "Thumbnail",
      },
      {
        id: "vq-5",
        time: "8 hours ago",
        method: "GET",
        path: "/v1/scores",
        status: 429,
        latency: 48,
        units: 1,
        channel: "NextWave",
        step: "Title",
      },
      {
        id: "vq-6",
        time: "11 hours ago",
        method: "GET",
        path: "/v1/keywords",
        status: 200,
        latency: 121,
        units: 1,
        channel: "Viral Cuts",
        step: "Script",
      },
      {
        id: "vq-7",
        time: "Yesterday",
        method: "GET",
        path: "/v1/competitors",
        status: 200,
        latency: 201,
        units: 1,
        channel: "Growth Lab",
        step: "Description",
      },
      {
        id: "vq-8",
        time: "Yesterday",
        method: "GET",
        path: "/v1/scores",
        status: 200,
        latency: 139,
        units: 1,
        channel: "Studio Core",
        step: "Title",
      },
      {
        id: "vq-9",
        time: "2 days ago",
        method: "GET",
        path: "/v1/keywords",
        status: 500,
        latency: 2400,
        units: 1,
        channel: "Viral Cuts",
        step: "Thumbnail",
      },
      {
        id: "vq-10",
        time: "2 days ago",
        method: "GET",
        path: "/v1/scores",
        status: 200,
        latency: 151,
        units: 1,
        channel: "Growth Lab",
        step: "Title",
      },
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT (OpenAI)",
    initials: "GPT",
    color: "bg-[#22c55e]",
    chartColor: "#22c55e",
    description: "Scripts, titles, outlines, and comment replies.",
    connected: true,
    maskedKey: "sk-••••••••••••7e4d",
    revealedKey: "sk-proj-7e4d91c0ab22ff18",
    lastUsed: "18 min ago",
    category: "Text generation",
    docsUrl: "https://platform.openai.com/docs",
    plan: "Pay-as-you-go",
    environment: "Production",
    keyCreated: "Feb 11, 2026",
    owner: "demo@aicreatorbuddy.app",
    scopes: ["chat.completions", "models.read"],
    status: "operational",
    statusNote: "gpt-4.1 and gpt-4.1-mini healthy across all regions.",
    quota: {
      used: 12480000,
      limit: 20000000,
      unit: "tokens",
      resetsOn: "Sep 1, 00:00 UTC",
      window: "Monthly",
    },
    cost: {
      monthToDate: 186.4,
      projected: 248.0,
      perUnitLabel: "$0.015 / 1K tokens (blended)",
      currency: "USD",
    },
    health: {
      successRate: 98.6,
      errorRate: 1.4,
      p95Latency: 1840,
      avgLatency: 920,
      rateLimitEvents: 6,
      uptime: 99.95,
    },
    trend: [
      86, 74, 102, 91, 118, 42, 31, 109, 121, 98, 134, 126, 48, 36, 142, 138, 125, 131, 149,
      52, 39, 156, 141, 128, 144, 152, 58, 41, 161, 148,
    ],
    stepBreakdown: [
      { label: "Script", value: 1240, color: "bg-accent" },
      { label: "Title", value: 680, color: "bg-chart-blue" },
      { label: "Timeline", value: 520, color: "bg-chart-purple" },
      { label: "Description", value: 410, color: "bg-chart-amber" },
      { label: "Thumbnail", value: 271, color: "bg-success" },
    ],
    channelBreakdown: [
      { label: "Growth Lab", value: 1420, color: "bg-accent" },
      { label: "Viral Cuts", value: 890, color: "bg-chart-blue" },
      { label: "Studio Core", value: 640, color: "bg-chart-purple" },
      { label: "NextWave", value: 171, color: "bg-chart-amber" },
    ],
    endpoints: [
      { method: "POST", path: "/v1/chat/completions", calls: 2840, avgLatency: 980, errorRate: 1.2 },
      { method: "POST", path: "/v1/responses", calls: 214, avgLatency: 1120, errorRate: 2.1 },
      { method: "GET", path: "/v1/models", calls: 67, avgLatency: 84, errorRate: 0 },
    ],
    recentCalls: [
      {
        id: "gpt-1",
        time: "18 min ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 200,
        latency: 842,
        units: 1840,
        channel: "Growth Lab",
        step: "Script",
      },
      {
        id: "gpt-2",
        time: "22 min ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 200,
        latency: 704,
        units: 620,
        channel: "Growth Lab",
        step: "Title",
      },
      {
        id: "gpt-3",
        time: "41 min ago",
        method: "POST",
        path: "/v1/responses",
        status: 200,
        latency: 1290,
        units: 2410,
        channel: "Viral Cuts",
        step: "Timeline",
      },
      {
        id: "gpt-4",
        time: "1 hour ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 429,
        latency: 51,
        units: 0,
        channel: "Studio Core",
        step: "Script",
      },
      {
        id: "gpt-5",
        time: "1 hour ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 200,
        latency: 910,
        units: 1980,
        channel: "Studio Core",
        step: "Script",
      },
      {
        id: "gpt-6",
        time: "3 hours ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 200,
        latency: 676,
        units: 540,
        channel: "Viral Cuts",
        step: "Description",
      },
      {
        id: "gpt-7",
        time: "5 hours ago",
        method: "GET",
        path: "/v1/models",
        status: 200,
        latency: 72,
        units: 0,
        channel: "Growth Lab",
        step: "Title",
      },
      {
        id: "gpt-8",
        time: "8 hours ago",
        method: "POST",
        path: "/v1/chat/completions",
        status: 500,
        latency: 4200,
        units: 0,
        channel: "NextWave",
        step: "Thumbnail",
      },
      {
        id: "gpt-9",
        time: "Yesterday",
        method: "POST",
        path: "/v1/responses",
        status: 200,
        latency: 1012,
        units: 1760,
        channel: "Growth Lab",
        step: "Timeline",
      },
      {
        id: "gpt-10",
        time: "Yesterday",
        method: "POST",
        path: "/v1/chat/completions",
        status: 200,
        latency: 888,
        units: 1320,
        channel: "Viral Cuts",
        step: "Script",
      },
    ],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    initials: "EL",
    color: "bg-[#38bdf8]",
    chartColor: "#38bdf8",
    description: "Natural AI voiceovers with edit and preview per take.",
    connected: true,
    maskedKey: "el_••••••••••••91c0",
    revealedKey: "el_live_91c0e4b2aa17c8f3",
    lastUsed: "25 min ago",
    category: "Voice synthesis",
    docsUrl: "https://elevenlabs.io/docs",
    plan: "Creator",
    environment: "Production",
    keyCreated: "Dec 9, 2025",
    owner: "demo@aicreatorbuddy.app",
    scopes: ["tts.write", "voices.read", "history.read"],
    status: "degraded",
    statusNote: "Elevated latency on multilingual v2 — retries succeeding.",
    quota: {
      used: 284000,
      limit: 500000,
      unit: "characters",
      resetsOn: "Sep 1, 00:00 UTC",
      window: "Monthly",
    },
    cost: {
      monthToDate: 64.2,
      projected: 82.5,
      perUnitLabel: "$0.22 / 1K characters",
      currency: "USD",
    },
    health: {
      successRate: 94.2,
      errorRate: 5.8,
      p95Latency: 2640,
      avgLatency: 1480,
      rateLimitEvents: 9,
      uptime: 98.4,
    },
    trend: [
      12, 9, 16, 14, 21, 3, 2, 18, 20, 15, 23, 19, 4, 2, 25, 22, 18, 21, 26, 5, 3, 28, 24, 19,
      22, 27, 6, 3, 29, 24,
    ],
    stepBreakdown: [{ label: "Voiceover", value: 480, color: "bg-chart-blue" }],
    channelBreakdown: [
      { label: "Growth Lab", value: 210, color: "bg-accent" },
      { label: "Viral Cuts", value: 142, color: "bg-chart-blue" },
      { label: "Studio Core", value: 98, color: "bg-chart-purple" },
      { label: "NextWave", value: 30, color: "bg-chart-amber" },
    ],
    endpoints: [
      {
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        calls: 412,
        avgLatency: 1520,
        errorRate: 6.1,
      },
      { method: "GET", path: "/v1/voices", calls: 48, avgLatency: 96, errorRate: 0 },
      { method: "GET", path: "/v1/history", calls: 20, avgLatency: 118, errorRate: 2.0 },
    ],
    recentCalls: [
      {
        id: "el-1",
        time: "25 min ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 200,
        latency: 1680,
        units: 1840,
        channel: "Growth Lab",
        step: "Voiceover",
      },
      {
        id: "el-2",
        time: "31 min ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 500,
        latency: 4100,
        units: 0,
        channel: "Growth Lab",
        step: "Voiceover",
      },
      {
        id: "el-3",
        time: "48 min ago",
        method: "GET",
        path: "/v1/voices",
        status: 200,
        latency: 88,
        units: 0,
        channel: "Viral Cuts",
        step: "Voiceover",
      },
      {
        id: "el-4",
        time: "1 hour ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 200,
        latency: 1412,
        units: 1260,
        channel: "Viral Cuts",
        step: "Voiceover",
      },
      {
        id: "el-5",
        time: "2 hours ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 429,
        latency: 41,
        units: 0,
        channel: "Studio Core",
        step: "Voiceover",
      },
      {
        id: "el-6",
        time: "3 hours ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 200,
        latency: 1988,
        units: 2104,
        channel: "Studio Core",
        step: "Voiceover",
      },
      {
        id: "el-7",
        time: "6 hours ago",
        method: "GET",
        path: "/v1/history",
        status: 200,
        latency: 122,
        units: 0,
        channel: "Growth Lab",
        step: "Voiceover",
      },
      {
        id: "el-8",
        time: "9 hours ago",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 503,
        latency: 80,
        units: 0,
        channel: "NextWave",
        step: "Voiceover",
      },
      {
        id: "el-9",
        time: "Yesterday",
        method: "POST",
        path: "/v1/text-to-speech/{voice_id}",
        status: 200,
        latency: 1340,
        units: 980,
        channel: "Growth Lab",
        step: "Voiceover",
      },
      {
        id: "el-10",
        time: "Yesterday",
        method: "GET",
        path: "/v1/voices",
        status: 200,
        latency: 91,
        units: 0,
        channel: "Viral Cuts",
        step: "Voiceover",
      },
    ],
  },
  {
    id: "seedance",
    name: "Seedance API",
    initials: "SD",
    color: "bg-[#a855f7]",
    chartColor: "#a855f7",
    description: "AI visual scene generation for your pipeline.",
    connected: false,
    maskedKey: "sd_••••••••••••0000",
    revealedKey: "",
    lastUsed: "Never",
    category: "Visual generation",
    docsUrl: "https://seedance.ai/docs",
    plan: "Not connected",
    environment: "Sandbox",
    keyCreated: "—",
    owner: "demo@aicreatorbuddy.app",
    scopes: ["scenes.generate"],
    status: "disconnected",
    statusNote: "Add an API key to generate visual scenes from the script.",
    quota: {
      used: 0,
      limit: 10000,
      unit: "credits",
      resetsOn: "—",
      window: "Monthly",
    },
    cost: {
      monthToDate: 0,
      projected: 0,
      perUnitLabel: "$0.04 / credit",
      currency: "USD",
    },
    health: {
      successRate: 0,
      errorRate: 0,
      p95Latency: 0,
      avgLatency: 0,
      rateLimitEvents: 0,
      uptime: 0,
    },
    trend: ZERO_TREND,
    stepBreakdown: [
      { label: "Stock footage", value: 0, color: "bg-chart-purple" },
      { label: "Timeline", value: 0, color: "bg-chart-blue" },
    ],
    channelBreakdown: [
      { label: "Growth Lab", value: 0, color: "bg-accent" },
      { label: "Viral Cuts", value: 0, color: "bg-chart-blue" },
      { label: "Studio Core", value: 0, color: "bg-chart-purple" },
      { label: "NextWave", value: 0, color: "bg-chart-amber" },
    ],
    endpoints: [
      { method: "POST", path: "/v1/scenes/generate", calls: 0, avgLatency: 0, errorRate: 0 },
      { method: "GET", path: "/v1/scenes/{id}", calls: 0, avgLatency: 0, errorRate: 0 },
    ],
    recentCalls: [],
  },
  {
    id: "remotion",
    name: "Remotion Render",
    initials: "RM",
    color: "bg-[#f59e0b]",
    chartColor: "#f59e0b",
    description: "Programmatic video editing and cloud renders.",
    connected: true,
    maskedKey: "rm_••••••••••••b2c8",
    revealedKey: "rm_live_b2c8d91e77aa4012",
    lastUsed: "Yesterday",
    category: "Video render",
    docsUrl: "https://www.remotion.dev/docs",
    plan: "Cloud renders",
    environment: "Production",
    keyCreated: "Apr 2, 2026",
    owner: "demo@aicreatorbuddy.app",
    scopes: ["lambda.render", "lambda.progress", "sites.write"],
    status: "operational",
    statusNote: "Lambda region us-east-1 healthy. Last render 11 min.",
    quota: {
      used: 142,
      limit: 500,
      unit: "render minutes",
      resetsOn: "Sep 1, 00:00 UTC",
      window: "Monthly",
    },
    cost: {
      monthToDate: 71.0,
      projected: 94.0,
      perUnitLabel: "$0.50 / render minute",
      currency: "USD",
    },
    health: {
      successRate: 99.8,
      errorRate: 0.2,
      p95Latency: 8400,
      avgLatency: 6120,
      rateLimitEvents: 0,
      uptime: 99.9,
    },
    trend: [
      4, 3, 6, 5, 8, 1, 0, 7, 6, 5, 9, 8, 2, 1, 10, 9, 7, 8, 11, 2, 1, 12, 9, 7, 10, 11, 3, 1,
      13, 10,
    ],
    stepBreakdown: [{ label: "Render", value: 189, color: "bg-chart-amber" }],
    channelBreakdown: [
      { label: "Growth Lab", value: 84, color: "bg-accent" },
      { label: "Viral Cuts", value: 56, color: "bg-chart-blue" },
      { label: "Studio Core", value: 41, color: "bg-chart-purple" },
      { label: "NextWave", value: 8, color: "bg-chart-amber" },
    ],
    endpoints: [
      { method: "POST", path: "/api/lambda/render", calls: 96, avgLatency: 6400, errorRate: 0.3 },
      { method: "GET", path: "/api/lambda/progress", calls: 78, avgLatency: 64, errorRate: 0 },
      { method: "POST", path: "/api/lambda/site", calls: 15, avgLatency: 890, errorRate: 0 },
    ],
    recentCalls: [
      {
        id: "rm-1",
        time: "Yesterday",
        method: "POST",
        path: "/api/lambda/render",
        status: 200,
        latency: 6840,
        units: 11,
        channel: "Growth Lab",
        step: "Render",
      },
      {
        id: "rm-2",
        time: "Yesterday",
        method: "GET",
        path: "/api/lambda/progress",
        status: 200,
        latency: 58,
        units: 0,
        channel: "Growth Lab",
        step: "Render",
      },
      {
        id: "rm-3",
        time: "2 days ago",
        method: "POST",
        path: "/api/lambda/render",
        status: 200,
        latency: 7210,
        units: 13,
        channel: "Viral Cuts",
        step: "Render",
      },
      {
        id: "rm-4",
        time: "2 days ago",
        method: "GET",
        path: "/api/lambda/progress",
        status: 200,
        latency: 61,
        units: 0,
        channel: "Viral Cuts",
        step: "Render",
      },
      {
        id: "rm-5",
        time: "4 days ago",
        method: "POST",
        path: "/api/lambda/render",
        status: 200,
        latency: 5980,
        units: 9,
        channel: "Studio Core",
        step: "Render",
      },
      {
        id: "rm-6",
        time: "4 days ago",
        method: "POST",
        path: "/api/lambda/site",
        status: 200,
        latency: 840,
        units: 0,
        channel: "Studio Core",
        step: "Render",
      },
      {
        id: "rm-7",
        time: "5 days ago",
        method: "POST",
        path: "/api/lambda/render",
        status: 500,
        latency: 120,
        units: 0,
        channel: "NextWave",
        step: "Render",
      },
      {
        id: "rm-8",
        time: "6 days ago",
        method: "GET",
        path: "/api/lambda/progress",
        status: 200,
        latency: 55,
        units: 0,
        channel: "Growth Lab",
        step: "Render",
      },
      {
        id: "rm-9",
        time: "1 week ago",
        method: "POST",
        path: "/api/lambda/render",
        status: 200,
        latency: 8120,
        units: 14,
        channel: "Growth Lab",
        step: "Render",
      },
      {
        id: "rm-10",
        time: "1 week ago",
        method: "POST",
        path: "/api/lambda/render",
        status: 200,
        latency: 6440,
        units: 10,
        channel: "Viral Cuts",
        step: "Render",
      },
    ],
  },
];

export function sumTrend(trend: readonly number[]): number {
  return trend.reduce((acc, n) => acc + n, 0);
}

export function quotaPercent(quota: IntegrationQuota): number {
  if (quota.limit <= 0) return 0;
  return Math.min(100, (quota.used / quota.limit) * 100);
}

export function integrationNeedsAttention(integration: Integration): boolean {
  return integration.status === "degraded" || integration.status === "rate-limited";
}

export function formatInt(value: number): string {
  const [whole, fraction] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const scaled = value / 1_000;
    return `${scaled % 1 === 0 ? scaled.toFixed(0) : scaled.toFixed(1)}K`;
  }
  return String(value);
}

export function formatUsd(value: number): string {
  if (value === 0) return "$0";
  const [whole, fraction = "00"] = value.toFixed(2).split(".");
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}

export function formatLatency(ms: number): string {
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return `${seconds % 1 === 0 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
  }
  return `${ms}ms`;
}

export const recentVideos = [
  {
    title: "How I Hit 1M Views in 30 Days",
    channel: "Growth Lab",
    status: "Published" as const,
    views: "128K",
    date: "Mar 12",
  },
  {
    title: "AI Editing Workflow Explained",
    channel: "Viral Cuts",
    status: "Rendering" as const,
    views: "—",
    date: "Mar 14",
  },
  {
    title: "Multi-Channel Growth Playbook",
    channel: "Studio Core",
    status: "Queued" as const,
    views: "—",
    date: "Mar 15",
  },
  {
    title: "Shorts That Convert Subscribers",
    channel: "Growth Lab",
    status: "Published" as const,
    views: "64K",
    date: "Mar 10",
  },
  {
    title: "Thumbnail A/B Test Results",
    channel: "Viral Cuts",
    status: "Published" as const,
    views: "41K",
    date: "Mar 8",
  },
];

export type NavChild = {
  href: string;
  label: string;
  exact?: boolean;
  badge?: "drafts" | "upcoming";
};

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  children?: NavChild[];
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", exact: true },
  { href: "/dashboard/channels", label: "Channels" },
  { href: "/dashboard/create", label: "Create Video" },
  {
    href: "/dashboard/library",
    label: "Content Library",
    children: [
      { href: "/dashboard/library", label: "All Videos", exact: true },
      { href: "/dashboard/library/drafts", label: "Drafts", exact: true, badge: "drafts" },
      { href: "/dashboard/library/scheduled", label: "Scheduled", exact: true },
      { href: "/dashboard/library/playlists", label: "Playlists" },
    ],
  },
  {
    href: "/dashboard/scheduler",
    label: "Video Scheduler",
    children: [
      { href: "/dashboard/scheduler", label: "Calendar", exact: true },
      { href: "/dashboard/scheduler/upcoming", label: "Upcoming Uploads", exact: true, badge: "upcoming" },
      { href: "/dashboard/scheduler/best-time", label: "Best Time To Post", exact: true },
    ],
  },
  { href: "/dashboard/integrations", label: "AI Integrations" },
  { href: "/dashboard/analytics", label: "Analytics" },
];
