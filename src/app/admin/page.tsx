// src/app/admin/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Manage your TeleVerify service.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Welcome to the TeleVerify Admin Panel.</p>
          <p className="text-red-500 font-semibold">
            SECURITY WARNING: This admin panel is not currently secured with authentication.
            Implement proper admin login before exposing this to any non-local environment.
          </p>
          <div>
            <Button asChild>
              <Link href="/admin/clients">
                <Users className="mr-2 h-4 w-4" /> Manage Client Applications
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
