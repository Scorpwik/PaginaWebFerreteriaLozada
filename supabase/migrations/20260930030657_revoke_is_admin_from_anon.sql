-- is_admin() solo tiene sentido con sesion; no debe quedar expuesta en /rpc para anon.
revoke execute on function public.is_admin() from anon;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
