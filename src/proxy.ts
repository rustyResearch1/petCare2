import { NextResponse, type NextRequest } from "next/server";

// HTTP basic auth in front of the ops dashboard and record downloads.
export function proxy(req: NextRequest) {
  const user = process.env.OPS_USER || "ops";
  const pass = process.env.OPS_PASSWORD;
  if (!pass) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Set OPS_PASSWORD to open the ops dashboard.", { status: 503 });
    }
    return NextResponse.next(); // local development without a password
  }
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    const [u, ...rest] = atob(encoded).split(":");
    if (u === user && rest.join(":") === pass) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Settled ops"' },
  });
}

export const config = { matcher: ["/ops/:path*"] };
