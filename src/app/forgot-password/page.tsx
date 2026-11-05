import type { Metadata } from "next";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <div className="container-x flex justify-center py-8 sm:py-16">
      <div className="w-full max-w-md"><ForgotForm /></div>
    </div>
  );
}
