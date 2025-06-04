// src/app/admin/layout.tsx
import Link from "next/link";
import { Shield, Users, LayoutDashboard, LogOut } from "lucide-react";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth/config";
import { verifyToken } from "@/lib/auth/utils";
import { Button } from "@/components/ui/button";
import { logoutAdminAction } from "@/lib/auth/actions";

async function getAuthStatus() {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (tokenCookie?.value) {
      const decoded = await verifyToken(tokenCookie.value);
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

  if (!isAuthenticated) {
    return children;
  }

  return (
    <div className="flex h-screen">
      <nav className="w-64 bg-gray-800 text-white p-4">
        <div className="space-y-4">
          <Link href="/admin" className="flex items-center space-x-2 text-lg">
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin/users" className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Users</span>
          </Link>
          <Link href="/admin/security" className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Security</span>
          </Link>
          <form action={logoutAdminAction}>
            <Button
              type="submit"
              variant="ghost"
              className="flex items-center space-x-2 text-red-400 hover:text-red-300"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </Button>
          </form>
        </div>
      </nav>
      <main className="flex-1 p-8 bg-gray-100">{children}</main>
    </div>
  );
}
