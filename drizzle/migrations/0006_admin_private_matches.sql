CREATE TABLE public.admin_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  host text NOT NULL DEFAULT 'Admin',
  seed integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_matches TO authenticated;
GRANT ALL ON public.admin_matches TO service_role;
ALTER TABLE public.admin_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see matches" ON public.admin_matches FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins start matches" ON public.admin_matches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

CREATE TABLE public.admin_match_scores (
  match_id uuid NOT NULL REFERENCES public.admin_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL DEFAULT 'Admin',
  strokes integer NOT NULL CHECK (strokes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);
GRANT SELECT, INSERT ON public.admin_match_scores TO authenticated;
GRANT ALL ON public.admin_match_scores TO service_role;
ALTER TABLE public.admin_match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins see match scores" ON public.admin_match_scores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins post own match score" ON public.admin_match_scores FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_match_scores;