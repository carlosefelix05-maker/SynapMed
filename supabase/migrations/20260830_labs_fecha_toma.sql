-- Fecha de toma de los laboratorios, para poder capturar estudios anteriores.
--
-- created_at se queda como registro de cuándo se capturó (auditoría) y
-- sampled_at pasa a ser la fecha clínica: es la que ordena el historial y la
-- que define cuál es "el último laboratorio".
--
-- Correr en Supabase → SQL Editor.

alter table public.labs
  add column if not exists sampled_at timestamptz;

-- Los laboratorios ya capturados se toman como tomados el día que se registraron.
update public.labs
   set sampled_at = created_at
 where sampled_at is null;

alter table public.labs
  alter column sampled_at set default now();

alter table public.labs
  alter column sampled_at set not null;

create index if not exists labs_patient_sampled_idx
  on public.labs (patient_id, sampled_at desc);
