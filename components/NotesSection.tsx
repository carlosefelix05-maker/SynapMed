import Link from "next/link";
import { supabase } from "@/lib/supabase";
import NotesSection from "@/components/NotesSection";

export default async function PatientPage({ params: { id } }: { params: { id: string } }) {
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single();

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  if (!patient) {
    return <p>Paciente no encontrado.</p>;
  }

  return (
    <div>
      <h1>{patient.name}</h1>

      <NotesSection patientId={id} notes={notes ?? []} />
    </div>
  );
}