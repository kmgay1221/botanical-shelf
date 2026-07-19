import { BottomNav } from "@/components/BottomNav";
import { getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-col h-dvh overflow-hidden" style={{ background: "var(--bg)" }}>
      <main className="safe-top flex-1 overflow-y-auto overscroll-contain">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
