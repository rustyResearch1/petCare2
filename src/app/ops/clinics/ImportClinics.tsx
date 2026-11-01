"use client";

import { useActionState } from "react";
import { importClinics } from "../actions";

export function ImportClinics() {
  const [state, action, pending] = useActionState(importClinics, { message: "" });
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="file" name="csv" accept=".csv,text/csv" className="text-[0.875rem]" aria-label="Clinic CSV" />
      <button className="btn btn-quiet min-h-10 px-4 py-1.5" disabled={pending}>
        {pending ? "Importing..." : "Import CSV"}
      </button>
      {state.message && <p className="w-full text-[0.875rem] text-muted">{state.message}</p>}
    </form>
  );
}
