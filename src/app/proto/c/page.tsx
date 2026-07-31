"use client";

/**
 * ADR-0004 prototype C — throwaway. Compact Bar → in-scene annotations: the
 * knowledge descriptions float as callouts along the lit Connections, in the
 * Sphere itself. No sheet at all.
 */

import { Html } from "@react-three/drei";
import { useState } from "react";

import { getSphereStore, useSphere } from "@/sphere/use-sphere";
import {
  CompactBar,
  ProtoBadge,
  ProtoScene,
  useSelectedDetail,
} from "../proto-shared";

function ConnectionCallouts() {
  const { layout, selectedAtomId } = useSphere();
  const store = getSphereStore();
  const detail = store.selectedDetail();
  if (!detail || !selectedAtomId) return null;
  const near = layout[selectedAtomId];
  if (!near) return null;

  return (
    <>
      {detail.connections.map(({ connection, otherAtom }) => {
        const far = layout[otherAtom.id];
        if (!far) return null;
        const midpoint = near.position.map(
          (value, axis) => (value + far.position[axis]) * 0.55,
        ) as [number, number, number];
        return (
          <Html
            key={connection.id}
            position={midpoint}
            center
            distanceFactor={2.2}
            zIndexRange={[10, 0]}
          >
            <button
              type="button"
              onClick={() => store.selectViaConnection(connection.id)}
              className="border-hairline bg-surface-1/90 w-40 rounded-md border px-2.5 py-2 text-left backdrop-blur"
            >
              <span className="text-ink block text-[11px] leading-snug">
                {connection.description}
              </span>
              <span className="text-primary-hover mt-1 block text-[10px] font-medium">
                → {otherAtom.label}
              </span>
            </button>
          </Html>
        );
      })}
    </>
  );
}

export default function ProtoC() {
  const detail = useSelectedDetail();
  const [isOpen, setIsOpen] = useState(false);

  const showCallouts = isOpen && detail !== null;

  return (
    <main className="fixed inset-0 overflow-hidden">
      <ProtoScene>{showCallouts && <ConnectionCallouts />}</ProtoScene>
      <ProtoBadge name="C · In-scene" />

      {detail && (
        <CompactBar
          detail={detail}
          onOpen={() => setIsOpen(!isOpen)}
          hint={showCallouts ? "Hide" : "Show in Sphere"}
        />
      )}
    </main>
  );
}
