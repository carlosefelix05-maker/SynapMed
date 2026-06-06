import { supabase } from "@/lib/supabase";

export default async function TestPage() {
  const { data, error } = await supabase.from("patients").select("*");

  return (
    <main style={{ padding: 40 }}>
      <h1>Test Supabase</h1>

      <pre>
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}