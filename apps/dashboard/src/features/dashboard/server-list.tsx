"use client";

import { ArrowRight, Crown, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Window } from "@forgely/ui";

import { GuildIcon } from "./guild-icon";

import type { UserServer } from "@/features/auth/guild-access";
import { getInviteHref } from "@/lib/invite";

const GRID = "m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3";
const CARD =
  "flex items-center gap-4 rounded-[14px] border border-line bg-surface-raised p-4 transition-colors";
const ICON = "size-14 rounded-xl";
const PILL =
  "inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-muted uppercase";

function RoleBadge({ isOwner }: { isOwner: boolean }) {
  if (!isOwner) return <span className={PILL}>Manage Server</span>;
  return (
    <span className={PILL}>
      <Crown className="size-3" aria-hidden="true" />
      Owner
    </span>
  );
}

function ActiveCard({ server }: { server: UserServer }) {
  return (
    <li>
      <Link
        href={`/dashboard/${server.id}`}
        aria-label={`Open ${server.name}`}
        className={`${CARD} hover:border-line-strong hover:bg-surface-overlay`}
      >
        <GuildIcon guild={server} className={ICON} />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <p className="truncate font-semibold">{server.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Active
          </p>
          <RoleBadge isOwner={server.owner} />
        </div>
        <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  );
}

function InviteCard({ server }: { server: UserServer }) {
  return (
    <li className={CARD}>
      <GuildIcon guild={server} className={`${ICON} border-dashed opacity-70`} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{server.name}</p>
        <p className="text-sm text-muted">Forgely not added</p>
      </div>
      <a
        href={getInviteHref(server.id)}
        aria-label={`Add Forgely to ${server.name}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm transition-colors hover:bg-surface-overlay"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add
      </a>
    </li>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className="grid gap-4">
      <h2 className="flex items-center gap-4 font-mono text-[11px] tracking-[0.1em] text-muted uppercase">
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        {label}
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
      </h2>
      {children}
    </section>
  );
}

/** The signed-in user's manageable servers: ones with Forgely first, then the ones it can be added to. */
export function ServerList({ servers }: { servers: UserServer[] }) {
  const [query, setQuery] = useState("");

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

  const needle = query.trim().toLowerCase();
  const visible = servers.filter((server) => server.name.toLowerCase().includes(needle));
  const active = visible.filter((server) => server.isBotPresent);
  const inactive = visible.filter((server) => !server.isBotPresent);

  return (
    <div className="grid gap-8">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search servers"
          placeholder="Search servers…"
          className="w-full rounded-[14px] border border-line bg-surface-raised py-3.5 pr-4 pl-12 text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        />
      </div>

      {visible.length === 0 && (
        <p role="status" className="text-center text-muted">
          No server matches &ldquo;{query.trim()}&rdquo;.
        </p>
      )}
      {active.length > 0 && (
        <Section label="Active">
          <ul className={GRID}>
            {active.map((server) => (
              <ActiveCard key={server.id} server={server} />
            ))}
          </ul>
        </Section>
      )}
      {inactive.length > 0 && (
        <Section label="Not yet added">
          <ul className={GRID}>
            {inactive.map((server) => (
              <InviteCard key={server.id} server={server} />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
