
// src/components/phone-verification-form.tsx
"use client";

import { useEffect } from "react";
import { useActionState } from "react"; // Correct hook for React 19+
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Smartphone, Loader2, Globe, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { sendCodeAction, type ActionFormState } from "@/lib/actions";

const africanCountries = [
  { name: "Algeria", code: "+213" }, { name: "Angola", code: "+244" },
  { name: "Benin", code: "+229" }, { name: "Botswana", code: "+267" },
  { name: "Burkina Faso", code: "+226" }, { name: "Burundi", code: "+257" },
  { name: "Cabo Verde", code: "+238" }, { name: "Cameroon", code: "+237" },
  { name: "Central African Republic", code: "+236" }, { name: "Chad", code: "+235" },
  { name: "Comoros", code: "+269" }, { name: "Congo, Dem. Rep.", code: "+243" },
  { name: "Congo, Rep.", code: "+242" }, { name: "Cote d'Ivoire", code: "+225" },
  { name: "Djibouti", code: "+253" }, { name: "Egypt", code: "+20" },
  { name: "Equatorial Guinea", code: "+240" }, { name: "Eritrea", code: "+291" },
  { name: "Eswatini (fmr. Swaziland)", code: "+268" }, { name: "Ethiopia", code: "+251" },
  { name: "Gabon", code: "+241" }, { name: "Gambia", code: "+220" },
  { name: "Ghana", code: "+233" }, { name: "Guinea", code: "+224" },
  { name: "Guinea-Bissau", code: "+245" }, { name: "Kenya", code: "+254" },
  { name: "Lesotho", code: "+266" }, { name: "Liberia", code: "+231" },
  { name: "Libya", code: "+218" }, { name: "Madagascar", code: "+261" },
  { name: "Malawi", code: "+265" }, { name: "Mali", code: "+223" },
  { name: "Mauritania", code: "+222" }, { name: "Mauritius", code: "+230" },
  { name: "Morocco", code: "+212" }, { name: "Mozambique", code: "+258" },
  { name: "Namibia", code: "+264" }, { name: "Niger", code: "+227" },
  { name: "Nigeria", code: "+234" }, { name: "Rwanda", code: "+250" },
  { name: "Sao Tome and Principe", code: "+239" }, { name: "Senegal", code: "+221" },
  { name: "Seychelles", code: "+248" }, { name: "Sierra Leone", code: "+232" },
  { name: "Somalia", code: "+252" }, { name: "South Africa", code: "+27" },
  { name: "South Sudan", code: "+211" }, { name: "Sudan", code: "+249" },
  { name: "Tanzania", code: "+255" }, { name: "Togo", code: "+228" },
  { name: "Tunisia", code: "+216" }, { name: "Uganda", code: "+256" },
  { name: "Zambia", code: "+260" }, { name: "Zimbabwe", code: "+263" },
];

const phoneSchema = z.object({
  countryCode: z.string()
    .min(1, "Please select a country code.")
    .max(5, "Country code is too long.")
    .regex(/^\+\d{1,4}$/, "Invalid country code format."),
  localPhoneNumber: z.string()
    .min(7, "Phone number is too short.")
    .max(14, "Phone number is too long.")
    .regex(/^\d+$/, "Phone number must contain only digits."),
});


export function PhoneVerificationForm() {
  const router = useRouter();
  const { toast } = useToast();

  const initialFormState: ActionFormState = { success: false, message: "" };
  const [sendCodeFormState, sendCodeFormAction] = useActionState<ActionFormState, FormData>(sendCodeAction, initialFormState);
  
  const phoneForm = useForm<z.infer<typeof phoneSchema>>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { countryCode: "+251", localPhoneNumber: "" }, // Default to Ethiopia
  });

  useEffect(() => {
    if (sendCodeFormState?.message) { // A message exists from the action
      if (sendCodeFormState.success && sendCodeFormState.redirectUrl) {
        if (sendCodeFormState.toastMessage) {
          toast({ title: "Notice", description: sendCodeFormState.toastMessage, variant: "default" });
        }
        router.push(sendCodeFormState.redirectUrl);
      } else if (!sendCodeFormState.success) {
        const messageToDisplay = sendCodeFormState.toastMessage || sendCodeFormState.message;
        toast({
          title: "Error",
          description: messageToDisplay,
          variant: "destructive",
        });
        if (sendCodeFormState.field) {
          if (sendCodeFormState.field === "countryCode" || sendCodeFormState.field === "localPhoneNumber") {
             phoneForm.setError(sendCodeFormState.field as "countryCode" | "localPhoneNumber", { type: "manual", message: sendCodeFormState.message });
          } else {
             phoneForm.setError("root.serverError", { type: "manual", message: sendCodeFormState.message });
          }
        } else {
            phoneForm.setError("root.serverError", { type: "manual", message: sendCodeFormState.message });
        }
      }
    }
  }, [sendCodeFormState, toast, router]); // Removed phoneForm from dependencies

  const SubmitButton = ({ children, icon }: { children: React.ReactNode, icon?: React.ReactNode }) => {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : icon}
        {children}
      </Button>
    );
  };

  return (
    <Form {...phoneForm}>
      <form action={sendCodeFormAction} className="space-y-6">
        <div className="flex space-x-2">
          <FormField
            control={phoneForm.control}
            name="countryCode"
            render={({ field }) => (
              <FormItem className="w-2/5">
                <FormLabel>Country</FormLabel>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    // name={field.name} // name is on hidden input
                  >
                    <FormControl>
                      {/* FormControl wraps the SelectTrigger for proper id and aria linking */}
                      <SelectTrigger className="pl-10" ref={field.ref}>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {africanCountries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name} ({country.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* This hidden input ensures the value is submitted with FormData for server actions */}
                  <input type="hidden" name={field.name} value={field.value} />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={phoneForm.control}
            name="localPhoneNumber"
            render={({ field }) => (
              <FormItem className="w-3/5">
                <FormLabel>Phone Number</FormLabel>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input
                      id="localPhoneNumber"
                      type="tel"
                      placeholder="123456789"
                      className="pl-10"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
         {phoneForm.formState.errors.root?.serverError && (
            <p className="text-sm font-medium text-destructive">{phoneForm.formState.errors.root.serverError.message}</p>
        )}
        <SubmitButton icon={<Smartphone className="mr-2 h-4 w-4" />}>Continue to Telegram</SubmitButton>
      </form>
    </Form>
  );
}
