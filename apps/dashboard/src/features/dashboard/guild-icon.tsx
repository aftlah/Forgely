import Image from "next/image";

import { cn } from "@forgely/ui";

import { getGuildIconUrl, type DiscordGuild } from "@/features/auth/discord-guilds";

const SIZE_PX = 40;

/** A server's icon, or its first letter on a dark disc when it has none. */
export function GuildIcon({
  guild,
  className,
}: {
  guild: Pick<DiscordGuild, "id" | "icon" | "name">;
  className?: string;
}) {
  const url = getGuildIconUrl(guild);
  const base =
    "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-ink";

  if (!url) {
    return (
      <span aria-hidden="true" className={cn(base, "font-display text-base font-bold", className)}>
        {guild.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image src={url} alt="" width={SIZE_PX} height={SIZE_PX} className={cn(base, className)} />
  );
}
