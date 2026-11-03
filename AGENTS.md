<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Players are anonymous (device id in localStorage) and synced to the players table so the leaderboard is shared without sign-in.
- Game progress is stored separately from leaderboard records on the current device, including ball simulation state; save on state changes, periodically during play, and when hiding or leaving the game so resuming never restarts the level.
- The phone app is a separate static build (`vite.cap.config.ts` → `cap-dist/` → Capacitor's `ios/` project) so the web build in `vite.config.ts` stays untouched; refresh the native copy with `bun run cap:sync` after any game change.
- The iPhone build workflow downloads the game package from the private game-builds storage bucket when the repo lacks game files, so the user's GitHub repo only needs the workflow file; re-upload sunny-links.zip after any game change.
- Admin gameplay overrides live in one cheat-sheet module read by the game; the AI that turns a typed command into that cheat sheet is a server function that verifies the admin role first, and the AI gateway call itself stays in a server-only module so the key never reaches the browser.
