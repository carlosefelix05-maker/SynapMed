-- Laboratorios en formato completo, gasometría y ventilación mecánica invasiva.
-- Todo es aditivo: no borra ni modifica columnas existentes.
--
-- Correr en Supabase → SQL Editor.

-- ---------------------------------------------------------------------------
-- 1. Laboratorios: completar el formato de la nota
-- ---------------------------------------------------------------------------
-- Ya existían: glu, ure, bun, cr, na, k, cl, ca, p, mg, leu, hb, hto, plt,
-- pct, pcr, bnp, otros.

alter table public.labs
  -- Química sanguínea
  add column if not exists au            text,   -- ácido úrico
  add column if not exists col           text,   -- colesterol
  add column if not exists tg            text,   -- triglicéridos
  add column if not exists bt            text,   -- bilirrubina total
  add column if not exists bd            text,   -- bilirrubina directa
  add column if not exists bi            text,   -- bilirrubina indirecta (se calcula si falta)
  add column if not exists prot_totales  text,   -- PT del formato: proteínas totales
  add column if not exists glob          text,   -- globulinas (se calcula si falta)
  add column if not exists ag_ratio      text,   -- relación A/G (se calcula si falta)
  add column if not exists alb           text,
  add column if not exists ast           text,
  add column if not exists alt           text,
  add column if not exists fa            text,
  add column if not exists dhl           text,
  add column if not exists ggt           text,
  -- Biometría hemática
  add column if not exists eri           text,
  add column if not exists vcm           text,
  add column if not exists hcm           text,
  add column if not exists chcm          text,
  add column if not exists rdw           text,
  -- Coagulación (TP = tiempo de protrombina, distinto de PT/proteínas totales)
  add column if not exists tp            text,
  add column if not exists inr           text,
  add column if not exists tpt           text,
  add column if not exists fibrinogeno   text,
  add column if not exists dimero_d      text,
  -- Gasometría
  add column if not exists gaso_tipo     text,   -- 'arterial' | 'venosa'
  add column if not exists ph            text,
  add column if not exists pco2          text,
  add column if not exists po2           text,
  add column if not exists hco3          text,
  add column if not exists hco3std       text,
  add column if not exists tco2          text,
  add column if not exists beecf         text,
  add column if not exists beb           text,
  add column if not exists so2           text,
  add column if not exists lactato       text,
  add column if not exists fio2          text;  -- necesaria para P/F y gradiente A-a

-- ---------------------------------------------------------------------------
-- 2. Paciente: bandera de VMI y talla (la talla es indispensable para el PBW)
-- ---------------------------------------------------------------------------
alter table public.patients
  add column if not exists on_vmi    boolean not null default false,
  add column if not exists height_cm numeric;

-- ---------------------------------------------------------------------------
-- 3. Ventilación mecánica: un registro por captura, para seguir el destete
-- ---------------------------------------------------------------------------
create table if not exists public.ventilation (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  recorded_at  timestamptz not null default now(),
  modo         text,
  vt           text,   -- volumen tidal programado, ml
  fr           text,   -- frecuencia respiratoria, rpm
  peep         text,   -- cmH2O
  fio2         text,   -- %
  pplat        text,   -- presión meseta, cmH2O
  ppico        text,   -- presión pico, cmH2O
  pao2         text,   -- de la gasometría del momento, para P/F
  notes        text,
  created_by   uuid references auth.users (id),
  created_at   timestamptz not null default now()
);

create index if not exists ventilation_patient_idx
  on public.ventilation (patient_id, recorded_at desc);

create index if not exists ventilation_team_idx
  on public.ventilation (team_id, recorded_at desc);

alter table public.ventilation enable row level security;

drop policy if exists ventilation_select on public.ventilation;
drop policy if exists ventilation_insert on public.ventilation;
drop policy if exists ventilation_update on public.ventilation;
drop policy if exists ventilation_delete on public.ventilation;

create policy ventilation_select on public.ventilation
  for select to authenticated using (true);

create policy ventilation_insert on public.ventilation
  for insert to authenticated with check (true);

create policy ventilation_update on public.ventilation
  for update to authenticated using (true) with check (true);

create policy ventilation_delete on public.ventilation
  for delete to authenticated using (true);
