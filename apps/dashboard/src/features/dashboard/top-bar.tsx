import { ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { GuildIcon } from "./guild-icon";
import { UserMenu } from "./user-menu";

import { auth, signOut } from "@/auth";
import type { DiscordGuild } from "@/features/auth/discord-guilds";

async function signOutAction(): Promise<void> {
  "use server";
  await signOut({ redirectTo: "/" });
}

/**
 * The bar that stays at the top while a page scrolls: which server you are in (a link back to the picker, so
 * switching is one click) and who you are signed in as. It pulls itself out to the page edges with negative margins.
 */
export async function TopBar({ server }: { server?: Pick<DiscordGuild, "id" | "icon" | "name"> }) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="sticky top-0 z-20 -mx-(--page-pad) -mt-(--page-pad) mb-8 flex min-h-14 items-center justify-between gap-3 border-b border-line bg-surface px-(--page-pad) py-2">
      {server ? (
        <Link
          href="/dashboard"
          title="Switch server"
          className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          <GuildIcon guild={server} className="size-7 text-xs" />
          <span className="truncate font-semibold">{server.name}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">Switch server</span>
        </Link>
      ) : (
        <span className="font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
          Your servers
        </span>
      )}
      {user?.name && (
        <UserMenu name={user.name} imageUrl={user.image ?? null} signOutAction={signOutAction} />
      )}
    </div>
  );
}
