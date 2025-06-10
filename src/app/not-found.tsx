
// src/app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home } from 'lucide-react';
import { TeleVerifyLogo } from '@/components/icons/logo';

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-3xl font-bold text-destructive">404 - Page Not Found</CardTitle>
            <CardDescription className="text-muted-foreground pt-2">
              Oops! The page you&apos;re looking for doesn&apos;t seem to exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">
              It might have been moved, deleted, or maybe you just mistyped the URL.
              Let&apos;s get you back on track.
            </p>
            <Button asChild>
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to Homepage
              </Link>
            </Button>
          </CardContent>
        </Card>
         <p className="mt-8 text-center text-sm text-muted-foreground">
          Powered by Genkit & Next.js
        </p>
      </div>
    </main>
  );
}
