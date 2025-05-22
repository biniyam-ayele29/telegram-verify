import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Using Inter as a suitable clear font
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans', // Using a more generic variable name
  display: 'swap', // Added for better font loading behavior
});

export const metadata: Metadata = {
  title: 'TeleVerify',
  description: 'Phone Number Verification with Telegram',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
