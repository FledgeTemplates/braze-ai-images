import { put } from "@vercel/blob";

// Temporary placeholder image (1x1 PNG)
// We will replace this with Gemini generation next
const ONE_BY_ONE_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5L2m0AAAAASUVORK5CYII=";

export async function POST(req: Request) {
  try {
    // 🔐 1. Auth check
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.BRAZE_SHARED_SECRET}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    // 📦 2. Parse body
    const body = await req.json();
    const hero = String(body?.hero || "");
    const external_id = String(body?.external_id || "");
    const prompt_version = String(body?.prompt_version || "v1");

    if (!hero || !external_id) {
      return Response.json(
        { error: "missing hero or external_id" },
        { status: 400 }
      );
    }

    // 📁 3. Deterministic filename (NO HASH)
    const pathname = `braze-images/${hero}_${external_id}_${prompt_version}.png`;

    // 🖼 4. Placeholder image buffer
    const pngBuffer = Buffer.from(ONE_BY_ONE_PNG_BASE64, "base64");

    // ☁️ 5. Upload to Vercel Blob (public + stable name)
    const blob = await put(pathname, pngBuffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false
    });

    return Response.json({
      ok: true,
      image_url: blob.url,
      pathname
    });
  } catch (e) {
    return Response.json(
      { error: "server_error", detail: String(e).slice(0, 300) },
      { status: 500 }
    );
  }
}
