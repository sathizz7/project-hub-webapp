"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ error }: { error?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(error ?? null);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    start(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const envelope = await res.json().catch(() => null);
        if (!res.ok || envelope?.status !== "success") {
          setServerError(envelope?.message ?? "Invalid email or password");
          return;
        }
        router.replace(from);
        router.refresh();
      } catch {
        setServerError("Network error — please try again");
      }
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-[360px] space-y-4 rounded-lg border border-border bg-bg p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-fg">Sign in to ProjectHub</h1>
        <p className="text-sm text-fg-muted">Enter your credentials to continue</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
