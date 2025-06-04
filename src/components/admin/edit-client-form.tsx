// src/components/admin/edit-client-form.tsx
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { updateClientApplicationAction, type UpdateClientFormState } from '@/lib/admin-actions';
import type { ClientApplication } from '@/lib/admin-types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Changes
    </Button>
  );
}

interface EditClientFormProps {
  clientApplication: ClientApplication;
}

export function EditClientForm({ clientApplication }: EditClientFormProps) {
  const router = useRouter();
  const initialState: UpdateClientFormState = { success: false, message: '' };
  const [state, formAction] = useActionState(updateClientApplicationAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success && state.updatedClient) {
      toast({
        title: "Client Updated!",
        description: `Client ${state.updatedClient.companyName} details saved.`,
        variant: "default",
      });
      // Optionally redirect or refresh data
      router.refresh(); // Refreshes server components on the current route
      // router.push('/admin/clients'); // Or redirect to client list
    } else if (!state.success && state.message && state.message !== 'Validation failed. Please check the fields.') {
      if(!state.fieldErrors){
         toast({
            title: "Error",
            description: state.message,
            variant: "destructive",
          });
      }
    }
  }, [state, toast, router]);

  return (
    <form
      action={(formData) => {
        formData.append('id', clientApplication.id!); // Pass the Firestore document ID
        formAction(formData);
      }}
      ref={formRef}
      className="space-y-6"
    >
      <input type="hidden" name="id" value={clientApplication.id} />
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" name="companyName" defaultValue={clientApplication.companyName} required />
        {state.fieldErrors?.companyName && (
          <p className="mt-1 text-sm text-destructive">{state.fieldErrors.companyName.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" defaultValue={clientApplication.contactEmail} required />
        {state.fieldErrors?.contactEmail && (
          <p className="mt-1 text-sm text-destructive">{state.fieldErrors.contactEmail.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="redirectUris">Redirect URIs (comma-separated)</Label>
        <Textarea
          id="redirectUris"
          name="redirectUris"
          placeholder="https://company.com/callback, https://another.company.com/oauth"
          defaultValue={clientApplication.redirectUris.join(', ')}
          required
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Provide one or more valid HTTPS URLs where users will be redirected after authentication.
        </p>
        {state.fieldErrors?.redirectUris && (
          <p className="mt-1 text-sm text-destructive">{state.fieldErrors.redirectUris.join(', ')}</p>
        )}
      </div>
      
      <SubmitButton />

      {state.success && state.updatedClient && (
        <Alert variant="default" className="mt-6">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle>Client Application Updated!</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>Changes for <strong>{state.updatedClient.companyName}</strong> have been saved.</p>
          </AlertDescription>
        </Alert>
      )}
      {!state.success && state.message && state.fieldErrors && (
         <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
