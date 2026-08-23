"use client";

import { useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import type { MessageStatus } from "@/db/schema";
import { MESSAGE_STATUS } from "@/lib/constants";
import { updateMessageStatus } from "@/modules/admin/actions";

export function MessageStatusPicker({ messageId, status }: { messageId: string; status: MessageStatus }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      aria-label="وضعیت پیام"
      onChange={(event) => {
        const next = event.target.value as MessageStatus;
        startTransition(async () => {
          const result = await updateMessageStatus(messageId, next);
          toast({
            title: result.status === "success" ? "به‌روزرسانی شد" : "خطا",
            description: result.message,
            tone: result.status === "success" ? "success" : "error",
          });
        });
      }}
      className="h-9 shrink-0 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-3 text-xs outline-none focus:border-[var(--brand)] disabled:opacity-50"
    >
      {(Object.keys(MESSAGE_STATUS) as MessageStatus[]).map((key) => (
        <option key={key} value={key}>
          {MESSAGE_STATUS[key].label}
        </option>
      ))}
    </select>
  );
}
