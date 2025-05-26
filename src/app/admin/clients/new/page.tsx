// src/app/admin/clients/new/page.tsx
import { AddClientForm } from '@/components/admin/add-client-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AddNewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/admin/clients">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Client List
            </Link>
        </Button>
        <h1 className="text-2xl font-bold">Add New Client Application</h1>
        <p className="text-muted-foreground">
          Register a new company or website to use TeleVerify.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Client Application Details</CardTitle>
          <CardDescription>
            The Client ID and Secret will be generated automatically. Provide the Client Secret to the company securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddClientForm />
        </CardContent>
      </Card>
    </div>
  );
}
