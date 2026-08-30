-- Columnas de laboratorio que el código ya leía pero que nunca existieron en la
-- tabla: la ruta de evolución hacía lab.ure, lab.bun, etc., y siempre recibía
-- undefined. Sin esto, guardar laboratorios falla por completo.
--
-- Correr en Supabase → SQL Editor.

alter table public.labs
  add column if not exists ure  text,   -- urea
  add column if not exists bun  text,
  add column if not exists ca   text,   -- calcio
  add column if not exists p    text,   -- fósforo
  add column if not exists cl   text,   -- cloro
  add column if not exists mg   text,   -- magnesio
  add column if not exists hto  text,   -- hematocrito
  add column if not exists plt  text;   -- plaquetas
