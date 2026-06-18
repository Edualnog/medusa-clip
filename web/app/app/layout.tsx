import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./sidebar";

// Shell do sistema (area logada). Auth checada aqui -> vale pra todas as /app/*.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="shell">
      <Sidebar email={user.email ?? ""} />
      <section className="content">{children}</section>
    </div>
  );
}
