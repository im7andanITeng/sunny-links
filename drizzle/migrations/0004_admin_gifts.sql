CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('coins','vip','daily','levels','skin','all_skins')),
  amount integer NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 100000000),
  claimed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins send gifts" ON public.gifts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins see gifts" ON public.gifts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.claim_gifts(_player uuid)
RETURNS TABLE(kind text, amount integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.gifts g SET claimed = true
  WHERE g.player_id = _player AND g.claimed = false
  RETURNING g.kind, g.amount
$$;
GRANT EXECUTE ON FUNCTION public.claim_gifts(uuid) TO anon, authenticated;