// src/components/phone-verification-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Smartphone, KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { sendCodeAction, verifyCodeAction } from "@/lib/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const phoneSchema = z.object({
  phoneNumber: z.string()
    .min(10, "Invalid phone number length.")
    .max(15, "Invalid phone number length.")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Include country code e.g. +1234567890"),
});

const codeSchema = z.object({
  verificationCode: z.string()
    .length(6, "Code must be 6 digits.")
    .regex(/^\d{6}$/, "Code must be 6 digits."),
});

type Step = "phoneNumber" | "verificationCode" | "verified";

export function PhoneVerificationForm() {
  const [step, setStep] = useState<Step>("phoneNumber");
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState<string>("");
  const { toast } = useToast();

  // Form state for sending code
  const [sendCodeFormState, sendCodeFormAction] = useFormState(sendCodeAction, { success: false, message: "" });
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phoneNumber: "" },
  });

  // Form state for verifying code
  const [verifyCodeFormState, verifyCodeFormAction] = useFormState(verifyCodeAction, { success: false, message: "" });
  const codeForm = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { verificationCode: "" },
  });

  useEffect(() => {
    if (sendCodeFormState?.message) {
      if (sendCodeFormState.success) {
        toast({
          title: "Success",
          description: sendCodeFormState.message,
          variant: "default",
        });
        setCurrentPhoneNumber(phoneForm.getValues("phoneNumber"));
        setStep("verificationCode");
        codeForm.reset(); // Reset code form
      } else {
        toast({
          title: "Error",
          description: sendCodeFormState.message,
          variant: "destructive",
        });
         if (sendCodeFormState.field === "phoneNumber") {
          phoneForm.setError("phoneNumber", { type: "manual", message: sendCodeFormState.message });
        }
      }
    }
  }, [sendCodeFormState, toast, phoneForm]);

  useEffect(() => {
    if (verifyCodeFormState?.message) {
      if (verifyCodeFormState.success) {
        toast({
          title: "Verified!",
          description: verifyCodeFormState.message,
          variant: "default",
        });
        setStep("verified");
      } else {
        toast({
          title: "Error",
          description: verifyCodeFormState.message,
          variant: "destructive",
        });
        if (verifyCodeFormState.field === "verificationCode") {
          codeForm.setError("verificationCode", { type: "manual", message: verifyCodeFormState.message });
        }
      }
    }
  }, [verifyCodeFormState, toast, codeForm]);
  
  const handleBackToPhoneInput = () => {
    setStep("phoneNumber");
    setCurrentPhoneNumber("");
    phoneForm.reset();
    codeForm.reset();
    // Reset form states if necessary, though useFormState handles its own reset on re-render effectively
  };

  const SubmitButton = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {children}
      </Button>
    );
  };

  if (step === "verified") {
    return (
      <Alert variant="default" className="mt-4">
        <CheckCircle2 className="h-5 w-5" />
        <AlertTitle>Verification Successful!</AlertTitle>
        <AlertDescription>
          Your phone number has been successfully verified.
        </AlertDescription>
        <Button onClick={handleBackToPhoneInput} variant="link" className="mt-4 p-0 h-auto">Start Over</Button>
      </Alert>
    );
  }

  return (
    <>
      {step === "phoneNumber" && (
        <Form {...phoneForm}>
          <form action={sendCodeFormAction} className="space-y-6">
            <FormField
              control={phoneForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="phoneNumber">Phone Number</FormLabel>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        placeholder="+1 123 456 7890"
                        className="pl-10"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SubmitButton icon={<Smartphone className="mr-2 h-4 w-4" />}>Send Verification Code</SubmitButton>
          </form>
        </Form>
      )}

      {step === "verificationCode" && (
        <Form {...codeForm}>
           <button onClick={handleBackToPhoneInput} className="flex items-center text-sm text-primary hover:underline mb-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Change phone number
          </button>
          <p className="text-sm text-muted-foreground mb-2">
            Enter the code sent to: <strong>{currentPhoneNumber}</strong>
          </p>
          <form
            action={(formData) => {
              formData.append("phoneNumber", currentPhoneNumber);
              verifyCodeFormAction(formData);
            }}
            className="space-y-6"
          >
            <FormField
              control={codeForm.control}
              name="verificationCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="verificationCode">Verification Code</FormLabel>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        id="verificationCode"
                        type="text"
                        maxLength={6}
                        placeholder="Enter 6-digit code"
                        className="pl-10 tracking-widest text-center"
                        {...field}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SubmitButton icon={<KeyRound className="mr-2 h-4 w-4" />}>Verify Code</SubmitButton>
          </form>
        </Form>
      )}
    </>
  );
}
