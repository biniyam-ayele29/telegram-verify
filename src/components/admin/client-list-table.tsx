// src/components/admin/client-list-table.tsx
import Link from 'next/link';
import { ClientApplication } from '@/lib/admin-types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil } from 'lucide-react';

interface ClientListTableProps {
  applications: ClientApplication[];
}

export default function ClientListTable({ applications }: ClientListTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company Name</TableHead>
          <TableHead>Client ID</TableHead>
          <TableHead>Contact Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {applications.map((app) => (
          <TableRow key={app.id}>
            <TableCell className="font-medium">{app.companyName}</TableCell>
            <TableCell>
              <code className="text-xs">{app.clientId}</code>
            </TableCell>
            <TableCell>{app.contactEmail}</TableCell>
            <TableCell>
              <Badge variant={app.status === 'active' ? 'default' : 'secondary'}>
                {app.status}
              </Badge>
            </TableCell>
            <TableCell>
              {app.createdAt ? format(new Date(app.createdAt), 'PPpp') : 'N/A'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/clients/${app.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </Button>
              {/* TODO: Add Disable action */}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
