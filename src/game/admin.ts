import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const ALL_SKINS_KEY = "sunny-links-admin-all";

/** True only when the signed-in account holds the admin role on the server. */
export function useAdmin() {
  const [admin, setAdmin] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setEmail(u?.email ?? null);
      if (!u) { setAdmin(false); return; }
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.id).eq("role", "admin").maybeSingle();
      setAdmin(!!r);
    };
    const { data: sub } = supabase.auth.onAuthStateChange(() => { setTimeout(check, 0); });
    void check();
    return () => sub.subscription.unsubscribe();
  }, []);
  return { admin, email };
}
