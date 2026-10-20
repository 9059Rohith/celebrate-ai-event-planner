"use client";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Send, Sparkles, Undo2, Check } from "lucide-react";
import { z } from "zod";
import { PlanSchema, type Plan } from "@/lib/schemas";
import {
  ToolProposalSchema,
  executeToolProposal,
  type ToolProposal,
} from "@/lib/llm/tools";
import { compactPlanSnapshot } from "@/lib/llm/snapshot";
import { consumeSSE } from "@/lib/client/network";
import { safeStorage, writeLocal } from "@/lib/client/storage";
import { usePlanStore } from "@/lib/store";
const Markdown = dynamic(() => import("@/components/chat/SafeMarkdown"), {
  ssr: false,
  loading: () => <p>Loading message…</p>,
});
const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["You", "Planner"]),
  text: z.string(),
  tools: z.array(ToolProposalSchema).optional(),
});
type Message = z.infer<typeof MessageSchema>;
type Decision = {
  status: "accepted" | "dismissed" | "undone";
  appliedVersion?: number;
};
export function ChatTab({
  plan,
  readOnly,
  onChange,
  onNotice,
}: {
  plan: Plan;
  readOnly: boolean;
  onChange: (v: Partial<Plan>) => void;
  onNotice: (v: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const abort = useRef<AbortController | null>(null);
  const key = `celebrate-chat-${plan.id}`;
  const decide = (value: Record<string, Decision>) => {
    setDecisions(value);
    writeLocal(`${key}-decisions`, JSON.stringify(value));
  };
  useEffect(() => {
    try {
      const raw = safeStorage.getItem(key);
      if (typeof raw === "string") {
        const parsed = MessageSchema.array().safeParse(JSON.parse(raw));
        if (parsed.success) queueMicrotask(() => setMessages(parsed.data));
        const rawDecisions = safeStorage.getItem(`${key}-decisions`);
        if (typeof rawDecisions === "string") {
          const parsedDecisions = z
            .record(
              z.string(),
              z.object({
                status: z.enum(["accepted", "dismissed", "undone"]),
                appliedVersion: z.number().optional(),
              }),
            )
            .safeParse(JSON.parse(rawDecisions));
          if (parsedDecisions.success)
            queueMicrotask(() => setDecisions(parsedDecisions.data));
        }
      }
    } catch {}
    return () => abort.current?.abort();
  }, [key]);
  const save = (value: Message[]) => {
    setMessages(value);
    writeLocal(key, JSON.stringify(value.slice(-50)));
  };
  async function send(value = text) {
    if (!value.trim() || busy || readOnly) return;
    const user: Message = {
      id: crypto.randomUUID(),
      role: "You",
      text: value.trim(),
    };
    const answer: Message = {
      id: crypto.randomUUID(),
      role: "Planner",
      text: "",
      tools: [],
    };
    const next = [...messages, user, answer];
    save(next);
    setText("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abort.current.signal,
        body: JSON.stringify({
          plan: compactPlanSnapshot(plan),
          message: value,
        }),
      });
      await consumeSSE(
        response,
        (event, data) => {
          if (event === "token") {
            const chunk = z.object({ text: z.string() }).parse(data);
            answer.text += chunk.text;
          }
          if (event === "tool_call") {
            const tool = ToolProposalSchema.parse(data);
            if (!answer.tools?.some((t) => t.id === tool.id))
              answer.tools?.push(tool);
          }
          if (event === "complete") {
            const result = z
              .object({
                answer: z.string(),
                toolCalls: z.array(ToolProposalSchema).optional(),
              })
              .passthrough()
              .parse(data);
            answer.text = result.answer;
            answer.tools = result.toolCalls || answer.tools;
          }
          if (event === "error")
            throw Error("The planner could not finish. Please try again.");
          save([...next]);
        },
        abort.current.signal,
      );
    } catch (error) {
      if (!abort.current?.signal.aborted) {
        answer.text =
          error instanceof Error
            ? error.message
            : "Unable to connect. Please retry.";
        save([...next]);
      }
    } finally {
      setBusy(false);
    }
  }
  async function accept(tool: ToolProposal) {
    const current =
      usePlanStore.getState().plans.find((p) => p.id === plan.id) || plan;
    try {
      let next: Plan;
      if (tool.name === "regenerate_section") {
        const { section, instructions } = tool.arguments;
        const response = await fetch("/api/plan/regenerate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: compactPlanSnapshot(current),
            section,
            instructions,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        const latest = usePlanStore
          .getState()
          .plans.find((p) => p.id === plan.id);
        if (latest && latest.version !== current.version)
          throw Error(
            "Your plan changed during regeneration. Review and request a fresh proposal.",
          );
        next = PlanSchema.parse({ ...current, [String(section)]: data.value });
      } else next = executeToolProposal(current, tool);
      onChange(next);
      decide({
        ...decisions,
        [tool.id]: { status: "accepted", appliedVersion: current.version + 1 },
      });
      onNotice("Change accepted and saved.");
    } catch (error) {
      onNotice(
        error instanceof Error ? error.message : "Unable to apply proposal.",
      );
    }
  }
  const undo = (tool: ToolProposal) => {
    const decision = decisions[tool.id];
    const current = usePlanStore.getState().plans.find((p) => p.id === plan.id);
    if (!decision || !current) return;
    if (current.version !== decision.appliedVersion) {
      onNotice(
        "Other changes were made after this proposal. Use the global Undo button to reverse changes in order.",
      );
      return;
    }
    const reverted = usePlanStore.getState().undo();
    if (!reverted) {
      onNotice(
        "Undo history is no longer available after reloading. Adjust this change in the editor.",
      );
      return;
    }
    decide({ ...decisions, [tool.id]: { ...decision, status: "undone" } });
  };
  return (
    <section className="chat panel">
      <div className="chat-intro">
        <Sparkles size={28} />
        <h2>A thoughtful second opinion.</h2>
        <p>
          Ask about your current plan. Every proposed change waits for your
          review.
        </p>
        <div className="chips">
          {[
            "What should I do next?",
            "Set budget to 500000",
            "Set contingency to 12%",
            "Add a milestone to confirm the caterer 7 days before",
            "How can I reduce food waste?",
          ].map((prompt) => (
            <button
              key={prompt}
              disabled={readOnly || busy}
              onClick={() => void send(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
      {messages.map((m) => (
        <div key={m.id} className={`message ${m.role === "You" ? "user" : ""}`}>
          <strong>{m.role}</strong>
          <Markdown text={m.text || "Thinking about your celebration…"} />
          {m.tools?.map((tool) => (
            <div className="tool-card" key={tool.id}>
              <strong>{tool.name.replaceAll("_", " ")}</strong>
              <pre>{JSON.stringify(tool.arguments, null, 2)}</pre>
              {decisions[tool.id] ? (
                <div className="row">
                  <span>{decisions[tool.id].status}</span>
                  {decisions[tool.id].status === "accepted" && (
                    <button
                      className="button secondary small"
                      disabled={readOnly}
                      onClick={() => undo(tool)}
                    >
                      <Undo2 size={14} /> Undo change
                    </button>
                  )}
                </div>
              ) : (
                <div className="row">
                  <button
                    className="button small"
                    disabled={readOnly}
                    onClick={() => void accept(tool)}
                  >
                    <Check size={14} /> Accept change
                  </button>
                  <button
                    className="button secondary small"
                    disabled={readOnly}
                    onClick={() =>
                      decide({
                        ...decisions,
                        [tool.id]: { status: "dismissed" },
                      })
                    }
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      {busy && (
        <div className="row">
          <span role="status">Planning…</span>
          <button
            className="text-link"
            onClick={() => {
              abort.current?.abort();
              setBusy(false);
            }}
          >
            Stop response
          </button>
        </div>
      )}
      <form
        className="chat-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          aria-label="Message the planner"
          placeholder="A question, an idea, a little what-if…"
          maxLength={2000}
          value={text}
          disabled={readOnly}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          aria-label="Send message"
          className="button"
          disabled={readOnly || busy || !text.trim()}
        >
          <Send size={18} />
        </button>
      </form>
      <p className="muted">
        Messages are saved on this device. Event details are sent to OpenAI only
        when configured.
      </p>
    </section>
  );
}
