// src/app/admin/clients/[clientId]/edit/page.tsx
import { EditClientForm } from '@/components/admin/edit-client-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getClientApplicationById } from '@/lib/admin-actions'; // We'll need a server action to fetch by Firestore ID

interface EditClientPageProps {
  params: { clientId: string };
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { clientId } = params;
  const { application, error } = await getClientApplicationById(clientId);

  if (error || !application) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/clients">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Client List
          </Link>
        </Button>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle /> Error Loading Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Client application not found."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/clients">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Client List
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Client Application</h1>
        <p className="text-muted-foreground">
          Modify the details for &quot;{application.companyName}&quot;.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Client Application Details</CardTitle>
          <CardDescription>
            Update the company name, contact email, or redirect URIs. Client ID and Secret cannot be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditClientForm clientApplication={application} />
        </CardContent>
      </Card>
    </div>
  );
}
