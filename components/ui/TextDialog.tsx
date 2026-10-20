"use client";
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
export function TextDialog({
  title,
  trigger,
  onSubmit,
}: {
  title: string;
  trigger: React.ReactNode;
  onSubmit: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>
            Add a short, specific description to your plan.
          </Dialog.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) {
                onSubmit(text.trim());
                setText("");
                setOpen(false);
              }
            }}
          >
            <label htmlFor="dialog-text">Description</label>
            <input
              id="dialog-text"
              autoFocus
              required
              maxLength={200}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="row">
              <Dialog.Close className="button secondary" type="button">
                Cancel
              </Dialog.Close>
              <button className="button" type="submit">
                Add to plan
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
