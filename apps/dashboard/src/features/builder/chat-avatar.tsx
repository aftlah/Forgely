import Image from "next/image";

import { LogoMark } from "@forgely/ui";

const AVATAR_PX = 36;
const FRAME =
  "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-ink";

export interface ChatUser {
  name: string;
  /** Discord profile picture URL, or null when the session has none. */
  image: string | null;
}

/** The signed-in person: their Discord picture, or the first letter of their name. */
export function UserAvatar({ user }: { user: ChatUser }) {
  if (!user.image) {
    return (
      <span aria-hidden="true" className={`${FRAME} font-display text-sm font-bold`}>
        {user.name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <Image
      src={user.image}
      alt=""
      width={AVATAR_PX}
      height={AVATAR_PX}
      className={`${FRAME} object-cover`}
    />
  );
}

/** The Forgely mark, for the AI's side of the conversation. */
export function AppAvatar() {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center">
      <LogoMark size={AVATAR_PX} />
    </span>
  );
}
