create or replace function public.guard_unlock_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true),
              current_setting('role', true)) is distinct from 'service_role' then

    if tg_op = 'INSERT' then
      if new.unlocked_at is not null or new.unlocked_by is not null then
        raise exception 'unlocked_at/unlocked_by só podem ser definidos pelo webhook de pagamento';
      end if;

    elsif tg_op = 'UPDATE' then
      if new.unlocked_at  is distinct from old.unlocked_at
      or new.unlocked_by  is distinct from old.unlocked_by
      or new.connection_fee is distinct from old.connection_fee then
        raise exception 'campos de unlock só podem ser alterados pelo webhook de pagamento';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_unlock_fields on public.matches;

create trigger trg_guard_unlock_fields
before insert or update on public.matches
for each row execute function public.guard_unlock_fields();
