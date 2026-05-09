import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(__dirname, '..', 'dev.db');

// Set the DATABASE_URL that prisma config reads
process.env.DATABASE_URL = `file:${dbPath}`;

const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });

const mod = await import('../src/generated/prisma/client.ts');
const PrismaClient = mod.PrismaClient;
const prisma = new PrismaClient({ adapter });

const ENGINEERING_PHASES = [
  { name: "Requirements", checklist: ["Problem statement defined", "Success criteria documented", "Stakeholders identified", "Scope boundaries set"] },
  { name: "Design", checklist: ["Architecture diagram provided", "Tech stack justified", "API contracts defined", "Data models designed"] },
  { name: "Development", checklist: ["Core features implemented", "Unit tests written", "Code reviewed", "Integration tests passing"] },
  { name: "Review", checklist: ["Code review complete", "Performance benchmarks met", "Security review done", "Documentation updated"] },
  { name: "Deploy", checklist: ["Staging deployment successful", "QA sign-off received", "Rollback plan documented", "Monitoring configured"] },
  { name: "Done", checklist: ["Post-mortem completed", "Metrics baseline established"] },
];

const RESEARCH_PHASES = [
  { name: "Hypothesis", checklist: ["Research question defined", "Hypothesis stated", "Success metrics identified", "Literature review done"] },
  { name: "Exploration", checklist: ["Data sources identified", "Data quality assessed", "EDA completed", "Feature candidates listed"] },
  { name: "Experiment", checklist: ["Baseline model established", "Experiments tracked", "Hyperparameter tuning done", "Results reproducible"] },
  { name: "Evaluation", checklist: ["Model performance evaluated", "Compared against baseline", "Error analysis complete", "Business impact estimated"] },
  { name: "Report", checklist: ["Findings documented", "Recommendations made", "Presentation prepared", "Next steps outlined"] },
  { name: "Done", checklist: ["Knowledge transferred", "Artifacts archived"] },
];

const DEV_PASSWORD_HASH = await bcrypt.hash("password123", 10);

await prisma.feedback.deleteMany();
await prisma.submission.deleteMany();
await prisma.checkpoint.deleteMany();
await prisma.phase.deleteMany();
await prisma.projectAssignee.deleteMany();
await prisma.project.deleteMany();
await prisma.user.deleteMany();

const rahul = await prisma.user.create({
  data: { name: "Rahul Gupta", role: "CEO", email: "rahul@projecthub.dev", avatarColor: "#4F46E5", passwordHash: DEV_PASSWORD_HASH, roleType: "ceo" },
});
const priya = await prisma.user.create({
  data: { name: "Priya Sharma", role: "Senior Data Scientist", email: "priya@projecthub.dev", avatarColor: "#9333EA", passwordHash: DEV_PASSWORD_HASH, roleType: "team_member" },
});
const arjun = await prisma.user.create({
  data: { name: "Arjun Mehta", role: "Full-Stack Engineer", email: "arjun@projecthub.dev", avatarColor: "#0EA5E9", passwordHash: DEV_PASSWORD_HASH, roleType: "team_member" },
});
const meera = await prisma.user.create({
  data: { name: "Meera Iyer", role: "ML Engineer", email: "meera@projecthub.dev", avatarColor: "#EC4899", passwordHash: DEV_PASSWORD_HASH, roleType: "team_member" },
});
const vikram = await prisma.user.create({
  data: { name: "Vikram Patel", role: "Backend Engineer", email: "vikram@projecthub.dev", avatarColor: "#F59E0B", passwordHash: DEV_PASSWORD_HASH, roleType: "team_member" },
});

const engProject = await prisma.project.create({
  data: {
    title: "API Gateway & Rate Limiting Service",
    type: "engineering",
    requirement: "Build a centralized API gateway that handles authentication, rate limiting, and request routing for all our microservices. Must handle 10k+ requests/second.",
    status: "active",
    priority: "high",
    currentPhase: "Development",
    timeboxDays: 21,
    startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    techStack: JSON.stringify(["Go", "Redis", "Docker", "Kubernetes", "Prometheus", "gRPC"]),
    aiPlan: JSON.stringify({
      summary: "Build a high-performance API gateway with rate limiting, auth, and circuit breaker capabilities",
      milestones: [
        { name: "Architecture Finalized", description: "Gateway architecture and tech decisions locked", targetDay: 4 },
        { name: "Core Gateway Live", description: "Request routing and JWT auth working", targetDay: 12 },
        { name: "Production Ready", description: "Rate limiting, circuit breaker, monitoring all integrated", targetDay: 21 },
      ],
      risks: [
        { risk: "Performance bottleneck at scale", mitigation: "Load test early with k6", severity: "high" },
        { risk: "Redis single point of failure", mitigation: "Use Redis Sentinel", severity: "medium" },
      ],
      killCriteria: ["Cannot achieve 5k req/s after optimization", "Security audit reveals fundamental design flaw"],
    }),
    assignees: { create: [{ userId: arjun.id }, { userId: vikram.id }] },
    phases: {
      create: ENGINEERING_PHASES.map((phase, index) => ({
        phaseName: phase.name,
        status: index < 2 ? "completed" : index === 2 ? "active" : "pending",
        checklist: JSON.stringify(phase.checklist),
        order: index,
      })),
    },
  },
  include: { phases: true },
});

const engDesignPhase = engProject.phases.find((p: any) => p.phaseName === "Design")!;
const engDevPhase = engProject.phases.find((p: any) => p.phaseName === "Development")!;

const archSub = await prisma.submission.create({
  data: {
    phaseId: engDesignPhase.id, projectId: engProject.id, userId: arjun.id,
    title: "API Gateway Architecture Document", type: "architecture",
    description: "Detailed architecture covering request flow, JWT validation, token bucket rate limiter, and circuit breaker state machine.",
  },
});
await prisma.feedback.create({
  data: {
    submissionId: archSub.id, fromUserId: rahul.id, isAi: false,
    text: "Solid architecture. Token bucket approach is the right call. Add failover behavior docs and observability section.",
  },
});
await prisma.submission.create({
  data: {
    phaseId: engDevPhase.id, projectId: engProject.id, userId: vikram.id,
    title: "Core routing and JWT middleware PR", type: "code",
    description: "Core request routing engine and JWT validation middleware. Unit tests included. Benchmarks: ~15k req/s on M1 Mac.",
  },
});
await prisma.submission.create({
  data: {
    phaseId: engDevPhase.id, projectId: engProject.id, userId: arjun.id,
    title: "Rate limiter implementation with Redis backend", type: "code",
    description: "Token bucket rate limiter with sliding window counters. Per-client and per-endpoint limits. In-memory fallback if Redis is down.",
  },
});
await prisma.checkpoint.create({
  data: {
    projectId: engProject.id, decision: "continue",
    notes: "Day 8: Requirements and Design completed on schedule. Core routing performing well (15k req/s). Rate limiter in review. On track.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
});

const resProject = await prisma.project.create({
  data: {
    title: "Customer Churn Prediction Model",
    type: "research",
    requirement: "Build an ML model to predict customer churn. 18 months of data available. Goal: identify at-risk customers 30 days before churn with >80% precision.",
    status: "active",
    priority: "critical",
    currentPhase: "Experiment",
    timeboxDays: 28,
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    techStack: JSON.stringify(["Python", "Pandas", "XGBoost", "Scikit-learn", "Jupyter", "MLflow", "SHAP"]),
    aiPlan: JSON.stringify({
      summary: "Develop churn prediction model using customer behavioral data",
      milestones: [
        { name: "Data Understanding", description: "EDA complete", targetDay: 7 },
        { name: "Model Baseline", description: "First model trained", targetDay: 18 },
        { name: "Production Model", description: "Final model >80% precision", targetDay: 28 },
      ],
      risks: [
        { risk: "Data quality issues", mitigation: "Early data audit", severity: "high" },
        { risk: "Class imbalance", mitigation: "Use SMOTE and class weights", severity: "medium" },
      ],
      killCriteria: ["Cannot achieve 60% precision", "Data quality too poor (>30% missing)"],
    }),
    assignees: { create: [{ userId: priya.id }, { userId: meera.id }] },
    phases: {
      create: RESEARCH_PHASES.map((phase, index) => ({
        phaseName: phase.name,
        status: index < 2 ? "completed" : index === 2 ? "active" : "pending",
        checklist: JSON.stringify(phase.checklist),
        order: index,
      })),
    },
  },
  include: { phases: true },
});

const resExplPhase = resProject.phases.find((p: any) => p.phaseName === "Exploration")!;
const resExpPhase = resProject.phases.find((p: any) => p.phaseName === "Experiment")!;

const edaSub = await prisma.submission.create({
  data: {
    phaseId: resExplPhase.id, projectId: resProject.id, userId: priya.id,
    title: "EDA Notebook — Customer Behavioral Patterns", type: "notebook",
    description: "EDA of 18 months of data. Key findings: usage drop-off 2 weeks before churn, support tickets correlate (r=0.42), non-adopters have 3x churn rate.",
  },
});
await prisma.feedback.create({
  data: {
    submissionId: edaSub.id, fromUserId: rahul.id, isAi: false,
    text: "Excellent EDA. Feature adoption finding is very actionable — flag for product team. Check for seasonal patterns in Q4 renewals.",
  },
});
await prisma.submission.create({
  data: {
    phaseId: resExpPhase.id, projectId: resProject.id, userId: meera.id,
    title: "Baseline Model Results — LR vs XGBoost", type: "notebook",
    description: "LR: 72% precision, 65% recall. XGBoost: 78% precision, 71% recall. Top features: usage_drop_14d, support_tickets_30d, days_since_key_feature_adoption.",
  },
});

await prisma.project.create({
  data: {
    title: "Internal Dashboard Redesign",
    type: "engineering",
    requirement: "Redesign analytics dashboard for faster loads and real-time data streaming.",
    status: "completed",
    priority: "medium",
    currentPhase: "Done",
    timeboxDays: 14,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    techStack: JSON.stringify(["React", "TypeScript", "WebSocket", "D3.js", "Redis"]),
    aiPlan: JSON.stringify({ summary: "Rebuild dashboard with real-time streaming" }),
    assignees: { create: [{ userId: arjun.id }] },
    phases: {
      create: ENGINEERING_PHASES.map((phase, index) => ({
        phaseName: phase.name, status: "completed",
        checklist: JSON.stringify(phase.checklist), order: index,
      })),
    },
  },
});

// ── Tasks ────────────────────────────────────────────────────────────────────

const engPhases = engProject.phases;
const resPhases = resProject.phases;
const engDevPhaseForTasks = engPhases.find((p: any) => p.phaseName === "Development")!;
const engReviewPhase = engPhases.find((p: any) => p.phaseName === "Review")!;
const resExpPhaseForTasks = resPhases.find((p: any) => p.phaseName === "Experiment")!;

const now = Date.now();
const d = (offsetDays: number) => new Date(now + offsetDays * 86400000);

// Engineering project tasks (4)
const t1 = await prisma.task.create({ data: { title: "Implement Redis-based token bucket", projectId: engProject.id, phaseId: engDevPhaseForTasks.id, assigneeId: arjun.id, priority: "high", status: "in_progress", dueDate: d(-1) } }); // overdue
const t2 = await prisma.task.create({ data: { title: "Write rate-limit middleware unit tests", projectId: engProject.id, phaseId: engDevPhaseForTasks.id, assigneeId: vikram.id, priority: "medium", status: "in_progress", dueDate: d(3) } });
const t3 = await prisma.task.create({ data: { title: "Performance benchmark (k6 load test)", projectId: engProject.id, phaseId: engDevPhaseForTasks.id, assigneeId: arjun.id, priority: "high", status: "planning", dueDate: d(5) } });
const t4 = await prisma.task.create({ data: { title: "Code review sign-off from Rahul", projectId: engProject.id, phaseId: engReviewPhase.id, assigneeId: vikram.id, priority: "medium", status: "planning", dueDate: d(9) } });

// Research project tasks (3)
await prisma.task.create({ data: { title: "Tune XGBoost hyperparameters (grid search)", projectId: resProject.id, phaseId: resExpPhaseForTasks.id, assigneeId: priya.id, priority: "high", status: "in_progress", dueDate: d(-2) } }); // overdue
await prisma.task.create({ data: { title: "Run SHAP feature importance analysis", projectId: resProject.id, phaseId: resExpPhaseForTasks.id, assigneeId: meera.id, priority: "medium", status: "planning", dueDate: d(4) } });
await prisma.task.create({ data: { title: "Write experiment results report", projectId: resProject.id, assigneeId: priya.id, priority: "low", status: "planning", dueDate: d(12) } });

// Dashboard project tasks (5, all completed)
const dashboardProject = await prisma.project.findFirst({ where: { title: { contains: "Dashboard" } } });
if (dashboardProject) {
  for (const [title, assigneeId] of [
    ["Set up WebSocket server", arjun.id],
    ["Build real-time chart components", arjun.id],
    ["Integrate D3.js visualizations", arjun.id],
    ["Redis caching layer for query results", vikram.id],
    ["QA and cross-browser testing", arjun.id],
  ] as [string, string][]) {
    await prisma.task.create({ data: { title, projectId: dashboardProject.id, assigneeId, priority: "medium", status: "completed", completedAt: d(-5) } });
  }
}

// ── Leave Requests ────────────────────────────────────────────────────────────

// 2 pending
await prisma.leaveRequest.create({ data: { userId: priya.id, type: "planned", startDate: d(7), endDate: d(9), days: 3, reason: "Family trip", status: "pending", contingencyNote: "Will hand off XGBoost tuning to Meera before leaving" } });
await prisma.leaveRequest.create({ data: { userId: arjun.id, type: "personal", startDate: d(14), endDate: d(16), days: 3, reason: "Personal commitment", status: "pending", contingencyNote: "Rate-limiter PR will be merged before leave starts" } });

// 3 approved (mix past + upcoming)
await prisma.leaveRequest.create({ data: { userId: vikram.id, type: "sick", startDate: d(-10), endDate: d(-9), days: 2, reason: "Fever", status: "approved", approvedById: rahul.id, approvedAt: d(-11), coveragePlan: "Arjun covered code reviews" } });
await prisma.leaveRequest.create({ data: { userId: meera.id, type: "wfh", startDate: d(2), endDate: d(2), days: 1, reason: "Home maintenance", status: "approved", approvedById: rahul.id, approvedAt: d(-1) } });
await prisma.leaveRequest.create({ data: { userId: priya.id, type: "half_day", startDate: d(-3), endDate: d(-3), days: 0.5, reason: "Doctor appointment", status: "approved", approvedById: rahul.id, approvedAt: d(-4) } });

// 1 rejected
await prisma.leaveRequest.create({ data: { userId: vikram.id, type: "planned", startDate: d(1), endDate: d(5), days: 5, reason: "Extended vacation", status: "rejected", approvedById: rahul.id, approvedAt: d(-2), contingencyNote: "Deployment scheduled same week" } });

// ── Deadline Extensions ───────────────────────────────────────────────────────

// 1 pending (high urgency)
await prisma.deadlineExtension.create({ data: { projectId: engProject.id, taskId: t1.id, requestedById: arjun.id, originalDeadline: d(-1), requestedDeadline: d(3), reason: "task_complexity", reasonDetail: "Redis Cluster failover edge cases took longer than estimated — need 4 more days to ensure correctness", status: "pending", escalationLevel: 0 } });

// 1 approved
await prisma.deadlineExtension.create({ data: { projectId: resProject.id, taskId: t2.id, requestedById: vikram.id, originalDeadline: d(-5), requestedDeadline: d(3), reason: "dependency_blocked", reasonDetail: "Waiting on data pipeline access from infra team", status: "approved", approvedById: rahul.id, approvedAt: d(-3), ceoComment: "Approved — infra delays are out of your control. Keep me posted.", escalationLevel: 0 } });

// 1 auto-escalated
await prisma.deadlineExtension.create({ data: { projectId: engProject.id, taskId: t3.id, requestedById: arjun.id, originalDeadline: d(-8), requestedDeadline: d(2), reason: "technical_challenge", reasonDetail: "k6 test environment setup took significantly longer due to Docker networking issues on CI", status: "auto_escalated", escalationLevel: 2 } });

// ── Capture Sessions ──────────────────────────────────────────────────────────

const cs1 = await prisma.captureSession.create({ data: { userId: rahul.id, rawInput: "Remind Arjun to finalize the rate-limiter doc by Thursday. Schedule churn model review with Priya and Meera for Monday. I committed to send the Q2 engineering report to the board by end of month. Need to review Vikram's middleware PR before Friday.", createdAt: d(-1) } });

await prisma.captureItem.create({ data: { sessionId: cs1.id, type: "follow_up", rawText: "Remind Arjun to finalize the rate-limiter doc by Thursday", title: "Rate-limiter doc — Arjun by Thursday", description: "Arjun to complete the architecture documentation for the API gateway rate-limiter", priority: "high", status: "pending", projectId: engProject.id, dueDate: d(3), assignees: { create: [{ userId: arjun.id }] } } });
await prisma.captureItem.create({ data: { sessionId: cs1.id, type: "meeting", rawText: "Schedule churn model review with Priya and Meera for Monday", title: "Churn model review meeting", description: "Review XGBoost experiment results and agree on next steps", priority: "medium", status: "pending", projectId: resProject.id, dueDate: d(2), assignees: { create: [{ userId: priya.id }, { userId: meera.id }] } } });
await prisma.captureItem.create({ data: { sessionId: cs1.id, type: "commitment", rawText: "I committed to send the Q2 engineering report to the board by end of month", title: "Q2 Engineering report to board", description: "Compile and send quarterly engineering progress report", priority: "high", status: "converted", convertedToType: "task", dueDate: d(20) } });
await prisma.captureItem.create({ data: { sessionId: cs1.id, type: "review", rawText: "Need to review Vikram's middleware PR before Friday", title: "Review Vikram's middleware PR", description: "Code review for JWT validation middleware implementation", priority: "high", status: "dismissed", projectId: engProject.id, dueDate: d(4), assignees: { create: [{ userId: vikram.id }] } } });

const cs2 = await prisma.captureSession.create({ data: { userId: rahul.id, rawInput: "Priya is going on leave next week — make sure churn experiment continues. Need to set up a timeline for the API gateway production deployment. Follow up with Vikram on Redis Sentinel setup.", createdAt: d(0) } });

await prisma.captureItem.create({ data: { sessionId: cs2.id, type: "todo", rawText: "Make sure churn experiment continues while Priya is on leave", title: "Churn experiment continuity during Priya leave", description: "Ensure Meera can cover XGBoost tuning while Priya is away", priority: "medium", status: "pending", projectId: resProject.id, assignees: { create: [{ userId: meera.id }] } } });
await prisma.captureItem.create({ data: { sessionId: cs2.id, type: "timeline", rawText: "Set up a timeline for the API gateway production deployment", title: "API gateway production deployment timeline", description: "Define dates for staging → production rollout with rollback plan", priority: "high", status: "pending", projectId: engProject.id, dueDate: d(7) } });

console.log("Seeded successfully! 5 users, 3 projects, 12 tasks, 6 leave requests, 3 extensions, 2 capture sessions (6 items), submissions & feedback.");
await prisma.$disconnect();
