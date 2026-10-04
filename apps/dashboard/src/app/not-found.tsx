import Link from "next/link";

import { buttonClasses } from "@forgely/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="mb-4 font-mono text-xs tracking-[0.1em] text-muted uppercase">404</p>
        <h1 className="display mb-4 text-[clamp(32px,5vw,56px)]">Nothing here.</h1>
        <p className="mx-auto mb-8 max-w-[40ch] text-muted">
          That page doesn&apos;t exist, or it moved. The home page is a safe place to start.
        </p>
        <Link href="/" className={buttonClasses({ variant: "bone" })}>
          Back to home
        </Link>
      </div>
    </main>
  );
}
