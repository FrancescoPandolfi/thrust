import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181B",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 90,
          }}
        >
          <div
            style={{
              width: 90,
              height: 20,
              background: "#DFFF00",
              borderRadius: 4,
            }}
          />
          <div
            style={{
              width: 20,
              height: 82,
              background: "#DFFF00",
              borderRadius: 4,
              marginTop: 0,
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}
