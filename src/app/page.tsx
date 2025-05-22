import { PhoneVerificationForm } from "@/components/phone-verification-form";
import { TeleVerifyLogo } from "@/components/icons/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-primary">Verify Your Phone Number</CardTitle>
            <CardDescription className="text-center text-muted-foreground pt-1">
              Securely verify your phone number using Telegram.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneVerificationForm />
          </CardContent>
        </Card>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Powered by Genkit & Next.js
        </p>
      </div>
    </main>
  );
}
