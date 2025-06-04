// src/app/admin/layout.tsx
import Link from "next/link";
import { Shield, Users, LayoutDashboard, LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { verifyToken } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { logoutAdminAction } from "@/lib/auth/actions"; // Import the server action

async function getAuthStatus() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (tokenCookie?.value) {
      const decoded = verifyToken(tokenCookie.value);
      return !!decoded; // True if token is valid, false otherwise
    }
    return false;
  } catch (error) {
    console.error("Error checking auth status:", error);
    return false;
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = await getAuthStatus();

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-lg font-semibold text-primary"
        >
          <Shield className="h-6 w-6" />
          <span>TeleVerify Admin</span>
        </Link>
        {isAuthenticated && (
          <form action={logoutAdminAction} className="ml-auto">
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </form>
        )}
      </header>
      <div className="flex flex-1">
        {isAuthenticated && ( // Only show sidebar if authenticated
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
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
                // TODO: Add active class based on current path
              >
                <Users className="h-4 w-4" />
                Client Apps
              </Link>
            </nav>
          </aside>
        )}
        <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">{children}</main>
      </div>
    </div>
  );
}
