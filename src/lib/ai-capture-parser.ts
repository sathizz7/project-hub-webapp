import { User, CaptureItem, CaptureItemType, generateCaptureItemId } from "./mock-data";

// Keyword maps for classifying sentences
const TYPE_KEYWORDS: Record<CaptureItemType, string[]> = {
  todo: ["assign", "task", "complete", "do", "handle", "work on", "implement", "build", "create", "prepare", "set up", "fix", "update", "finish"],
  follow_up: ["report", "give me", "send", "deliver", "provide", "submit", "share", "present", "by friday", "by monday", "by tuesday", "by wednesday", "by thursday", "by end of", "due", "get back"],
  commitment: ["committed", "promised", "agreed", "will provide", "will deliver", "will send", "guarantee", "assured", "pledged"],
  meeting: ["meeting", "meet with", "discuss", "call with", "sync", "standup", "catch up", "one-on-one", "1:1", "huddle", "session with"],
  review_reminder: ["review", "check", "look at", "verify", "approve", "sign off", "audit", "inspect", "evaluate", "assess", "feedback on"],
  timeline: ["deadline", "milestone", "launch", "go-live", "release", "target date", "eta", "ship by", "rollout"],
};

// Day names for date extraction
const DAY_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function extractDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();

  // "tomorrow"
  if (lower.includes("tomorrow")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  // "next week"
  if (lower.includes("next week")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }

  // "end of month"
  if (lower.includes("end of month") || lower.includes("end of the month")) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d.toISOString().split("T")[0];
  }

  // "end of week"
  if (lower.includes("end of week") || lower.includes("end of the week")) {
    const d = new Date(now);
    const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilFriday);
    return d.toISOString().split("T")[0];
  }

  // Day names: "by Friday", "on Monday", etc.
  for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
    if (lower.includes(dayName)) {
      const d = new Date(now);
      const daysAhead = (dayNum - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + daysAhead);
      return d.toISOString().split("T")[0];
    }
  }

  // "in X days"
  const inDaysMatch = lower.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() + parseInt(inDaysMatch[1]));
    return d.toISOString().split("T")[0];
  }

  return "";
}

function classifySentence(sentence: string): CaptureItemType {
  const lower = sentence.toLowerCase();
  let bestType: CaptureItemType = "todo";
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS) as [CaptureItemType, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return bestType;
}

function matchUsers(sentence: string, users: User[]): string[] {
  const lower = sentence.toLowerCase();
  return users
    .filter(u => lower.includes(u.name.toLowerCase()))
    .map(u => u.id);
}

function matchDepartment(sentence: string, departments: string[]): string {
  const lower = sentence.toLowerCase();
  for (const dept of departments) {
    if (lower.includes(dept.toLowerCase())) return dept;
  }
  // Check common aliases
  const aliases: Record<string, string> = {
    "data science": "Data Science",
    "ds": "Data Science",
    "ml": "Data Science",
    "eng": "Engineering",
    "engineering": "Engineering",
    "design": "Design",
    "marketing": "Marketing",
    "hr": "HR",
    "finance": "Finance",
    "legal": "Legal",
    "ops": "Operations",
    "operations": "Operations",
    "product": "Product",
    "sales": "Sales",
    "strategy": "Strategy",
    "research": "Research",
    "qa": "QA",
    "security": "Security",
  };
  for (const [alias, dept] of Object.entries(aliases)) {
    if (lower.includes(alias)) return dept;
  }
  return "";
}

function generateTitle(sentence: string, type: CaptureItemType): string {
  // Clean up the sentence to make a concise title
  let title = sentence.trim();
  // Remove leading connector words
  title = title.replace(/^(and |also |then |plus |additionally |moreover |furthermore )/i, "");
  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);
  // Truncate if too long
  if (title.length > 80) title = title.substring(0, 77) + "...";
  return title;
}

function getPriorityForType(type: CaptureItemType, hasDeadline: boolean): "low" | "medium" | "high" | "critical" {
  if (type === "commitment") return "high";
  if (type === "review_reminder") return "high";
  if (type === "timeline") return hasDeadline ? "high" : "medium";
  if (type === "meeting") return "medium";
  if (type === "follow_up") return hasDeadline ? "high" : "medium";
  return "medium";
}

export function parseCaptureInput(
  text: string,
  users: User[],
  departments: string[]
): CaptureItem[] {
  // Split by sentence boundaries
  const sentences = text
    .split(/[.\n;!]+/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // ignore tiny fragments

  return sentences.map(sentence => {
    const type = classifySentence(sentence);
    const assigneeIds = matchUsers(sentence, users);
    const department = matchDepartment(sentence, departments);
    const dueDate = extractDate(sentence);
    const priority = getPriorityForType(type, !!dueDate);

    return {
      id: generateCaptureItemId(),
      type,
      rawText: sentence,
      title: generateTitle(sentence, type),
      description: sentence,
      assigneeIds,
      department,
      dueDate,
      priority,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
  });
}
