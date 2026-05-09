import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an AI assistant that parses unstructured meeting notes and voice memos into structured action items.

Extract all actionable items from the input text and return them as a JSON array. Each item must have:
- "type": one of "todo", "follow_up", "commitment", "meeting", "review", "timeline"
- "title": short action title (max 80 chars)
- "description": 1-2 sentence explanation
- "priority": one of "low", "medium", "high", "critical"

Return ONLY valid JSON — an array of objects with those four fields. No markdown, no extra text.

Examples:
- "asked Arjun to finish the doc by Thursday" → type=follow_up, priority=high
- "I need to review Vikram's PR before Friday" → type=review, priority=high
- "set up a deployment timeline for next week" → type=timeline, priority=medium
- "committed to send quarterly report to board by month-end" → type=commitment, priority=high`;

type ParsedItem = {
  type: string;
  title: string;
  description: string;
  priority: string;
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { rawInput: string; userId: string };
  const { rawInput, userId } = body;

  if (!rawInput?.trim()) {
    return NextResponse.json({ error: "rawInput is required" }, { status: 400 });
  }

  let parsedItems: ParsedItem[] = [];
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: rawInput }],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : "[]";
    parsedItems = JSON.parse(text) as ParsedItem[];
    if (!Array.isArray(parsedItems)) parsedItems = [];
  } catch {
    parsedItems = [];
  }

  const session = await prisma.captureSession.create({
    data: {
      userId,
      rawInput,
      items: {
        create: parsedItems.map(item => ({
          type: item.type ?? "todo",
          rawText: rawInput,
          title: item.title ?? "Untitled",
          description: item.description ?? "",
          priority: item.priority ?? "medium",
          status: "pending",
        })),
      },
    },
    include: {
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    id: session.id,
    rawInput: session.rawInput,
    createdAt: session.createdAt.toISOString(),
    items: session.items.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      priority: i.priority,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
