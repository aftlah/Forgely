"use client";

import { createContext, useContext } from "react";

const PortalContainerContext = createContext<HTMLElement | null>(null);

/**
 * Where floating panels (such as a dropdown's list) should be drawn. A native `<dialog>` opened as a modal
 * sits in the browser's top layer, so anything drawn into `document.body` would hide behind it. A dialog
 * puts itself here so its dropdowns render inside it instead.
 */
export const PortalContainerProvider = PortalContainerContext.Provider;

/** The element floating panels should render into, or null to use the page body. */
export function usePortalContainer(): HTMLElement | null {
  return useContext(PortalContainerContext);
}
