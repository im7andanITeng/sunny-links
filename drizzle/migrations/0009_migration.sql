alter table public.players add column if not exists is_owner boolean not null default false;
create or replace function public.stamp_player_admin() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null or (tg_op = 'UPDATE' and new.banned is distinct from old.banned) then
    if tg_op = 'UPDATE' then new.is_admin := old.is_admin; new.is_owner := old.is_owner; else new.is_owner := false; end if;
    return new;
  end if;
  new.is_admin := public.has_role(auth.uid(), 'admin');
  new.is_owner := new.is_admin and lower(coalesce(auth.jwt()->>'email','')) = 'fahadalthani537@gmail.com';
  return new;
end $$;