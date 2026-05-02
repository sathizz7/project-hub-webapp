"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  PROJECTS,
  type Project,
  type Phase,
  type Task,
  type ProjectCategory,
  type ProjectOutcomeType,
} from "@/lib/mock-data";

type User = {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
};

const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  engineering: "Engineering",
  data_science: "Data Science",
  design: "Design",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  hr: "HR",
  legal: "Legal",
  strategy: "Strategy",
  research: "Research",
  product: "Product",
  finance: "Finance",
  mixed: "Mixed / Cross-functional",
};

const OUTCOME_OPTIONS: Record<string, ProjectOutcomeType[]> = {
  engineering: ["product", "web_app", "mobile_app", "api_service", "tool", "integration"],
  data_science: ["ml_model", "data_pipeline", "report", "analytics_report"],
  design: ["ui_design", "design_system", "ux_research"],
  marketing: ["campaign", "content", "brand_asset"],
  research: ["report", "exploration", "market_analysis"],
};

const OUTCOME_FALLBACK: ProjectOutcomeType[] = ["report", "other", "presentation"];

function outcomeLabel(ot: string): string {
  return ot
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

type AIPlan = {
  summary?: string;
  milestones?: { name: string; description: string; targetDay: number }[];
  techStack?: string[];
  tasks?: { phase: string; task: string; estimatedDays: number }[];
  risks?: { risk: string; mitigation: string; severity: string }[];
  killCriteria?: string[];
};

export function NewProjectClient({ users }: { users: User[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectCategory>("engineering");
  const [outcomeType, setOutcomeType] = useState<ProjectOutcomeType>("product");
  const [requirement, setRequirement] = useState("");
  const [priority, setPriority] = useState("medium");
  const [timeboxDays, setTimeboxDays] = useState(14);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>("");
  const [coOwnerIds, setCoOwnerIds] = useState<string[]>([]);
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState<"details" | "plan" | "review">("details");

  async function generatePlan() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement, projectType: type, timeboxDays }),
      });
      const plan = await res.json();
      setAiPlan(plan);
      setStep("plan");
    } catch {
      alert("Failed to generate plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function createProject() {
    setCreating(true);
    try {
      const newId = `p${Date.now()}`;
      const resolvedOwner = ownerId || selectedUsers[0] || "u1";
      const resolvedCoOwners = coOwnerIds.filter((id) => id !== resolvedOwner);
      const now = new Date();

      // Convert AI plan tasks into phases and real task objects
      const phases: Phase[] = [];
      const tasks: Task[] = [];

      if (aiPlan?.tasks && aiPlan.tasks.length > 0) {
        // Extract unique phase names from AI plan tasks
        const phaseNames: string[] = [];
        for (const t of aiPlan.tasks) {
          if (t.phase && !phaseNames.includes(t.phase)) {
            phaseNames.push(t.phase);
          }
        }

        // Create Phase objects
        let dayOffset = 0;
        phaseNames.forEach((phaseName, idx) => {
          const phaseTasks = (aiPlan.tasks || []).filter((t: { phase: string }) => t.phase === phaseName);
          const phaseDays = phaseTasks.reduce((sum: number, t: { estimatedDays: number }) => sum + (t.estimatedDays || 2), 0);
          const startDate = new Date(now);
          startDate.setDate(startDate.getDate() + dayOffset);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + phaseDays);

          phases.push({
            id: `${newId}-ph${idx + 1}`,
            name: phaseName,
            description: `${phaseName} phase for ${title}`,
            status: idx === 0 ? "active" : "pending",
            checklist: phaseTasks.map((t: { task: string }) => ({ item: t.task, done: false })),
            discussions: [],
            attachments: [],
            signOffRequired: idx === phaseNames.length - 1,
            estimatedDuration: `${phaseDays} days`,
            order: idx + 1,
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
          });

          dayOffset += phaseDays;
        });

        // Create Task objects from AI plan tasks
        let taskIdx = 0;
        for (const planTask of aiPlan.tasks) {
          const phase = phases.find((p) => p.name === planTask.phase);
          const assignee = selectedUsers[taskIdx % selectedUsers.length] || resolvedOwner;
          tasks.push({
            id: `${newId}-t${taskIdx + 1}`,
            title: planTask.task,
            description: `${planTask.task} (${planTask.phase} phase)`,
            assigneeId: assignee,
            approach: "",
            planStatus: "ai_generated",
            steps: [],
            successCriteria: [],
            killCriteria: [],
            estimatedHours: (planTask.estimatedDays || 2) * 8,
            status: "planning",
            updates: [],
            priority: priority === "critical" ? "high" : (priority as Task["priority"]),
            milestones: [],
            deadlineExtensions: [],
            createdAt: now.toISOString(),
            phaseId: phase?.id,
          });
          taskIdx++;
        }
      }

      const newProject: Project = {
        id: newId,
        title,
        type,
        category: type,
        requirement,
        outcomeType,
        outcomeDescription: `${outcomeLabel(outcomeType)} for ${title}`,
        intermediateSubmissions: [],
        status: "active",
        priority: priority as Project["priority"],
        currentPhase: phases.length > 0 ? phases[0].name : "Planning",
        timeboxDays,
        startDate: now.toISOString(),
        techStack: aiPlan?.techStack || [],
        assigneeIds: selectedUsers,
        ownerId: resolvedOwner,
        coOwnerIds: resolvedCoOwners.length > 0 ? resolvedCoOwners : undefined,
        tasks,
        phases,
        updates: [],
        checkpoints: [],
        documents: [],
        aiPlan: aiPlan
          ? {
              summary: aiPlan.summary || "",
              risks: aiPlan.risks || [],
              killCriteria: aiPlan.killCriteria || [],
            }
          : undefined,
      };
      PROJECTS.push(newProject);
      router.push(`/projects/${newId}`);
    } catch {
      alert("Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  function toggleUser(userId: string) {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  const severityColors: Record<string, string> = {
    low: "text-green-400",
    medium: "text-amber-400",
    high: "text-red-400",
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Project</h1>
        <p className="text-muted-foreground mt-1">
          Define your project and let AI help you plan it
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-4 text-sm">
        {["details", "plan", "review"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["details", "plan", "review"].indexOf(step)
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < ["details", "plan", "review"].indexOf(step) ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={
                step === s ? "font-medium" : "text-muted-foreground"
              }
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </span>
            {i < 2 && (
              <div className="w-12 h-px bg-border mx-2" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === "details" && (
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>
              Describe your project requirement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Customer Churn Prediction System"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Type</Label>
                <Select
                  value={type}
                  onValueChange={(v) => {
                    if (!v) return;
                    const cat = v as ProjectCategory;
                    setType(cat);
                    const options = OUTCOME_OPTIONS[cat] || OUTCOME_FALLBACK;
                    if (!options.includes(outcomeType)) {
                      setOutcomeType(options[0]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as ProjectCategory[]).map(
                      (cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => v && setPriority(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Outcome Type</Label>
              <div className="flex flex-wrap gap-2">
                {(OUTCOME_OPTIONS[type] || OUTCOME_FALLBACK).map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOutcomeType(ot)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      outcomeType === ot
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                    }`}
                  >
                    {outcomeLabel(ot)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timebox">Timebox (days)</Label>
              <Input
                id="timebox"
                type="number"
                min={1}
                max={365}
                value={timeboxDays}
                onChange={(e) => setTimeboxDays(parseInt(e.target.value) || 14)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirement">Requirement</Label>
              <Textarea
                id="requirement"
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="Describe what you need built or researched in plain English..."
                className="min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Team Members</Label>
              <div className="space-y-2">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => toggleUser(user.id)}
                    />
                    <div
                      className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.name[0]}
                    </div>
                    <div>
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {user.role}
                      </span>
                    </div>
                  </label>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No team members yet. Add them in the Team section.
                  </p>
                )}
              </div>
            </div>

            {selectedUsers.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select
                    value={ownerId || selectedUsers[0]}
                    onValueChange={(v) => {
                      if (!v) return;
                      setOwnerId(v);
                      setCoOwnerIds((prev) => prev.filter((id) => id !== v));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter((u) => selectedUsers.includes(u.id))
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Co-owner(s)</Label>
                  <div className="space-y-1">
                    {users
                      .filter(
                        (u) =>
                          selectedUsers.includes(u.id) &&
                          u.id !== (ownerId || selectedUsers[0])
                      )
                      .map((u) => (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-accent cursor-pointer"
                        >
                          <Checkbox
                            checked={coOwnerIds.includes(u.id)}
                            onCheckedChange={() =>
                              setCoOwnerIds((prev) =>
                                prev.includes(u.id)
                                  ? prev.filter((id) => id !== u.id)
                                  : [...prev, u.id]
                              )
                            }
                          />
                          <span className="text-sm">{u.name}</span>
                        </label>
                      ))}
                    {users.filter(
                      (u) =>
                        selectedUsers.includes(u.id) &&
                        u.id !== (ownerId || selectedUsers[0])
                    ).length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Select more team members to assign co-owners.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={generatePlan}
                disabled={!title || !requirement || generating}
                className="gap-2"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate AI Plan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setAiPlan(null);
                  setStep("review");
                }}
                disabled={!title || !requirement}
              >
                Skip AI Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: AI Plan Review */}
      {step === "plan" && aiPlan && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
                AI-Generated Plan
              </CardTitle>
              <CardDescription>{aiPlan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tech Stack */}
              {aiPlan.techStack && aiPlan.techStack.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Suggested Tech Stack
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiPlan.techStack.map((tech) => (
                      <Badge key={tech} variant="secondary">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Milestones */}
              {aiPlan.milestones && aiPlan.milestones.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Milestones</h4>
                  <div className="space-y-2">
                    {aiPlan.milestones.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-accent/50"
                      >
                        <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.description} — Day {m.targetDay}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {aiPlan.tasks && aiPlan.tasks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Task Breakdown
                  </h4>
                  <div className="space-y-1">
                    {aiPlan.tasks.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded text-sm hover:bg-accent/30"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t.phase}
                          </Badge>
                          <span>{t.task}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ~{t.estimatedDays}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risks */}
              {aiPlan.risks && aiPlan.risks.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">
                    Risk Assessment
                  </h4>
                  <div className="space-y-2">
                    {aiPlan.risks.map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-accent/50 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle
                            className={`h-3.5 w-3.5 ${severityColors[r.severity]}`}
                          />
                          <span className="text-sm font-medium">{r.risk}</span>
                          <Badge variant="outline" className="text-xs">
                            {r.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground ml-5">
                          Mitigation: {r.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kill Criteria */}
              {aiPlan.killCriteria && aiPlan.killCriteria.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Kill Criteria</h4>
                  <ul className="space-y-1">
                    {aiPlan.killCriteria.map((k, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                        {k}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={() => setStep("details")} variant="outline">
              Back to Details
            </Button>
            <Button onClick={() => setStep("review")}>Approve Plan</Button>
            <Button
              variant="secondary"
              onClick={generatePlan}
              disabled={generating}
              className="gap-2"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Final Review & Create */}
      {step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Create</CardTitle>
            <CardDescription>
              Confirm project details before creation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Title:</span>
                <p className="font-medium">{title}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="font-medium">{CATEGORY_LABELS[type]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Outcome Type:</span>
                <p className="font-medium">{outcomeLabel(outcomeType)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <p className="font-medium capitalize">{priority}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Timebox:</span>
                <p className="font-medium">{timeboxDays} days</p>
              </div>
              {(ownerId || selectedUsers.length > 0) && (
                <div>
                  <span className="text-muted-foreground">Owner:</span>
                  <p className="font-medium">
                    {users.find(
                      (u) => u.id === (ownerId || selectedUsers[0])
                    )?.name || "—"}
                  </p>
                </div>
              )}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Requirement:</span>
              <p className="mt-1">{requirement}</p>
            </div>
            {selectedUsers.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Team:</span>
                <div className="flex gap-2 mt-1">
                  {users
                    .filter((u) => selectedUsers.includes(u.id))
                    .map((u) => (
                      <Badge key={u.id} variant="secondary">
                        {u.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {coOwnerIds.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Co-owner(s):</span>
                <div className="flex gap-2 mt-1">
                  {users
                    .filter((u) => coOwnerIds.includes(u.id))
                    .map((u) => (
                      <Badge key={u.id} variant="outline">
                        {u.name}
                      </Badge>
                    ))}
                </div>
              </div>
            )}
            {aiPlan && (
              <div className="text-sm">
                <span className="text-muted-foreground">AI Plan:</span>
                <p className="mt-1 text-green-400">Approved</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(aiPlan ? "plan" : "details")}
              >
                Back
              </Button>
              <Button
                onClick={createProject}
                disabled={creating}
                className="gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Project
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
