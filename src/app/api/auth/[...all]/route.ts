import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";

async function handle(req: Request) {
  const auth = await getAuth();
  return auth.handler(req);
}

export { handle as GET, handle as POST };
