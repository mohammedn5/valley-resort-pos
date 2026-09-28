import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "تسجيل الدخول | منتجع فالي",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">منتجع فالي</h1>
          <p className="mt-1 text-sm text-muted-foreground">تسجيل الدخول إلى النظام</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
