import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/providers';

export const metadata: Metadata = {
  title: 'AEMS — Emergency Training Simulator',
  description: 'ALS/BLS training simulation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-950 antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
