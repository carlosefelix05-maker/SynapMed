"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Attending = {
  id: string;
  full_name: string;
  specialty: string | null;
};

type Resident = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
};

type Props = {
  createPatient: (formData: FormData) => void;
  attendings?: Attending[];
  residents?: Resident[];
};

const subspecialties = [
  "Medicina Interna",
  "Cardiología",
  "Nefrología",
  "Neumología",
  "Gastroenterología",
  "Endocrinología",
  "Hematología",
  "Terapia Intensiva",
  "Neurología",
  "Infectología",
];

export default function NewPatientForm({ createPatient, attendings = [], residents = [] }: Props) {
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("Medicina Interna");
  const [selectedAttendingId, setSelectedAttendingId] = useState("");

  const filteredAttendings = useMemo(() => {
    return attendings.filter(
      (attending) => (attending.specialty || "Medicina Interna") === selectedSubspecialty
    );
  }, [attendings, selectedSubspecialty]);

  function handleSubspecialtyChange(value: string) {
    setSelectedSubspecialty(value);
    setSelectedAttendingId("");
  }

  return (
    <form action={createPatient} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          name="bed"
          placeholder="Cama"
          required
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        />

        <input
          name="full_name"
          placeholder="Nombre completo"
          required
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        />

        <input
          name="age"
          type="number"
          placeholder="Edad"
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        />

        <select name="sex" defaultValue="" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white">
          <option value="" disabled>
            Sexo
          </option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>

        <textarea
          name="diagnosis"
          rows={4}
          placeholder="Diagnóstico principal"
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white md:col-span-2"
        />

        <select
          name="subspecialty"
          value={selectedSubspecialty}
          onChange={(event) => handleSubspecialtyChange(event.target.value)}
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        >
          {subspecialties.map((subspecialty) => (
            <option key={subspecialty} value={subspecialty}>
              {subspecialty}
            </option>
          ))}
        </select>

        <select name="priority" defaultValue="Estable" className="rounded-xl bg-[#071A2F] px-4 py-3 text-white">
          <option value="Estable">Estable</option>
          <option value="Alta">Alta</option>
          <option value="Crítico">Crítico</option>
        </select>

        <select
          name="attending_id"
          value={selectedAttendingId}
          onChange={(event) => setSelectedAttendingId(event.target.value)}
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        >
          <option value="">
            {filteredAttendings.length > 0
              ? `Adscrito responsable · ${selectedSubspecialty}`
              : `Sin adscritos registrados · ${selectedSubspecialty}`}
          </option>
          {filteredAttendings.map((attending) => (
            <option key={attending.id} value={attending.id}>
              {attending.full_name}
            </option>
          ))}
        </select>

        <select
          name="assigned_resident_id"
          defaultValue=""
          className="rounded-xl bg-[#071A2F] px-4 py-3 text-white"
        >
          <option value="">Residente responsable</option>
          {residents.map((resident) => (
            <option key={resident.id} value={resident.id}>
              {resident.full_name || resident.email || "Usuario"}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 pt-4">
        <button type="submit" className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950">
          Guardar paciente
        </button>

        <Link href="/" className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-200">
          Cancelar
        </Link>
      </div>
    </form>
  );
}