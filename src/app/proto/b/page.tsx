"use client";

/** ADR-0004 prototype B — throwaway. Compact Bar → half sheet, Sphere alive above. */

import { useState } from "react";

import { getSphereStore } from "@/sphere/use-sphere";
import {
  CompactBar,
  ConnectionRow,
  ProtoBadge,
  ProtoScene,
  useSelectedDetail,
} from "../proto-shared";

export default function ProtoB() {
  const detail = useSelectedDetail();
  const [isOpen, setIsOpen] = useState(false);
  const store = getSphereStore();

  const showSheet = isOpen && detail;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoScene />
      <ProtoBadge name="B · Split" />

      {detail && !showSheet && (
        <CompactBar detail={detail} onOpen={() => setIsOpen(true)} />
      )}

      {showSheet && (
        <div className="border-hairline bg-surface-1 fixed right-0 bottom-0 left-0 z-20 h-[48%] overflow-y-auto rounded-t-xl border-t px-4 pt-3 pb-8">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mx-auto block w-full py-1"
            aria-label="Collapse details"
          >
            <span className="bg-hairline-strong mx-auto block h-1 w-9 rounded-full" />
          </button>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-ink text-lg font-medium tracking-[-0.3px]">
              {detail.atom.label}
            </h2>
            <p className="text-ink-subtle text-xs whitespace-nowrap">
              {detail.atom.hoursSpent.toLocaleString()} hrs
            </p>
          </div>

          <p className="text-ink-tertiary mt-3 text-[13px] font-medium tracking-[0.4px]">
            CONNECTED KNOWLEDGE · {detail.connections.length}
          </p>
          <div className="mt-1">
            {detail.connections.map((connectionDetail) => (
              <ConnectionRow
                key={connectionDetail.connection.id}
                detail={connectionDetail}
                onFollow={() =>
                  store.selectViaConnection(connectionDetail.connection.id)
                }
              />
            ))}
          </div>

          <p className="text-ink-tertiary mt-5 text-[13px] font-medium tracking-[0.4px]">
            ABOUT
          </p>
          <p className="text-ink-muted mt-2 text-sm leading-relaxed">
            {detail.atom.description}
          </p>
        </div>
      )}
    </main>
  );
}
