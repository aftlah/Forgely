import { Button, Window } from "@forgely/ui";

import { signIn } from "@/auth";
import { DiscordIcon } from "@/features/marketing/discord-icon";
import { getMissingAuthEnv } from "@/lib/env";

const COPY = {
  "signed-out": {
    title: "Sign in to see your servers",
    body: "Forgely only lists servers where you have the Manage Server permission.",
  },
  expired: {
    title: "Your session ended",
    body: "Discord access runs out after a few days. Sign in again to carry on. Your settings are safe.",
  },
} as const;

async function startDiscordSignIn(): Promise<void> {
  "use server";
  await signIn("discord", { redirectTo: "/dashboard" });
}

/**
 * Shown to visitors who are not signed in. If sign-in is not configured yet it says which
 * variables are missing (outside production), instead of failing after the Discord redirect.
 */
export function SignInCard({ reason }: { reason: keyof typeof COPY }) {
  const missing = getMissingAuthEnv();
  const isConfigured = missing.length === 0;
  const showSetupHint = !isConfigured && process.env.NODE_ENV !== "production";
  const copy = COPY[reason];

  return (
    <Window className="max-w-[640px] p-8">
      <h2 className="display mb-2 text-[22px]">{copy.title}</h2>
      <p className="mb-6 text-muted">{copy.body}</p>
      <form action={startDiscordSignIn}>
        <Button type="submit" variant="ember" disabled={!isConfigured}>
          <DiscordIcon />
          Log in with Discord
        </Button>
      </form>
      {showSetupHint && (
        <p
          role="note"
          className="mt-5 rounded-md border border-line-strong bg-surface-overlay p-3 font-mono text-xs text-muted"
        >
          Sign-in is not set up yet. Add {missing.join(", ")} to apps/dashboard/.env.local.
        </p>
      )}
      {!isConfigured && !showSetupHint && (
        <p className="mt-5 text-sm text-muted">Sign-in is temporarily unavailable.</p>
      )}
    </Window>
  );
}
