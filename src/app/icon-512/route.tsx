import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#1C1C1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#FAF7F1",
            fontSize: 180,
            fontFamily: "serif",
            letterSpacing: "0.08em",
            lineHeight: 1,
          }}
        >
          I
        </div>
        <div
          style={{
            width: 80,
            height: 3,
            background: "#A07B3A",
          }}
        />
      </div>
    ),
    { width: 512, height: 512 }
  );
}
