import Link from "next/link";

import { buttonClasses, Window } from "@forgely/ui";

import { GuildIcon } from "./guild-icon";

import type { UserServer } from "@/features/auth/guild-access";
import { getInviteHref } from "@/lib/invite";

function ServerRow({ server }: { server: UserServer }) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
      <GuildIcon guild={server} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{server.name}</p>
        <p className="font-mono text-xs text-muted">
          {server.owner ? "Owner" : "Manage Server"}
          {!server.isBotPresent && " · Forgely not added"}
        </p>
      </div>
      {server.isBotPresent ? (
        <Link
          href={`/dashboard/${server.id}`}
          aria-label={`Open ${server.name}`}
          className={buttonClasses({ variant: "bone", size: "sm" })}
        >
          Open
        </Link>
      ) : (
        <a
          href={getInviteHref(server.id)}
          aria-label={`Add Forgely to ${server.name}`}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          Add Forgely
        </a>
      )}
    </li>
  );
}

/** The signed-in user's manageable servers, with Forgely servers first. */
export function ServerList({ servers }: { servers: UserServer[] }) {
  if (servers.length === 0) {
    return (
      <Window className="max-w-[640px] p-8">
        <h2 className="display mb-2 text-[22px]">No servers to manage yet</h2>
        <p className="text-muted">
          You don&apos;t have the Manage Server permission anywhere. Ask a server owner to give it
          to you, or create your own server and add Forgely to it.
        </p>
      </Window>
    );
  }

  return (
    <Window className="max-w-[640px]">
      <ul aria-label="Your servers" className="m-0 list-none p-0">
        {servers.map((server) => (
          <ServerRow key={server.id} server={server} />
        ))}
      </ul>
    </Window>
  );
}
