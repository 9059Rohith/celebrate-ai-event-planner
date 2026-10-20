import { ImageResponse } from "next/og";
export const alt = "Celebrate AI — Beautifully planned celebrations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#faf9f5",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 90,
        color: "#2c3931",
      }}
    >
      <div style={{ fontSize: 35, display: "flex", color: "#a95238" }}>
        ✳ celebrate ai
      </div>
      <div style={{ fontSize: 87, marginTop: 40, display: "flex" }}>
        Big moments.
      </div>
      <div style={{ fontSize: 87, color: "#a95238", display: "flex" }}>
        Beautifully planned.
      </div>
      <div style={{ fontSize: 25, marginTop: 32, display: "flex" }}>
        Weddings · Birthdays · Community events
      </div>
    </div>,
    size,
  );
}
