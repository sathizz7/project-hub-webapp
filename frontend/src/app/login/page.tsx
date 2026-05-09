import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle p-6">
      <LoginForm />
    </main>
  );
}
