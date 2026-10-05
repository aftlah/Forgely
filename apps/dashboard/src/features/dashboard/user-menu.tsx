"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const AVATAR_PX = 64;

interface UserMenuProps {
  name: string;
  imageUrl: string | null;
  /** Server Action that signs the user out. */
  signOutAction: () => Promise<void>;
}

/** The signed-in person's avatar and name; opens a small menu with Sign out. Closes on Escape or an outside click. */
export function UserMenu({ name, imageUrl, signOutAction }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const close = (event: Event): void => {
      const isKey = event instanceof KeyboardEvent;
      if (isKey && event.key !== "Escape") return;
      if (!isKey && root.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [isOpen]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="flex cursor-pointer items-center gap-2.5 rounded-full border border-line py-1 pr-3 pl-1 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            width={AVATAR_PX}
            height={AVATAR_PX}
            className="size-7 rounded-full"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-full bg-ink text-xs font-bold"
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-32 truncate text-sm">{name}</span>
        <ChevronDown
          className={`size-3.5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <form
          action={signOutAction}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-48 rounded-lg border border-line-strong bg-surface-overlay p-1"
        >
          <button
            type="submit"
            role="menuitem"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-ember"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </button>
        </form>
      )}
    </div>
  );
}
