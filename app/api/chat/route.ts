import { z } from "zod";
import { getClient, moderate } from "@/lib/llm/client";
import { hydratePlan, TransportPlanSchema } from "@/lib/llm/snapshot";
import {
  ToolProposalSchema,
  toolDefinitions,
  type ToolProposal,
} from "@/lib/llm/tools";
import { promptMessages } from "@/lib/llm/prompts";
import {
  cleanOutput,
  scrubText,
  injectionDetected,
  outputSafe,
} from "@/lib/llm/guardrails";
import { reserveTokens } from "@/lib/llm/cost";
import { sseResponse } from "@/lib/llm/sse";
import { checkedBody, apiError } from "@/lib/security/request";
import { getServerEnv } from "@/lib/security/env";
const Body = z
  .object({
    plan: TransportPlanSchema,
    message: z.string().min(1).max(2000),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(2000),
          })
          .strict(),
      )
      .max(12)
      .optional(),
  })
  .strict();
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = Body.parse(await checkedBody(request));
    const plan = hydratePlan(body.plan);
    const message = scrubText(body.message, 2000);
    return sseResponse(request, async (send, signal) => {
      let answer = "";
      let source: "ai" | "fallback" = "fallback";
      const toolCalls: ToolProposal[] = [];
      const finish = (text: string) => {
        answer = cleanOutput(text);
        send("token", { text: answer });
        for (const call of toolCalls) send("tool_call", call);
        send("complete", { answer, toolCalls, source });
      };
      if (injectionDetected(message)) {
        finish(
          "I can help with safe event planning, budgets, vendors and timelines. Tell me which part of your celebration you would like to work on.",
        );
        return;
      }
      if (
        /(?:evade|skip|avoid).{0,20}(?:permit|fire safety|permission)|(?:illegal|weapon|drug dealing)/i.test(
          message,
        )
      ) {
        finish(
          "Keep permits and fire safety checks in the plan. Confirm local requirements with the venue and choose a safe, permitted alternative.",
        );
        return;
      }
      const amount = message.match(
        /(?:budget|guests?)\s*(?:to|at|=|:)?\s*[₹$€£]?\s*([\d,]+(?:\.\d+)?)\s*(lakh|l|k|crore)?/i,
      );
      if (amount) {
        const value =
          Number(amount[1].replaceAll(",", "")) *
          ({ lakh: 100000, l: 100000, k: 1000, crore: 10000000 }[
            amount[2]?.toLowerCase()
          ] || 1);
        const proposal = ToolProposalSchema.safeParse({
          id: crypto.randomUUID(),
          name: /guests?/i.test(amount[0])
            ? "set_guest_count"
            : "set_total_budget",
          arguments: { value },
        });
        if (proposal.success) {
          toolCalls.push(proposal.data);
          finish(
            `Review the proposed ${proposal.data.name === "set_guest_count" ? "guest count" : "budget"} change to ${value.toLocaleString("en-IN")}. Accept it to recalculate your plan.`,
          );
          return;
        }
      }
      const relevant =
        /event|plan|wedding|birthday|community|budget|guest|food|menu|diet|vegan|jain|halal|venue|vendor|photo|decor|music|timeline|schedule|idea|theme|party|celebrat|cater|permit|accessib|cost|cheap|tradition|sustainab|invite|milestone|contingency|compare|option|make|change|add|update|lock|hello|hi\b|thanks/i.test(
          message,
        );
      if (!relevant) {
        finish(
          "I focus on celebration planning. Ask me about your budget, timeline, food, vendors or ideas for this event.",
        );
        return;
      }
      const fallback = `For ${plan.summary.headline}, focus next on ${plan.timeline.milestones
        .filter((m) => m.status !== "done")
        .slice(0, 3)
        .map((m) => m.title)
        .join(
          ", ",
        )}. Your budget is ${plan.input.currency} ${plan.budget.total.toLocaleString("en-IN")} for ${plan.input.guestCount} guests. AI unavailable — using smart templates.`;
      const client = getClient();
      if (!client || !(await reserveTokens(3500))) {
        finish(fallback);
        return;
      }
      if (!(await moderate(message, signal))) {
        finish(
          "I can help plan a safe, welcoming event. Please describe the celebration or a safe alternative you would like to explore.",
        );
        return;
      }
      try {
        const stream = await client.chat.completions.create(
          {
            model: getServerEnv().OPENAI_MODEL,
            messages: promptMessages(
              {
                input: plan.input,
                budget: plan.budget,
                milestones: plan.timeline.milestones.map((m) => ({
                  id: m.id,
                  title: m.title,
                  status: m.status,
                })),
                vendors: plan.vendors.map((v) => v.category),
                message,
                history: body.messages,
              },
              "Answer this event planning question in concise plain text. Propose tools for changes; never claim a change has been applied. Compare options is read-only. All tool calls require user review.",
            ),
            tools: toolDefinitions(),
            stream: true,
            max_completion_tokens: 600,
            temperature: 0.2,
          },
          { signal },
        );
        const pending = new Map<
          number,
          { id: string; name: string; arguments: string }
        >();
        let unsafe = false;
        // Buffer model fragments until the complete answer passes the secret scanner. This prevents split-token secret leaks.
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;
          if (delta?.content) answer += delta.content;
          for (const call of delta?.tool_calls || []) {
            const old = pending.get(call.index) || {
              id: "",
              name: "",
              arguments: "",
            };
            pending.set(call.index, {
              id: call.id || old.id,
              name: call.function?.name || old.name,
              arguments: old.arguments + (call.function?.arguments || ""),
            });
          }
          if (!outputSafe(answer)) {
            unsafe = true;
            stream.controller.abort();
            break;
          }
        }
        if (unsafe) {
          finish(
            "I can help with your celebration plan. Please ask about the budget, vendors or timeline.",
          );
          return;
        }
        for (const call of pending.values()) {
          try {
            const parsed = ToolProposalSchema.safeParse({
              id: call.id || crypto.randomUUID(),
              name: call.name,
              arguments: JSON.parse(call.arguments),
            });
            if (parsed.success && outputSafe(JSON.stringify(parsed.data)))
              toolCalls.push(parsed.data);
          } catch {}
        }
        source = "ai";
        finish(
          answer ||
            (toolCalls.length
              ? "Review the proposed changes below."
              : "Please specify which part of the event you would like help with."),
        );
      } catch {
        if (signal.aborted) throw signal.reason;
        toolCalls.length = 0;
        finish(fallback);
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
