import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { title, type, description, projectContext } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === "your-api-key-here") {
      return NextResponse.json({
        feedback: generateFallbackReview(title, type, description),
      });
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a senior tech lead reviewing a team submission. Provide constructive, actionable feedback.

Submission Title: ${title}
Submission Type: ${type}
Description: ${description}
${projectContext ? `Project Context: ${projectContext}` : ""}

Provide feedback covering:
1. What's good about this submission
2. Areas for improvement
3. Specific actionable suggestions
4. Any concerns or risks

Keep it concise and constructive. Format as plain text paragraphs.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ feedback: text });
  } catch (error) {
    console.error("AI review error:", error);
    return NextResponse.json(
      { error: "Failed to generate review" },
      { status: 500 }
    );
  }
}

function generateFallbackReview(
  title: string,
  type: string,
  description: string
) {
  const typeSpecific: Record<string, string> = {
    document: `The document "${title}" covers the key points. Consider adding more specific examples and metrics to strengthen the argument. Ensure all stakeholders have been considered.`,
    code: `The code submission "${title}" appears functional. Consider adding edge case handling and ensure test coverage is adequate. Review naming conventions for consistency.`,
    architecture: `The architecture proposal "${title}" shows good structure. Verify scalability assumptions and document failure modes. Consider adding a data flow diagram if not present.`,
    notebook: `The notebook "${title}" demonstrates the analysis well. Ensure all cells are reproducible and add markdown explanations for complex steps. Consider parameterizing key variables.`,
    demo: `The demo "${title}" effectively showcases the feature. Consider edge cases in the demo flow and prepare answers for common stakeholder questions.`,
  };

  return (
    typeSpecific[type] ||
    `Review of "${title}": ${description.slice(0, 100)}. Please ensure completeness and quality standards are met.`
  );
}
