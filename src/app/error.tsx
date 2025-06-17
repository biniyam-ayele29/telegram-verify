'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { TeleVerifyLogo } from '@/components/icons/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    // console.error("Global Error Boundary Caught:", error);
    // For production, integrate with Sentry, LogRocket, etc.
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Card className="shadow-xl border-destructive">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-destructive">Something Went Wrong</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              We encountered an unexpected error. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {process.env.NODE_ENV === 'development' && error?.message && (
                 <p className="text-sm text-destructive bg-destructive/5 p-2 rounded-md">
                    <strong>Error:</strong> {error.message}
                    {error.digest && <><br/><strong>Digest:</strong> {error.digest}</>}
                </p>
            )}
            <Button
              onClick={
                // Attempt to recover by trying to re-render the segment
                () => reset()
              }
            >
              Try again
            </Button>
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          If the problem persists, please contact support.
        </p>
      </div>
    </main>
  );
}
