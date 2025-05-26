// src/components/admin/add-client-form.tsx
'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { addClientApplicationAction, type AddClientFormState } from '@/lib/admin-actions';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertTriangle, Loader2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Add Client Application
    </Button>
  );
}

export function AddClientForm() {
  const initialState: AddClientFormState = { success: false, message: '' };
  const [state, formAction] = useActionState(addClientApplicationAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.success && state.newClient) {
      toast({
        title: "Client Added!",
        description: `Client ${state.newClient.companyName} created.`,
        variant: "default",
      });
      formRef.current?.reset(); // Reset form on success
    } else if (!state.success && state.message && state.message !== 'Validation failed. Please check the fields.') {
      // Show general errors as toasts, field errors are shown inline
      if(!state.fieldErrors){
         toast({
            title: "Error",
            description: state.message,
            variant: "destructive",
          });
      }
    }
  }, [state, toast]);

  const copyToClipboard = (text: string | undefined, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${fieldName} copied to clipboard.` });
    }).catch(err => {
      toast({ title: "Error", description: `Failed to copy ${fieldName}.`, variant: "destructive" });
    });
  };


  return (
    <form action={formAction} ref={formRef} className="space-y-6">
      <div>
        <Label htmlFor="companyName">Company Name</Label>
        <Input id="companyName" name="companyName" required />
        {state.fieldErrors?.companyName && (
          <p className="mt-1 text-sm text-destructive">{state.fieldErrors.companyName.join(', ')}</p>
        )}
      </div>

      <div>
        <Label htmlFor="contactEmail">Contact Email</Label>
        <Input id="contactEmail" name="contactEmail" type="email" required />
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

      {state.success && state.newClient && (
        <Alert variant="default" className="mt-6">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertTitle>Client Application Created Successfully!</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p><strong>Company:</strong> {state.newClient.companyName}</p>
            <div className="flex items-center justify-between">
              <span><strong>Client ID:</strong> <code>{state.newClient.clientId}</code></span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(state.newClient?.clientId, 'Client ID')} aria-label="Copy Client ID">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-red-600"><strong>Client Secret (Copy Now - Shown Once):</strong> <code>{state.newClient.clientSecretPlainText}</code></span>
               <Button variant="ghost" size="sm" onClick={() => copyToClipboard(state.newClient?.clientSecretPlainText, 'Client Secret')} aria-label="Copy Client Secret">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-red-500 font-medium">
              Store the Client Secret securely. It will not be shown again. 
              In a production environment, this secret should be properly hashed before storage and never stored in plain text.
            </p>
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
