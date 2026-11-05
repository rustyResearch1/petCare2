import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { getDb, schema } from "./db/client";
import { baseUrl, sendEmail } from "./email";
import { site } from "./site";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function build(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    appName: site.name,
    baseURL: process.env.BETTER_AUTH_URL || baseUrl(),
    secret: process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-change-me-0000000000"),
    trustedOrigins: [baseUrl()],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    session: { expiresIn: 60 * 60 * 24 * 60, updateAge: 60 * 60 * 24 },
    account: { accountLinking: { enabled: true, trustedProviders: ["google", "email-otp"] } },
    socialProviders: googleConfigured()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
            prompt: "select_account",
          },
        }
      : {},
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 10 * 60,
        allowedAttempts: 5,
        async sendVerificationOTP({ email, otp }) {
          await sendEmail({
            to: email,
            subject: `${otp} is your ${site.name} code`,
            heading: `Your sign-in code is ${otp}`,
            lines: ["Enter it on the sign-in page. It expires in 10 minutes.", "If you didn't ask for this, you can ignore this email."],
          });
        },
      }),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof build>;

declare global {
  // eslint-disable-next-line no-var
  var __settledAuth: Promise<Auth> | undefined;
}

export function getAuth(): Promise<Auth> {
  globalThis.__settledAuth ??= getDb().then(build);
  return globalThis.__settledAuth;
}

export type SessionUser = { id: string; email: string; name: string; image?: string | null };

/** The signed-in person for this request, or null. Emails are lowercased so they match owner records. */
export async function currentUser(): Promise<SessionUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email.toLowerCase(), name: session.user.name, image: session.user.image };
}
