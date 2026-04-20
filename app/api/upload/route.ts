import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { getUploadUrl, publicUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

const MAX_SIZE_MB = 50;
const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
const ALLOWED_DOC = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const ALLOWED_AUDIO = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];
const ALLOWED_VIDEO = ["video/webm", "video/mp4", "video/quicktime"];

export async function POST(req: NextRequest) {
  const session = await requireSession();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const messageId = formData.get("messageId") as string | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 400 });
  }

  const mime = file.type;
  let type: "image" | "document" | "audio" | "video";
  if (ALLOWED_IMAGE.includes(mime)) type = "image";
  else if (ALLOWED_DOC.includes(mime)) type = "document";
  else if (ALLOWED_AUDIO.includes(mime)) type = "audio";
  else if (ALLOWED_VIDEO.includes(mime)) type = "video";
  else return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });

  // Strip EXIF from images server-side (basic: just store as-is for now, can add sharp later)
  const key = `uploads/${session.userId}/${nanoid()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Upload directly to R2
  const bytes = await file.arrayBuffer();
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME ?? "vita-uploads",
    Key: key,
    Body: Buffer.from(bytes),
    ContentType: mime,
  }));

  // Extract transcript for audio/video via Deepgram (optional)
  let transcript: string | undefined;
  if ((type === "audio" || type === "video") && process.env.DEEPGRAM_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdk = (await import("@deepgram/sdk")) as any;
      const DeepgramClient = sdk.DeepgramClient ?? sdk.default?.DeepgramClient;
      if (DeepgramClient) {
        const dg = new DeepgramClient(process.env.DEEPGRAM_API_KEY!);
        const buffer = Buffer.from(bytes);
        const result = await dg.listen.prerecorded.transcribeFile(buffer, { model: "nova-2", mimetype: mime });
        transcript = result?.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;
      }
    } catch (e) {
      console.error("Transcription failed:", e);
    }
  }

  // Extract text from documents
  let documentText: string | undefined;
  if (type === "document") {
    try {
      if (mime === "application/pdf") {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(Buffer.from(bytes) as Buffer);
        documentText = data.text.slice(0, 8000); // cap at 8k chars
      } else if (mime.includes("wordprocessingml")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
        documentText = result.value.slice(0, 8000);
      } else if (mime === "text/plain") {
        documentText = new TextDecoder().decode(bytes).slice(0, 8000);
      }
    } catch (e) {
      console.error("Document extraction failed:", e);
    }
  }

  // Persist attachment if messageId provided
  let attachmentId: string | undefined;
  if (messageId) {
    const attachment = await prisma.attachment.create({
      data: {
        messageId,
        type,
        fileName: file.name,
        mimeType: mime,
        r2Key: key,
        sizeBytes: file.size,
        transcript: transcript ?? documentText,
      },
    });
    attachmentId = attachment.id;
  }

  return NextResponse.json({
    ok: true,
    attachmentId,
    key,
    url: publicUrl(key),
    type,
    fileName: file.name,
    mimeType: mime,
    transcript,
    documentText,
  });
}

// GET presigned upload URL (for client-side direct upload)
export async function GET(req: NextRequest) {
  await requireSession();
  const { searchParams } = req.nextUrl;
  const fileName = searchParams.get("fileName") ?? "file";
  const contentType = searchParams.get("contentType") ?? "application/octet-stream";
  const key = `uploads/${nanoid()}/${fileName}`;
  const url = await getUploadUrl(key, contentType);
  return NextResponse.json({ url, key });
}
