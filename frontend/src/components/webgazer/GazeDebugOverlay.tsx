"use client";

import { useWebGazer } from "./WebGazerProvider";

export function GazeDebugOverlay() {
  const { latestGaze, gazeStream } = useWebGazer();

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!latestGaze) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999]">
      {gazeStream.map((point) => {
        const age = latestGaze.timestamp - point.timestamp;
        const opacity = Math.max(0.1, 1 - age / 2000);

        return (
          <div
            key={`${point.timestamp}-${point.x}-${point.y}`}
            className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-300"
            style={{
              left: point.x,
              top: point.y,
              opacity,
            }}
          />
        );
      })}

      <div
        className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow"
        style={{
          left: latestGaze.x,
          top: latestGaze.y,
        }}
      />
    </div>
  );
}