alter table public.matches add column created_by uuid references public.profiles(id);
update public.matches set created_by = (select requester_id from public.orders where id = order_id) where created_by is null;
alter table public.matches alter column created_by set not null;
