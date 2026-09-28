import type { ReactNode } from "react";

export const metadata = {
  title: "Teletriage Veterinario",
  description: "Orientación veterinaria de urgencia online",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
