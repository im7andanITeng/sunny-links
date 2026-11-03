CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  author text NOT NULL DEFAULT 'Admin',
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read lobby" ON public.admin_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins post in lobby" ON public.admin_messages FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());

CREATE TABLE public.admin_status (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT 'Admin',
  levels_passed integer NOT NULL DEFAULT 0,
  hole integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.admin_status TO authenticated;
GRANT ALL ON public.admin_status TO service_role;
ALTER TABLE public.admin_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read status" ON public.admin_status FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins add own status" ON public.admin_status FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());
CREATE POLICY "Admins update own status" ON public.admin_status FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_status;