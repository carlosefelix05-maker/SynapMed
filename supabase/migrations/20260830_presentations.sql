-- Presentaciones de pase de visita.
-- Una presentación por paciente y por fecha: permite ver cómo se presentó el caso
-- cada día del pase y cómo fue evolucionando.
--
-- Correr en Supabase → SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.presentations (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  presented_on  date not null default current_date,
  content       text not null,
  source        text not null default 'manual',   -- 'manual' | 'ia'
  created_by    uuid references auth.users (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Una sola presentación por paciente por día: al guardar de nuevo se actualiza.
  constraint presentations_patient_date_unique unique (patient_id, presented_on)
);

create index if not exists presentations_patient_idx
  on public.presentations (patient_id, presented_on desc);

create index if not exists presentations_team_idx
  on public.presentations (team_id, presented_on desc);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists presentations_set_updated_at on public.presentations;

create trigger presentations_set_updated_at
  before update on public.presentations
  for each row execute function public.set_updated_at();

-- Seguridad a nivel de fila.
-- La app filtra por team_id en cada consulta; estas políticas dejan el acceso
-- a cualquier usuario autenticado, igual que el resto de las tablas del censo.
-- Si tus otras tablas restringen por membresía de equipo, replica esa condición aquí.
alter table public.presentations enable row level security;

drop policy if exists presentations_select on public.presentations;
drop policy if exists presentations_insert on public.presentations;
drop policy if exists presentations_update on public.presentations;
drop policy if exists presentations_delete on public.presentations;

create policy presentations_select on public.presentations
  for select to authenticated using (true);

create policy presentations_insert on public.presentations
  for insert to authenticated with check (true);

create policy presentations_update on public.presentations
  for update to authenticated using (true) with check (true);

create policy presentations_delete on public.presentations
  for delete to authenticated using (true);
