import { ImageResponse } from "next/og";

export const runtime = "edge";

const ALLOWED_SIZES = new Set(["192", "512"]);

export async function GET(
  _request: Request,
  { params }: { params: { size: string } }
) {
  const size = ALLOWED_SIZES.has(params.size) ? Number(params.size) : 512;
  const radius = Math.round(size * 0.22);
  const ring = Math.max(6, Math.round(size * 0.04));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #2563eb 0%, #1e3a8a 100%)",
          borderRadius: radius,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: size * 0.52,
            height: size * 0.52,
            border: `${ring}px solid white`,
            borderRadius: "50%",
            color: "white",
            fontSize: Math.round(size * 0.22),
            fontWeight: 700,
          }}
        >
          HR
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
