"use client";

import { X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { PortalContainerProvider } from "@forgely/ui";

interface ModalProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onClose: () => void;
  /** Fixed strip under the content, for the buttons. */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * A dialog on top of the page. It is the browser's own `<dialog>`, so focus stays inside, Escape closes
 * it, and the page behind cannot be clicked or tabbed into. Clicking the dim area does not close it: a
 * form with unsaved work should only close on a deliberate Cancel, X, or Escape.
 */
export function Modal({ title, subtitle, icon: Icon, onClose, footer, children }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Dropdowns inside the dialog draw into it; a modal dialog sits above anything added to the page body.
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Stable, so React does not detach and re-attach the ref (and re-render) on every render.
  const attachDialog = useCallback((element: HTMLDialogElement | null) => {
    dialog.current = element;
    setContainer(element);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog
      ref={attachDialog}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[calc(100vh-48px)] w-[min(1040px,calc(100vw-32px))] overflow-hidden rounded-[22px] border border-line bg-surface-raised p-0 text-fg backdrop:bg-black/70 open:flex open:flex-col"
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface-inset">
          <Icon className="size-5 text-muted" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">{title}</h2>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-9 cursor-pointer place-items-center rounded-full text-muted transition-colors hover:bg-surface-overlay hover:text-fg"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <PortalContainerProvider value={container}>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </PortalContainerProvider>
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
        {footer}
      </footer>
    </dialog>
  );
}
