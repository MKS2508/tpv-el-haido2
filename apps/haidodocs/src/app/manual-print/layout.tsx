/**
 * @fileoverview Layout para la página de impresión del manual
 * @description Layout minimalista sin sidebar ni navegación para impresión/PDF
 */

import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function ManualPrintLayout({
  children,
}: LayoutProps): ReactNode {
  return <div className="manual-print-layout">{children}</div>;
}
