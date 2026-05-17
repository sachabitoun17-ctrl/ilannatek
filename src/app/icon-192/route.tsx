import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: "#1C1C1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div
          style={{
            color: "#FAF7F1",
            fontSize: 64,
            fontFamily: "serif",
            letterSpacing: "0.1em",
            lineHeight: 1,
          }}
        >
          I
        </div>
        <div
          style={{
            width: 32,
            height: 2,
            background: "#A07B3A",
          }}
        />
      </div>
    ),
    { width: 192, height: 192 }
  );
}
