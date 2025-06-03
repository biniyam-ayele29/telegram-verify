
// src/app/admin/login/page.tsx
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loginAdminAction } from '@/lib/auth/actions';
import type { AdminAuthFormState } from '@/lib/auth/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LogIn, AlertTriangle, Loader2 } from 'lucide-react';
import { TeleVerifyLogo } from '@/components/icons/logo';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
      Login
    </Button>
  );
}

export default function AdminLoginPage() {
  const router = useRouter();
  const initialState: AdminAuthFormState = { success: false, message: '' };
  const [state, formAction] = useActionState(loginAdminAction, initialState);

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-primary">
              Admin Login
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground pt-1">
              Access the TeleVerify Admin Panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" name="username" type="text" required />
                {state.fieldErrors?.username && (
                  <p className="mt-1 text-sm text-destructive">{state.fieldErrors.username.join(', ')}</p>
                )}
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
                 {state.fieldErrors?.password && (
                  <p className="mt-1 text-sm text-destructive">{state.fieldErrors.password.join(', ')}</p>
                )}
              </div>

              {!state.success && state.message && !state.fieldErrors && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}
              
              <SubmitButton />
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
