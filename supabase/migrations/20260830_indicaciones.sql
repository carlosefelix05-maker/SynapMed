-- Indicaciones médicas: dieta, soluciones e infusiones, inhaloterapia y
-- medicamentos.
--
-- Suspender no borra: el medicamento suspendido se conserva con su fecha,
-- porque saber qué se retiró y cuándo es parte del expediente. El borrado
-- existe aparte, para errores de captura.
--
-- Correr en Supabase → SQL Editor.

create table if not exists public.medical_orders (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  category      text not null,   -- 'dieta' | 'soluciones' | 'inhaloterapia' | 'medicamentos'
  description   text not null,
  dose          text,
  route         text,
  frequency     text,
  suspended     boolean not null default false,
  suspended_at  timestamptz,
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),

  constraint medical_orders_category_check
    check (category in ('dieta', 'soluciones', 'inhaloterapia', 'medicamentos'))
);

create index if not exists medical_orders_patient_idx
  on public.medical_orders (patient_id, category, created_at desc);

create index if not exists medical_orders_team_idx
  on public.medical_orders (team_id, created_at desc);

alter table public.medical_orders enable row level security;

drop policy if exists medical_orders_select on public.medical_orders;
drop policy if exists medical_orders_insert on public.medical_orders;
drop policy if exists medical_orders_update on public.medical_orders;
drop policy if exists medical_orders_delete on public.medical_orders;

create policy medical_orders_select on public.medical_orders
  for select to authenticated using (true);

create policy medical_orders_insert on public.medical_orders
  for insert to authenticated with check (true);

create policy medical_orders_update on public.medical_orders
  for update to authenticated using (true) with check (true);

create policy medical_orders_delete on public.medical_orders
  for delete to authenticated using (true);
