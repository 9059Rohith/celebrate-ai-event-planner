"use client";
import { ArrowUp, ArrowDown, GripVertical } from "lucide-react";
import type { EventInput } from "@/lib/schemas";
export function OrderedPriorities({
  value,
  onChange,
}: {
  value: EventInput["priorities"];
  onChange: (v: EventInput["priorities"]) => void;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  return (
    <div aria-label="Priority order">
      {value.map((v, i) => (
        <div
          key={v}
          className="priority-row"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("text/plain"));
            if (Number.isInteger(from) && from >= 0 && from < value.length) {
              const next = [...value];
              const [item] = next.splice(from, 1);
              next.splice(i, 0, item);
              onChange(next);
            }
          }}
        >
          <GripVertical size={15} />
          <span>
            {i + 1}. {v}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${v} priority up`}
            disabled={i === 0}
            onClick={() => move(i, i - 1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Move ${v} priority down`}
            disabled={i === value.length - 1}
            onClick={() => move(i, i + 1)}
          >
            <ArrowDown size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
