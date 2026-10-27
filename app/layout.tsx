import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskSphere",
  description:
    "TaskSphere Enterprise — a local-first, gamised workspace and task operating system.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TaskSphere",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/* Runs before first paint so a theme swap never flashes the default skin. */
const THEME_BOOTSTRAP = `
try {
  var p = JSON.parse(localStorage.getItem('tasksphere.preferences.v1') || '{}');
  var modes = ['light', 'cyber', 'zen', 'retro', 'brutalist'];
  var mode = modes.indexOf(p.uiMode) > -1 ? p.uiMode : 'light';
  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.crt = String(p.crtEnabled === true);
  var motion = ['full', 'subtle', 'reduced'].indexOf(p.motionLevel) > -1 ? p.motionLevel : 'full';
  document.documentElement.dataset.motion = motion;
} catch (e) {
  document.documentElement.dataset.mode = 'light';
  document.documentElement.dataset.motion = 'full';
}
/* The layout paradigm is decided here too, so the shell renders as a phone on
   a phone from the very first frame instead of flashing a desktop grid. */
try {
  var w = window.innerWidth;
  var h = window.innerHeight;
  document.documentElement.dataset.paradigm =
    w <= 420 && h <= 640 ? "extension" : w < 820 ? "mobile" : w < 1280 ? "tablet" : "desktop";
} catch (e) {
  document.documentElement.dataset.paradigm = "desktop";
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-mode="light" data-motion="full" data-paradigm="desktop" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400..700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
