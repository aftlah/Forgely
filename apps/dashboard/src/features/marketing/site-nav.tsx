import Link from "next/link";

import { buttonClasses, LogoMark } from "@forgely/ui";

import { DiscordIcon } from "./discord-icon";

const LINKS = [
  { href: "#plan", label: "How it works" },
  { href: "#dashboard", label: "Dashboard" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function SiteNav() {
  return (
    <header className="sticky top-4 z-20 px-[clamp(16px,5vw,48px)]">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-[1180px] items-center gap-6 rounded-full border border-line bg-surface-raised py-2.5 pr-2.5 pl-[18px]"
      >
        <Link
          href="/"
          aria-label="Forgely home"
          className="display inline-flex items-center gap-2.5 text-[19px] tracking-[-0.02em]"
        >
          <LogoMark />
          Forgely
        </Link>
        <ul className="m-0 mx-auto flex list-none gap-7 p-0 text-[15px] max-lg:hidden">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-muted transition-colors hover:text-fg">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <Link
          href="/dashboard"
          className={buttonClasses({ variant: "ember", size: "sm", className: "ml-auto lg:ml-0" })}
        >
          <DiscordIcon />
          Log in with Discord
        </Link>
      </nav>
    </header>
  );
}
