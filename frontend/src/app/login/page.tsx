import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-subtle p-6">
      <LoginForm />
    </main>
  );
}
