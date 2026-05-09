import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { requirement, projectType, timeboxDays } = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey || apiKey === "your-api-key-here") {
      return NextResponse.json(
        generateFallbackPlan(requirement, projectType, timeboxDays),
        { status: 200 }
      );
    }

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a technical project planner. Generate a detailed project plan for the following requirement.

Project Type: ${projectType}
Timebox: ${timeboxDays} days
Requirement: ${requirement}

Respond in JSON format with this structure:
{
  "summary": "Brief project summary",
  "milestones": [{"name": "milestone name", "description": "what to achieve", "targetDay": number}],
  "techStack": ["technology1", "technology2"],
  "tasks": [{"phase": "phase name", "task": "task description", "estimatedDays": number}],
  "risks": [{"risk": "description", "mitigation": "how to mitigate", "severity": "low|medium|high"}],
  "killCriteria": ["criterion 1", "criterion 2"]
}

Only output valid JSON, no markdown formatting.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const plan = JSON.parse(text);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("AI plan generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate plan" },
      { status: 500 }
    );
  }
}

type PlanTemplate = {
  phases: { name: string; tasks: string[]; ratio: number }[];
  techStack: string[];
};

const PLAN_TEMPLATES: Record<string, PlanTemplate> = {
  engineering: {
    phases: [
      { name: "Requirements & Design", tasks: ["Define scope and success criteria", "Create architecture and API design"], ratio: 0.2 },
      { name: "Development", tasks: ["Implement core functionality", "Build integration layer", "Write unit tests"], ratio: 0.45 },
      { name: "Testing & Review", tasks: ["Code review and QA testing", "Performance and security audit"], ratio: 0.2 },
      { name: "Deployment", tasks: ["Deploy to staging and production", "Set up monitoring and alerts"], ratio: 0.15 },
    ],
    techStack: ["TypeScript", "React", "Node.js", "PostgreSQL"],
  },
  data_science: {
    phases: [
      { name: "Hypothesis & Data Collection", tasks: ["Define hypotheses and success metrics", "Collect and validate data sources"], ratio: 0.2 },
      { name: "Exploration & Feature Engineering", tasks: ["Explore data distributions and patterns", "Build feature pipeline"], ratio: 0.25 },
      { name: "Modeling & Experimentation", tasks: ["Train baseline models", "Hyperparameter tuning and experiments"], ratio: 0.3 },
      { name: "Evaluation & Reporting", tasks: ["Evaluate model on holdout set", "Document findings and present results"], ratio: 0.25 },
    ],
    techStack: ["Python", "Pandas", "Scikit-learn", "Jupyter", "MLflow"],
  },
  design: {
    phases: [
      { name: "Research & Discovery", tasks: ["User research and competitive analysis", "Define personas and user journeys"], ratio: 0.25 },
      { name: "Wireframing & Prototyping", tasks: ["Create low-fidelity wireframes", "Build interactive prototype"], ratio: 0.3 },
      { name: "Visual Design", tasks: ["Create high-fidelity mockups", "Design system components"], ratio: 0.25 },
      { name: "Handoff & Review", tasks: ["Prepare developer handoff specs", "Stakeholder review and iteration"], ratio: 0.2 },
    ],
    techStack: ["Figma", "FigJam", "Principle", "Zeplin"],
  },
  marketing: {
    phases: [
      { name: "Strategy & Planning", tasks: ["Define target audience and positioning", "Create campaign brief and timeline"], ratio: 0.2 },
      { name: "Content Creation", tasks: ["Develop creative assets and copy", "Build landing pages and materials"], ratio: 0.35 },
      { name: "Launch & Distribution", tasks: ["Execute launch across channels", "Set up tracking and analytics"], ratio: 0.25 },
      { name: "Analysis & Optimization", tasks: ["Monitor performance metrics", "Optimize and report results"], ratio: 0.2 },
    ],
    techStack: ["Google Analytics", "HubSpot", "Canva", "Mailchimp"],
  },
  strategy: {
    phases: [
      { name: "Research & Data Gathering", tasks: ["Collect market and competitive data", "Stakeholder interviews and analysis"], ratio: 0.3 },
      { name: "Analysis & Framework", tasks: ["Build analytical framework", "Identify opportunities and threats"], ratio: 0.3 },
      { name: "Recommendations", tasks: ["Develop strategic recommendations", "Financial modeling and projections"], ratio: 0.25 },
      { name: "Presentation & Alignment", tasks: ["Prepare executive presentation", "Align with leadership team"], ratio: 0.15 },
    ],
    techStack: ["Excel", "PowerPoint", "Tableau", "Notion"],
  },
};

function generateFallbackPlan(
  requirement: string,
  projectType: string,
  timeboxDays: number
) {
  const template = PLAN_TEMPLATES[projectType] || PLAN_TEMPLATES.engineering;
  const typeLabel = projectType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const milestones = template.phases.map((phase, idx) => {
    const cumulativeRatio = template.phases.slice(0, idx + 1).reduce((sum, p) => sum + p.ratio, 0);
    return {
      name: `${phase.name} Complete`,
      description: `${phase.name} phase deliverables finalized`,
      targetDay: Math.round(timeboxDays * cumulativeRatio),
    };
  });

  const tasks = template.phases.flatMap((phase) =>
    phase.tasks.map((task) => ({
      phase: phase.name,
      task,
      estimatedDays: Math.max(1, Math.round(timeboxDays * phase.ratio / phase.tasks.length)),
    }))
  );

  return {
    summary: `${typeLabel} project: ${requirement.slice(0, 100)}`,
    milestones,
    techStack: template.techStack,
    tasks,
    risks: [
      {
        risk: "Scope creep beyond timebox",
        mitigation: "Strict prioritization and daily standups",
        severity: "medium",
      },
      {
        risk: "Technical or resource blockers",
        mitigation: "Early prototyping and clear escalation path",
        severity: "high",
      },
      {
        risk: "Stakeholder alignment gaps",
        mitigation: "Regular check-ins and shared progress dashboards",
        severity: "medium",
      },
    ],
    killCriteria: [
      "No measurable progress after 30% of timebox elapsed",
      "Core assumption invalidated by data or technical constraint",
      "Team blocked for more than 3 consecutive days",
    ],
  };
}
