"use client";

import {useTransition} from "react";
import {LogOut} from "lucide-react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      await fetch("/api/admin/session", {method: "DELETE"});
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleLogout}
      disabled={isPending}
      className="h-10 rounded-full border-border/50 bg-background/70 px-4 backdrop-blur-sm"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {isPending ? "Leaving..." : "Logout"}
    </Button>
  );
}
