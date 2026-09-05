-- Cierra las tres tablas que quedaron abiertas a cualquier usuario autenticado.
--
-- El resto del censo ya estaba bien: patients, labs, notes, problems,
-- patient_images, patient_tasks, patient_vitals y round_logs usan
-- is_team_member(team_id) desde antes. Estas tres se crearon con
-- "to authenticated using (true)", que deja leer y escribir a cualquiera que
-- tenga cuenta, sea o no del equipo.
--
-- No se toca la función is_team_member: ya existe y la usan las otras ocho
-- tablas. Aquí solo se reusa.
--
-- Correr en Supabase → SQL Editor.

-- --- medical_orders ---------------------------------------------------------
drop policy if exists medical_orders_select on public.medical_orders;
drop policy if exists medical_orders_insert on public.medical_orders;
drop policy if exists medical_orders_update on public.medical_orders;
drop policy if exists medical_orders_delete on public.medical_orders;
drop policy if exists "team members full access medical_orders" on public.medical_orders;

create policy "team members full access medical_orders"
  on public.medical_orders
  for all
  using (is_team_member(team_id))
  with check (is_team_member(team_id));

-- --- presentations ----------------------------------------------------------
drop policy if exists presentations_select on public.presentations;
drop policy if exists presentations_insert on public.presentations;
drop policy if exists presentations_update on public.presentations;
drop policy if exists presentations_delete on public.presentations;
drop policy if exists "team members full access presentations" on public.presentations;

create policy "team members full access presentations"
  on public.presentations
  for all
  using (is_team_member(team_id))
  with check (is_team_member(team_id));

-- --- ventilation ------------------------------------------------------------
drop policy if exists ventilation_select on public.ventilation;
drop policy if exists ventilation_insert on public.ventilation;
drop policy if exists ventilation_update on public.ventilation;
drop policy if exists ventilation_delete on public.ventilation;
drop policy if exists "team members full access ventilation" on public.ventilation;

create policy "team members full access ventilation"
  on public.ventilation
  for all
  using (is_team_member(team_id))
  with check (is_team_member(team_id));

-- Comprobación: las tres deben quedar con is_team_member(team_id), igual que
-- las demás.
--
-- select tablename, policyname, cmd, qual
--   from pg_policies
--  where schemaname = 'public'
--    and tablename in ('medical_orders', 'presentations', 'ventilation');
