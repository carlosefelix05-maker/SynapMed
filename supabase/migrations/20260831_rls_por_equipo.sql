-- Acceso por membresía de equipo.
--
-- Hoy las políticas dicen "to authenticated using (true)": cualquiera que se
-- registre y entre puede leer el censo completo. Esto las cambia por
-- "pertenezco al equipo dueño del renglón".
--
-- Los 5 miembros actuales del equipo no se ven afectados: siguen viendo todo
-- lo suyo. Lo que se cierra es el acceso de una cuenta que no esté en
-- team_members.
--
-- Correr en Supabase → SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Función de membresía
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER a propósito: si la política de una tabla consultara
-- team_members directamente, chocaría con el propio RLS de team_members.
create or replace function public.is_team_member(target_team uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.team_members
     where team_id = target_team
       and user_id = auth.uid()
  );
$$;

revoke all on function public.is_team_member(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Políticas de las tablas clínicas
-- ---------------------------------------------------------------------------
-- Todas tienen team_id, así que la regla es la misma en las doce.
do $$
declare
  tabla text;
  politica record;
begin
  foreach tabla in array array[
    'patients', 'labs', 'notes', 'problems', 'patient_images', 'patient_tasks',
    'patient_vitals', 'presentations', 'ventilation', 'medical_orders',
    'attendings', 'round_logs'
  ]
  loop
    for politica in
      select policyname
        from pg_policies
       where schemaname = 'public'
         and tablename = tabla
    loop
      execute format('drop policy %I on public.%I', politica.policyname, tabla);
    end loop;

    execute format('alter table public.%I enable row level security', tabla);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_team_member(team_id))',
      tabla || '_select', tabla);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.is_team_member(team_id))',
      tabla || '_insert', tabla);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.is_team_member(team_id))
         with check (public.is_team_member(team_id))',
      tabla || '_update', tabla);

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.is_team_member(team_id))',
      tabla || '_delete', tabla);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Para revertir, si algo sale mal
-- ---------------------------------------------------------------------------
-- Deja las tablas como estaban (abiertas a cualquier autenticado):
--
-- do $$
-- declare tabla text; politica record;
-- begin
--   foreach tabla in array array[
--     'patients','labs','notes','problems','patient_images','patient_tasks',
--     'patient_vitals','presentations','ventilation','medical_orders',
--     'attendings','round_logs'
--   ] loop
--     for politica in select policyname from pg_policies
--       where schemaname='public' and tablename=tabla
--     loop execute format('drop policy %I on public.%I', politica.policyname, tabla); end loop;
--     execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', tabla||'_all', tabla);
--   end loop;
-- end $$;
