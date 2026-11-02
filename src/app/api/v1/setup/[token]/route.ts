import { getRequestByToken } from "@/lib/queries";
import { upcomingVaccines } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Owner-facing setup status as JSON, for the mobile app.
 * The token is the same private link the owner gets after submitting the form.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return Response.json({ error: "Not found" }, { status: 404 });
  const data = await getRequestByToken(token);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  const { request, owner, pets, appointmentClinic } = data;
  const today = new Date();

  return Response.json(
    {
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      owner: { firstName: owner.name.split(" ")[0], neighborhood: owner.neighborhood },
      appointment: request.appointment
        ? {
            at: request.appointment.at,
            notes: request.appointment.notes ?? null,
            clinic: appointmentClinic
              ? { name: appointmentClinic.name, address: appointmentClinic.address, phone: appointmentClinic.phone }
              : null,
          }
        : null,
      pets: pets.map((p) => ({
        id: p.id,
        name: p.name,
        species: p.speciesOther || p.species,
        breed: p.breed,
        age: p.age,
        records: p.extractionStatus,
        summary: p.profile?.summary ?? null,
        vaccines: p.profile?.vaccines ?? [],
        dueSoon: upcomingVaccines(p.profile, today, 60).map((v) => ({ name: v.name, nextDue: v.next_due, overdue: v.overdue })),
      })),
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
