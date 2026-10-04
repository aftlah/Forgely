import { Button, Window } from "@forgely/ui";

import { DiscordIcon } from "@/features/marketing/discord-icon";

/** Empty state: no signed-in user yet. Login lands in the next step. */
export default function DashboardHomePage() {
  return (
    <>
      <h1 className="display mb-2 text-[clamp(28px,3.4vw,40px)]">Your servers</h1>
      <p className="mb-8 max-w-[56ch] text-muted">
        Servers where you can manage settings and the bot is present will appear here.
      </p>

      <Window className="max-w-[640px] p-8">
        <h2 className="display mb-2 text-[22px]">Sign in to see your servers</h2>
        <p className="mb-6 text-muted">
          Forgely only lists servers where you have the Manage Server permission. Sign-in with
          Discord is the next piece to be wired up, so this button is not active yet.
        </p>
        <Button variant="ember" disabled>
          <DiscordIcon />
          Log in with Discord
        </Button>
      </Window>
    </>
  );
}
