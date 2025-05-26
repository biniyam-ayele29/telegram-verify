// src/app/admin/layout.tsx
import Link from 'next/link';
import { Shield, Users, LayoutDashboard } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link href="/admin" className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Shield className="h-6 w-6" />
          <span>TeleVerify Admin</span>
        </Link>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
          <nav className="grid gap-1 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/admin/clients"
              className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
            >
              <Users className="h-4 w-4" />
              Client Apps
            </Link>
            {/* TODO: Add admin authentication link/status here */}
            <p className="mt-4 px-3 py-2 text-xs text-muted-foreground">
              (Admin auth not implemented)
            </p>
          </nav>
        </aside>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
