create or replace function public.stamp_player_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or (tg_op = 'UPDATE' and new.banned is distinct from old.banned) then
    if tg_op = 'UPDATE' then new.is_admin := old.is_admin; end if;
    return new;
  end if;
  new.is_admin := public.has_role(auth.uid(), 'admin');
  return new;
end $$;

create or replace function public.guard_player_ban()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.is_admin and new.banned then
    new.banned := false;
  end if;
  if public.has_role(auth.uid(), 'admin') then return new; end if;
  if tg_op = 'INSERT' then
    new.banned := false;
  else
    if old.banned then return null; end if;
    new.banned := old.banned;
  end if;
  return new;
end $$;