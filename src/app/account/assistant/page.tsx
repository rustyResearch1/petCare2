import { currentUser } from "@/lib/auth";
import { messagesFor } from "@/lib/account";
import { Chat } from "@/components/account/Chat";

export default async function AssistantPage() {
  const user = (await currentUser())!;
  const history = await messagesFor(user.email);
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-[clamp(2rem,6vw,2.75rem)] font-[760] [font-stretch:86%] leading-[1]">Assistant</h1>
        <p className="mt-3 max-w-[38rem] leading-relaxed text-muted">
          Ask about your setup, records or bills, or ask us to book or move a visit. It hands anything that needs a person to
          our team, who reply here. It can&apos;t give medical advice. If your pet needs care now, call a 24-hour emergency
          hospital.
        </p>
      </div>
      <Chat
        initial={history.map((m) => ({ id: m.id, role: m.role, content: m.content, at: m.createdAt.toISOString() }))}
      />
    </div>
  );
}
