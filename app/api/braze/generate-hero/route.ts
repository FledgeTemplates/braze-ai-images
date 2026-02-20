import { put } from "@vercel/blob";

export async function POST(req: Request) {
  try {
    // 🔐 Auth check
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${process.env.BRAZE_SHARED_SECRET}`) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

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

    const pathname = `braze-images/${hero}_${external_id}_${prompt_version}.png`;

    // 🧠 Generate image with Gemini
    const prompt = `
Create a high-quality marketing hero image.
Style: modern, clean, flat illustration.
No text in the image.
White or light neutral background.
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    if (!geminiResponse.ok) {
      const err = await geminiResponse.text();
      return Response.json(
        { error: "gemini_failed", detail: err },
        { status: 500 }
      );
    }

    const data = await geminiResponse.json();

    // Extract base64 image
    const imagePart =
      data?.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData?.mimeType?.startsWith("image/")
      );

    if (!imagePart?.inlineData?.data) {
      return Response.json(
        { error: "no_image_returned" },
        { status: 500 }
      );
    }

    const pngBuffer = Buffer.from(imagePart.inlineData.data, "base64");

    // ☁️ Upload to Vercel Blob
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
