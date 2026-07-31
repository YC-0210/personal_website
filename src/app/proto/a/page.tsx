"use client";

/** ADR-0004 prototype A — throwaway. Compact Bar → full-screen Dossier. */

import { useState } from "react";

import { getSphereStore } from "@/sphere/use-sphere";
import {
  CompactBar,
  ConnectionRow,
  ProtoBadge,
  ProtoScene,
  useSelectedDetail,
} from "../proto-shared";

export default function ProtoA() {
  const detail = useSelectedDetail();
  const [isOpen, setIsOpen] = useState(false);
  const store = getSphereStore();

  const showDossier = isOpen && detail;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoScene />
      <ProtoBadge name="A · Takeover" />

      {detail && !showDossier && (
        <CompactBar detail={detail} onOpen={() => setIsOpen(true)} />
      )}

      {showDossier && (
        <div className="bg-canvas fixed inset-0 z-20 overflow-y-auto px-4 pt-4 pb-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-ink-tertiary text-[13px] font-medium tracking-[0.4px]">
                ATOM
              </p>
              <h2 className="text-ink mt-1 text-[22px] font-medium tracking-[-0.4px]">
                {detail.atom.label}
              </h2>
              <p className="bg-surface-2 text-ink-muted mt-2 inline-block rounded-full px-2 py-0.5 text-xs">
                {detail.atom.hoursSpent.toLocaleString()} hrs
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="border-hairline bg-surface-1 text-ink rounded-md border px-3 py-1.5 text-sm"
            >
              ↓ Sphere
            </button>
          </div>

          <p className="text-ink-tertiary mt-6 text-[13px] font-medium tracking-[0.4px]">
            CONNECTED KNOWLEDGE · {detail.connections.length}
          </p>
          <div className="mt-2">
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

          <p className="text-ink-tertiary mt-8 text-[13px] font-medium tracking-[0.4px]">
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
