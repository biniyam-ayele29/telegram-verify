// src/app/admin/clients/page.tsx
import Link from 'next/link';
import { PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getClientApplicationsAction } from '@/lib/admin-actions';
import ClientListTable from '@/components/admin/client-list-table';

export default async function AdminClientsPage() {
  const { applications, error } = await getClientApplicationsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Applications</h1>
          <p className="text-muted-foreground">
            Manage companies using TeleVerify for authentication.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/clients/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Client
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Error Loading Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!error && applications && (
        <ClientListTable applications={applications} />
      )}
       {!error && (!applications || applications.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No client applications found.</p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/admin/clients/new">Add your first client</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
