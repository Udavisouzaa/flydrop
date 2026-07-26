-- profiles_public é uma view SECURITY DEFINER (security_invoker = off) e
-- auto-atualizável: escritas através dela rodariam como `postgres`, ignorando
-- o RLS de public.profiles. Os grants padrão davam INSERT/UPDATE/DELETE a
-- anon e authenticated, permitindo que qualquer portador da chave anon
-- reescrevesse ou apagasse qualquer perfil. A view deve ser somente-leitura.
revoke all on public.profiles_public from anon, authenticated;
grant select on public.profiles_public to anon, authenticated;

-- guard_unlock_fields() é função de trigger; não deve ser chamável via
-- /rest/v1/rpc por usuários finais.
revoke execute on function public.guard_unlock_fields() from anon, authenticated;
