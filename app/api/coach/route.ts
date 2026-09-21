import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  question: z.string().trim().min(1).max(700),
  context: z.object({
    entryCount: z.number().int().min(0).max(3650),
    weightTrendKg: z.number().min(-325).max(325).nullable(),
    energy: z.number().int().min(1).max(5).nullable(),
    completed: z.number().int().min(0).max(5),
    days: z.number().int().min(2).max(5),
    goal: z.enum(["bem-estar", "forca", "massa"]),
    diet: z.enum(["onivora", "vegetariana", "vegana"]),
  }).strict(),
}).strict();

const windowMs = 10 * 60 * 1000;
const requestLimit = 12;
const buckets = new Map<string, { count: number; resetAt: number }>();

function limited(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  if (buckets.size > 2000) for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) { buckets.set(ip, { count: 1, resetAt: now + windowMs }); return false; }
  bucket.count += 1;
  return bucket.count > requestLimit;
}

async function readSmallBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function GET() {
  return NextResponse.json({ online: Boolean(process.env.OPENAI_API_KEY) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "IA online não configurada" }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ error: "Pedido muito grande" }, { status: 413 });
  if (limited(request)) return NextResponse.json({ error: "Limite temporário atingido" }, { status: 429, headers: { "Retry-After": "600" } });

  let raw: string | null;
  try { raw = await readSmallBody(request); } catch { return NextResponse.json({ error: "Pedido inválido" }, { status: 400 }); }
  if (raw === null) return NextResponse.json({ error: "Pedido muito grande" }, { status: 413 });
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { return NextResponse.json({ error: "Pedido inválido" }, { status: 400 }); }
  const parsed = requestSchema.safeParse(decoded);
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        store: false,
        max_output_tokens: 450,
        instructions: "Você é o assistente do Pulso Fitness, para adultos em português do Brasil. Dê sugestões gerais, breves e práticas sobre treinos, alimentação e hábitos. O contexto é opcional e pode estar incompleto. Não prescreva calorias, dietas restritivas, jejum ou tratamento; não diagnostique. Para sintomas, condições de saúde, lesão, gravidez ou histórico de transtorno alimentar, recomende orientação profissional. Nunca incentive culpa ou compensação alimentar. Não repita os dados de contexto sem necessidade.",
        input: `Resumo enviado com permissão do usuário: ${JSON.stringify(parsed.data.context)}\n\nPergunta: ${parsed.data.question}`,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 502 });
    const result = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
    const answer = result.output?.flatMap(item => item.content || []).filter(part => part.type === "output_text").map(part => part.text || "").join("\n").trim();
    if (!answer) return NextResponse.json({ error: "Resposta vazia" }, { status: 502 });
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Serviço temporariamente indisponível" }, { status: 502 });
  }
}
