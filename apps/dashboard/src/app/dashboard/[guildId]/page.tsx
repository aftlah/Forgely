import Link from "next/link";

import { createGuildConfigRepository } from "@forgely/db";
import { cn, Window } from "@forgely/ui";

import { MODULE_CATALOG } from "@/features/dashboard/module-catalog";
import { getDatabase } from "@/lib/db";

/** The layout above already checked that the user may manage this server. */
export default async function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const states = await createGuildConfigRepository(getDatabase()).listModuleStates(guildId);
  const isEnabled = (moduleId: string): boolean =>
    states.some((state) => state.moduleId === moduleId && state.isEnabled);

  return (
    <>
      <h2 className="mb-3 font-mono text-xs tracking-[0.1em] text-muted uppercase">Modules</h2>
      <Window className="max-w-[720px]">
        <ul aria-label="Modules" className="m-0 list-none p-0">
          {MODULE_CATALOG.map((module) => {
            const on = isEnabled(module.id);
            return (
              <li
                key={module.id}
                className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/dashboard/${guildId}/${module.id}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {module.name}
                  </Link>
                  <p className="text-sm text-muted">{module.description}</p>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-xs",
                    on ? "border-ember text-fg" : "border-line-strong text-muted",
                  )}
                >
                  {on ? "On" : "Off"}
                </span>
              </li>
            );
          })}
        </ul>
      </Window>
      <p className="mt-4 max-w-[60ch] text-sm text-muted">
        Open a module to change its settings. Changes reach the running bot without a restart.
      </p>
    </>
  );
}
