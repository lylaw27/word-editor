import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Word Editor',
  description: 'A desktop word processor built with Electron, React, and TipTap',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
