"use client";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { RecurringManager } from "@/components/sender/recurring-manager";

export default function RecurringPage() {
  return <AuthGuard><AppShell><div className="mx-auto max-w-2xl pb-12"><RecurringManager /></div></AppShell></AuthGuard>;
}
