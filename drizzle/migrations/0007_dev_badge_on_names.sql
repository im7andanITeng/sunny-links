alter table public.players add column is_admin boolean not null default false;

create or replace function public.stamp_player_admin()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    if tg_op = 'UPDATE' then new.is_admin := old.is_admin; end if;
    return new;
  end if;
  new.is_admin := public.has_role(auth.uid(), 'admin');
  return new;
end $$;

create trigger players_stamp_admin before insert or update on public.players
for each row execute function public.stamp_player_admin();