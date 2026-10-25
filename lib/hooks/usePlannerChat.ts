"use client";
import { useState, useEffect, useRef } from "react";
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
const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["You", "Planner"]),
  text: z.string(),
  tools: z.array(ToolProposalSchema).optional(),
});
type Message = z.infer<typeof MessageSchema>;
const DecisionSchema = z.object({
  status: z.enum(["accepted", "dismissed", "undone"]),
  appliedVersion: z.number().optional(),
});
const DecisionsSchema = z.record(z.string(), DecisionSchema);
type Decision = z.infer<typeof DecisionSchema>;
export function usePlannerChat({
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
    let active = true;
    const read = <T>(
      storageKey: string,
      schema: z.ZodType<T>,
      fallback: T,
    ): T => {
      try {
        const raw = safeStorage.getItem(storageKey);
        const parsed = schema.safeParse(
          typeof raw === "string" ? JSON.parse(raw) : null,
        );
        return parsed.success ? parsed.data : fallback;
      } catch {
        // Invalid or inaccessible device data must not prevent a new conversation.
        return fallback;
      }
    };
    const savedMessages = read(key, MessageSchema.array(), []);
    const savedDecisions = read(key + "-decisions", DecisionsSchema, {});
    queueMicrotask(() => {
      if (!active) return;
      setMessages(savedMessages);
      setDecisions(savedDecisions);
      setText("");
      setBusy(false);
    });
    return () => {
      active = false;
      abort.current?.abort();
      abort.current = null;
    };
  }, [key]);
  const save = (value: Message[]) => {
    setMessages(value);
    writeLocal(key, JSON.stringify(value.slice(-50)));
  };
  async function send(value = text) {
    if (!value.trim() || abort.current || busy || readOnly) return;
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
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          plan: compactPlanSnapshot(plan),
          message: value,
        }),
      });
      await consumeSSE(
        response,
        (event, data) => {
          if (controller.signal.aborted) return;
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
          setMessages([...next]);
        },
        controller.signal,
      );
      if (abort.current === controller) save([...next]);
    } catch (error) {
      if (!controller.signal.aborted) {
        answer.text =
          error instanceof Error
            ? error.message
            : "Unable to connect. Please retry.";
        save([...next]);
      }
    } finally {
      if (abort.current === controller) {
        abort.current = null;
        setBusy(false);
      }
    }
  }
  async function accept(tool: ToolProposal) {
    if (readOnly || decisions[tool.id]) return;
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
    if (readOnly) return;
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
  const stop = () => {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
    writeLocal(key, JSON.stringify(messages.slice(-50)));
  };
  return {
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
  };
}
