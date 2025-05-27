
// src/app/verify-telegram/page.tsx
"use client";

import React, { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  KeyRound,
  Loader2,
  BotMessageSquare,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  Copy,
  LogOut,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { verifyCodeAction, type ActionFormState } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TeleVerifyLogo } from "@/components/icons/logo";
import { VerificationCodeSchema } from "@/lib/verification-shared";

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "Firegebeyaouthbot"; // Use env var or default

const otpFormSchema = z.object({
  verificationCode: VerificationCodeSchema,
});

function VerifyTelegramContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const pendingId = searchParams.get("pendingId");

  const initialFormState: ActionFormState = { success: false, message: "" };
  const [verifyCodeFormState, verifyCodeFormAction] = useActionState<
    ActionFormState,
    FormData
  >(verifyCodeAction, initialFormState);

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { verificationCode: "" },
  });

  const [isVerified, setIsVerified] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [associatedPhoneNumber, setAssociatedPhoneNumber] = useState<string | null>(null);


  useEffect(() => {
    if (!pendingId) {
      toast({
        title: "Error",
        description: "Verification identifier missing. Please start over.",
        variant: "destructive",
      });
      router.push("/"); 
    }
    // If you want to display the phone number, you'd need to fetch it based on pendingId
    // For now, we'll rely on the bot to confirm which number the code is for.
    // Or, have the verifyCodeAction return it upon success.
  }, [pendingId, router, toast]);

  useEffect(() => {
    if (verifyCodeFormState?.message) {
      if (verifyCodeFormState.success) {
        setIsVerified(true);
        toast({
          title: "Verified!",
          description: verifyCodeFormState.message,
          variant: "default",
        });

        if (verifyCodeFormState.finalRedirectUrl) {
          setIsRedirecting(true);
          let currentCountdown = 3;
          const intervalId = setInterval(() => {
            currentCountdown -= 1;
            setCountdown(currentCountdown);
            if (currentCountdown <= 0) {
              clearInterval(intervalId);
              router.push(verifyCodeFormState.finalRedirectUrl!);
            }
          }, 1000);
          return () => clearInterval(intervalId); 
        }

      } else {
        toast({
          title: "Error",
          description: verifyCodeFormState.message,
          variant: "destructive",
        });
        if (verifyCodeFormState.field === "verificationCode") {
          otpForm.setError("verificationCode", {
            type: "manual",
            message: verifyCodeFormState.message,
          });
        } else {
          otpForm.setError("root.serverError", {
            type: "manual",
            message: verifyCodeFormState.message,
          });
        }
      }
    }
  }, [verifyCodeFormState, toast, otpForm, router]);

  const SubmitButton = ({
    children,
    icon,
  }: {
    children: React.ReactNode;
    icon?: React.ReactNode;
  }) => {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending || isVerified || isRedirecting}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {children}
      </Button>
    );
  };

  if (isVerified) {
    return (
      <Alert variant="default" className="mt-4 text-center">
        <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-2" />
        <AlertTitle className="font-bold text-lg">Verification Successful!</AlertTitle>
        <AlertDescription>
          Your phone number has been successfully verified.
          {isRedirecting && verifyCodeFormState.finalRedirectUrl && (
            <p className="mt-2">
              Redirecting you back in {countdown}...
            </p>
          )}
           {!isRedirecting && ( 
            <Button
              onClick={() => router.push("/")}
              variant="link"
              className="mt-4 p-0 h-auto"
            >
              Verify Another Number
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (!pendingId) {
    return (
      <Alert variant="destructive" className="mt-4">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Missing Information</AlertTitle>
        <AlertDescription>
          The verification identifier is missing. Please{" "}
          <a href="/" className="underline">
            start over
          </a>
          .
        </AlertDescription>
      </Alert>
    );
  }
  
  // KICKOFF_ prefix is for the bot to identify the payload type
  const telegramBotDeeplinkPayload = `KICKOFF_${pendingId}`;
  const telegramBotUrl = `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${telegramBotDeeplinkPayload}`;
  const telegramAppUrl = `tg://resolve?domain=${TELEGRAM_BOT_USERNAME}&start=${telegramBotDeeplinkPayload}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    telegramBotUrl 
  )}`;

  return (
    <Card className="shadow-xl w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center text-primary">
          Verify via Telegram
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground pt-1">
          Follow these steps to get your verification code.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 text-left text-sm">
          <p className="flex items-start">
            <span className="font-semibold mr-2">1.</span> Click a button below or scan the QR code to open our Telegram bot. This will automatically start the process.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center my-2">
            <Button asChild variant="outline">
              <a
                href={telegramAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BotMessageSquare className="mr-2 h-4 w-4" /> Open in Telegram App
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href={telegramBotUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" /> Open in Telegram Web
              </a>
            </Button>
          </div>
          <div className="flex justify-center my-3">
            <Image
              src={qrCodeUrl}
              alt={`QR Code for Telegram bot ${TELEGRAM_BOT_USERNAME}`}
              width={150}
              height={150}
              className="rounded-md border shadow-md"
              data-ai-hint="qr code"
            />
          </div>
           <p className="flex items-start">
            <span className="font-semibold mr-2">2.</span> Our bot will send you a 6-digit code.
          </p>
           <p className="flex items-start">
            <span className="font-semibold mr-2">3.</span> Enter that code below.
          </p>
        </div>

        <Alert variant="default">
            <Info className="h-4 w-4" />
            <AlertTitle>Pending ID</AlertTitle>
            <AlertDescription>
                Your current verification session ID is: <code className="font-mono bg-muted p-1 rounded">{pendingId}</code>.
                The bot will use this.
            </AlertDescription>
        </Alert>


        <hr className="my-6 border-border" />

        <div>
          <p className="text-sm text-foreground text-center mb-3">
            Enter the 6-digit code from the bot:
          </p>
          <Form {...otpForm}>
            <form
              action={(formData) => {
                if (pendingId) {
                  formData.append("pendingId", pendingId);
                }
                verifyCodeFormAction(formData);
              }}
              className="space-y-4"
            >
              <FormField
                control={otpForm.control}
                name="verificationCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="verificationCode" className="sr-only">
                      Verification Code
                    </FormLabel>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl>
                        <Input
                          id="verificationCode"
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          className="pl-10 tracking-widest text-center text-lg"
                          {...field}
                          disabled={isVerified || isRedirecting}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {otpForm.formState.errors.root?.serverError && (
                <p className="text-sm font-medium text-destructive">
                  {otpForm.formState.errors.root.serverError.message}
                </p>
              )}
              <SubmitButton icon={<KeyRound className="mr-2 h-4 w-4" />}>
                Verify My Code
              </SubmitButton>
            </form>
          </Form>
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-2">
        <Button
          variant="link"
          onClick={() => router.push("/")}
          className="mx-auto text-sm"
          disabled={isRedirecting}
        >
          Start Over
        </Button>
        { isVerified && verifyCodeFormState.finalRedirectUrl && (
           <Button
            variant="outline"
            onClick={() => router.push(verifyCodeFormState.finalRedirectUrl!)}
            className="mx-auto text-sm"
          >
            <LogOut className="mr-2 h-4 w-4" /> Go to Client App Now
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function VerifyTelegramPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <TeleVerifyLogo />
        </div>
        <Suspense
          fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}
        >
          <VerifyTelegramContent />
        </Suspense>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Powered by Genkit & Next.js
        </p>
      </div>
    </main>
  );
}
