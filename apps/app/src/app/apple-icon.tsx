import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#005C41",
        borderRadius: 40,
      }}
    >
      <svg width="130" height="130" viewBox="0 0 32 32" fill="none">
        <path
          d="M8 22.5V12.2L16 7.5l8 4.7v10.3"
          stroke="#F3FBF7"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M12.2 22.5V14.8h7.6v7.7"
          stroke="#F3FBF7"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <rect x="14.35" y="17.4" width="3.3" height="5.1" rx="0.4" fill="#D2B373" />
        <path
          d="M23.2 9.2a4.4 4.4 0 1 1-6.2-6.2"
          stroke="#D2B373"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    { ...size },
  );
}
