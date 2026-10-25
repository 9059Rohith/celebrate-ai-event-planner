"use client";
import dynamic from "next/dynamic";
import { Send, Sparkles, Undo2, Check } from "lucide-react";
import type { Plan } from "@/lib/schemas";
import { usePlannerChat } from "@/lib/hooks/usePlannerChat";
const Markdown = dynamic(() => import("@/components/chat/SafeMarkdown"), {
  ssr: false,
  loading: () => <p>Loading message…</p>,
});
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
  const {
    messages,
    text,
    setText,
    busy,
    decisions,
    decide,
    send,
    accept,
    undo,
    stop,
  } = usePlannerChat({ plan, readOnly, onChange, onNotice });
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
          <button className="text-link" onClick={stop}>
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
