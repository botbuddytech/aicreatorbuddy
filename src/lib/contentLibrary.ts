export type VideoLibraryStatus = "published" | "draft" | "scheduled";
export type PlaylistLibraryStatus = "ready" | "editing" | "review";
export type LibraryViewMode = "grid" | "list";

export type LibraryVideo = {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  status: VideoLibraryStatus;
  duration: string;
  publishedDate: string;
  relativeTime: string;
  views: string;
  likes: string;
  comments: string;
  revenue: string;
  thumbLabel: string;
};

export type LibraryPlaylist = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  status: PlaylistLibraryStatus;
  visibility: "public" | "private";
  videoCount: number;
  views: string;
  watchTime: string;
  updatedLabel: string;
  thumbLabels: [string, string, string, string];
};

function thumbSvg(label: string, seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  const hue = hash;
  const hue2 = (hue + 46) % 360;
  const id = `g${Math.abs(hash)}${seed.length}`;
  const caption = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue} 42% 28%)"/>
      <stop offset="100%" stop-color="hsl(${hue2} 48% 12%)"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#${id})"/>
  <circle cx="1040" cy="160" r="180" fill="rgba(255,255,255,0.08)"/>
  <text x="64" y="640" fill="rgba(255,255,255,0.92)" font-size="36" font-family="Georgia,serif">${caption}</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function libraryThumbUrl(label: string, seed = label): string {
  return thumbSvg(label, seed);
}

export const libraryVideos: LibraryVideo[] = [
  {
    id: "v1",
    title: "How to Build a Successful YouTube Channel in 2024",
    channelId: "gt",
    channelName: "Growth Lab",
    status: "published",
    duration: "12:45",
    publishedDate: "Nov 15, 2024",
    relativeTime: "2 days ago",
    views: "125K",
    likes: "8.2K",
    comments: "342",
    revenue: "$1,240",
    thumbLabel: "Channel growth",
  },
  {
    id: "v2",
    title: "10 AI Tools That Will Change Content Creation Forever",
    channelId: "vl",
    channelName: "Viral Cuts",
    status: "published",
    duration: "18:22",
    publishedDate: "Nov 12, 2024",
    relativeTime: "5 days ago",
    views: "89K",
    likes: "6.1K",
    comments: "218",
    revenue: "$890",
    thumbLabel: "AI tools",
  },
  {
    id: "v3",
    title: "The Future of Remote Work: Trends and Predictions",
    channelId: "sc",
    channelName: "Studio Core",
    status: "scheduled",
    duration: "15:30",
    publishedDate: "Nov 20, 2024",
    relativeTime: "in 3 days",
    views: "—",
    likes: "—",
    comments: "—",
    revenue: "—",
    thumbLabel: "Remote work",
  },
  {
    id: "v4",
    title: "Complete Guide to Personal Branding on Social Media",
    channelId: "gt",
    channelName: "Growth Lab",
    status: "draft",
    duration: "22:10",
    publishedDate: "Nov 8, 2024",
    relativeTime: "1 week ago",
    views: "—",
    likes: "—",
    comments: "—",
    revenue: "—",
    thumbLabel: "Personal brand",
  },
  {
    id: "v5",
    title: "Thumbnail A/B Tests That Doubled CTR",
    channelId: "vl",
    channelName: "Viral Cuts",
    status: "published",
    duration: "09:18",
    publishedDate: "Nov 4, 2024",
    relativeTime: "11 days ago",
    views: "64K",
    likes: "4.4K",
    comments: "156",
    revenue: "$510",
    thumbLabel: "Thumbnails",
  },
  {
    id: "v6",
    title: "Multi-Channel Publishing Workflow Explained",
    channelId: "sc",
    channelName: "Studio Core",
    status: "published",
    duration: "14:02",
    publishedDate: "Oct 28, 2024",
    relativeTime: "3 weeks ago",
    views: "41K",
    likes: "2.9K",
    comments: "98",
    revenue: "$420",
    thumbLabel: "Workflow",
  },
  {
    id: "v7",
    title: "Shorts Hooks That Convert Browsers to Subscribers",
    channelId: "gt",
    channelName: "Growth Lab",
    status: "draft",
    duration: "08:44",
    publishedDate: "Nov 14, 2024",
    relativeTime: "3 days ago",
    views: "—",
    likes: "—",
    comments: "—",
    revenue: "—",
    thumbLabel: "Shorts hooks",
  },
  {
    id: "v8",
    title: "Year-End Analytics Recap for Creators",
    channelId: "nx",
    channelName: "NextWave",
    status: "scheduled",
    duration: "16:55",
    publishedDate: "Dec 1, 2024",
    relativeTime: "in 2 weeks",
    views: "—",
    likes: "—",
    comments: "—",
    revenue: "—",
    thumbLabel: "Analytics recap",
  },
  {
    id: "v9",
    title: "Voiceover Stack: ElevenLabs vs Studio Mics",
    channelId: "sc",
    channelName: "Studio Core",
    status: "published",
    duration: "11:36",
    publishedDate: "Oct 21, 2024",
    relativeTime: "1 month ago",
    views: "28K",
    likes: "1.8K",
    comments: "74",
    revenue: "$260",
    thumbLabel: "Voiceover",
  },
  {
    id: "v10",
    title: "Script Beats for Faceless Explainers",
    channelId: "vl",
    channelName: "Viral Cuts",
    status: "draft",
    duration: "13:07",
    publishedDate: "Nov 16, 2024",
    relativeTime: "1 day ago",
    views: "—",
    likes: "—",
    comments: "—",
    revenue: "—",
    thumbLabel: "Script beats",
  },
];

export const libraryPlaylists: LibraryPlaylist[] = [
  {
    id: "p1",
    title: "Mastering React 18: Hooks & Context API",
    description: "A complete path from useState to production patterns for faceless coding channels.",
    channelId: "gt",
    channelName: "Growth Lab",
    status: "ready",
    visibility: "public",
    videoCount: 45,
    views: "100M",
    watchTime: "156kh",
    updatedLabel: "Updated 2 hours ago",
    thumbLabels: ["Hooks", "Context", "Effects", "Memo"],
  },
  {
    id: "p2",
    title: "Advanced TypeScript Patterns",
    description: "Generics, branded types, and inference tricks that keep long-form tutorials tight.",
    channelId: "sc",
    channelName: "Studio Core",
    status: "editing",
    visibility: "public",
    videoCount: 28,
    views: "12.4M",
    watchTime: "48kh",
    updatedLabel: "Updated 1 day ago",
    thumbLabels: ["Generics", "Utility", "Infer", "Brands"],
  },
  {
    id: "p3",
    title: "Node.js Backend Development",
    description: "APIs, queues, and auth flows packaged as a bingeable series.",
    channelId: "vl",
    channelName: "Viral Cuts",
    status: "review",
    visibility: "private",
    videoCount: 36,
    views: "8.1M",
    watchTime: "31kh",
    updatedLabel: "Updated 4 days ago",
    thumbLabels: ["Express", "Auth", "Queues", "Prisma"],
  },
  {
    id: "p4",
    title: "Full Stack Web Development Bootcamp",
    description: "Front to back: design systems, APIs, and shipping a SaaS demo on camera.",
    channelId: "gt",
    channelName: "Growth Lab",
    status: "ready",
    visibility: "public",
    videoCount: 62,
    views: "54M",
    watchTime: "210kh",
    updatedLabel: "Updated 6 hours ago",
    thumbLabels: ["HTML", "CSS", "API", "Ship"],
  },
  {
    id: "p5",
    title: "YouTube SEO Sprints",
    description: "Title, thumbnail, and packaging drills for weekly upload calendars.",
    channelId: "nx",
    channelName: "NextWave",
    status: "editing",
    visibility: "private",
    videoCount: 14,
    views: "1.2M",
    watchTime: "6kh",
    updatedLabel: "Updated 3 days ago",
    thumbLabels: ["Titles", "Thumbs", "Tags", "CTR"],
  },
  {
    id: "p6",
    title: "Faceless Studio Ops",
    description: "Batching, VA handoff, and QA checklists for a multi-channel desk.",
    channelId: "sc",
    channelName: "Studio Core",
    status: "review",
    visibility: "public",
    videoCount: 19,
    views: "3.6M",
    watchTime: "14kh",
    updatedLabel: "Updated 9 hours ago",
    thumbLabels: ["Batch", "Handoff", "QA", "Calendar"],
  },
];

export const draftVideoCount = libraryVideos.filter((video) => video.status === "draft").length;

export function videoStatusCounts(videos: readonly LibraryVideo[]) {
  return {
    all: videos.length,
    published: videos.filter((video) => video.status === "published").length,
    draft: videos.filter((video) => video.status === "draft").length,
    scheduled: videos.filter((video) => video.status === "scheduled").length,
  };
}

export function playlistStatusCounts(playlists: readonly LibraryPlaylist[]) {
  return {
    all: playlists.length,
    ready: playlists.filter((playlist) => playlist.status === "ready").length,
    editing: playlists.filter((playlist) => playlist.status === "editing").length,
    review: playlists.filter((playlist) => playlist.status === "review").length,
  };
}

export function filterVideos(
  videos: readonly LibraryVideo[],
  {
    status,
    query,
    channelId,
  }: {
    status: VideoLibraryStatus | "all";
    query: string;
    channelId: string;
  },
): LibraryVideo[] {
  const needle = query.trim().toLowerCase();
  return videos.filter((video) => {
    if (status !== "all" && video.status !== status) return false;
    if (channelId !== "all" && video.channelId !== channelId) return false;
    if (!needle) return true;
    return `${video.title} ${video.channelName}`.toLowerCase().includes(needle);
  });
}

export function filterPlaylists(
  playlists: readonly LibraryPlaylist[],
  {
    status,
    query,
    channelId,
  }: {
    status: PlaylistLibraryStatus | "all";
    query: string;
    channelId: string;
  },
): LibraryPlaylist[] {
  const needle = query.trim().toLowerCase();
  return playlists.filter((playlist) => {
    if (status !== "all" && playlist.status !== status) return false;
    if (channelId !== "all" && playlist.channelId !== channelId) return false;
    if (!needle) return true;
    return `${playlist.title} ${playlist.description} ${playlist.channelName}`
      .toLowerCase()
      .includes(needle);
  });
}

export function videosToCsv(videos: readonly LibraryVideo[]): string {
  const header = [
    "Title",
    "Channel",
    "Status",
    "Duration",
    "Date",
    "Views",
    "Likes",
    "Comments",
    "Revenue",
  ];
  const rows = videos.map((video) => [
    video.title,
    video.channelName,
    video.status,
    video.duration,
    video.publishedDate,
    video.views,
    video.likes,
    video.comments,
    video.revenue,
  ]);
  return toCsv([header, ...rows]);
}

export function playlistsToCsv(playlists: readonly LibraryPlaylist[]): string {
  const header = ["Title", "Channel", "Status", "Visibility", "Videos", "Views", "Watch time"];
  const rows = playlists.map((playlist) => [
    playlist.title,
    playlist.channelName,
    playlist.status,
    playlist.visibility,
    String(playlist.videoCount),
    playlist.views,
    playlist.watchTime,
  ]);
  return toCsv([header, ...rows]);
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell.replace(/"/g, '""');
          return /[",\n]/.test(value) ? `"${value}"` : value;
        })
        .join(","),
    )
    .join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
