import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { requirement, projectType } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === "your-api-key-here") {
      return NextResponse.json({
        stack: generateFallbackStack(projectType),
      });
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `Suggest a tech stack for this ${projectType} project: "${requirement}".
Return a JSON array of technology names, max 8 items. Only output valid JSON array, no markdown.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const stack = JSON.parse(text);
    return NextResponse.json({ stack });
  } catch (error) {
    console.error("AI suggest stack error:", error);
    return NextResponse.json(
      { error: "Failed to suggest stack" },
      { status: 500 }
    );
  }
}

function generateFallbackStack(projectType: string) {
  if (projectType === "engineering") {
    return [
      "TypeScript",
      "React",
      "Next.js",
      "Node.js",
      "PostgreSQL",
      "Docker",
      "Jest",
      "GitHub Actions",
    ];
  }
  return [
    "Python",
    "Pandas",
    "NumPy",
    "Scikit-learn",
    "Jupyter",
    "Matplotlib",
    "DVC",
    "MLflow",
  ];
}
