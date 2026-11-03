import { createFileRoute } from "@tanstack/react-router";
import GolfApp from "@/components/golf/GolfApp";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sunny Links Mini Golf — Endless Levels, 500 Ball Skins" },
      { name: "description", content: "Play endless 3D mini golf: 6-hole levels, windmills, water and sand traps, 500 unlockable ball skins, and an online leaderboard." },
      { property: "og:title", content: "Sunny Links Mini Golf" },
      { property: "og:description", content: "Endless 3D mini golf with 500 unlockable ball skins and an online leaderboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GolfApp,
});
