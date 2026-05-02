// ==========================================
// MOCK DATA STORE — Frontend Prototype Only
// ==========================================

// ---- TYPE DEFINITIONS ----

export type User = {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatarColor: string;
};

export type Milestone = {
  id: string;
  title: string;
  description: string;
  targetDay: number;
  status: "pending" | "in_progress" | "completed";
  assigneeId?: string;
  aiJustification?: string;
};

export type TaskStep = {
  id: string;
  description: string;
  expectedOutcome: string; // What should be produced/achieved
  category: "design" | "development" | "review" | "testing" | "deployment" | "documentation" | "research" | "integration";
  estimatedHours: number;
  actualHours?: number;
  status: "pending" | "in_progress" | "completed" | "blocked" | "skipped";
  completedAt?: string;
  assigneeId?: string; // Can be different from task assignee
  dependencies?: string[]; // IDs of steps this depends on
  reviewStatus?: "not_needed" | "pending_review" | "approved" | "changes_requested";
  reviewerId?: string;
  notes?: string; // Brief notes about progress
};

export type TaskUpdate = {
  id: string;
  userId: string;
  message: string;
  revisedEstimate?: number; // revised hours based on learnings
  createdAt: string;
};

export type OutcomeType = "information" | "decision" | "document" | "code" | "design" | "data";

export type TaskOutcome = {
  type: OutcomeType;
  expectedDeliverable: string; // what this task should produce
  status: "pending" | "submitted" | "verified" | "rejected";
  // For text outcomes (information/decision)
  textContent?: string;
  // For document outcomes
  documentTitle?: string;
  documentUrl?: string; // link or uploaded file path
  // For code outcomes
  codeRepoUrl?: string; // GitHub repo
  codePrUrl?: string; // Pull request link
  codeBranch?: string;
  // General
  links?: { label: string; url: string }[];
  submittedBy?: string; // userId
  submittedAt?: string;
  verifiedBy?: string; // userId who verified the outcome
  verifiedAt?: string;
  feedback?: string; // CEO or reviewer feedback on the outcome
};

export type DeliverableType = "code" | "document" | "ppt" | "text" | "meeting_notes" | "data";

export type ProjectCategory =
  | "engineering" | "data_science" | "design" | "sales"
  | "marketing" | "operations" | "hr" | "legal"
  | "strategy" | "research" | "product" | "finance" | "mixed";

export type ProjectOutcomeType =
  | "product" | "web_app" | "mobile_app" | "api_service"   // Engineering outputs
  | "ml_model" | "data_pipeline" | "analytics_report"       // DS outputs
  | "report" | "exploration" | "market_analysis"             // Research/strategy outputs
  | "presentation" | "strategy_document" | "process_document" // Document outputs
  | "campaign" | "brand_asset" | "content"                   // Marketing outputs
  | "ui_design" | "ux_research" | "design_system"            // Design outputs
  | "tool" | "automation" | "integration"                    // Ops/tool outputs
  | "policy" | "compliance_report"                           // Legal/HR outputs
  | "other";

export type FinalOutcome = {
  expectedType: ProjectOutcomeType;
  expectedDescription: string;
  status: "not_started" | "in_progress" | "draft_submitted" | "review" | "finalized" | "delivered";
  actualDeliverable?: {
    title: string;
    type: DeliverableType;
    description?: string;
    url?: string;
    submittedBy?: string;
    submittedAt?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    feedback?: string;
  };
  completionNotes?: string;
};

export type IntermediateSubmission = {
  id: string;
  title: string;
  type: DeliverableType;
  description: string;
  submittedBy: string;
  submittedAt: string;
  url?: string;
  status: "submitted" | "reviewed" | "approved" | "needs_revision";
  reviewedBy?: string;
  reviewedAt?: string;
  feedback?: string;
  isKeyMilestone: boolean;
};

export type Deliverable = {
  id: string;
  type: DeliverableType;
  title: string;
  description?: string;
  status: "pending" | "submitted" | "verified" | "rejected";
  // Code
  codeRepoUrl?: string;
  codePrUrl?: string;
  codeBranch?: string;
  // Document / PPT
  documentUrl?: string;
  fileType?: string;
  // Text
  textContent?: string;
  // Meeting Notes
  attendees?: string[];
  decisions?: string[];
  actionItems?: { task: string; assigneeId: string; dueDate: string }[];
  // General
  links?: { label: string; url: string }[];
  submittedBy?: string;
  submittedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  feedback?: string;
  createdAt: string;
};

export type TaskMilestone = {
  id: string;
  title: string;
  description: string;
  deliverableType: DeliverableType;
  successCriteria: string[];
  status: "pending" | "in_progress" | "completed" | "blocked";
  assigneeId?: string;
  targetDay?: number;
  outcome?: "met" | "partially_met" | "not_met" | "deferred";
  outcomeNotes?: string;
  deliverables: Deliverable[];
  updates: TaskUpdate[];
  completedAt?: string;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  approach: string; // HOW they plan to solve this
  aiGeneratedPlan?: {
    approach: string;
    steps: string[];
    generatedAt: string;
  };
  planRefinedBy?: string; // userId who refined the AI plan
  planRefinedAt?: string;
  planStatus: "ai_generated" | "being_refined" | "finalized";
  steps: TaskStep[]; // sub-steps with time estimates
  successCriteria: string[]; // what counts as done
  killCriteria: string[]; // when to abandon/redefine
  estimatedHours: number; // initial estimate
  revisedEstimateHours?: number; // updated after initial work
  status: "planning" | "in_progress" | "completed" | "blocked" | "killed" | "redefined";
  updates: TaskUpdate[]; // checkpoint progress updates
  priority: "low" | "medium" | "high";
  milestones: TaskMilestone[];
  deadlineExtensions: DeadlineExtension[];
  outcome?: TaskOutcome;
  createdAt: string;
  completedAt?: string;
  reviewStatus?: "pending_review" | "approved" | "changes_requested" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewFeedback?: string;
  phaseId?: string;
};

export type DelayReason = "personal" | "other_commitments" | "task_complexity" | "dependency_blocked" | "scope_change" | "technical_challenge";

export type DeadlineExtension = {
  id: string;
  projectId: string;
  milestoneId?: string; // optional — can be milestone or task level
  taskId?: string;
  requestedBy: string; // userId
  originalDeadline: string; // ISO date
  requestedDeadline: string; // ISO date
  reason: DelayReason;
  reasonDetail: string; // detailed explanation
  impact: string; // what this delay means for the project
  status: "pending" | "approved" | "rejected" | "auto_escalated";
  ceoComment?: string; // Rahul's response
  approvedBy?: string; // userId
  approvedAt?: string;
  escalationLevel: number; // 0 = first request, 1 = second delay, 2+ = escalated
  actionTaken?: "extended" | "reassigned" | "split_task" | "added_help" | "descoped";
  createdAt: string;
};

export type LeaveType = "planned" | "sick" | "personal" | "wfh" | "half_day";

export type LeaveImpact = {
  taskId: string;
  taskTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  projectId: string;
  projectTitle: string;
  originalDeadline: string; // the milestone/task target
  impactDays: number; // how many days this leave delays the task
  cascadeEffects: {
    affectedUserId: string;
    affectedTaskTitle: string;
    delayDays: number;
    reason: string; // e.g. "Blocked — waiting for design handoff"
  }[];
};

export type LeaveRequest = {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  coveragePlan?: string; // who covers, what's the plan
  contingencyNote?: string; // "will finish X before leaving" or "Y will handle"
  coverPersonId?: string; // who's covering
  impacts: LeaveImpact[]; // auto-calculated impact on tasks/projects
  createdAt: string;
};

export type TeamAvailability = {
  userId: string;
  date: string;
  status: "available" | "on_leave" | "wfh" | "half_day" | "public_holiday";
  leaveRequestId?: string;
};

export type Update = {
  id: string;
  projectId: string;
  userId: string;
  type: "status_update" | "document" | "code" | "architecture" | "notebook" | "demo" | "meeting_notes";
  title: string;
  description: string;
  link?: string;
  attachments?: string[];
  // For status updates
  whatWasDone?: string;
  blockers?: string;
  nextSteps?: string;
  // For meeting notes
  attendees?: string[];
  decisions?: string[];
  actionItems?: { task: string; assigneeId: string; dueDate: string }[];
  // Review
  reviewed: boolean;
  feedback?: Feedback[];
  createdAt: string;
};

export type Feedback = {
  id: string;
  fromUserId: string;
  text: string;
  isAi: boolean;
  actionItems?: string[];
  createdAt: string;
};

export type Checkpoint = {
  id: string;
  projectId: string;
  decision: "continue" | "kill" | "pivot";
  notes: string;
  aiInsights?: string;
  actionItems?: string[];
  createdAt: string;
};

export type AIInsight = {
  id: string;
  type: "risk" | "opportunity" | "blocker" | "performance" | "suggestion";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  actionItems?: string[];
  relatedProjectId?: string;
  relatedUserId?: string;
};

export type Discussion = {
  id: string;
  userId: string;
  message: string;
  type: "question" | "clarification" | "disagreement" | "resolution";
  createdAt: string;
};

export type PhaseAttachment = {
  id: string;
  title: string;
  type: "document" | "mom" | "feedback" | "proof" | "architecture" | "prototype";
  uploadedBy: string;
  url?: string;
  createdAt: string;
};

export type RequirementChange = {
  id: string;
  version: number;
  changedBy: string; // userId
  changeType: "initial" | "refinement" | "major_change" | "minor_change";
  impact: "none" | "design_only" | "plan_and_design" | "development_only";
  title: string;
  description: string; // what changed and why
  previousText?: string; // snapshot of what changed
  newText?: string; // the updated text
  discussionIds?: string[]; // linked discussions that led to this change
  approvedBy?: string[]; // userIds who approved
  createdAt: string;
};

export type RequirementDiscussion = {
  id: string;
  userId: string;
  message: string;
  type: "question" | "clarification" | "suggestion" | "feedback" | "approval" | "concern";
  linkedChangeId?: string; // links to a specific requirement change
  resolved: boolean;
  createdAt: string;
};

export type RequirementDocument = {
  currentVersion: number;
  lastUpdated: string;
  currentText: string; // the full current requirement text
  sections: {
    id: string;
    title: string;
    content: string;
    lastModifiedBy: string;
    lastModifiedAt: string;
  }[];
  changes: RequirementChange[];
  discussions: RequirementDiscussion[];
};

export type DocumentType =
  | "requirement" | "design" | "technical_roadmap" | "architecture"
  | "api_spec" | "meeting_notes" | "research" | "test_plan"
  | "deployment" | "user_guide" | "custom";

export type DocumentSection = {
  id: string;
  title: string;
  content: string;
  order: number;
  lastModifiedBy: string;
  lastModifiedAt: string;
  isCustom?: boolean;
};

export type DocumentChange = {
  id: string;
  version: number;
  changedBy: string;
  changeType: "initial" | "section_added" | "section_edited" | "section_removed" | "refinement" | "major_change" | "minor_change";
  impact: "none" | "design_only" | "plan_and_design" | "development_only" | "roadmap" | "all_documents";
  title: string;
  description: string;
  sectionId?: string;
  previousText?: string;
  newText?: string;
  linkedDocumentIds?: string[];
  approvedBy?: string[];
  createdAt: string;
};

export type DocumentDiscussion = {
  id: string;
  userId: string;
  message: string;
  type: "question" | "clarification" | "suggestion" | "feedback" | "approval" | "concern" | "action_item";
  sectionId?: string;
  linkedChangeId?: string;
  resolved: boolean;
  createdAt: string;
};

export type ProjectDocument = {
  id: string;
  type: DocumentType;
  title: string;
  description: string;
  currentVersion: number;
  status: "draft" | "in_review" | "approved" | "active" | "archived";
  createdBy: string;
  createdAt: string;
  lastUpdated: string;
  sections: DocumentSection[];
  changes: DocumentChange[];
  discussions: DocumentDiscussion[];
  linkedDocumentIds?: string[];
  tags?: string[];
};

export type Phase = {
  id: string;
  name: string;
  description: string;
  status: "pending" | "active" | "in_discussion" | "completed";
  checklist: { item: string; done: boolean }[];
  discussions: Discussion[];
  attachments: PhaseAttachment[];
  signedOffBy?: string[];
  signOffRequired: boolean;
  estimatedDuration: string;
  order: number;
  startDate?: string;   // ISO date string "2026-04-01"
  endDate?: string;      // ISO date string "2026-04-14"
};

export type EditChange = {
  id: string;
  section: "phase" | "task" | "document" | "requirement" | "outcome" | "checkpoint";
  sectionId: string;
  sectionTitle: string;
  changeDescription: string;
  changedBy: string;
  changedAt: string;
  impactAreas: { area: string; description: string; severity: "low" | "medium" | "high" }[];
  status: "pending_approval" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
};

export type Project = {
  id: string;
  title: string;
  type: "engineering" | "research" | "mixed" | "data_science" | "design" | "sales" | "marketing" | "operations" | "hr" | "legal" | "strategy" | "product" | "finance";
  category: ProjectCategory;
  requirement: string;
  objective?: string;
  outcomeType: ProjectOutcomeType;
  outcomeDescription: string;
  finalOutcome?: FinalOutcome;
  intermediateSubmissions: IntermediateSubmission[];
  status: "active" | "completed" | "killed" | "paused";
  priority: "low" | "medium" | "high" | "critical";
  currentPhase: string;
  timeboxDays: number;
  startDate: string;
  techStack: string[];
  assigneeIds: string[];
  ownerId: string; // primary project owner
  coOwnerIds?: string[]; // co-owners / joint owners
  tasks: Task[];
  phases: Phase[];
  updates: Update[];
  checkpoints: Checkpoint[];
  requirementDoc?: RequirementDocument;
  documents: ProjectDocument[];
  aiPlan?: {
    summary: string;
    risks: { risk: string; mitigation: string; severity: string }[];
    killCriteria: string[];
  };
  editHistory?: EditChange[];
};

// ---- MASTER LISTS: ROLES & DEPARTMENTS ----

export const ROLES: string[] = [
  "CEO",
  "CTO",
  "VP Engineering",
  "Engineering Manager",
  "Full-Stack Engineer",
  "Backend Engineer",
  "Frontend Engineer",
  "DevOps Engineer",
  "Senior Data Scientist",
  "Data Scientist",
  "ML Engineer",
  "Data Analyst",
  "Product Designer",
  "UX Researcher",
  "UI Designer",
  "Product Manager",
  "Project Manager",
  "Marketing Lead",
  "Content Strategist",
  "Strategy Analyst",
  "Business Analyst",
  "QA Engineer",
  "Security Engineer",
  "Solutions Architect",
  "Technical Writer",
  "HR Manager",
  "Finance Analyst",
  "Legal Counsel",
  "Operations Manager",
];

export const DEPARTMENTS: string[] = [
  "Leadership",
  "Engineering",
  "Data Science",
  "Design",
  "Product",
  "Marketing",
  "Strategy",
  "Operations",
  "HR",
  "Finance",
  "Legal",
  "Sales",
  "Research",
  "QA",
  "Security",
  "General",
];

export function addRole(role: string): boolean {
  if (ROLES.includes(role)) return false;
  ROLES.push(role);
  return true;
}

export function removeRole(role: string): boolean {
  const idx = ROLES.indexOf(role);
  if (idx === -1) return false;
  ROLES.splice(idx, 1);
  return true;
}

export function addDepartment(dept: string): boolean {
  if (DEPARTMENTS.includes(dept)) return false;
  DEPARTMENTS.push(dept);
  return true;
}

export function removeDepartment(dept: string): boolean {
  const idx = DEPARTMENTS.indexOf(dept);
  if (idx === -1) return false;
  DEPARTMENTS.splice(idx, 1);
  return true;
}

// ---- USERS ----
export const USERS: User[] = [
  { id: "u1", name: "Rahul", role: "CEO", department: "Leadership", email: "rahul@company.dev", avatarColor: "#3b82f6" },
  { id: "u2", name: "Priya", role: "Senior Data Scientist", department: "Data Science", email: "priya@company.dev", avatarColor: "#a855f7" },
  { id: "u3", name: "Arjun", role: "Full-Stack Engineer", department: "Engineering", email: "arjun@company.dev", avatarColor: "#10b981" },
  { id: "u4", name: "Meera", role: "ML Engineer", department: "Data Science", email: "meera@company.dev", avatarColor: "#f59e0b" },
  { id: "u5", name: "Vikram", role: "Backend Engineer", department: "Engineering", email: "vikram@company.dev", avatarColor: "#ef4444" },
  { id: "u6", name: "Sneha", role: "Product Designer", department: "Design", email: "sneha@company.dev", avatarColor: "#ec4899" },
  { id: "u7", name: "Karthik", role: "Marketing Lead", department: "Marketing", email: "karthik@company.dev", avatarColor: "#8b5cf6" },
  { id: "u8", name: "Ananya", role: "Strategy Analyst", department: "Strategy", email: "ananya@company.dev", avatarColor: "#06b6d4" },
];

export function getUser(id: string) {
  return USERS.find((u) => u.id === id);
}

// ---- PROJECTS ----
export const PROJECTS: Project[] = [
  // ========================================
  // P1: API Gateway & Rate Limiting Service
  // ========================================
  {
    id: "p1",
    title: "API Gateway & Rate Limiting Service",
    type: "engineering",
    category: "engineering",
    requirement:
      "Build a centralized API gateway that handles authentication, rate limiting, and request routing for all our microservices. Should support JWT validation, per-client rate limits, and circuit breaker patterns. Must handle 10k+ requests/second.",
    objective: "Build a high-performance centralized API gateway for all microservices with auth, rate limiting, and circuit breaker capabilities",
    outcomeType: "api_service",
    outcomeDescription: "Production-ready API gateway with rate limiting, auth, and circuit breaker",
    finalOutcome: {
      expectedType: "api_service",
      expectedDescription: "Deployed API gateway handling 10k+ req/s with sub-5ms routing overhead",
      status: "in_progress",
    },
    intermediateSubmissions: [
      { id: "is-1", title: "Architecture Design Document", type: "document", description: "System architecture with component diagrams and data flow", submittedBy: "u3", submittedAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: "approved", reviewedBy: "u1", reviewedAt: new Date(Date.now() - 6 * 86400000).toISOString(), feedback: "Solid architecture, approved tech stack choices", isKeyMilestone: true },
      { id: "is-2", title: "Routing Engine Benchmark Results", type: "data", description: "Performance benchmarks showing 15k req/s on single instance", submittedBy: "u5", submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: "approved", reviewedBy: "u1", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), isKeyMilestone: true },
      { id: "is-3", title: "Rate Limiter PR", type: "code", description: "Token bucket implementation with Redis backend", submittedBy: "u3", submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: "submitted", isKeyMilestone: false },
    ],
    status: "active",
    priority: "high",
    currentPhase: "Development",
    timeboxDays: 21,
    startDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    techStack: ["Go", "Redis", "Docker", "Kubernetes", "Prometheus", "gRPC"],
    assigneeIds: ["u3", "u5"],
    ownerId: "u3",
    coOwnerIds: ["u5"],
    tasks: [
      // ---- Task 1: Architecture & System Design (from old milestone m1) ----
      {
        id: "t1",
        title: "Architecture & System Design",
        description: "Complete system architecture, API contracts, data flow diagrams, and tech stack justification for the API gateway.",
        assigneeId: "u3",
        phaseId: "ph2",
        approach: "Research existing gateway patterns, benchmark Go stdlib vs NGINX, produce architecture doc with data flow diagrams and API contracts for team review.",
        planStatus: "finalized",
        steps: [
          { id: "ts1a", description: "Research gateway patterns and existing solutions", expectedOutcome: "Comparison document of gateway patterns (Envoy, Kong, custom) with pros/cons", category: "research", estimatedHours: 4, actualHours: 3.5, status: "completed", completedAt: new Date(Date.now() - 7 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u5" },
          { id: "ts1b", description: "Draft system architecture document", expectedOutcome: "Architecture doc with component diagrams, data flow, and technology decisions", category: "design", estimatedHours: 6, actualHours: 7, status: "completed", completedAt: new Date(Date.now() - 6.5 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u1", notes: "Added extra section on caching strategy" },
          { id: "ts1c", description: "Define API contracts and data flow diagrams", expectedOutcome: "OpenAPI specs for all gateway endpoints with request/response schemas", category: "design", estimatedHours: 4, actualHours: 4, status: "completed", completedAt: new Date(Date.now() - 6 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u5" },
          { id: "ts1d", description: "Peer review and finalize architecture", expectedOutcome: "Signed-off architecture document with all feedback addressed", category: "review", estimatedHours: 2, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u1", notes: "Vikram raised NGINX concern, resolved in favor of Go" },
        ],
        successCriteria: [
          "Architecture document approved by team",
          "API contracts defined for all endpoints",
          "Tech stack justified with benchmarks",
        ],
        killCriteria: [],
        estimatedHours: 16,
        status: "completed",
        updates: [
          {
            id: "tu1a",
            userId: "u3",
            message: "Architecture doc v1 complete. Go stdlib benchmark shows 15k req/s on single instance — validates our approach over NGINX.",
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        priority: "high",
        milestones: [
          {
            id: "dm1",
            title: "Architecture Document Complete",
            description: "Full system architecture with component interactions, deployment topology, and tech stack justification",
            deliverableType: "document",
            successCriteria: ["Architecture diagram covers all components", "Peer reviewed by team", "CEO sign-off received"],
            status: "completed",
            assigneeId: "u3",
            targetDay: 4,
            outcome: "met",
            outcomeNotes: "Architecture approved after team review. Go-based approach validated with benchmarks.",
            deliverables: [
              {
                id: "d1",
                type: "document",
                title: "System Architecture v1",
                description: "Complete architecture covering request flow, component interactions, deployment topology. Includes JWT validation flow, token bucket rate limiter design, and circuit breaker state machine.",
                status: "verified",
                documentUrl: "https://docs.google.com/document/d/arch-v1",
                submittedBy: "u3",
                submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
                feedback: "Solid architecture. Token bucket approach for rate limiting is the right call.",
                createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: "dm2",
            title: "API Contract Finalized",
            description: "API contracts defined for all gateway endpoints with request/response schemas",
            deliverableType: "document",
            successCriteria: ["All endpoints documented", "Request/response schemas defined", "Versioning strategy documented"],
            status: "completed",
            assigneeId: "u3",
            targetDay: 4,
            outcome: "met",
            deliverables: [
              {
                id: "d2",
                type: "document",
                title: "API Contracts",
                description: "Complete API contract specification for all gateway endpoints including auth, routing, rate limiting, and health check endpoints.",
                status: "verified",
                documentUrl: "https://docs.company.dev/api/gateway-contracts-v1",
                submittedBy: "u3",
                submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
                feedback: "Contracts look comprehensive. Good versioning approach.",
                createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        outcome: {
          type: "document",
          expectedDeliverable: "System architecture document and API contracts for the API gateway",
          status: "verified",
          documentTitle: "API Gateway Architecture Document v1",
          documentUrl: "https://docs.google.com/document/d/arch-v1",
          submittedBy: "u3",
          submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          verifiedBy: "u1",
          verifiedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
          feedback: "Solid architecture. Approved — proceed to implementation.",
        },
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
      },
      // ---- Task 2: Request Routing Engine (old task t1) ----
      {
        id: "t2",
        title: "Implement request routing engine",
        description: "Build the core HTTP request routing engine for the API gateway with support for parameterized routes and middleware chains.",
        assigneeId: "u5",
        phaseId: "ph4",
        approach: "Build a trie-based path matcher with support for parameterized routes. Use Go's net/http as the base. Implement middleware chain pattern for extensibility.",
        planStatus: "finalized",
        aiGeneratedPlan: {
          approach: "Implement a radix tree based router with support for path parameters, wildcards, and method-based routing. Use middleware chain pattern.",
          steps: ["Research existing Go router implementations (chi, gorilla/mux)", "Design radix tree data structure for path matching", "Implement basic route registration and matching", "Add parameterized route support (:id, *wildcard)", "Build middleware chain with before/after hooks", "Add route grouping and prefix support", "Write benchmarks comparing with net/http"],
          generatedAt: "2026-03-10T09:00:00Z",
        },
        planRefinedBy: "u5",
        planRefinedAt: "2026-03-10T14:30:00Z",
        steps: [
          { id: "ts1", description: "Design router interface and middleware chain", expectedOutcome: "Router interface definition with middleware chain pattern and extension points", category: "design", estimatedHours: 4, actualHours: 3.5, status: "completed", completedAt: new Date(Date.now() - 6 * 86400000).toISOString(), assigneeId: "u5", reviewStatus: "approved", reviewerId: "u3" },
          { id: "ts2", description: "Implement trie-based path matcher", expectedOutcome: "Working trie-based path matching engine with O(n) lookup complexity", category: "development", estimatedHours: 6, actualHours: 5, status: "completed", completedAt: new Date(Date.now() - 5 * 86400000).toISOString(), assigneeId: "u5", reviewStatus: "approved", reviewerId: "u3", notes: "Cleaner than expected, radix tree approach simplified edge cases" },
          { id: "ts3", description: "Add parameterized route support", expectedOutcome: "Support for :id params, *wildcard, and regex constraints in routes", category: "development", estimatedHours: 3, actualHours: 3, status: "completed", completedAt: new Date(Date.now() - 4.5 * 86400000).toISOString(), assigneeId: "u5", dependencies: ["ts2"], reviewStatus: "approved", reviewerId: "u3" },
          { id: "ts4", description: "Write unit tests for all route patterns", expectedOutcome: "100% test coverage for path matcher with edge case tests", category: "testing", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 4 * 86400000).toISOString(), assigneeId: "u5", dependencies: ["ts2", "ts3"], reviewStatus: "approved", reviewerId: "u3" },
        ],
        successCriteria: [
          "All route patterns match correctly",
          "Benchmark >15k req/s for routing alone",
          "100% unit test coverage for matcher",
        ],
        killCriteria: ["Cannot achieve 5k req/s after optimization"],
        estimatedHours: 16,
        revisedEstimateHours: 14,
        status: "completed",
        updates: [
          {
            id: "tu1",
            userId: "u5",
            message: "Initial implementation done. Trie matcher is cleaner than expected — reduced estimate from 16h to 14h",
            revisedEstimate: 14,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "tu2",
            userId: "u5",
            message: "Benchmark: 18k req/s raw routing. Exceeds target.",
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
        ],
        priority: "high",
        milestones: [
          {
            id: "dm3",
            title: "Router Implementation",
            description: "Core trie-based routing engine with parameterized routes and middleware chain support",
            deliverableType: "code",
            successCriteria: ["All route patterns match correctly", "Middleware chain works", "Unit tests pass"],
            status: "completed",
            assigneeId: "u5",
            targetDay: 10,
            outcome: "met",
            outcomeNotes: "Trie-based matcher implemented cleanly. All route patterns working.",
            deliverables: [
              {
                id: "d3",
                type: "code",
                title: "Routing Engine PR",
                description: "Core HTTP request routing engine with trie-based path matcher, parameterized routes, and middleware chain pattern.",
                status: "verified",
                codeRepoUrl: "https://github.com/company/api-gateway",
                codePrUrl: "https://github.com/company/api-gateway/pull/42",
                codeBranch: "feature/routing-engine",
                links: [
                  { label: "Architecture Decision Record", url: "https://docs.company.dev/adr/routing-engine" },
                ],
                submittedBy: "u5",
                submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
                feedback: "Clean implementation. Approved.",
                createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "dm4",
            title: "Benchmark Passing",
            description: "Routing engine benchmark exceeds 15k req/s target",
            deliverableType: "text",
            successCriteria: ["Benchmark >15k req/s for routing alone", "Results documented and reproducible"],
            status: "completed",
            assigneeId: "u5",
            targetDay: 10,
            outcome: "met",
            outcomeNotes: "18k req/s achieved — exceeds 15k target by 20%.",
            deliverables: [
              {
                id: "d4",
                type: "text",
                title: "Benchmark Results",
                description: "Performance benchmark results for the routing engine",
                status: "verified",
                textContent: "18k req/s raw routing. Exceeds 15k target. Tested on standard k8s pod (2 vCPU, 4GB RAM). P99 latency: 12ms.",
                links: [
                  { label: "Benchmark Results", url: "https://docs.company.dev/benchmarks/routing-v1" },
                ],
                submittedBy: "u5",
                submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
                feedback: "Benchmark exceeds target at 18k req/s. Excellent.",
                createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [
          {
            id: "de1",
            projectId: "p1",
            taskId: "t2",
            requestedBy: "u5",
            originalDeadline: new Date(Date.now() - 8 * 86400000).toISOString(),
            requestedDeadline: new Date(Date.now() - 5 * 86400000).toISOString(),
            reason: "task_complexity",
            reasonDetail: "The trie-based path matcher required more edge case handling than initially estimated. Parameterized routes with wildcards and regex constraints added complexity.",
            impact: "Core routing delayed by 3 days. Auth middleware can start in parallel to minimize downstream impact.",
            status: "approved",
            ceoComment: "Understood. Quality is important for the routing foundation. Approved, but let's ensure auth work starts immediately in parallel.",
            approvedBy: "u1",
            approvedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
            escalationLevel: 0,
            actionTaken: "extended",
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
        ],
        outcome: {
          type: "code",
          expectedDeliverable: "Working routing engine with trie-based path matcher, parameterized route support, and middleware chain",
          status: "verified",
          codeRepoUrl: "https://github.com/company/api-gateway",
          codePrUrl: "https://github.com/company/api-gateway/pull/42",
          codeBranch: "feature/routing-engine",
          links: [
            { label: "Architecture Decision Record", url: "https://docs.company.dev/adr/routing-engine" },
            { label: "Benchmark Results", url: "https://docs.company.dev/benchmarks/routing-v1" },
          ],
          submittedBy: "u5",
          submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          verifiedBy: "u1",
          verifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          feedback: "Clean implementation. Benchmark exceeds target at 18k req/s. Approved.",
        },
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      // ---- Task 3: JWT Authentication Middleware (old task t2) ----
      {
        id: "t3",
        title: "JWT Authentication Middleware",
        description: "Implement JWT validation middleware supporting RS256 tokens with key caching and multiple auth sources.",
        assigneeId: "u5",
        phaseId: "ph4",
        approach: "Implement RS256 JWT validation using Go's crypto package. Cache public keys with 5-min TTL. Support both Authorization header and cookie-based tokens.",
        planStatus: "finalized",
        aiGeneratedPlan: {
          approach: "Implement JWT validation middleware supporting RS256 and HS256 algorithms. Use JWKS endpoint for key rotation.",
          steps: ["Set up JWT parsing with crypto/rsa", "Implement JWKS endpoint fetcher with caching", "Build validation middleware for HTTP handlers", "Add role-based access control claims", "Implement token refresh flow", "Write security test suite"],
          generatedAt: "2026-03-14T09:00:00Z",
        },
        planRefinedBy: "u5",
        planRefinedAt: "2026-03-14T11:00:00Z",
        steps: [
          { id: "ts5", description: "Implement RS256 token parser", expectedOutcome: "JWT parser supporting RS256 with proper signature verification", category: "development", estimatedHours: 4, actualHours: 4, status: "completed", completedAt: new Date(Date.now() - 4 * 86400000).toISOString(), assigneeId: "u5", reviewStatus: "approved", reviewerId: "u3" },
          { id: "ts6", description: "Add key caching with TTL", expectedOutcome: "JWKS key cache with 5-min TTL reducing auth latency by >50%", category: "development", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 3.5 * 86400000).toISOString(), assigneeId: "u5", dependencies: ["ts5"], reviewStatus: "approved", reviewerId: "u3", notes: "Cache hit rate in testing: 97%" },
          { id: "ts7", description: "Support cookie + header auth", expectedOutcome: "Dual auth source support: Authorization header and secure cookies", category: "development", estimatedHours: 2, actualHours: 1.5, status: "completed", completedAt: new Date(Date.now() - 3 * 86400000).toISOString(), assigneeId: "u5", dependencies: ["ts5"], reviewStatus: "approved", reviewerId: "u3" },
          { id: "ts8", description: "Integration tests with routing", expectedOutcome: "End-to-end tests covering auth + routing flows for all token scenarios", category: "testing", estimatedHours: 3, actualHours: 3, status: "completed", completedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(), assigneeId: "u5", dependencies: ["ts5", "ts6", "ts7"], reviewStatus: "approved", reviewerId: "u1", notes: "Covered expired, malformed, missing, and revoked token cases" },
        ],
        successCriteria: [
          "Validates RS256 tokens correctly",
          "Key cache reduces latency by >50%",
          "Handles expired/malformed tokens gracefully",
        ],
        killCriteria: [],
        estimatedHours: 12,
        status: "completed",
        updates: [],
        priority: "high",
        milestones: [
          {
            id: "dm5",
            title: "Auth Module Complete",
            description: "JWT validation middleware with RS256 support, key caching, and multiple auth source handling",
            deliverableType: "code",
            successCriteria: ["Validates RS256 tokens correctly", "Key cache reduces latency by >50%", "Handles expired/malformed tokens gracefully"],
            status: "completed",
            assigneeId: "u5",
            targetDay: 10,
            outcome: "met",
            outcomeNotes: "JWT middleware implemented with full RS256 support, key caching, and cookie+header auth.",
            deliverables: [
              {
                id: "d5",
                type: "code",
                title: "JWT Middleware PR",
                description: "JWT validation middleware with token parsing, signature verification, role-based claims extraction, and refresh token handling.",
                status: "verified",
                codeRepoUrl: "https://github.com/company/api-gateway",
                codePrUrl: "https://github.com/company/api-gateway/pull/47",
                codeBranch: "feature/jwt-middleware",
                links: [
                  { label: "Security Review Notes", url: "https://docs.company.dev/security/jwt-review" },
                ],
                submittedBy: "u5",
                submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
                feedback: "Good coverage of edge cases. Token refresh flow looks solid.",
                createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        outcome: {
          type: "code",
          expectedDeliverable: "JWT validation middleware with token parsing, signature verification, role-based claims extraction, and refresh token handling",
          status: "verified",
          codeRepoUrl: "https://github.com/company/api-gateway",
          codePrUrl: "https://github.com/company/api-gateway/pull/47",
          codeBranch: "feature/jwt-middleware",
          links: [
            { label: "Security Review Notes", url: "https://docs.company.dev/security/jwt-review" },
          ],
          submittedBy: "u5",
          submittedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          verifiedBy: "u1",
          verifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          feedback: "Good coverage of edge cases. Token refresh flow looks solid.",
        },
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(),
      },
      // ---- Task 4: Token Bucket Rate Limiter (old task t3) ----
      {
        id: "t4",
        title: "Token bucket rate limiter with Redis",
        description: "Build a distributed token bucket rate limiter backed by Redis with in-memory fallback for high availability.",
        assigneeId: "u3",
        phaseId: "ph4",
        approach: "Use Redis EVALSHA with Lua script for atomic token bucket operations. Implement sliding window counters for per-client limits. Build in-memory fallback when Redis is unavailable.",
        planStatus: "finalized",
        aiGeneratedPlan: {
          approach: "Build rate limiter using token bucket algorithm with Redis backend. Support per-client and per-endpoint limits.",
          steps: ["Research rate limiting algorithms (token bucket vs leaky bucket vs sliding window)", "Design Redis schema for rate limit counters", "Implement token bucket in Redis with Lua scripts", "Add per-client identification (API key, IP)", "Build middleware integration", "Add fallback for Redis unavailability", "Load test with vegeta"],
          generatedAt: "2026-03-18T09:00:00Z",
        },
        planRefinedBy: "u3",
        planRefinedAt: "2026-03-18T16:00:00Z",
        steps: [
          { id: "ts9", description: "Design Lua script for atomic operations", expectedOutcome: "Redis Lua script for atomic token bucket increment/decrement with TTL", category: "design", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 2 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u5", notes: "Lua script handles race conditions cleanly" },
          { id: "ts10", description: "Implement Redis rate limiter", expectedOutcome: "Working token bucket rate limiter with Redis backend and sliding window counters", category: "development", estimatedHours: 6, status: "in_progress", assigneeId: "u3", dependencies: ["ts9"], reviewStatus: "pending_review", reviewerId: "u5", notes: "Redis latency ~3ms, within acceptable range" },
          { id: "ts11", description: "Build in-memory fallback", expectedOutcome: "In-memory rate limiter that activates within 1s of Redis failure", category: "development", estimatedHours: 4, status: "pending", assigneeId: "u3", dependencies: ["ts10"] },
          { id: "ts12", description: "Per-client config management", expectedOutcome: "YAML-based per-client rate limit configuration with hot-reload support", category: "development", estimatedHours: 3, status: "pending", assigneeId: "u3", dependencies: ["ts10"] },
          { id: "ts13", description: "Integration tests", expectedOutcome: "Test suite covering concurrent load, Redis failover, and per-client limit enforcement", category: "testing", estimatedHours: 4, status: "pending", assigneeId: "u3", dependencies: ["ts10", "ts11", "ts12"] },
        ],
        successCriteria: [
          "Correct rate limiting under concurrent load",
          "Fallback activates within 1s of Redis failure",
          "Per-client limits configurable via YAML",
        ],
        killCriteria: [
          "Redis latency adds >20ms to p99",
          "Lua script approach proves unreliable under load",
        ],
        estimatedHours: 20,
        status: "in_progress",
        updates: [
          {
            id: "tu3",
            userId: "u3",
            message: "Lua script approach working well in dev. Redis latency adding ~3ms which is acceptable.",
            createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
          },
          {
            id: "tu4",
            userId: "u3",
            message: "Hit a snag with Redis Sentinel — need staging access from DevOps. Using local Docker for now.",
            createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(),
          },
        ],
        priority: "high",
        milestones: [
          {
            id: "dm6",
            title: "Redis Integration",
            description: "Token bucket rate limiter with Redis backend and Lua scripts for atomic operations",
            deliverableType: "code",
            successCriteria: ["Correct rate limiting under concurrent load", "Redis latency <20ms at p99", "Lua script atomic operations working"],
            status: "in_progress",
            assigneeId: "u3",
            targetDay: 16,
            deliverables: [
              {
                id: "d6",
                type: "code",
                title: "Rate Limiter PR",
                description: "Token bucket rate limiter with Redis backend, Lua script for atomic operations, and per-client config.",
                status: "submitted",
                codeRepoUrl: "https://github.com/company/api-gateway",
                codePrUrl: "https://github.com/company/api-gateway/pull/15",
                codeBranch: "feature/rate-limiter",
                submittedBy: "u3",
                submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
                createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
              },
            ],
            updates: [
              {
                id: "dmu1",
                userId: "u3",
                message: "Lua script approach working well. Redis latency ~3ms which is acceptable.",
                createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
              },
            ],
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            id: "dm7",
            title: "Load Test Report",
            description: "Load testing results showing rate limiter performance under concurrent load with vegeta",
            deliverableType: "document",
            successCriteria: ["Load test covers 10k+ concurrent requests", "Fallback behavior validated", "Results documented"],
            status: "pending",
            assigneeId: "u3",
            targetDay: 16,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [
          {
            id: "de2",
            projectId: "p1",
            taskId: "t4",
            requestedBy: "u3",
            originalDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
            requestedDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
            reason: "dependency_blocked",
            reasonDetail: "Redis cluster setup is taking longer than expected. DevOps team is still configuring the staging environment. Cannot proceed with rate limiter integration tests.",
            impact: "Rate limiter testing blocked. Can continue with unit tests and circuit breaker design in parallel.",
            status: "pending",
            escalationLevel: 0,
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        ],
        outcome: {
          type: "code",
          expectedDeliverable: "Token bucket rate limiter with Redis backend, configurable limits per API key/IP, and sliding window support",
          status: "pending",
          codeRepoUrl: "https://github.com/company/api-gateway",
          codeBranch: "feature/rate-limiter",
        },
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      // ---- Task 5: Circuit Breaker Implementation (old task t4) ----
      {
        id: "t5",
        title: "Circuit breaker implementation",
        description: "Implement a distributed circuit breaker with configurable thresholds and Redis-backed state synchronization.",
        assigneeId: "u3",
        phaseId: "ph5",
        approach: "State machine pattern: closed \u2192 open \u2192 half-open. Use per-service breaker instances. Configurable thresholds: 5 failures in 30s \u2192 open, 60s cooldown \u2192 half-open. Store state in Redis for distributed consistency.",
        planStatus: "being_refined",
        aiGeneratedPlan: {
          approach: "Implement circuit breaker pattern with three states: closed, open, half-open. Use exponential backoff for retry. Store state in-memory with optional Redis sync.",
          steps: ["Study circuit breaker patterns (Netflix Hystrix, resilience4j)", "Design state machine with configurable thresholds", "Implement per-service breaker instances", "Add health check probing in half-open state", "Build dashboard metrics endpoint", "Integrate with existing HTTP client", "Write chaos engineering tests"],
          generatedAt: "2026-03-25T09:00:00Z",
        },
        planRefinedBy: "u3",
        planRefinedAt: "2026-03-26T10:00:00Z",
        steps: [
          { id: "ts14", description: "Implement state machine", expectedOutcome: "Circuit breaker state machine (closed/open/half-open) with configurable thresholds", category: "development", estimatedHours: 4, status: "pending", assigneeId: "u3" },
          { id: "ts15", description: "Per-service breaker registry", expectedOutcome: "Registry managing independent breaker instances per upstream service", category: "development", estimatedHours: 3, status: "pending", assigneeId: "u3", dependencies: ["ts14"] },
          { id: "ts16", description: "Redis state sync", expectedOutcome: "Distributed breaker state synchronized across gateway instances via Redis", category: "integration", estimatedHours: 4, status: "pending", assigneeId: "u3", dependencies: ["ts14", "ts15"] },
          { id: "ts17", description: "Health check probing in half-open", expectedOutcome: "Automated health probes sent during half-open state to determine recovery", category: "development", estimatedHours: 2, status: "pending", assigneeId: "u3", dependencies: ["ts14"] },
          { id: "ts18", description: "Integration tests + chaos testing", expectedOutcome: "Chaos test suite validating breaker behavior under service failures and network partitions", category: "testing", estimatedHours: 5, status: "pending", assigneeId: "u3", dependencies: ["ts14", "ts15", "ts16", "ts17"] },
        ],
        successCriteria: [
          "Breaker opens correctly on threshold",
          "Half-open probing works",
          "State consistent across gateway instances",
        ],
        killCriteria: [
          "Distributed state sync adds >10ms latency",
          "Cannot maintain consistency across 3+ instances",
        ],
        estimatedHours: 18,
        status: "planning",
        updates: [],
        priority: "medium",
        milestones: [
          {
            id: "dm8",
            title: "State Machine Design",
            description: "Circuit breaker state machine design document with threshold configuration and fallback strategy",
            deliverableType: "document",
            successCriteria: ["State machine diagram complete", "Threshold configuration documented", "Fallback strategy defined"],
            status: "pending",
            assigneeId: "u3",
            targetDay: 16,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: "dm9",
            title: "Implementation & Tests",
            description: "Circuit breaker implementation with Redis state sync and chaos engineering tests",
            deliverableType: "code",
            successCriteria: ["Breaker opens correctly on threshold", "Half-open probing works", "Chaos tests pass"],
            status: "pending",
            assigneeId: "u3",
            targetDay: 16,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [
          {
            id: "de3",
            projectId: "p1",
            taskId: "t5",
            requestedBy: "u3",
            originalDeadline: new Date(Date.now() - 2 * 86400000).toISOString(),
            requestedDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
            reason: "other_commitments",
            reasonDetail: "Had to support production incident on the payment service for 2 days. Lost critical development time on circuit breaker implementation.",
            impact: "Circuit breaker implementation delayed. This is the second delay request for this task area.",
            status: "pending",
            escalationLevel: 1,
            createdAt: new Date(Date.now()).toISOString(),
          },
        ],
        outcome: {
          type: "document",
          expectedDeliverable: "Circuit breaker design document with state machine diagram, threshold configuration, and fallback strategy",
          status: "pending",
        },
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      // ---- Task 6: Production Deployment & Monitoring (from old milestone m4) ----
      {
        id: "t6",
        title: "Production Deployment & Monitoring",
        description: "Deploy to staging, load test, set up Prometheus dashboards, document runbooks. Production rollout with rollback plan.",
        assigneeId: "u5",
        phaseId: "ph6",
        approach: "Staged rollout: deploy to staging first, run load tests with k6, set up Prometheus + Grafana dashboards for all key metrics, write runbooks, then production rollout with canary deployment.",
        planStatus: "ai_generated",
        aiGeneratedPlan: {
          approach: "Deploy to staging, validate with load tests, set up monitoring, then staged production rollout.",
          steps: ["Deploy to staging environment", "Run k6 load tests against staging", "Set up Prometheus metrics and Grafana dashboards", "Write operational runbooks", "Canary production deployment", "Full production rollout with monitoring"],
          generatedAt: "2026-03-28T09:00:00Z",
        },
        steps: [
          { id: "ts19a", description: "Deploy to staging environment", expectedOutcome: "Gateway service running on staging k8s cluster with all components integrated", category: "deployment", estimatedHours: 3, status: "pending", assigneeId: "u5" },
          { id: "ts19b", description: "Run k6 load tests", expectedOutcome: "Load test report confirming 10k+ req/s with latency percentiles documented", category: "testing", estimatedHours: 4, status: "pending", assigneeId: "u5", dependencies: ["ts19a"] },
          { id: "ts19c", description: "Set up Prometheus + Grafana dashboards", expectedOutcome: "Monitoring dashboards for throughput, latency, error rates, and circuit breaker state", category: "integration", estimatedHours: 6, status: "pending", assigneeId: "u5", dependencies: ["ts19a"] },
          { id: "ts19d", description: "Write operational runbooks", expectedOutcome: "Runbook covering incident response, scaling procedures, and rollback steps", category: "documentation", estimatedHours: 3, status: "pending", assigneeId: "u5", dependencies: ["ts19a", "ts19c"] },
          { id: "ts19e", description: "Canary production deployment", expectedOutcome: "Zero-downtime production rollout with canary validation and rollback capability", category: "deployment", estimatedHours: 4, status: "pending", assigneeId: "u5", dependencies: ["ts19a", "ts19b", "ts19c", "ts19d"] },
        ],
        successCriteria: [
          "Staging deployment passes all load tests",
          "Monitoring dashboards showing all key metrics",
          "Runbooks documented and reviewed",
          "Production rollout with zero downtime",
        ],
        killCriteria: [],
        estimatedHours: 20,
        status: "planning",
        updates: [],
        priority: "high",
        milestones: [
          {
            id: "dm10",
            title: "Staging Deploy",
            description: "Successful staging deployment with passing load tests",
            deliverableType: "text",
            successCriteria: ["Staging deployment successful", "Load test results meet 10k req/s target", "No critical issues found"],
            status: "pending",
            assigneeId: "u5",
            targetDay: 21,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
          {
            id: "dm11",
            title: "Monitoring Dashboards",
            description: "Prometheus + Grafana dashboards for request throughput, latency, error rates, and circuit breaker state",
            deliverableType: "document",
            successCriteria: ["Dashboard covers throughput, latency percentiles, error rates", "Circuit breaker state visible", "Alerting rules configured"],
            status: "pending",
            assigneeId: "u5",
            targetDay: 21,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
    phases: [
      // Phase 1: Requirement Understanding
      {
        id: "ph1",
        name: "Requirement Understanding",
        description: "Align the team on what the API gateway needs to do, performance targets, and integration points.",
        status: "completed",
        order: 0,
        estimatedDuration: "2-3 days",
        startDate: "2026-03-15",
        endDate: "2026-03-17",
        signOffRequired: true,
        signedOffBy: ["u1", "u3", "u5"],
        checklist: [
          { item: "Problem statement defined", done: true },
          { item: "Success criteria documented", done: true },
          { item: "Performance targets set (10k req/s)", done: true },
          { item: "Integration points with existing services mapped", done: true },
          { item: "Non-functional requirements listed", done: true },
        ],
        discussions: [
          {
            id: "d1",
            userId: "u3",
            message: "Should the gateway handle WebSocket upgrades or just HTTP/REST? Some of our internal services use WebSockets for real-time data.",
            type: "question",
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: "d2",
            userId: "u1",
            message: "Good question. For v1, HTTP/REST only. We can add WebSocket support in v2 if there's demand. Let's not scope-creep this.",
            type: "clarification",
            createdAt: new Date(Date.now() - 8 * 86400000 + 3600000).toISOString(),
          },
          {
            id: "d3",
            userId: "u5",
            message: "What about gRPC? The billing service already speaks gRPC. Do we need a translation layer?",
            type: "question",
            createdAt: new Date(Date.now() - 7.5 * 86400000).toISOString(),
          },
          {
            id: "d4",
            userId: "u1",
            message: "Skip gRPC in v1 as well. The billing service can keep its direct gRPC endpoint for now. Focus on the REST microservices first — that covers 90% of our traffic.",
            type: "clarification",
            createdAt: new Date(Date.now() - 7.5 * 86400000 + 1800000).toISOString(),
          },
          {
            id: "d5",
            userId: "u3",
            message: "Understood. V1 scope locked to HTTP/REST with JWT auth, rate limiting, and circuit breaker. Performance target 10k req/s.",
            type: "resolution",
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att1",
            title: "API Gateway Requirements Document v1.0",
            type: "document",
            uploadedBy: "u3",
            url: "https://docs.google.com/document/d/api-gw-reqs-v1",
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "att2",
            title: "Requirements Kickoff MOM - Mar 24",
            type: "mom",
            uploadedBy: "u1",
            url: "https://docs.google.com/document/d/api-gw-mom-1",
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 2: Design Understanding & Design Freeze
      {
        id: "ph2",
        name: "Design Understanding & Design Freeze",
        description: "Finalize system architecture, API contracts, data flow diagrams, and tech stack decisions.",
        status: "completed",
        order: 1,
        estimatedDuration: "3-4 days",
        startDate: "2026-03-18",
        endDate: "2026-03-21",
        signOffRequired: true,
        signedOffBy: ["u1", "u3", "u5"],
        checklist: [
          { item: "Architecture diagram provided", done: true },
          { item: "Tech stack justified", done: true },
          { item: "API contracts defined", done: true },
          { item: "Data flow diagrams complete", done: true },
          { item: "Failover and HA strategy documented", done: true },
        ],
        discussions: [
          {
            id: "d6",
            userId: "u5",
            message: "I think we should use NGINX as the base for routing instead of building from scratch in Go. It's battle-tested for this use case.",
            type: "disagreement",
            createdAt: new Date(Date.now() - 6.5 * 86400000).toISOString(),
          },
          {
            id: "d7",
            userId: "u3",
            message: "I disagree. NGINX config gets complex fast with our custom auth logic. A Go-based gateway gives us full control and the benchmarks I ran show we can hit 15k req/s with the stdlib HTTP server.",
            type: "disagreement",
            createdAt: new Date(Date.now() - 6.5 * 86400000 + 3600000).toISOString(),
          },
          {
            id: "d8",
            userId: "u1",
            message: "Let's go with the Go approach. Arjun's benchmarks are convincing and we need tight integration with our JWT infra. NGINX would require Lua plugins which adds ops complexity. Final call: custom Go gateway.",
            type: "resolution",
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att3",
            title: "API Gateway Architecture Document v1",
            type: "architecture",
            uploadedBy: "u3",
            url: "https://docs.google.com/document/d/arch-v1",
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
          {
            id: "att4",
            title: "Design Review MOM - Mar 26",
            type: "mom",
            uploadedBy: "u1",
            url: "https://docs.google.com/document/d/api-gw-design-mom",
            createdAt: new Date(Date.now() - 5.5 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 3: Prototype/PoC Build
      {
        id: "ph3",
        name: "Prototype/PoC Build",
        description: "Build a minimal proof-of-concept to validate routing performance and JWT auth flow.",
        status: "completed",
        order: 2,
        estimatedDuration: "3 days",
        startDate: "2026-03-22",
        endDate: "2026-03-24",
        signOffRequired: false,
        signedOffBy: ["u1"],
        checklist: [
          { item: "Basic request routing working", done: true },
          { item: "JWT validation flow verified", done: true },
          { item: "Benchmark results shared (>10k req/s)", done: true },
          { item: "PoC demo to team", done: true },
        ],
        discussions: [
          {
            id: "d9",
            userId: "u5",
            message: "The PoC benchmark shows 15.2k req/s on a single instance. That gives us plenty of headroom.",
            type: "clarification",
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att5",
            title: "PoC Benchmark Results - Routing Performance",
            type: "proof",
            uploadedBy: "u5",
            url: "https://github.com/company/api-gateway/wiki/poc-benchmark",
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 4: Development
      {
        id: "ph4",
        name: "Development",
        description: "Full implementation of routing, auth, rate limiting, and circuit breaker.",
        status: "active",
        order: 3,
        estimatedDuration: "1 week",
        startDate: "2026-03-25",
        endDate: "2026-03-31",
        signOffRequired: false,
        checklist: [
          { item: "Core routing implemented", done: true },
          { item: "JWT auth middleware done", done: true },
          { item: "Rate limiter implemented", done: false },
          { item: "Circuit breaker done", done: false },
          { item: "Integration tests passing", done: false },
        ],
        discussions: [
          {
            id: "d10",
            userId: "u5",
            message: "Blocked on Redis Sentinel setup for staging. DevOps hasn't provisioned the cluster yet. This is holding up the rate limiter integration tests.",
            type: "question",
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
          {
            id: "d11",
            userId: "u1",
            message: "I'll escalate with DevOps today. In the meantime, use a local Docker Redis Sentinel setup so you're not blocked on development.",
            type: "resolution",
            createdAt: new Date(Date.now() - 0.8 * 86400000).toISOString(),
          },
          {
            id: "d12",
            userId: "u3",
            message: "Should we use a sliding window or fixed window for rate limiting? Sliding window is more accurate but adds Redis complexity.",
            type: "question",
            createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(),
          },
        ],
        attachments: [],
      },
      // Phase 5: Testing & Review
      {
        id: "ph5",
        name: "Testing & Review",
        description: "Code review, load testing, security review, and performance validation.",
        status: "pending",
        order: 4,
        estimatedDuration: "3 days",
        startDate: "2026-04-01",
        endDate: "2026-04-03",
        signOffRequired: true,
        checklist: [
          { item: "Code review complete", done: false },
          { item: "Load test results shared", done: false },
          { item: "Security review done", done: false },
          { item: "Performance meets 10k req/s target", done: false },
        ],
        discussions: [],
        attachments: [],
      },
      // Phase 6: Deployment
      {
        id: "ph6",
        name: "Deployment",
        description: "Staged rollout to production with monitoring and rollback plan.",
        status: "pending",
        order: 5,
        estimatedDuration: "2 days",
        startDate: "2026-04-04",
        endDate: "2026-04-05",
        signOffRequired: true,
        checklist: [
          { item: "Staging deployment successful", done: false },
          { item: "Monitoring configured", done: false },
          { item: "Rollback plan documented", done: false },
          { item: "Production rollout complete", done: false },
        ],
        discussions: [],
        attachments: [],
      },
    ],
    updates: [
      {
        id: "upd1",
        projectId: "p1",
        userId: "u3",
        type: "architecture",
        title: "API Gateway Architecture Document v1",
        description:
          "Complete architecture covering request flow, component interactions, deployment topology. Includes JWT validation flow, token bucket rate limiter design, and circuit breaker state machine.",
        link: "https://docs.google.com/document/d/arch-v1",
        reviewed: true,
        feedback: [
          {
            id: "fb1",
            fromUserId: "u1",
            text: "Solid architecture. Token bucket approach for rate limiting is the right call. Two things to add:\n1. Document failover behavior when Redis is unavailable\n2. Add observability section — what metrics do we expose?\n\nOverall approved — proceed to implementation.",
            isAi: false,
            actionItems: ["Add Redis failover documentation", "Add observability/metrics section"],
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: "upd2",
        projectId: "p1",
        userId: "u5",
        type: "code",
        title: "Core routing and JWT middleware PR",
        description:
          "Implements the core request routing engine and JWT validation middleware. Includes unit tests for all auth flows.",
        whatWasDone: "Built request router with path matching, JWT validation middleware with RS256 support, unit tests for all flows",
        blockers: "None currently",
        nextSteps: "Integration tests with rate limiter once Arjun's PR is ready",
        link: "https://github.com/company/api-gateway/pull/12",
        reviewed: true,
        feedback: [
          {
            id: "fb2",
            fromUserId: "u1",
            text: "Great work on the benchmarks — 15k req/s exceeds our 10k target. Code looks clean. Approved.",
            isAi: false,
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: "upd3",
        projectId: "p1",
        userId: "u3",
        type: "code",
        title: "Rate limiter implementation with Redis backend",
        description:
          "Token bucket rate limiter with sliding window counters. Supports per-client and per-endpoint limits. Falls back to in-memory limiter if Redis is down.",
        whatWasDone: "Implemented token bucket algorithm, Redis integration, in-memory fallback, per-client configs",
        blockers: "Need Redis Sentinel setup for HA — Vikram is working on infra",
        nextSteps: "Integration tests with routing layer, load testing",
        link: "https://github.com/company/api-gateway/pull/15",
        reviewed: false,
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: "upd4",
        projectId: "p1",
        userId: "u3",
        type: "meeting_notes",
        title: "Sprint Planning — Week 2",
        description: "Sprint planning for the second week of API Gateway development",
        attendees: ["u1", "u3", "u5"],
        decisions: [
          "Use Redis Sentinel instead of Cluster for HA — simpler ops",
          "Circuit breaker thresholds: 5 failures in 30s \u2192 open, 60s half-open",
          "Skip gRPC support in v1 — HTTP/REST only for now",
        ],
        actionItems: [
          { task: "Set up Redis Sentinel on staging", assigneeId: "u5", dueDate: "2026-04-03" },
          { task: "Implement circuit breaker module", assigneeId: "u3", dueDate: "2026-04-05" },
          { task: "Write load test scripts with k6", assigneeId: "u5", dueDate: "2026-04-04" },
        ],
        reviewed: true,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "upd5",
        projectId: "p1",
        userId: "u5",
        type: "status_update",
        title: "Daily Update — Day 8",
        description: "",
        whatWasDone: "Finished JWT middleware optimizations. Benchmark now at 15.2k req/s. Started on Redis Sentinel config for staging.",
        blockers: "Waiting on DevOps for staging Redis cluster access",
        nextSteps: "Integration test harness setup, k6 load test scripts",
        reviewed: false,
        createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(),
      },
    ],
    checkpoints: [
      {
        id: "cp1",
        projectId: "p1",
        decision: "continue",
        notes: "Day 8 check-in: Requirements and Design completed on schedule. Core routing performing well (15k req/s exceeds 10k target). Rate limiter PR in review. Team velocity is good.",
        aiInsights:
          "Project is 38% through timebox with 33% of phases complete — slightly ahead of schedule. Key risk: Redis HA setup depends on DevOps, which is an external dependency. Recommend escalating staging access request.",
        actionItems: [
          "Escalate Redis staging access with DevOps",
          "Review rate limiter PR by EOD",
          "Confirm circuit breaker thresholds with team",
        ],
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
    requirementDoc: {
      currentVersion: 4,
      lastUpdated: new Date(Date.now() - 1 * 86400000).toISOString(),
      currentText:
        "Build a centralized API gateway that handles authentication, rate limiting, and request routing for all our microservices. Must support JWT validation (RS256), per-client and per-endpoint rate limits using a token bucket algorithm with Redis backend, and circuit breaker patterns (5 failures in 30s triggers open state, 60s half-open). Must handle 10k+ requests/second with <50ms p99 latency for routing. Rate limiting latency may be slightly higher. Redis Sentinel must be used for HA with automatic failover; in-memory fallback when Redis is unavailable. Monitoring via Prometheus with dashboards for request throughput, latency percentiles, error rates, and circuit breaker state. Deployment on Kubernetes with rolling updates and rollback capability. gRPC support deferred to v2. WebSocket proxying deferred to v2.",
      sections: [
        {
          id: "rs1",
          title: "Overview",
          content:
            "Centralized API gateway service to unify authentication, rate limiting, and request routing for all REST microservices. Replaces the current per-service auth middleware with a single entry point that enforces consistent security and traffic management policies.",
          lastModifiedBy: "u1",
          lastModifiedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        },
        {
          id: "rs2",
          title: "Functional Requirements",
          content:
            "1. JWT Authentication: Validate RS256-signed JWTs on every request. Support token refresh and revocation checks against Redis.\n2. Rate Limiting: Token bucket algorithm with per-client and per-endpoint configurable limits. Redis backend for distributed state. In-memory fallback when Redis is unavailable.\n3. Circuit Breaker: Configurable thresholds (default: 5 failures in 30s triggers open, 60s half-open window). Per-upstream-service configuration.\n4. Request Routing: Path-based routing to downstream microservices with configurable timeouts. Health-check-aware routing.",
          lastModifiedBy: "u3",
          lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: "rs3",
          title: "Performance Requirements",
          content:
            "1. Throughput: Must handle 10,000+ requests/second per instance on standard k8s pod (2 vCPU, 4GB RAM).\n2. Latency: <50ms p99 for routing and auth. Rate limiting may add up to 10ms additional latency.\n3. Availability: 99.95% uptime target. Graceful degradation when Redis is down (fallback to in-memory rate limiting).",
          lastModifiedBy: "u5",
          lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: "rs4",
          title: "Non-Functional Requirements",
          content:
            "1. High Availability: Redis Sentinel for state store HA with automatic failover. Multi-replica gateway deployment.\n2. Monitoring: Prometheus metrics for request throughput, latency percentiles (p50/p95/p99), error rates, circuit breaker state, and rate limit hit rates. Grafana dashboards.\n3. Deployment: Kubernetes with rolling updates. Rollback capability within 2 minutes. Zero-downtime deployments.",
          lastModifiedBy: "u3",
          lastModifiedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        {
          id: "rs5",
          title: "Out of Scope",
          content:
            "1. gRPC support: Decided during sprint planning to skip in v1. The billing service retains its direct gRPC endpoint.\n2. WebSocket proxying: Deferred to v2 based on team discussion. V1 focuses on HTTP/REST which covers 90% of traffic.",
          lastModifiedBy: "u1",
          lastModifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
      ],
      changes: [
        {
          id: "rc1",
          version: 1,
          changedBy: "u1",
          changeType: "initial",
          impact: "none",
          title: "Initial requirement from CEO",
          description:
            "Original requirement defining the API gateway scope: JWT auth, rate limiting, circuit breaker, and 10k req/s target.",
          newText:
            "Build a centralized API gateway that handles authentication, rate limiting, and request routing for all our microservices. Should support JWT validation, per-client rate limits, and circuit breaker patterns. Must handle 10k+ requests/second.",
          createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        },
        {
          id: "rc2",
          version: 2,
          changedBy: "u3",
          changeType: "refinement",
          impact: "plan_and_design",
          title: "Added performance targets and monitoring requirements",
          description:
            "After team discussion during design phase, added specific p99 latency targets (<50ms for routing), monitoring requirements (Prometheus + Grafana), and Redis Sentinel HA requirement. These additions affect both the project plan timeline and the architecture design.",
          previousText: "Must handle 10k+ requests/second.",
          newText:
            "Must handle 10k+ requests/second with <50ms p99 latency for routing. Monitoring via Prometheus with dashboards for request throughput, latency percentiles, error rates, and circuit breaker state. Redis Sentinel for HA.",
          discussionIds: ["rd5", "rd4"],
          approvedBy: ["u3", "u5"],
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: "rc3",
          version: 3,
          changedBy: "u3",
          changeType: "minor_change",
          impact: "development_only",
          title: "gRPC support removed from v1 scope",
          description:
            "Decided during sprint planning (Week 2) to skip gRPC support in v1. The billing service keeps its direct gRPC endpoint. This reduces development scope without affecting the architecture design.",
          previousText: "Support JWT validation, per-client rate limits, circuit breaker, and gRPC translation.",
          newText: "Support JWT validation, per-client rate limits, and circuit breaker. gRPC deferred to v2.",
          discussionIds: ["rd7", "rd8"],
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "rc4",
          version: 4,
          changedBy: "u3",
          changeType: "refinement",
          impact: "design_only",
          title: "Added Redis failover requirements",
          description:
            "After architecture review feedback from CEO, added explicit Redis failover behavior: automatic failover via Sentinel, in-memory fallback for rate limiting when Redis is completely unavailable. This impacts the design document but not the project plan.",
          previousText: "Redis backend for distributed rate limiting state.",
          newText:
            "Redis Sentinel for HA with automatic failover. In-memory fallback for rate limiting when Redis is unavailable. Failover must complete within 30 seconds.",
          discussionIds: ["rd5", "rd6"],
          approvedBy: ["u1", "u3"],
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
      ],
      discussions: [
        {
          id: "rd1",
          userId: "u3",
          message: "Should we support WebSocket proxying through the gateway? Some internal services use WebSockets for real-time data.",
          type: "question",
          resolved: true,
          createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        },
        {
          id: "rd2",
          userId: "u1",
          message: "Defer WebSocket to v2, focus on REST. That covers 90% of our traffic and keeps the scope manageable.",
          type: "clarification",
          linkedChangeId: "rc1",
          resolved: true,
          createdAt: new Date(Date.now() - 8 * 86400000 + 3600000).toISOString(),
        },
        {
          id: "rd3",
          userId: "u5",
          message: "What's the expected p99 latency target? We need a concrete number for the benchmarks.",
          type: "question",
          resolved: true,
          createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        },
        {
          id: "rd4",
          userId: "u1",
          message: "Under 50ms at p99 for routing and auth. Rate limiting can be slightly higher since it involves a Redis round-trip.",
          type: "clarification",
          linkedChangeId: "rc2",
          resolved: true,
          createdAt: new Date(Date.now() - 6 * 86400000 + 1800000).toISOString(),
        },
        {
          id: "rd5",
          userId: "u3",
          message: "We should add Redis failover behavior to the requirements — the architecture review flagged that we don't specify what happens when Redis goes down.",
          type: "suggestion",
          linkedChangeId: "rc4",
          resolved: true,
          createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
        },
        {
          id: "rd6",
          userId: "u1",
          message: "Agreed, adding it as a v4 change. In-memory fallback for rate limiting plus Sentinel failover should cover it.",
          type: "approval",
          linkedChangeId: "rc4",
          resolved: true,
          createdAt: new Date(Date.now() - 1.2 * 86400000).toISOString(),
        },
        {
          id: "rd7",
          userId: "u4",
          message: "Shouldn't we consider gRPC for internal service communication? The billing service already uses it.",
          type: "concern",
          resolved: true,
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          id: "rd8",
          userId: "u3",
          message: "Discussed in sprint planning — skipping gRPC in v1 to reduce scope. Billing keeps its direct endpoint for now.",
          type: "clarification",
          linkedChangeId: "rc3",
          resolved: true,
          createdAt: new Date(Date.now() - 2.5 * 86400000).toISOString(),
        },
      ],
    },
    documents: [
      // ── Document 1: Requirements Document ──
      {
        id: "doc-p1-req",
        type: "requirement" as DocumentType,
        title: "Requirements Document",
        description: "Functional and non-functional requirements for the API Gateway service",
        currentVersion: 4,
        status: "approved" as const,
        createdBy: "u1",
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 1 * 86400000).toISOString(),
        sections: [
          {
            id: "ds1",
            title: "Overview",
            content: "Centralized API gateway service to unify authentication, rate limiting, and request routing for all REST microservices. Replaces the current per-service auth middleware with a single entry point that enforces consistent security and traffic management policies.",
            order: 1,
            lastModifiedBy: "u1",
            lastModifiedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: "ds2",
            title: "Functional Requirements",
            content: "1. JWT Authentication: Validate RS256-signed JWTs on every request. Support token refresh and revocation checks against Redis.\n2. Rate Limiting: Token bucket algorithm with per-client and per-endpoint configurable limits. Redis backend for distributed state. In-memory fallback when Redis is unavailable.\n3. Circuit Breaker: Configurable thresholds (default: 5 failures in 30s triggers open, 60s half-open window). Per-upstream-service configuration.\n4. Request Routing: Path-based routing to downstream microservices with configurable timeouts. Health-check-aware routing.",
            order: 2,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "ds3",
            title: "Performance Requirements",
            content: "1. Throughput: Must handle 10,000+ requests/second per instance on standard k8s pod (2 vCPU, 4GB RAM).\n2. Latency: <50ms p99 for routing and auth. Rate limiting may add up to 10ms additional latency.\n3. Availability: 99.95% uptime target. Graceful degradation when Redis is down (fallback to in-memory rate limiting).",
            order: 3,
            lastModifiedBy: "u5",
            lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "ds4",
            title: "Non-Functional Requirements",
            content: "1. High Availability: Redis Sentinel for state store HA with automatic failover. Multi-replica gateway deployment.\n2. Monitoring: Prometheus metrics for request throughput, latency percentiles (p50/p95/p99), error rates, circuit breaker state, and rate limit hit rates. Grafana dashboards.\n3. Deployment: Kubernetes with rolling updates. Rollback capability within 2 minutes. Zero-downtime deployments.",
            order: 4,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
          {
            id: "ds5",
            title: "Out of Scope",
            content: "1. gRPC support: Decided during sprint planning to skip in v1. The billing service retains its direct gRPC endpoint.\n2. WebSocket proxying: Deferred to v2 based on team discussion. V1 focuses on HTTP/REST which covers 90% of traffic.",
            order: 5,
            lastModifiedBy: "u1",
            lastModifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dc1",
            version: 1,
            changedBy: "u1",
            changeType: "initial",
            impact: "none",
            title: "Initial requirement from CEO",
            description: "Original requirement defining the API gateway scope: JWT auth, rate limiting, circuit breaker, and 10k req/s target.",
            newText: "Build a centralized API gateway that handles authentication, rate limiting, and request routing for all our microservices. Should support JWT validation, per-client rate limits, and circuit breaker patterns. Must handle 10k+ requests/second.",
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: "dc2",
            version: 2,
            changedBy: "u3",
            changeType: "refinement",
            impact: "plan_and_design",
            title: "Added performance targets and monitoring requirements",
            description: "After team discussion during design phase, added specific p99 latency targets (<50ms for routing), monitoring requirements (Prometheus + Grafana), and Redis Sentinel HA requirement.",
            previousText: "Must handle 10k+ requests/second.",
            newText: "Must handle 10k+ requests/second with <50ms p99 latency for routing. Monitoring via Prometheus with dashboards for request throughput, latency percentiles, error rates, and circuit breaker state. Redis Sentinel for HA.",
            linkedDocumentIds: ["doc-p1-arch"],
            approvedBy: ["u3", "u5"],
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "dc3",
            version: 3,
            changedBy: "u3",
            changeType: "minor_change",
            impact: "development_only",
            title: "gRPC support removed from v1 scope",
            description: "Decided during sprint planning (Week 2) to skip gRPC support in v1. The billing service keeps its direct gRPC endpoint.",
            previousText: "Support JWT validation, per-client rate limits, circuit breaker, and gRPC translation.",
            newText: "Support JWT validation, per-client rate limits, and circuit breaker. gRPC deferred to v2.",
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: "dc4",
            version: 4,
            changedBy: "u3",
            changeType: "refinement",
            impact: "design_only",
            title: "Added Redis failover requirements",
            description: "After architecture review feedback from CEO, added explicit Redis failover behavior: automatic failover via Sentinel, in-memory fallback for rate limiting when Redis is completely unavailable.",
            previousText: "Redis backend for distributed rate limiting state.",
            newText: "Redis Sentinel for HA with automatic failover. In-memory fallback for rate limiting when Redis is unavailable. Failover must complete within 30 seconds.",
            linkedDocumentIds: ["doc-p1-arch"],
            approvedBy: ["u1", "u3"],
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
        ],
        discussions: [
          {
            id: "dd1",
            userId: "u3",
            message: "Should we support WebSocket proxying through the gateway? Some internal services use WebSockets for real-time data.",
            type: "question",
            resolved: true,
            createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          },
          {
            id: "dd2",
            userId: "u1",
            message: "Defer WebSocket to v2, focus on REST. That covers 90% of our traffic and keeps the scope manageable.",
            type: "clarification",
            linkedChangeId: "dc1",
            resolved: true,
            createdAt: new Date(Date.now() - 8 * 86400000 + 3600000).toISOString(),
          },
          {
            id: "dd3",
            userId: "u5",
            message: "What's the expected p99 latency target? We need a concrete number for the benchmarks.",
            type: "question",
            resolved: true,
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
          {
            id: "dd4",
            userId: "u1",
            message: "Under 50ms at p99 for routing and auth. Rate limiting can be slightly higher since it involves a Redis round-trip.",
            type: "clarification",
            linkedChangeId: "dc2",
            resolved: true,
            createdAt: new Date(Date.now() - 6 * 86400000 + 1800000).toISOString(),
          },
          {
            id: "dd5",
            userId: "u3",
            message: "We should add Redis failover behavior to the requirements — the architecture review flagged that we don't specify what happens when Redis goes down.",
            type: "suggestion",
            linkedChangeId: "dc4",
            resolved: true,
            createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
          },
          {
            id: "dd6",
            userId: "u1",
            message: "Agreed, adding it as a v4 change. In-memory fallback for rate limiting plus Sentinel failover should cover it.",
            type: "approval",
            linkedChangeId: "dc4",
            resolved: true,
            createdAt: new Date(Date.now() - 1.2 * 86400000).toISOString(),
          },
          {
            id: "dd7",
            userId: "u4",
            message: "Shouldn't we consider gRPC for internal service communication? The billing service already uses it.",
            type: "concern",
            resolved: true,
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            id: "dd8",
            userId: "u3",
            message: "Discussed in sprint planning — skipping gRPC in v1 to reduce scope. Billing keeps its direct endpoint for now.",
            type: "clarification",
            linkedChangeId: "dc3",
            resolved: true,
            createdAt: new Date(Date.now() - 2.5 * 86400000).toISOString(),
          },
        ],
        linkedDocumentIds: ["doc-p1-arch", "doc-p1-roadmap"],
        tags: ["requirements", "v1"],
      },
      // ── Document 2: Architecture & Design Document ──
      {
        id: "doc-p1-arch",
        type: "design" as DocumentType,
        title: "System Architecture & Design",
        description: "API Gateway architecture, component design, and data flow documentation",
        currentVersion: 2,
        status: "approved" as const,
        createdBy: "u3",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
        sections: [
          {
            id: "das1",
            title: "System Overview",
            content: "The API gateway follows a modular pipeline architecture. Incoming HTTP requests flow through: TLS termination \u2192 JWT validation \u2192 Rate limiting \u2192 Circuit breaker \u2192 Request routing \u2192 Response transformation. Each stage is a middleware function that can be independently configured, tested, and bypassed for specific routes.",
            order: 1,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "das2",
            title: "Component Architecture",
            content: "Core components: (1) Router \u2014 path-based matching with O(1) lookup via radix tree. (2) Auth Middleware \u2014 RS256 JWT validation with JWKS caching. (3) Rate Limiter \u2014 Token bucket algorithm with Redis backend. (4) Circuit Breaker \u2014 Per-service state machine with configurable thresholds.",
            order: 2,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
          {
            id: "das3",
            title: "Data Flow",
            content: "Request lifecycle: Client \u2192 Gateway (port 8080) \u2192 Auth check \u2192 Rate limit check (Redis) \u2192 Circuit breaker evaluation \u2192 Upstream service \u2192 Response transformation \u2192 Client. Async: Metrics emission to Prometheus, access logs to stdout.",
            order: 3,
            lastModifiedBy: "u5",
            lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
          {
            id: "das4",
            title: "Technology Decisions",
            content: "Go 1.22 (stdlib net/http), Redis Sentinel for rate limit state, Prometheus for metrics, Docker + K8s for deployment. Decision: Custom Go over NGINX \u2014 benchmarks show 15k req/s, tight JWT integration, no Lua plugin complexity.",
            order: 4,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dac1",
            version: 1,
            changedBy: "u3",
            changeType: "initial",
            impact: "none",
            title: "Initial architecture draft",
            description: "First version of the system architecture document covering pipeline design, component architecture, data flow, and technology decisions.",
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "dac2",
            version: 2,
            changedBy: "u3",
            changeType: "section_edited",
            impact: "design_only",
            title: "Added failover section after CEO feedback",
            description: "Added Redis failover behavior documentation and in-memory fallback strategy based on CEO architecture review feedback.",
            sectionId: "das4",
            linkedDocumentIds: ["doc-p1-req"],
            approvedBy: ["u1"],
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        discussions: [
          {
            id: "dad1",
            userId: "u5",
            message: "Should we use NGINX instead of custom Go for the routing layer? NGINX is battle-tested for this.",
            type: "question",
            resolved: true,
            createdAt: new Date(Date.now() - 6.5 * 86400000).toISOString(),
          },
          {
            id: "dad2",
            userId: "u1",
            message: "Going with custom Go. Arjun's benchmarks show 15k req/s and we need tight JWT integration. NGINX Lua plugins add ops complexity.",
            type: "clarification",
            resolved: true,
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        linkedDocumentIds: ["doc-p1-req", "doc-p1-roadmap", "doc-p1-api"],
        tags: ["architecture", "design"],
      },
      // ── Document 3: Technical Roadmap ──
      {
        id: "doc-p1-roadmap",
        type: "technical_roadmap" as DocumentType,
        title: "Technical Roadmap & Milestones",
        description: "Development phases, milestones, and delivery timeline",
        currentVersion: 2,
        status: "active" as const,
        createdBy: "u3",
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 3 * 86400000).toISOString(),
        sections: [
          {
            id: "drs1",
            title: "Phase 1: Foundation (Days 1-5)",
            content: "Requirements alignment, architecture design, tech stack validation. Deliverables: Requirements doc v1, Architecture doc v1, PoC benchmark results.",
            order: 1,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "drs2",
            title: "Phase 2: Core Development (Days 6-14)",
            content: "Routing engine, JWT middleware, rate limiter, circuit breaker. Current: Rate limiter in review, circuit breaker pending. Blockers: Redis staging access.",
            order: 2,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
          {
            id: "drs3",
            title: "Phase 3: Hardening & Deployment (Days 15-21)",
            content: "Load testing, security review, staging deploy, production rollout. Pending: All items.",
            order: 3,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "drc1",
            version: 1,
            changedBy: "u3",
            changeType: "initial",
            impact: "none",
            title: "Initial roadmap",
            description: "First version of the technical roadmap with 3 development phases mapped to the 21-day timebox.",
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          },
          {
            id: "drc2",
            version: 2,
            changedBy: "u3",
            changeType: "section_edited",
            impact: "roadmap",
            title: "Timeline adjusted after requirement refinement",
            description: "Updated Phase 2 timeline to reflect current progress and Redis staging access blocker.",
            sectionId: "drs2",
            linkedDocumentIds: ["doc-p1-req"],
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        discussions: [],
        linkedDocumentIds: ["doc-p1-req", "doc-p1-arch"],
        tags: ["roadmap", "timeline"],
      },
      // ── Document 4: API Specification ──
      {
        id: "doc-p1-api",
        type: "api_spec" as DocumentType,
        title: "API Specification & Contracts",
        description: "OpenAPI specs, endpoint definitions, request/response schemas",
        currentVersion: 1,
        status: "active" as const,
        createdBy: "u3",
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 6 * 86400000).toISOString(),
        sections: [
          {
            id: "dapis1",
            title: "Gateway Endpoints",
            content: "POST /auth/validate \u2014 Validate JWT token. GET /health \u2014 Health check. GET /metrics \u2014 Prometheus metrics endpoint. ANY /{service}/{path} \u2014 Proxied request to upstream service.",
            order: 1,
            lastModifiedBy: "u3",
            lastModifiedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
          {
            id: "dapis2",
            title: "Rate Limit Headers",
            content: "X-RateLimit-Limit: Maximum requests per window. X-RateLimit-Remaining: Remaining requests. X-RateLimit-Reset: Unix timestamp for window reset. 429 Too Many Requests returned when limit exceeded.",
            order: 2,
            lastModifiedBy: "u5",
            lastModifiedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dapc1",
            version: 1,
            changedBy: "u3",
            changeType: "initial",
            impact: "none",
            title: "Initial API specification",
            description: "First version of the API specification covering gateway endpoints and rate limit response headers.",
            createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        discussions: [],
        linkedDocumentIds: ["doc-p1-arch"],
        tags: ["api", "contracts"],
      },
    ],
    aiPlan: {
      summary: "High-performance API gateway with auth, rate limiting, and circuit breaker for microservices",
      risks: [
        { risk: "Performance bottleneck under load", mitigation: "Early load testing with k6, profile hot paths", severity: "high" },
        { risk: "Redis single point of failure", mitigation: "Redis Sentinel for HA, in-memory fallback", severity: "medium" },
        { risk: "External dependency on DevOps for staging", mitigation: "Escalate early, have local Docker fallback", severity: "medium" },
      ],
      killCriteria: [
        "Cannot achieve 5k req/s after optimization sprint",
        "Security audit reveals fundamental design flaw",
        "Team blocked for more than 5 consecutive days",
      ],
    },
  },

  // ========================================
  // P2: Customer Churn Prediction Model
  // ========================================
  {
    id: "p2",
    title: "Customer Churn Prediction Model",
    type: "research",
    category: "data_science",
    requirement:
      "Build a machine learning model to predict customer churn for our SaaS product. We have 18 months of customer data including usage patterns, support tickets, billing history, and feature adoption. Goal: identify at-risk customers 30 days before churn with >80% precision.",
    objective: "Predict customer churn 30 days ahead with actionable early warning signals for the customer success team",
    outcomeType: "ml_model",
    outcomeDescription: "Deployed churn prediction model with >80% precision and SHAP-based explanations",
    finalOutcome: {
      expectedType: "ml_model",
      expectedDescription: "Production ML model with API endpoint, monitoring dashboard, and explanation module",
      status: "in_progress",
    },
    intermediateSubmissions: [
      { id: "is-4", title: "Data Quality Assessment Report", type: "document", description: "Analysis of 18 months customer data with completeness and quality metrics", submittedBy: "u2", submittedAt: new Date(Date.now() - 10 * 86400000).toISOString(), status: "approved", reviewedBy: "u1", reviewedAt: new Date(Date.now() - 9 * 86400000).toISOString(), isKeyMilestone: true },
      { id: "is-5", title: "Baseline Model Notebook", type: "data", description: "XGBoost baseline achieving 78% precision without tuning", submittedBy: "u2", submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(), status: "approved", reviewedBy: "u1", reviewedAt: new Date(Date.now() - 4 * 86400000).toISOString(), isKeyMilestone: true },
      { id: "is-6", title: "Hyperparameter Tuning Results", type: "document", description: "Optuna optimization results with top 5 configurations", submittedBy: "u4", submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: "submitted", isKeyMilestone: false },
    ],
    status: "active",
    priority: "critical",
    currentPhase: "Experiment & Model Building",
    timeboxDays: 28,
    startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    techStack: ["Python", "Pandas", "XGBoost", "Scikit-learn", "Jupyter", "MLflow", "SHAP"],
    assigneeIds: ["u2", "u4"],
    ownerId: "u2",
    coOwnerIds: ["u4"],
    tasks: [
      // ---- Task 7: Data Collection Pipeline (old task t7) ----
      {
        id: "t7",
        title: "Data collection from customer sources",
        description: "Extract and merge customer data from all 4 sources for the churn prediction model training dataset.",
        assigneeId: "u2",
        approach: "Extract data from 4 sources: (1) Product usage DB via SQL, (2) Zendesk API for support tickets, (3) Stripe API for billing, (4) Amplitude export for feature adoption. Merge on customer_id with temporal alignment.",
        planStatus: "ai_generated",
        aiGeneratedPlan: {
          approach: "Build ETL pipeline extracting from 4 data sources. Use pandas for transformation with temporal alignment on customer_id. Store in feature store format.",
          steps: ["Map all data sources and their schemas", "Build SQL extractor for product usage DB", "Build Zendesk API client for ticket data", "Build Stripe API client for billing data", "Build Amplitude export parser", "Design merge strategy with temporal alignment", "Implement data quality checks", "Create pipeline orchestration with retry logic", "Document data dictionary"],
          generatedAt: "2026-03-28T09:00:00Z",
        },
        steps: [
          { id: "ts27", description: "SQL extraction from usage DB", expectedOutcome: "18-month product usage dataset extracted with login frequency, feature usage, and session durations", category: "development", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 12 * 86400000).toISOString(), assigneeId: "u2", reviewStatus: "approved", reviewerId: "u4", notes: "Clean data, good coverage across all customer segments" },
          { id: "ts28", description: "Zendesk API integration", expectedOutcome: "Support ticket dataset with ticket count, resolution time, and sentiment per customer", category: "integration", estimatedHours: 4, actualHours: 5, status: "completed", completedAt: new Date(Date.now() - 11 * 86400000).toISOString(), assigneeId: "u2", reviewStatus: "approved", reviewerId: "u4", notes: "Zendesk API rate limits slowed extraction, used pagination" },
          { id: "ts29", description: "Stripe billing data pull", expectedOutcome: "Billing history with MRR, payment failures, plan changes, and discount usage", category: "integration", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 10.5 * 86400000).toISOString(), assigneeId: "u2", reviewStatus: "approved", reviewerId: "u4" },
          { id: "ts30", description: "Amplitude feature adoption export", expectedOutcome: "Feature adoption metrics per customer including activation rates and feature stickiness", category: "integration", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: new Date(Date.now() - 10 * 86400000).toISOString(), assigneeId: "u2", reviewStatus: "not_needed" },
          { id: "ts31", description: "Data merge and validation", expectedOutcome: "Unified dataset merged on customer_id with <5% missing values and temporal alignment verified", category: "research", estimatedHours: 4, actualHours: 3.5, status: "completed", completedAt: new Date(Date.now() - 9 * 86400000).toISOString(), assigneeId: "u2", reviewStatus: "approved", reviewerId: "u1", notes: "4% missing values, well within threshold" },
        ],
        successCriteria: [
          "All 4 sources integrated",
          "<5% missing values in key fields",
          "Temporal alignment verified",
        ],
        killCriteria: [">30% missing data in critical fields"],
        estimatedHours: 16,
        revisedEstimateHours: 14,
        status: "completed",
        updates: [
          {
            id: "tu7",
            userId: "u2",
            message: "Usage DB extraction done — clean data, good coverage",
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: "tu8",
            userId: "u2",
            message: "Zendesk API has rate limits, took slightly longer but all 18 months extracted",
            createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
          },
          {
            id: "tu9",
            userId: "u2",
            message: "All 4 sources merged. Only 4% missing values — well within threshold",
            revisedEstimate: 14,
            createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
          },
        ],
        priority: "high",
        milestones: [
          {
            id: "dm12",
            title: "All Sources Integrated",
            description: "Data extracted from all 4 customer data sources and merged with temporal alignment",
            deliverableType: "data",
            successCriteria: ["All 4 sources extracted", "Data merged on customer_id", "Temporal alignment verified"],
            status: "completed",
            assigneeId: "u2",
            targetDay: 7,
            outcome: "met",
            outcomeNotes: "All 4 sources merged successfully. Only 4% missing values — well within 5% threshold.",
            deliverables: [
              {
                id: "d7",
                type: "data",
                title: "Merged Dataset",
                description: "Cleaned and merged dataset from 4 sources (CRM, billing, support tickets, usage logs) with <5% missing values and documented schema.",
                status: "verified",
                documentUrl: "https://docs.company.dev/data/churn-pipeline-v1",
                links: [
                  { label: "Data Schema", url: "https://docs.company.dev/data/churn-schema" },
                  { label: "EDA Notebook", url: "https://jupyter.company.dev/notebooks/churn/eda-final.ipynb" },
                  { label: "Data Quality Report", url: "https://docs.company.dev/data/quality-report-churn" },
                ],
                submittedBy: "u2",
                submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
                feedback: "Comprehensive data pipeline. Quality metrics look good. Schema documentation is thorough.",
                createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
          },
          {
            id: "dm13",
            title: "Data Quality Validated",
            description: "Data quality report confirming <5% missing values in key fields and no data leakage",
            deliverableType: "document",
            successCriteria: ["<5% missing values in critical fields", "No data leakage detected", "Quality report documented"],
            status: "completed",
            assigneeId: "u2",
            targetDay: 7,
            outcome: "met",
            outcomeNotes: "4% missing values. Temporal alignment prevents leakage. Quality report shared.",
            deliverables: [
              {
                id: "d8",
                type: "document",
                title: "Data Quality Report",
                description: "Comprehensive data quality assessment covering missing values, outliers, temporal alignment, and leakage checks.",
                status: "verified",
                documentUrl: "https://docs.company.dev/data/quality-report-churn",
                submittedBy: "u2",
                submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
                feedback: "Quality metrics look good. Temporal split approach is sound.",
                createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [
          {
            id: "de5",
            projectId: "p2",
            taskId: "t7",
            requestedBy: "u2",
            originalDeadline: new Date(Date.now() - 10 * 86400000).toISOString(),
            requestedDeadline: new Date(Date.now() - 7 * 86400000).toISOString(),
            reason: "personal",
            reasonDetail: "Had a family emergency and was on leave for 2 days. Could not complete the data pipeline validation in time.",
            impact: "Data collection was delayed but has since been completed. No further downstream impact.",
            status: "approved",
            ceoComment: "No worries, Priya. Family comes first. Take care.",
            approvedBy: "u1",
            approvedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
            escalationLevel: 0,
            actionTaken: "extended",
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
        ],
        outcome: {
          type: "data",
          expectedDeliverable: "Cleaned and merged dataset from 4 sources (CRM, billing, support tickets, usage logs) with <5% missing values and documented schema",
          status: "verified",
          documentTitle: "Data Pipeline Documentation",
          documentUrl: "https://docs.company.dev/data/churn-pipeline-v1",
          links: [
            { label: "Data Schema", url: "https://docs.company.dev/data/churn-schema" },
            { label: "EDA Notebook", url: "https://jupyter.company.dev/notebooks/churn/eda-final.ipynb" },
            { label: "Data Quality Report", url: "https://docs.company.dev/data/quality-report-churn" },
          ],
          submittedBy: "u2",
          submittedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
          verifiedBy: "u1",
          verifiedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
          feedback: "Comprehensive data pipeline. Quality metrics look good. Schema documentation is thorough.",
        },
        createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      // ---- Task 8: Hyperparameter Tuning (old task t5) ----
      {
        id: "t8",
        title: "Hyperparameter tuning for XGBoost",
        description: "Run Bayesian hyperparameter optimization using Optuna to find the best XGBoost configuration for churn prediction.",
        assigneeId: "u4",
        approach: "Use Optuna for Bayesian optimization. Search space: learning_rate, max_depth, n_estimators, min_child_weight, subsample. Run 100 trials with 5-fold temporal CV. Track all experiments in MLflow.",
        planStatus: "finalized",
        aiGeneratedPlan: {
          approach: "Use Bayesian optimization with Optuna for hyperparameter search. Define search space for XGBoost parameters. Track experiments with MLflow.",
          steps: ["Define hyperparameter search space", "Set up Optuna study with TPE sampler", "Configure temporal cross-validation (5-fold)", "Run initial 50 trials for exploration", "Analyze intermediate results and narrow search space", "Run 50 more trials for exploitation", "Compare top 5 models on holdout set", "Document final model configuration"],
          generatedAt: "2026-03-12T09:00:00Z",
        },
        planRefinedBy: "u4",
        planRefinedAt: "2026-03-12T15:00:00Z",
        steps: [
          { id: "ts19", description: "Define search space and CV strategy", expectedOutcome: "Documented hyperparameter search space and 5-fold temporal CV configuration", category: "research", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: new Date(Date.now() - 3 * 86400000).toISOString(), assigneeId: "u4", reviewStatus: "approved", reviewerId: "u2" },
          { id: "ts20", description: "Set up Optuna + MLflow integration", expectedOutcome: "Automated experiment tracking pipeline with Optuna TPE sampler and MLflow logging", category: "development", estimatedHours: 3, actualHours: 3.5, status: "completed", completedAt: new Date(Date.now() - 2.5 * 86400000).toISOString(), assigneeId: "u4", reviewStatus: "approved", reviewerId: "u2", notes: "MLflow integration required custom callback for Optuna" },
          { id: "ts21", description: "Run 100 optimization trials", expectedOutcome: "100 completed Bayesian optimization trials with best config exceeding 82% precision", category: "research", estimatedHours: 8, status: "in_progress", assigneeId: "u4", dependencies: ["ts19", "ts20"], notes: "50 trials done, best so far: 83.2% precision. Search converging." },
          { id: "ts22", description: "Analyze results and select best model", expectedOutcome: "Comparison table of top 5 models with holdout set validation and final config selection", category: "research", estimatedHours: 2, status: "pending", assigneeId: "u4", dependencies: ["ts21"] },
        ],
        successCriteria: [
          "Best model >82% precision",
          "All trials tracked in MLflow",
          "CV variance <3%",
        ],
        killCriteria: [
          "Cannot exceed 80% precision after 100 trials",
          "Severe overfitting despite regularization",
        ],
        estimatedHours: 15,
        status: "in_progress",
        updates: [
          {
            id: "tu5",
            userId: "u4",
            message: "50 trials complete. Best so far: 83.2% precision, 72% recall. Looking promising!",
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          },
          {
            id: "tu6",
            userId: "u4",
            message: "Search is converging — top 10 trials all within 1% of each other.",
            createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(),
          },
        ],
        priority: "high",
        milestones: [
          {
            id: "dm14",
            title: "100 Trials Complete",
            description: "All 100 Bayesian optimization trials completed and tracked in MLflow",
            deliverableType: "text",
            successCriteria: ["100 trials completed", "All tracked in MLflow", "Best model >82% precision"],
            status: "in_progress",
            assigneeId: "u4",
            targetDay: 21,
            deliverables: [
              {
                id: "d9",
                type: "text",
                title: "Intermediate Tuning Results",
                description: "Current best config after 50 trials",
                status: "submitted",
                textContent: "Current best config: XGBoost with max_depth=6, learning_rate=0.05, n_estimators=350, subsample=0.8. Validation precision: 83.2%, recall: 72.1%. 50 of 100 trials complete.",
                links: [
                  { label: "MLflow Experiment Dashboard", url: "https://mlflow.company.dev/experiments/churn-v1" },
                ],
                submittedBy: "u4",
                submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
                createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
              },
            ],
            updates: [
              {
                id: "dmu2",
                userId: "u4",
                message: "50 trials complete. Best so far: 83.2% precision. Search converging.",
                createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
              },
            ],
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
          {
            id: "dm15",
            title: "Best Model Selected",
            description: "Final model configuration selected with comparison table and holdout set validation",
            deliverableType: "document",
            successCriteria: ["Top 5 models compared on holdout set", "Final model configuration documented", "CV variance <3%"],
            status: "pending",
            assigneeId: "u4",
            targetDay: 21,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [
          {
            id: "de4",
            projectId: "p2",
            taskId: "t8",
            requestedBy: "u4",
            originalDeadline: new Date(Date.now() - 3 * 86400000).toISOString(),
            requestedDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
            reason: "technical_challenge",
            reasonDetail: "Hyperparameter search space is larger than expected. Bayesian optimization is not converging well with the current feature set. Need to experiment with different feature engineering approaches first.",
            impact: "Model tuning delayed by 5 days. SHAP analysis depends on finalized model, so it will cascade.",
            status: "approved",
            ceoComment: "Approved. But please share intermediate results so we can assess if the approach needs pivoting.",
            approvedBy: "u1",
            approvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            escalationLevel: 0,
            actionTaken: "extended",
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        outcome: {
          type: "information",
          expectedDeliverable: "Best hyperparameter configuration with validation metrics (precision, recall, F1) and comparison table across experiments",
          status: "submitted",
          textContent: "Current best config: XGBoost with max_depth=6, learning_rate=0.05, n_estimators=350, subsample=0.8. Validation precision: 78.3%, recall: 72.1%, F1: 75.1%. Still running additional experiments with feature selection variants.",
          links: [
            { label: "MLflow Experiment Dashboard", url: "https://mlflow.company.dev/experiments/churn-v1" },
            { label: "Experiment Comparison Notebook", url: "https://jupyter.company.dev/notebooks/churn/hyperparam-comparison.ipynb" },
          ],
          submittedBy: "u4",
          submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      // ---- Task 9: SHAP Explainability Analysis (old task t6) ----
      {
        id: "t9",
        title: "SHAP analysis for model interpretability",
        description: "Generate SHAP-based explanations for the XGBoost churn model to enable stakeholder trust and actionable insights.",
        assigneeId: "u4",
        approach: "Use SHAP TreeExplainer for XGBoost. Generate summary plots, force plots for individual predictions, and feature interaction analysis. Focus on top 10 features for stakeholder presentation.",
        planStatus: "finalized",
        aiGeneratedPlan: {
          approach: "Apply SHAP TreeExplainer on final XGBoost model. Generate global and local explanations. Create stakeholder-friendly visualizations.",
          steps: ["Set up SHAP with TreeExplainer for XGBoost", "Generate global feature importance (summary plot)", "Create force plots for sample predictions", "Analyze feature interactions", "Build executive summary with top insights", "Create interactive dashboard for non-technical stakeholders"],
          generatedAt: "2026-03-20T09:00:00Z",
        },
        planRefinedBy: "u4",
        planRefinedAt: "2026-03-20T13:30:00Z",
        steps: [
          { id: "ts23", description: "Generate SHAP values for test set", expectedOutcome: "SHAP TreeExplainer values computed for full test set with global importance rankings", category: "research", estimatedHours: 3, status: "pending", assigneeId: "u4" },
          { id: "ts24", description: "Create summary and force plots", expectedOutcome: "SHAP summary plot (global) and force plots for representative individual predictions", category: "research", estimatedHours: 3, status: "pending", assigneeId: "u4", dependencies: ["ts23"] },
          { id: "ts25", description: "Feature interaction analysis", expectedOutcome: "SHAP interaction plots showing key feature combinations driving churn predictions", category: "research", estimatedHours: 4, status: "pending", assigneeId: "u4", dependencies: ["ts23"] },
          { id: "ts26", description: "Build stakeholder-ready visualizations", expectedOutcome: "Board-ready presentation with top 10 features, segment breakdowns, and actionable recommendations", category: "documentation", estimatedHours: 4, status: "pending", assigneeId: "u4", dependencies: ["ts23", "ts24", "ts25"] },
        ],
        successCriteria: [
          "Top features align with business intuition",
          "Individual predictions are explainable",
          "Visualizations ready for board presentation",
        ],
        killCriteria: [],
        estimatedHours: 14,
        status: "planning",
        updates: [],
        priority: "high",
        milestones: [
          {
            id: "dm16",
            title: "SHAP Values Generated",
            description: "SHAP TreeExplainer values computed for the full test set with global and local explanations",
            deliverableType: "code",
            successCriteria: ["SHAP values computed for test set", "Global feature importance extracted", "Top 10 features identified"],
            status: "pending",
            assigneeId: "u4",
            targetDay: 21,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: "dm17",
            title: "Stakeholder Report",
            description: "Board-ready presentation with SHAP-based model explanations and actionable feature importance rankings",
            deliverableType: "ppt",
            successCriteria: ["Summary plots for global importance", "Force plots for sample predictions", "Actionable recommendations for business team"],
            status: "pending",
            assigneeId: "u4",
            targetDay: 24,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        outcome: {
          type: "document",
          expectedDeliverable: "Model interpretability report with SHAP summary plots, feature importance rankings, and per-segment explanations for business stakeholders",
          status: "pending",
        },
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    phases: [
      // Phase 1: Requirement Understanding
      {
        id: "ph7",
        name: "Requirement Understanding",
        description: "Align on what 'churn' means for our business, define success metrics, and scope the project.",
        status: "completed",
        order: 0,
        estimatedDuration: "3 days",
        signOffRequired: true,
        signedOffBy: ["u1", "u2", "u4"],
        checklist: [
          { item: "Churn definition agreed upon", done: true },
          { item: "Success metrics identified (>80% precision)", done: true },
          { item: "Data sources inventoried", done: true },
          { item: "Prediction window defined (30 days)", done: true },
        ],
        discussions: [
          {
            id: "d13",
            userId: "u2",
            message: "How do we define churn? Is it subscription cancellation, or does inactivity for N days also count? Some customers stay subscribed but stop using the product entirely.",
            type: "question",
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "d14",
            userId: "u1",
            message: "Good distinction. Let's define churn as: (a) explicit cancellation, or (b) zero logins for 30+ consecutive days while still subscribed. The second group is actually more valuable to identify because we can still save them.",
            type: "clarification",
            createdAt: new Date(Date.now() - 14 * 86400000 + 3600000).toISOString(),
          },
          {
            id: "d15",
            userId: "u4",
            message: "Should we treat enterprise and SMB customers differently? Their churn patterns are likely very different — enterprise has longer contracts and slower churn cycles.",
            type: "question",
            createdAt: new Date(Date.now() - 13.5 * 86400000).toISOString(),
          },
          {
            id: "d16",
            userId: "u1",
            message: "Start with a single model but include customer segment as a feature. If the SHAP analysis shows it's a dominant factor, we can consider separate models later. Don't over-engineer it upfront.",
            type: "resolution",
            createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att6",
            title: "Churn Project Kickoff MOM - Mar 18",
            type: "mom",
            uploadedBy: "u1",
            url: "https://docs.google.com/document/d/churn-kickoff-mom",
            createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 2: Data Exploration & Hypothesis
      {
        id: "ph8",
        name: "Data Exploration & Hypothesis",
        description: "Explore customer data, assess quality, form hypotheses about churn drivers.",
        status: "completed",
        order: 1,
        estimatedDuration: "1 week",
        signOffRequired: false,
        signedOffBy: ["u1"],
        checklist: [
          { item: "Data sources identified and accessed", done: true },
          { item: "Data quality assessed", done: true },
          { item: "EDA completed", done: true },
          { item: "Feature candidates listed", done: true },
          { item: "Hypotheses documented", done: true },
        ],
        discussions: [
          {
            id: "d17",
            userId: "u2",
            message: "EDA is done. Key finding: usage drop-off 2 weeks before churn is the strongest signal. Also, customers who don't adopt key features in the first 30 days have a 3x higher churn rate.",
            type: "clarification",
            createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
          },
          {
            id: "d18",
            userId: "u1",
            message: "The 30-day adoption finding is very actionable regardless of model outcome. Flag this for the product team. Did you check for seasonal patterns? Q4 renewals might skew the data.",
            type: "question",
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att7",
            title: "EDA Notebook - Customer Behavioral Patterns",
            type: "document",
            uploadedBy: "u2",
            url: "https://jupyter.company.dev/notebooks/churn-eda-v1",
            createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 3: Experiment & Model Building
      {
        id: "ph9",
        name: "Experiment & Model Building",
        description: "Train baseline and optimized models, run experiments, track with MLflow.",
        status: "active",
        order: 2,
        estimatedDuration: "1-2 weeks",
        signOffRequired: false,
        checklist: [
          { item: "Baseline model established", done: true },
          { item: "Experiments tracked in MLflow", done: true },
          { item: "Hyperparameter tuning done", done: false },
          { item: "SHAP analysis complete", done: false },
        ],
        discussions: [
          {
            id: "d19",
            userId: "u4",
            message: "Baseline XGBoost is at 78% precision, 71% recall. That's already close to the 80% target with no tuning. Should we raise the bar?",
            type: "question",
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
          {
            id: "d20",
            userId: "u1",
            message: "Great progress. Keep the 80% target for now but note in the report if we exceed it. Focus on SHAP analysis — I need the model to be explainable for the board presentation.",
            type: "clarification",
            createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
          },
        ],
        attachments: [
          {
            id: "att8",
            title: "Baseline Model Results - LR vs XGBoost",
            type: "document",
            uploadedBy: "u4",
            url: "https://jupyter.company.dev/notebooks/churn-baseline-v1",
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
      },
      // Phase 4: Evaluation & Analysis
      {
        id: "ph10",
        name: "Evaluation & Analysis",
        description: "Compare model against baseline, perform error analysis, estimate business impact.",
        status: "pending",
        order: 3,
        estimatedDuration: "3-5 days",
        signOffRequired: true,
        checklist: [
          { item: "Model vs baseline comparison", done: false },
          { item: "Error analysis complete", done: false },
          { item: "Business impact estimated", done: false },
          { item: "Cross-validation results documented", done: false },
        ],
        discussions: [],
        attachments: [],
      },
      // Phase 5: Report & Recommendations
      {
        id: "ph11",
        name: "Report & Recommendations",
        description: "Document findings, build prediction pipeline design, present recommendations.",
        status: "pending",
        order: 4,
        estimatedDuration: "3 days",
        signOffRequired: true,
        checklist: [
          { item: "Findings documented", done: false },
          { item: "Recommendations made", done: false },
          { item: "Presentation prepared", done: false },
          { item: "Production pipeline design outlined", done: false },
        ],
        discussions: [],
        attachments: [],
      },
    ],
    updates: [
      {
        id: "upd6",
        projectId: "p2",
        userId: "u2",
        type: "notebook",
        title: "EDA Notebook — Customer Behavioral Patterns",
        description:
          "Comprehensive EDA covering 18 months of customer data.\n\nKey findings:\n1. Usage drop-off 2 weeks before churn is the strongest signal\n2. Support ticket frequency correlates with churn (r=0.42)\n3. Customers who don't adopt key features in first 30 days have 3x churn rate\n4. Data quality is good — only 4% missing values in critical fields",
        link: "https://jupyter.company.dev/notebooks/churn-eda-v1",
        reviewed: true,
        feedback: [
          {
            id: "fb3",
            fromUserId: "u1",
            text: "Excellent EDA. The feature adoption finding in first 30 days is very actionable — flag this for the product team regardless of model outcome.\n\nQuestion: did you check for seasonal patterns in churn? Our Q4 renewals might skew the data.",
            isAi: false,
            actionItems: ["Share 30-day adoption finding with product team", "Check Q4 seasonal patterns"],
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 11 * 86400000).toISOString(),
      },
      {
        id: "upd7",
        projectId: "p2",
        userId: "u4",
        type: "notebook",
        title: "Baseline Model Results — LR vs XGBoost",
        description:
          "Trained baseline models on temporal train/test split.\n\nResults:\n- Logistic Regression: 72% precision, 65% recall\n- XGBoost: 78% precision, 71% recall\n\nTop features: usage_drop_14d, support_tickets_30d, days_since_key_feature_adoption\n\nNext: hyperparameter tuning and SHAP analysis for interpretability.",
        link: "https://jupyter.company.dev/notebooks/churn-baseline-v1",
        reviewed: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: "upd8",
        projectId: "p2",
        userId: "u2",
        type: "meeting_notes",
        title: "Churn Model Review — Week 2",
        description: "Mid-project review of churn prediction model progress",
        attendees: ["u1", "u2", "u4"],
        decisions: [
          "Focus on XGBoost — 6% precision gain over LR justifies complexity",
          "Add customer segment as a feature — enterprise vs SMB may churn differently",
          "Target: 80% precision with 70%+ recall for production deployment",
        ],
        actionItems: [
          { task: "Add customer segment features to model", assigneeId: "u4", dueDate: "2026-04-03" },
          { task: "Run SHAP analysis on XGBoost model", assigneeId: "u4", dueDate: "2026-04-05" },
          { task: "Draft stakeholder presentation outline", assigneeId: "u2", dueDate: "2026-04-07" },
        ],
        reviewed: true,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
    checkpoints: [],
    requirementDoc: {
      currentVersion: 3,
      lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
      currentText:
        "Build a machine learning model to predict customer churn for our SaaS product. Churn is defined as: (a) explicit subscription cancellation, or (b) no login for 45+ consecutive days while still subscribed. Use 18 months of customer data including usage patterns, support tickets, billing history, and feature adoption. Goal: identify at-risk customers 30 days before churn with >85% precision (minimum acceptable: 80%) and >70% recall. Must segment enterprise vs SMB customers. Model must be explainable — SHAP analysis required for stakeholder trust and board presentation. Must produce actionable feature importance rankings.",
      sections: [
        {
          id: "rs6",
          title: "Objective",
          content:
            "Predict customer churn 30 days ahead with >85% precision (minimum acceptable: 80%) and >70% recall. Produce actionable early warning signals that enable the customer success team to intervene before churn occurs.",
          lastModifiedBy: "u1",
          lastModifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "rs7",
          title: "Data Sources",
          content:
            "1. Usage patterns: login frequency, feature usage, session duration, usage drop-off trends.\n2. Support tickets: frequency, severity, resolution time, satisfaction scores.\n3. Billing history: plan type, payment failures, upgrade/downgrade events.\n4. Feature adoption: key feature usage in first 30 days, feature breadth score.",
          lastModifiedBy: "u2",
          lastModifiedAt: new Date(Date.now() - 11 * 86400000).toISOString(),
        },
        {
          id: "rs8",
          title: "Success Criteria",
          content:
            "1. Precision >85% (minimum acceptable: 80%) on held-out temporal test set.\n2. Recall >70% to ensure sufficient coverage of at-risk customers.\n3. Actionable feature importance via SHAP analysis — model must be explainable for board presentation.\n4. Enterprise vs SMB segmentation included as model feature.",
          lastModifiedBy: "u4",
          lastModifiedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          id: "rs9",
          title: "Constraints",
          content:
            "1. Must work on 18 months of historical data (oldest records may have quality issues).\n2. Must be explainable — no black-box models without SHAP or similar interpretability.\n3. Strict temporal train/test split to prevent data leakage.\n4. Must handle class imbalance (churn is a rare event).",
          lastModifiedBy: "u2",
          lastModifiedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
      ],
      changes: [
        {
          id: "rc5",
          version: 1,
          changedBy: "u1",
          changeType: "initial",
          impact: "none",
          title: "Initial requirement from CEO",
          description:
            "Original requirement defining churn prediction scope: 18 months of data, 30-day prediction window, >80% precision target.",
          newText:
            "Build a machine learning model to predict customer churn for our SaaS product. We have 18 months of customer data including usage patterns, support tickets, billing history, and feature adoption. Goal: identify at-risk customers 30 days before churn with >80% precision.",
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
        {
          id: "rc6",
          version: 2,
          changedBy: "u4",
          changeType: "refinement",
          impact: "plan_and_design",
          title: "Added enterprise vs SMB segmentation requirement",
          description:
            "After team discussion, added requirement to include customer segment (enterprise vs SMB) as a model feature. Enterprise and SMB customers have different churn patterns and contract cycles.",
          previousText: "Goal: identify at-risk customers 30 days before churn with >80% precision.",
          newText:
            "Goal: identify at-risk customers 30 days before churn with >80% precision. Must segment enterprise vs SMB customers as a model feature.",
          discussionIds: ["rd11", "rd12"],
          approvedBy: ["u1", "u2"],
          createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        {
          id: "rc7",
          version: 3,
          changedBy: "u1",
          changeType: "refinement",
          impact: "development_only",
          title: "Raised precision target after strong baseline results",
          description:
            "Baseline XGBoost model achieved 78% precision with no tuning, exceeding expectations. Raised the aspirational target to 85% while keeping 80% as the minimum acceptable threshold.",
          previousText: ">80% precision target.",
          newText: ">85% precision target (minimum acceptable: 80%).",
          discussionIds: ["rd13", "rd14"],
          approvedBy: ["u1"],
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
      ],
      discussions: [
        {
          id: "rd9",
          userId: "u2",
          message: "How do we define churn? Non-login for 30 days or cancelled subscription?",
          type: "question",
          resolved: true,
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
        {
          id: "rd10",
          userId: "u1",
          message: "Cancelled subscription OR no login for 45 days. The inactive-but-subscribed group is actually more valuable to identify since we can still intervene.",
          type: "clarification",
          resolved: true,
          createdAt: new Date(Date.now() - 14 * 86400000 + 3600000).toISOString(),
        },
        {
          id: "rd11",
          userId: "u4",
          message: "Should we segment enterprise vs SMB separately? Their churn patterns are likely very different — enterprise has longer contracts.",
          type: "question",
          resolved: true,
          createdAt: new Date(Date.now() - 13.5 * 86400000).toISOString(),
        },
        {
          id: "rd12",
          userId: "u1",
          message: "Yes, good catch — add customer segment as a feature. If SHAP shows it's dominant we can build separate models later.",
          type: "approval",
          linkedChangeId: "rc6",
          resolved: true,
          createdAt: new Date(Date.now() - 13 * 86400000).toISOString(),
        },
        {
          id: "rd13",
          userId: "u2",
          message: "Baseline XGBoost is at 78% precision with no tuning. Should we raise the bar to 85%?",
          type: "suggestion",
          linkedChangeId: "rc7",
          resolved: true,
          createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "rd14",
          userId: "u1",
          message: "Let's target 85% but keep 80% as minimum acceptable. We don't want to over-optimize at the expense of recall.",
          type: "clarification",
          linkedChangeId: "rc7",
          resolved: true,
          createdAt: new Date(Date.now() - 1.5 * 86400000).toISOString(),
        },
      ],
    },
    documents: [
      // ── Document 1: Requirements Document ──
      {
        id: "doc-p2-req",
        type: "requirement" as DocumentType,
        title: "Churn Prediction Requirements",
        description: "Problem statement, data sources, and model requirements for the churn prediction project",
        currentVersion: 3,
        status: "approved" as const,
        createdBy: "u1",
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
        sections: [
          {
            id: "dp2s1",
            title: "Problem Statement",
            content: "Customer churn is costing the business significant revenue. We need a predictive model that can identify at-risk customers 30 days before churn occurs, enabling the customer success team to intervene proactively. Churn defined as: (a) explicit subscription cancellation, or (b) no login for 45+ consecutive days while subscribed.",
            order: 1,
            lastModifiedBy: "u1",
            lastModifiedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "dp2s2",
            title: "Data Sources",
            content: "1. Usage patterns: login frequency, feature usage, session duration, usage drop-off trends.\n2. Support tickets: frequency, severity, resolution time, satisfaction scores.\n3. Billing history: plan type, payment failures, upgrade/downgrade events.\n4. Feature adoption: key feature usage in first 30 days, feature breadth score.",
            order: 2,
            lastModifiedBy: "u2",
            lastModifiedAt: new Date(Date.now() - 11 * 86400000).toISOString(),
          },
          {
            id: "dp2s3",
            title: "Model Requirements",
            content: "1. Precision >85% (minimum acceptable: 80%) on held-out temporal test set.\n2. Recall >70% to ensure sufficient coverage of at-risk customers.\n3. Actionable feature importance via SHAP analysis \u2014 model must be explainable for board presentation.\n4. Enterprise vs SMB segmentation included as model feature.\n5. Strict temporal train/test split to prevent data leakage.",
            order: 3,
            lastModifiedBy: "u4",
            lastModifiedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dp2c1",
            version: 1,
            changedBy: "u1",
            changeType: "initial",
            impact: "none",
            title: "Initial requirement from CEO",
            description: "Original requirement defining churn prediction scope: 18 months of data, 30-day prediction window, >80% precision target.",
            newText: "Build a machine learning model to predict customer churn for our SaaS product with >80% precision.",
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "dp2c2",
            version: 2,
            changedBy: "u4",
            changeType: "refinement",
            impact: "plan_and_design",
            title: "Added enterprise vs SMB segmentation requirement",
            description: "After team discussion, added requirement to include customer segment (enterprise vs SMB) as a model feature.",
            previousText: "Goal: identify at-risk customers 30 days before churn with >80% precision.",
            newText: "Goal: identify at-risk customers 30 days before churn with >80% precision. Must segment enterprise vs SMB customers.",
            approvedBy: ["u1", "u2"],
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        discussions: [
          {
            id: "dp2d1",
            userId: "u2",
            message: "How do we define churn? Non-login for 30 days or cancelled subscription?",
            type: "question",
            resolved: true,
            createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
          },
          {
            id: "dp2d2",
            userId: "u1",
            message: "Cancelled subscription OR no login for 45 days. The inactive-but-subscribed group is actually more valuable to identify.",
            type: "clarification",
            resolved: true,
            createdAt: new Date(Date.now() - 14 * 86400000 + 3600000).toISOString(),
          },
        ],
        linkedDocumentIds: ["doc-p2-research"],
        tags: ["requirements", "ml"],
      },
      // ── Document 2: Research Notes ──
      {
        id: "doc-p2-research",
        type: "research" as DocumentType,
        title: "Research Notes",
        description: "Literature review and feature engineering research for the churn prediction model",
        currentVersion: 1,
        status: "active" as const,
        createdBy: "u2",
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 5 * 86400000).toISOString(),
        sections: [
          {
            id: "dp2rs1",
            title: "Literature Review",
            content: "Key findings from academic and industry literature on SaaS churn prediction:\n1. Usage drop-off is the strongest leading indicator (Chen et al., 2024)\n2. Support ticket sentiment analysis adds 3-5% precision lift (Gupta & Lee, 2023)\n3. Feature adoption in first 30 days predicts long-term retention (SaaStr benchmarks)\n4. XGBoost and LightGBM consistently outperform deep learning for tabular churn data",
            order: 1,
            lastModifiedBy: "u2",
            lastModifiedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
          {
            id: "dp2rs2",
            title: "Feature Engineering Approach",
            content: "Planned feature groups:\n1. Behavioral: login_frequency_7d, login_frequency_30d, usage_drop_14d, session_duration_trend\n2. Support: ticket_count_30d, avg_resolution_time, sentiment_score\n3. Billing: mrr, payment_failures_90d, plan_changes_6m, discount_usage\n4. Adoption: key_feature_adoption_30d, feature_breadth_score, time_to_first_key_action\n5. Derived: engagement_score (composite), churn_risk_velocity (rate of change in engagement)",
            order: 2,
            lastModifiedBy: "u4",
            lastModifiedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dp2rc1",
            version: 1,
            changedBy: "u2",
            changeType: "initial",
            impact: "none",
            title: "Initial research notes",
            description: "Compiled literature review findings and planned feature engineering approach.",
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
        ],
        discussions: [],
        linkedDocumentIds: ["doc-p2-req"],
        tags: ["research", "feature-engineering"],
      },
    ],
    aiPlan: {
      summary: "Churn prediction model using customer behavioral data with focus on actionable early warning signals",
      risks: [
        { risk: "Data quality issues in legacy records", mitigation: "Early data audit, imputation strategy", severity: "high" },
        { risk: "Class imbalance (rare churn events)", mitigation: "SMOTE, class weights, appropriate metrics", severity: "medium" },
        { risk: "Feature leakage from post-churn data", mitigation: "Strict temporal split, feature audit", severity: "high" },
      ],
      killCriteria: [
        "Cannot achieve 60% precision after full experiment cycle",
        "Data quality too poor (>30% missing in key fields)",
        "Churn definition cannot be agreed upon",
      ],
    },
  },

  // ========================================
  // P3: Internal Dashboard Redesign
  // ========================================
  {
    id: "p3",
    title: "Internal Dashboard Redesign",
    type: "engineering",
    category: "engineering",
    requirement: "Redesign the internal analytics dashboard to improve load time (currently 12s) and add real-time data streaming (currently 15 min stale).",
    outcomeType: "web_app",
    outcomeDescription: "Rebuilt analytics dashboard with sub-2s load time and real-time WebSocket streaming",
    finalOutcome: {
      expectedType: "web_app",
      expectedDescription: "Production analytics dashboard with real-time streaming and <2s load time",
      status: "delivered",
      actualDeliverable: {
        title: "Internal Analytics Dashboard v2",
        type: "code",
        description: "Rebuilt dashboard with WebSocket streaming and optimized queries",
        submittedBy: "u3",
        submittedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        verifiedBy: "u1",
        verifiedAt: new Date(Date.now() - 17 * 86400000).toISOString(),
        feedback: "Load time down to 1.8s. Streaming working well. Great work.",
      },
      completionNotes: "Delivered ahead of schedule. Load time reduced from 12s to 1.8s.",
    },
    intermediateSubmissions: [],
    status: "completed",
    priority: "medium",
    currentPhase: "Done",
    timeboxDays: 14,
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    techStack: ["React", "TypeScript", "WebSocket", "D3.js", "Redis"],
    assigneeIds: ["u3"],
    ownerId: "u3",
    tasks: [
      // ---- Task 12: Requirements & Performance Audit ----
      {
        id: "t12",
        title: "Requirements Gathering & Performance Audit",
        description: "Audit the existing dashboard's performance bottlenecks, collect user feedback, and define measurable improvement targets for the redesign.",
        assigneeId: "u3",
        phaseId: "ph12",
        approach: "Profile the existing dashboard with Chrome DevTools and Lighthouse, interview 5 key internal users, and document performance baselines and user pain points.",
        planStatus: "finalized",
        steps: [
          { id: "ts40", description: "Profile existing dashboard load time and render performance", expectedOutcome: "Performance report with waterfall charts showing 12s load bottleneck breakdown", category: "research", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 29 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts41", description: "Collect user feedback on current dashboard pain points", expectedOutcome: "Summary of top 5 user complaints with frequency data", category: "research", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: new Date(Date.now() - 28.5 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts42", description: "Define performance targets and success metrics", expectedOutcome: "Document with <2s load time target, <5s streaming latency, and UX improvement goals", category: "documentation", estimatedHours: 1.5, actualHours: 1, status: "completed", completedAt: new Date(Date.now() - 28 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u1" },
        ],
        successCriteria: ["Performance bottlenecks identified and documented", "User pain points cataloged", "Measurable targets approved by CEO"],
        killCriteria: [],
        estimatedHours: 6.5,
        status: "completed",
        updates: [
          { id: "tu12a", userId: "u3", message: "Biggest bottleneck is the aggregation queries — 8s of the 12s load time. Users also hate the 15-min staleness.", createdAt: new Date(Date.now() - 28 * 86400000).toISOString() },
        ],
        priority: "high",
        milestones: [],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
      },
      // ---- Task 13: Architecture & Component Design ----
      {
        id: "t13",
        title: "WebSocket Architecture & Component Design",
        description: "Design the new WebSocket-based real-time architecture, define the React component hierarchy, and produce the design document for review.",
        assigneeId: "u3",
        phaseId: "ph13",
        approach: "Evaluate WebSocket vs SSE for streaming, design component hierarchy with D3.js for charts, and produce architecture diagram with data flow.",
        planStatus: "finalized",
        steps: [
          { id: "ts43", description: "Evaluate streaming approaches (WebSocket vs SSE vs polling)", expectedOutcome: "Comparison document recommending WebSocket with justification", category: "research", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 27 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts44", description: "Design React component hierarchy and state management", expectedOutcome: "Component tree diagram with data flow and state management strategy", category: "design", estimatedHours: 4, actualHours: 4.5, status: "completed", completedAt: new Date(Date.now() - 26 * 86400000).toISOString(), assigneeId: "u3", notes: "Opted for React context + useReducer over Redux for simplicity" },
          { id: "ts45", description: "Create architecture diagram and get sign-off", expectedOutcome: "Architecture document with WebSocket flow, Redis caching layer, and component design approved", category: "design", estimatedHours: 3, actualHours: 3, status: "completed", completedAt: new Date(Date.now() - 25 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u1" },
        ],
        successCriteria: ["Architecture diagram approved", "Component hierarchy defined", "WebSocket approach justified with benchmarks"],
        killCriteria: [],
        estimatedHours: 10,
        status: "completed",
        updates: [
          { id: "tu13a", userId: "u3", message: "WebSocket chosen over SSE — need bidirectional comms for filter changes. Redis pub/sub will fan out updates.", createdAt: new Date(Date.now() - 26 * 86400000).toISOString() },
        ],
        priority: "high",
        milestones: [],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
      },
      // ---- Task 14: Core Dashboard Development ----
      {
        id: "t14",
        title: "Core Dashboard Implementation",
        description: "Build the new dashboard with React component library, WebSocket streaming integration, optimized queries, and D3.js visualizations.",
        assigneeId: "u3",
        phaseId: "ph14",
        approach: "Build incrementally: core layout and component library first, then data pipeline with Redis caching, then WebSocket streaming, and finally D3 visualizations.",
        planStatus: "finalized",
        steps: [
          { id: "ts46", description: "Build reusable React component library (cards, tables, filters)", expectedOutcome: "Storybook with 12+ dashboard components ready for composition", category: "development", estimatedHours: 10, actualHours: 11, status: "completed", completedAt: new Date(Date.now() - 22 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts47", description: "Implement optimized data pipeline with Redis caching", expectedOutcome: "API endpoints with Redis caching reducing query time from 8s to <500ms", category: "development", estimatedHours: 8, actualHours: 7, status: "completed", completedAt: new Date(Date.now() - 21 * 86400000).toISOString(), assigneeId: "u3", notes: "Redis materialized views cut aggregation queries by 90%" },
          { id: "ts48", description: "Integrate WebSocket real-time streaming", expectedOutcome: "Live data updates via WebSocket with <5s latency from event to dashboard", category: "development", estimatedHours: 6, actualHours: 7, status: "completed", completedAt: new Date(Date.now() - 20 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts49", description: "Build D3.js chart visualizations", expectedOutcome: "Interactive charts (line, bar, heatmap) rendering with real-time data feeds", category: "development", estimatedHours: 6, actualHours: 5, status: "completed", completedAt: new Date(Date.now() - 19 * 86400000).toISOString(), assigneeId: "u3" },
        ],
        successCriteria: ["Load time under 2s target", "Real-time streaming with <5s latency", "All dashboard views rebuilt with new components"],
        killCriteria: [],
        estimatedHours: 30,
        status: "completed",
        updates: [
          { id: "tu14a", userId: "u3", message: "Component library done. Redis caching brought query time from 8s to 400ms — massive win.", createdAt: new Date(Date.now() - 21 * 86400000).toISOString() },
          { id: "tu14b", userId: "u3", message: "WebSocket streaming working end-to-end. Dashboard now updates within 3s of any event.", createdAt: new Date(Date.now() - 19 * 86400000).toISOString() },
        ],
        priority: "high",
        milestones: [],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 19 * 86400000).toISOString(),
      },
      // ---- Task 15: Testing & Performance Validation ----
      {
        id: "t15",
        title: "Testing & Performance Validation",
        description: "Comprehensive testing including unit tests, integration tests, load testing, and performance validation against the <2s target.",
        assigneeId: "u3",
        phaseId: "ph15",
        approach: "Write unit tests for components and data layer, run Lighthouse audits, load test with k6 to simulate 100+ concurrent users, and validate WebSocket reconnection.",
        planStatus: "finalized",
        steps: [
          { id: "ts50", description: "Write unit and integration tests for React components", expectedOutcome: "85%+ test coverage on dashboard components with passing CI", category: "testing", estimatedHours: 5, actualHours: 5, status: "completed", completedAt: new Date(Date.now() - 18.5 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts51", description: "Load test with k6 and validate performance targets", expectedOutcome: "Load test report showing <2s load time under 100 concurrent users", category: "testing", estimatedHours: 3, actualHours: 3.5, status: "completed", completedAt: new Date(Date.now() - 18 * 86400000).toISOString(), assigneeId: "u3", notes: "Achieved 1.8s p95 load time under 150 concurrent users" },
          { id: "ts52", description: "Code review and security audit", expectedOutcome: "All PR feedback addressed, no critical security findings", category: "review", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: new Date(Date.now() - 17.5 * 86400000).toISOString(), assigneeId: "u3", reviewStatus: "approved", reviewerId: "u5" },
        ],
        successCriteria: ["85%+ test coverage", "Load time <2s at p95 under load", "Code review approved with no blockers"],
        killCriteria: [],
        estimatedHours: 10,
        status: "completed",
        updates: [
          { id: "tu15a", userId: "u3", message: "All tests passing. Load test shows 1.8s p95 under 150 concurrent users. WebSocket reconnection works cleanly.", createdAt: new Date(Date.now() - 18 * 86400000).toISOString() },
        ],
        priority: "medium",
        milestones: [],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 19 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 17.5 * 86400000).toISOString(),
      },
      // ---- Task 16: Deployment & Monitoring Setup ----
      {
        id: "t16",
        title: "Staged Deployment & Monitoring Setup",
        description: "Deploy the rebuilt dashboard to production via staged rollout and configure monitoring dashboards for performance tracking.",
        assigneeId: "u3",
        phaseId: "ph16",
        approach: "Deploy to staging first for smoke tests, then canary rollout to 10% of users, then full production. Set up Grafana dashboards for load time and WebSocket health.",
        planStatus: "finalized",
        steps: [
          { id: "ts53", description: "Deploy to staging and run smoke tests", expectedOutcome: "Staging environment fully functional with all smoke tests passing", category: "deployment", estimatedHours: 2, actualHours: 1.5, status: "completed", completedAt: new Date(Date.now() - 17 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts54", description: "Canary rollout and production deployment", expectedOutcome: "Dashboard live in production for all users with zero downtime", category: "deployment", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: new Date(Date.now() - 17 * 86400000).toISOString(), assigneeId: "u3" },
          { id: "ts55", description: "Configure Grafana monitoring and alerts", expectedOutcome: "Monitoring dashboard tracking load time, WebSocket connections, error rates with alerts", category: "deployment", estimatedHours: 2, actualHours: 1.5, status: "completed", completedAt: new Date(Date.now() - 17 * 86400000).toISOString(), assigneeId: "u3" },
        ],
        successCriteria: ["Zero-downtime deployment", "Monitoring dashboards live", "Alert thresholds configured for load time regression"],
        killCriteria: [],
        estimatedHours: 6,
        status: "completed",
        updates: [
          { id: "tu16a", userId: "u3", message: "Production deployment complete. Grafana dashboards tracking load time (avg 1.6s), WebSocket connections (stable), and error rates (<0.1%).", createdAt: new Date(Date.now() - 17 * 86400000).toISOString() },
        ],
        priority: "medium",
        milestones: [],
        deadlineExtensions: [],
        createdAt: new Date(Date.now() - 17.5 * 86400000).toISOString(),
        completedAt: new Date(Date.now() - 17 * 86400000).toISOString(),
      },
    ],
    phases: [
      {
        id: "ph12",
        name: "Requirement Understanding",
        description: "Define performance targets and user requirements for the dashboard redesign.",
        status: "completed",
        order: 0,
        estimatedDuration: "1 day",
        signOffRequired: true,
        signedOffBy: ["u1", "u3"],
        checklist: [
          { item: "Performance targets set", done: true },
          { item: "User feedback collected", done: true },
        ],
        discussions: [],
        attachments: [],
      },
      {
        id: "ph13",
        name: "Design Understanding & Design Freeze",
        description: "Finalize the WebSocket-based architecture and component design.",
        status: "completed",
        order: 1,
        estimatedDuration: "2 days",
        signOffRequired: true,
        signedOffBy: ["u1", "u3"],
        checklist: [
          { item: "Architecture diagram provided", done: true },
          { item: "Component hierarchy defined", done: true },
        ],
        discussions: [],
        attachments: [],
      },
      {
        id: "ph14",
        name: "Development",
        description: "Implement the rebuilt dashboard with real-time streaming.",
        status: "completed",
        order: 2,
        estimatedDuration: "1 week",
        signOffRequired: false,
        signedOffBy: ["u1"],
        checklist: [
          { item: "Core views rebuilt", done: true },
          { item: "WebSocket streaming integrated", done: true },
          { item: "Load time under 2s target met", done: true },
        ],
        discussions: [],
        attachments: [],
      },
      {
        id: "ph15",
        name: "Testing & Review",
        description: "Performance testing and code review.",
        status: "completed",
        order: 3,
        estimatedDuration: "2 days",
        signOffRequired: true,
        signedOffBy: ["u1"],
        checklist: [
          { item: "Load test passed", done: true },
          { item: "Code review complete", done: true },
        ],
        discussions: [],
        attachments: [],
      },
      {
        id: "ph16",
        name: "Deployment",
        description: "Staged rollout to production with monitoring.",
        status: "completed",
        order: 4,
        estimatedDuration: "1 day",
        signOffRequired: true,
        signedOffBy: ["u1"],
        checklist: [
          { item: "Staging verified", done: true },
          { item: "Production deployed", done: true },
          { item: "Monitoring confirmed", done: true },
        ],
        discussions: [],
        attachments: [],
      },
    ],
    updates: [],
    checkpoints: [],
    requirementDoc: {
      currentVersion: 1,
      lastUpdated: new Date(Date.now() - 30 * 86400000).toISOString(),
      currentText:
        "Redesign the internal analytics dashboard to improve load time (currently 12s, target <2s) and add real-time data streaming (currently 15 min stale, target <5s). Use WebSocket-based architecture for live data updates.",
      sections: [
        {
          id: "rs10",
          title: "Overview",
          content:
            "Rebuild the internal analytics dashboard to dramatically improve performance and add real-time data capabilities. Current load time of 12s is unacceptable; target is under 2 seconds. Replace 15-minute polling with WebSocket streaming.",
          lastModifiedBy: "u1",
          lastModifiedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
      ],
      changes: [
        {
          id: "rc8",
          version: 1,
          changedBy: "u1",
          changeType: "initial",
          impact: "none",
          title: "Initial requirement from CEO",
          description:
            "Original requirement defining the dashboard redesign scope: load time improvement and real-time streaming.",
          newText:
            "Redesign the internal analytics dashboard to improve load time (currently 12s) and add real-time data streaming (currently 15 min stale).",
          createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        },
      ],
      discussions: [],
    },
    documents: [],
    aiPlan: { summary: "Rebuild dashboard with real-time streaming and optimized queries", risks: [], killCriteria: [] },
  },

  // ========================================
  // P4: Competitor Landscape & Market Positioning Analysis
  // ========================================
  {
    id: "p4",
    title: "Competitor Landscape & Market Positioning Analysis",
    type: "strategy",
    category: "strategy",
    requirement: "Analyze top 10 competitors in the API management space, identify gaps in the market, and recommend positioning strategy for our product launch",
    outcomeType: "market_analysis",
    outcomeDescription: "Comprehensive market analysis report with competitive matrix, positioning recommendations, and go-to-market suggestions",
    finalOutcome: {
      expectedType: "market_analysis",
      expectedDescription: "Board-ready market analysis with competitive matrix, positioning strategy, and GTM recommendations",
      status: "in_progress",
    },
    intermediateSubmissions: [
      { id: "is-7", title: "Competitor Feature Matrix v1", type: "document", description: "Feature comparison of 10 competitors across 20+ dimensions", submittedBy: "u4", submittedAt: new Date(Date.now() - 6 * 86400000).toISOString(), status: "approved", reviewedBy: "u1", reviewedAt: new Date(Date.now() - 5 * 86400000).toISOString(), feedback: "Add API analytics comparison column", isKeyMilestone: true },
    ],
    status: "active",
    priority: "high",
    currentPhase: "Research & Analysis",
    timeboxDays: 21,
    startDate: new Date(Date.now() - 12 * 86400000).toISOString(),
    techStack: ["Google Sheets", "Notion", "Figma"],
    assigneeIds: ["u4", "u7", "u8"],
    ownerId: "u8",
    coOwnerIds: ["u7"],
    tasks: [
      // ---- Task 10: Competitor Research ----
      {
        id: "t10",
        title: "Competitor Feature & Pricing Analysis",
        description: "Research and document features, pricing tiers, and market positioning of top 10 API management competitors",
        assigneeId: "u4",
        approach: "Systematic analysis of public information, product trials, and review sites",
        planStatus: "finalized",
        steps: [
          { id: "ts30a", description: "Identify and list top 10 competitors", expectedOutcome: "Ranked list of competitors by market share with brief profiles", category: "research", estimatedHours: 3, actualHours: 2.5, status: "completed", completedAt: new Date(Date.now() - 10 * 86400000).toISOString(), assigneeId: "u4" },
          { id: "ts31a", description: "Deep-dive feature comparison", expectedOutcome: "Feature matrix spreadsheet comparing all competitors across 20+ dimensions", category: "research", estimatedHours: 8, actualHours: 9, status: "completed", completedAt: new Date(Date.now() - 7 * 86400000).toISOString(), assigneeId: "u4", notes: "Added 5 more competitors based on CEO feedback" },
          { id: "ts32a", description: "Pricing tier analysis", expectedOutcome: "Pricing comparison table with value-per-tier breakdown", category: "research", estimatedHours: 4, status: "in_progress", assigneeId: "u4" },
          { id: "ts33a", description: "Compile competitor analysis report", expectedOutcome: "Final report document with insights and recommendations", category: "documentation", estimatedHours: 6, status: "pending", assigneeId: "u4", dependencies: ["ts32a"] },
        ],
        successCriteria: ["All 10 competitors analyzed", "Feature matrix covers all key dimensions", "Pricing analysis includes hidden costs"],
        killCriteria: [],
        estimatedHours: 21,
        status: "in_progress",
        priority: "high",
        milestones: [
          {
            id: "tm10a",
            title: "Competitor Matrix Draft",
            description: "First draft of the competitive feature matrix",
            deliverableType: "document",
            successCriteria: ["Covers all 10 competitors", "At least 15 feature dimensions"],
            status: "completed",
            assigneeId: "u4",
            targetDay: 7,
            outcome: "met",
            outcomeNotes: "Feature matrix covers 10 competitors across 22 dimensions.",
            deliverables: [
              {
                id: "d10a",
                type: "document",
                title: "Competitor Feature Matrix v1",
                status: "verified",
                documentUrl: "#",
                verifiedBy: "u1",
                verifiedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
                feedback: "Great depth, add API analytics comparison",
                createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
              },
            ],
            updates: [],
            completedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: "tm10b",
            title: "Final Analysis Report",
            description: "Complete market analysis with positioning recommendations",
            deliverableType: "ppt",
            successCriteria: ["Executive summary included", "SWOT analysis for each competitor", "Positioning recommendations with rationale"],
            status: "in_progress",
            assigneeId: "u4",
            targetDay: 18,
            deliverables: [],
            updates: [
              { id: "mu10b1", userId: "u4", message: "Working on SWOT analysis section. Pricing analysis taking longer than expected due to complex enterprise tiers.", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() },
            ],
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        updates: [
          { id: "tu10a", userId: "u4", message: "Completed deep-dive on first 5 competitors. Key finding: most lack granular rate limiting, which is our differentiator.", createdAt: new Date(Date.now() - 8 * 86400000).toISOString() },
          { id: "tu10b", userId: "u4", message: "Finished all 10 competitor profiles. Starting pricing analysis.", createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
        ],
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      },
      // ---- Task 11: Market Positioning ----
      {
        id: "t11",
        title: "Positioning Strategy & GTM Recommendations",
        description: "Based on competitor analysis, develop market positioning strategy and go-to-market recommendations",
        assigneeId: "u4",
        approach: "Synthesize competitor gaps with our strengths to define unique positioning",
        planStatus: "ai_generated",
        aiGeneratedPlan: {
          approach: "Analyze competitor weaknesses, map to our strengths, develop positioning statement and GTM playbook",
          steps: ["Identify competitor gaps and market whitespace", "Map our product strengths to market needs", "Draft positioning statement options", "Develop GTM channel recommendations", "Create executive presentation"],
          generatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        },
        steps: [
          { id: "ts34", description: "Gap analysis and whitespace identification", expectedOutcome: "Document listing market gaps and unmet needs", category: "research", estimatedHours: 4, status: "pending", assigneeId: "u4" },
          { id: "ts35", description: "Draft positioning statements", expectedOutcome: "3-5 positioning statement options with rationale", category: "documentation", estimatedHours: 3, status: "pending", assigneeId: "u4", dependencies: ["ts34"] },
          { id: "ts36", description: "GTM channel recommendations", expectedOutcome: "Channel strategy document with budget estimates", category: "research", estimatedHours: 5, status: "pending", assigneeId: "u4", dependencies: ["ts35"] },
          { id: "ts37", description: "Executive presentation", expectedOutcome: "Board-ready presentation deck with all findings", category: "documentation", estimatedHours: 4, status: "pending", assigneeId: "u4", dependencies: ["ts36"] },
        ],
        successCriteria: ["Clear positioning differentiation", "Actionable GTM recommendations", "Executive presentation approved"],
        killCriteria: ["Market too saturated for differentiation"],
        estimatedHours: 16,
        status: "planning",
        priority: "medium",
        milestones: [
          {
            id: "tm11a",
            title: "Positioning Deck",
            description: "Final positioning and GTM presentation",
            deliverableType: "ppt",
            successCriteria: ["Board-ready quality", "Data-backed recommendations"],
            status: "pending",
            assigneeId: "u4",
            targetDay: 21,
            deliverables: [],
            updates: [],
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
          },
        ],
        deadlineExtensions: [],
        updates: [],
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
    ],
    phases: [
      {
        id: "ph17",
        name: "Requirement Understanding",
        description: "Align on research scope, competitor list, and deliverable expectations.",
        status: "completed",
        order: 0,
        estimatedDuration: "1 day",
        signOffRequired: true,
        signedOffBy: ["u1", "u4"],
        checklist: [
          { item: "Competitor list finalized", done: true },
          { item: "Research dimensions agreed", done: true },
          { item: "Deliverable format confirmed", done: true },
        ],
        discussions: [
          { id: "d13", userId: "u4", message: "Should we include open-source API gateways like Kong and Tyk in the analysis, or only commercial competitors?", type: "question", createdAt: new Date(Date.now() - 12 * 86400000).toISOString() },
          { id: "d14", userId: "u1", message: "Include both. Open-source options are a key part of the competitive landscape. Enterprise buyers evaluate them too.", type: "clarification", createdAt: new Date(Date.now() - 12 * 86400000 + 3600000).toISOString() },
        ],
        attachments: [],
      },
      {
        id: "ph18",
        name: "Research & Analysis",
        description: "Deep-dive competitor analysis, feature comparison, and pricing research.",
        status: "active",
        order: 1,
        estimatedDuration: "2 weeks",
        signOffRequired: false,
        checklist: [
          { item: "All 10 competitors profiled", done: true },
          { item: "Feature matrix complete", done: true },
          { item: "Pricing analysis complete", done: false },
          { item: "SWOT analysis complete", done: false },
        ],
        discussions: [
          { id: "d15", userId: "u4", message: "Several competitors have hidden enterprise pricing. I'm reaching out to their sales teams for accurate data.", type: "clarification", createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
        ],
        attachments: [
          { id: "att6", title: "Competitor Feature Matrix v1", type: "document", uploadedBy: "u4", url: "#", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
        ],
      },
      {
        id: "ph19",
        name: "Strategy & Recommendations",
        description: "Synthesize findings into positioning strategy and GTM recommendations.",
        status: "pending",
        order: 2,
        estimatedDuration: "1 week",
        signOffRequired: true,
        checklist: [
          { item: "Gap analysis complete", done: false },
          { item: "Positioning statements drafted", done: false },
          { item: "GTM recommendations documented", done: false },
          { item: "Executive presentation ready", done: false },
        ],
        discussions: [],
        attachments: [],
      },
    ],
    updates: [
      {
        id: "upd9",
        projectId: "p4",
        userId: "u4",
        type: "status_update",
        title: "Research Phase Progress Update",
        description: "",
        whatWasDone: "Completed feature matrix for all 10 competitors. Started pricing tier analysis.",
        blockers: "Some enterprise pricing is not publicly available — reaching out to sales teams.",
        nextSteps: "Complete pricing analysis, begin SWOT analysis for each competitor.",
        reviewed: true,
        feedback: [
          { id: "fb4", fromUserId: "u1", text: "Good progress. Make sure to capture API analytics as a comparison dimension — it's a gap we can exploit.", isAi: false, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
        ],
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: "upd10",
        projectId: "p4",
        userId: "u4",
        type: "status_update",
        title: "Pricing Analysis Update",
        description: "",
        whatWasDone: "Received enterprise pricing from 3 of 5 vendors. Analyzing tier structures.",
        blockers: "Waiting on pricing info from 2 competitors (Apigee, MuleSoft).",
        nextSteps: "Follow up on outstanding pricing, compile initial SWOT drafts.",
        reviewed: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    checkpoints: [
      {
        id: "cp3",
        projectId: "p4",
        decision: "continue",
        notes: "Day 12 check-in: Feature matrix is thorough and reveals clear gaps in the market. Pricing analysis in progress. On track for 21-day timebox.",
        aiInsights: "Research phase is 60% complete at day 12 of 21 — on track. Key finding so far: most competitors lack granular rate limiting, which aligns with our product differentiator.",
        actionItems: [
          "Follow up on enterprise pricing from Apigee and MuleSoft",
          "Schedule CEO review of draft positioning statements",
        ],
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
    ],
    documents: [
      // ── Document 1: Requirements ──
      {
        id: "doc-p4-req",
        type: "requirement" as DocumentType,
        title: "Market Analysis Requirements",
        description: "Objective, scope, and deliverables for the competitor landscape analysis",
        currentVersion: 1,
        status: "approved" as const,
        createdBy: "u1",
        createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 12 * 86400000).toISOString(),
        sections: [
          {
            id: "dp4s1",
            title: "Objective",
            content: "Analyze the competitive landscape in the API management space to identify market gaps and inform our product positioning strategy for launch. Must cover both commercial and open-source competitors.",
            order: 1,
            lastModifiedBy: "u1",
            lastModifiedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: "dp4s2",
            title: "Scope",
            content: "Top 10 competitors including commercial (Apigee, MuleSoft, AWS API Gateway, Azure API Management) and open-source (Kong, Tyk, KrakenD). Analysis dimensions: features, pricing, developer experience, enterprise readiness, analytics capabilities.",
            order: 2,
            lastModifiedBy: "u4",
            lastModifiedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
          {
            id: "dp4s3",
            title: "Deliverables",
            content: "1. Competitive feature matrix (spreadsheet)\n2. Pricing tier comparison with hidden cost analysis\n3. SWOT analysis for each competitor\n4. Gap analysis identifying market whitespace\n5. Positioning strategy recommendations (board-ready presentation)",
            order: 3,
            lastModifiedBy: "u1",
            lastModifiedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dp4c1",
            version: 1,
            changedBy: "u1",
            changeType: "initial",
            impact: "none",
            title: "Initial analysis requirements",
            description: "Defined scope, competitor list, and expected deliverables for the market analysis project.",
            createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
          },
        ],
        discussions: [],
        linkedDocumentIds: ["doc-p4-research"],
        tags: ["requirements", "strategy"],
      },
      // ── Document 2: Market Analysis Framework ──
      {
        id: "doc-p4-research",
        type: "research" as DocumentType,
        title: "Market Analysis Framework",
        description: "Competitor evaluation criteria and analysis methodology",
        currentVersion: 1,
        status: "active" as const,
        createdBy: "u4",
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        lastUpdated: new Date(Date.now() - 6 * 86400000).toISOString(),
        sections: [
          {
            id: "dp4rs1",
            title: "Competitor Matrix Criteria",
            content: "Evaluation dimensions: (1) Core Features \u2014 routing, auth, rate limiting, transformation, caching. (2) Developer Experience \u2014 SDK quality, documentation, CLI tools, local dev. (3) Enterprise Readiness \u2014 SSO, RBAC, audit logs, compliance certs. (4) Analytics \u2014 API usage dashboards, anomaly detection, custom reporting. (5) Pricing \u2014 per-call, per-API, flat rate, enterprise negotiable.",
            order: 1,
            lastModifiedBy: "u4",
            lastModifiedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
          {
            id: "dp4rs2",
            title: "Analysis Methodology",
            content: "Three-phase approach: (1) Public information review \u2014 documentation, pricing pages, G2/Gartner reviews. (2) Product trials \u2014 sign up for free tiers, test key features, measure DX. (3) Sales engagement \u2014 request enterprise pricing and feature roadmaps from competitor sales teams. Scoring: 1-5 scale per dimension, weighted by strategic importance.",
            order: 2,
            lastModifiedBy: "u4",
            lastModifiedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          },
        ],
        changes: [
          {
            id: "dp4rc1",
            version: 1,
            changedBy: "u4",
            changeType: "initial",
            impact: "none",
            title: "Initial analysis framework",
            description: "Defined competitor evaluation criteria and three-phase analysis methodology.",
            createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          },
        ],
        discussions: [],
        linkedDocumentIds: ["doc-p4-req"],
        tags: ["research", "framework"],
      },
    ],
    aiPlan: {
      summary: "Comprehensive competitor analysis and market positioning strategy for API management product launch",
      risks: [
        { risk: "Enterprise pricing data unavailable", mitigation: "Use G2/Gartner estimates as fallback", severity: "low" },
        { risk: "Market too crowded for clear differentiation", mitigation: "Focus on niche strengths like granular rate limiting", severity: "medium" },
      ],
      killCriteria: [
        "Cannot identify meaningful product differentiation after full analysis",
        "Market analysis reveals total addressable market too small",
      ],
    },
  },
];

// ---- AI INSIGHTS (for dashboard) ----
export const AI_INSIGHTS: AIInsight[] = [
  {
    id: "ins1",
    type: "blocker",
    severity: "high",
    title: "External dependency risk on API Gateway",
    description: "Vikram is blocked on Redis staging access from DevOps. This has been pending for 2 days and risks delaying rate limiter integration tests.",
    actionItems: ["Escalate Redis staging access with DevOps lead", "Set up local Docker Redis Sentinel as interim workaround"],
    relatedProjectId: "p1",
    relatedUserId: "u5",
  },
  {
    id: "ins2",
    type: "opportunity",
    severity: "medium",
    title: "Churn model baseline exceeds expectations",
    description: "XGBoost baseline at 78% precision is already close to the 80% target with no tuning. With hyperparameter optimization and SHAP-guided feature selection, the team is likely to exceed the target.",
    actionItems: ["Consider raising precision target to 85%", "Start planning production deployment pipeline early"],
    relatedProjectId: "p2",
  },
  {
    id: "ins3",
    type: "suggestion",
    severity: "medium",
    title: "Unreviewed submission pending for 24+ hours",
    description: "Arjun's rate limiter PR has been waiting for review for over a day. Delayed reviews create bottlenecks and block dependent work.",
    actionItems: ["Review rate limiter PR today", "Consider setting a 24-hour review SLA"],
    relatedProjectId: "p1",
    relatedUserId: "u3",
  },
  {
    id: "ins4",
    type: "performance",
    severity: "low",
    title: "Arjun has highest delivery velocity this week",
    description: "Arjun has completed 2 major deliverables (architecture doc + rate limiter) in 7 days across the API Gateway project. Consistently delivering ahead of milestone targets.",
    relatedUserId: "u3",
  },
  {
    id: "ins5",
    type: "risk",
    severity: "medium",
    title: "Churn project at 50% timebox with experiment phase still in progress",
    description: "The Churn Prediction project has used 14 of 28 days but the Experiment phase (3 of 5) is still active. Evaluation and Report phases still remain. Consider whether scope needs trimming.",
    actionItems: ["Discuss scope with Priya and Meera", "Consider combining Evaluation and Report phases"],
    relatedProjectId: "p2",
  },
];

// ---- LEAVE REQUESTS ----
export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "lr1",
    userId: "u3", // Arjun
    type: "planned",
    startDate: new Date(Date.now() + 3 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    days: 3,
    reason: "Family function — sister's wedding",
    status: "approved",
    approvedBy: "u1",
    approvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    coveragePlan: "Vikram will handle any urgent rate limiter issues. Circuit breaker design doc is already shared.",
    contingencyNote: "Will complete Redis connection pooling code before leaving. Vikram has context on the rate limiter architecture.",
    coverPersonId: "u5",
    impacts: [
      {
        taskId: "t4",
        taskTitle: "Token bucket rate limiter with Redis",
        milestoneId: "dm6",
        milestoneTitle: "Redis Integration",
        projectId: "p1",
        projectTitle: "API Gateway & Rate Limiting Service",
        originalDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        impactDays: 2,
        cascadeEffects: [
          {
            affectedUserId: "u5",
            affectedTaskTitle: "Production Deployment & Monitoring",
            delayDays: 2,
            reason: "Deployment depends on rate limiter completion",
          },
        ],
      },
      {
        taskId: "t5",
        taskTitle: "Circuit breaker implementation",
        milestoneId: "dm8",
        milestoneTitle: "State Machine Design",
        projectId: "p1",
        projectTitle: "API Gateway & Rate Limiting Service",
        originalDeadline: new Date(Date.now() + 12 * 86400000).toISOString(),
        impactDays: 3,
        cascadeEffects: [],
      },
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "lr2",
    userId: "u4", // Meera
    type: "planned",
    startDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 8 * 86400000).toISOString(),
    days: 2,
    reason: "Conference — PyData Mumbai 2026",
    status: "pending",
    coveragePlan: "Priya can review model outputs. Hyperparameter tuning will be running on MLflow — just needs monitoring.",
    contingencyNote: "Will kick off final tuning run before leaving. Priya has access to the MLflow dashboard and can flag if metrics degrade.",
    coverPersonId: "u2",
    impacts: [
      {
        taskId: "t8",
        taskTitle: "Hyperparameter tuning for XGBoost",
        milestoneId: "dm14",
        milestoneTitle: "100 Trials Complete",
        projectId: "p2",
        projectTitle: "Customer Churn Prediction Model",
        originalDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
        impactDays: 1,
        cascadeEffects: [
          {
            affectedUserId: "u4",
            affectedTaskTitle: "SHAP analysis for model interpretability",
            delayDays: 1,
            reason: "SHAP analysis requires finalized model from tuning",
          },
        ],
      },
    ],
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "lr3",
    userId: "u5", // Vikram
    type: "sick",
    startDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    endDate: new Date(Date.now()).toISOString(),
    days: 1,
    reason: "Not feeling well — fever",
    status: "approved",
    approvedBy: "u1",
    approvedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    contingencyNote: "PR for JWT middleware is already up for review. No blockers for others today.",
    impacts: [],
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "lr4",
    userId: "u2", // Priya
    type: "wfh",
    startDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    days: 1,
    reason: "Internet installation at new apartment",
    status: "approved",
    approvedBy: "u1",
    approvedAt: new Date(Date.now()).toISOString(),
    contingencyNote: "Will be on Slack. Data pipeline monitoring will continue — no impact on deliverables.",
    impacts: [],
    createdAt: new Date(Date.now()).toISOString(),
  },
  {
    id: "lr5",
    userId: "u3", // Arjun
    type: "half_day",
    startDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    days: 0.5,
    reason: "Doctor appointment — afternoon",
    status: "pending",
    contingencyNote: "Will work in the morning. The circuit breaker PR will be submitted before I leave.",
    impacts: [],
    createdAt: new Date(Date.now()).toISOString(),
  },
  // --- Historical leave data (past 6 months) for analytics ---
  {
    id: "lr6", userId: "u3", type: "sick", days: 1, reason: "Migraine — couldn't work",
    startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 45 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "lr7", userId: "u3", type: "wfh", days: 1, reason: "Plumber visit — water heater repair",
    startDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 30 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "lr8", userId: "u3", type: "personal", days: 1, reason: "Bank appointment — home loan documentation",
    startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 20 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
  },
  {
    id: "lr9", userId: "u3", type: "sick", days: 2, reason: "Food poisoning",
    startDate: new Date(Date.now() - 60 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 59 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "lr10", userId: "u2", type: "planned", days: 5, reason: "Annual vacation — Goa trip",
    startDate: new Date(Date.now() - 90 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 86 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 95 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 97 * 86400000).toISOString(),
  },
  {
    id: "lr11", userId: "u2", type: "sick", days: 1, reason: "Cold and cough",
    startDate: new Date(Date.now() - 40 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 40 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 40 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: "lr12", userId: "u2", type: "wfh", days: 1, reason: "Waiting for courier — important delivery",
    startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 15 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "lr13", userId: "u4", type: "wfh", days: 1, reason: "Dental appointment in the morning",
    startDate: new Date(Date.now() - 25 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 25 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: "lr14", userId: "u4", type: "sick", days: 1, reason: "Stomach bug",
    startDate: new Date(Date.now() - 50 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 50 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 50 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: "lr15", userId: "u5", type: "planned", days: 3, reason: "Brother's wedding in Chennai",
    startDate: new Date(Date.now() - 75 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 73 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 80 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 82 * 86400000).toISOString(),
  },
  {
    id: "lr16", userId: "u5", type: "wfh", days: 1, reason: "AC repair — technician visit",
    startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "lr17", userId: "u5", type: "sick", days: 1, reason: "Back pain — rest advised by doctor",
    startDate: new Date(Date.now() - 35 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 35 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
  },
  {
    id: "lr18", userId: "u6", type: "planned", days: 2, reason: "Design conference — Figma Config",
    startDate: new Date(Date.now() - 55 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 54 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 62 * 86400000).toISOString(),
  },
  {
    id: "lr19", userId: "u6", type: "wfh", days: 1, reason: "Furniture delivery",
    startDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 8 * 86400000).toISOString(),
    status: "approved", approvedBy: "u1", approvedAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    impacts: [], createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
];

// ---- HELPER FUNCTIONS ----
export function getProjectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

export function getPhaseById(projectId: string, phaseId: string): Phase | undefined {
  const project = getProjectById(projectId);
  return project?.phases.find((p) => p.id === phaseId);
}

export function getPendingReviews(): Update[] {
  return PROJECTS.flatMap((p) =>
    p.updates.filter((u) => !u.reviewed)
  );
}

export function getActiveProjects(): Project[] {
  return PROJECTS.filter((p) => p.status === "active");
}

export function getUserProjects(userId: string): Project[] {
  return PROJECTS.filter((p) => p.assigneeIds.includes(userId));
}

export function getUserUpdates(userId: string): Update[] {
  return PROJECTS.flatMap((p) => p.updates.filter((u) => u.userId === userId));
}

export function getPhaseProgress(phases: Phase[]): number {
  const completed = phases.filter((p) => p.status === "completed").length;
  return Math.round((completed / phases.length) * 100);
}

export function getMilestoneProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === "completed").length;
  return Math.round((completed / tasks.length) * 100);
}

export function getDaysRemaining(startDate: string, timeboxDays: number): number {
  const end = new Date(new Date(startDate).getTime() + timeboxDays * 86400000);
  return Math.round((end.getTime() - Date.now()) / 86400000);
}

export function getRequirementChanges(projectId: string): RequirementChange[] {
  const project = getProjectById(projectId);
  return project?.requirementDoc?.changes || [];
}

export function getTasksByProject(projectId: string): Task[] {
  const project = getProjectById(projectId);
  return project?.tasks || [];
}

export function getTasksByUser(userId: string): Task[] {
  return PROJECTS.flatMap(p => p.tasks.filter(t => t.assigneeId === userId));
}

export function getDeadlineExtensions(projectId: string): DeadlineExtension[] {
  const project = getProjectById(projectId);
  if (!project) return [];
  return project.tasks.flatMap(t => t.deadlineExtensions);
}

export function getPendingExtensions(projectId?: string): DeadlineExtension[] {
  if (projectId) {
    const project = getProjectById(projectId);
    if (!project) return [];
    return project.tasks.flatMap(t => t.deadlineExtensions.filter(de => de.status === "pending"));
  }
  return PROJECTS.flatMap(p => p.tasks.flatMap(t => t.deadlineExtensions.filter(de => de.status === "pending")));
}

export function getExtensionsByUser(userId: string): DeadlineExtension[] {
  return PROJECTS.flatMap(p => p.tasks.flatMap(t => t.deadlineExtensions.filter(de => de.requestedBy === userId)));
}

export function getEscalatedExtensions(): DeadlineExtension[] {
  return PROJECTS.flatMap(p => p.tasks.flatMap(t => t.deadlineExtensions.filter(de => de.escalationLevel >= 1)));
}

export function getLeaveRequests(): LeaveRequest[] {
  return LEAVE_REQUESTS;
}

export function getLeavesByUser(userId: string): LeaveRequest[] {
  return LEAVE_REQUESTS.filter(lr => lr.userId === userId);
}

export function getPendingLeaves(): LeaveRequest[] {
  return LEAVE_REQUESTS.filter(lr => lr.status === "pending");
}

export function getUpcomingLeaves(daysAhead: number = 14): LeaveRequest[] {
  const cutoff = new Date(Date.now() + daysAhead * 86400000).getTime();
  return LEAVE_REQUESTS.filter(lr => {
    const start = new Date(lr.startDate).getTime();
    return start <= cutoff && start >= Date.now() && (lr.status === "approved" || lr.status === "pending");
  });
}

export function getLeavesWithImpact(): LeaveRequest[] {
  return LEAVE_REQUESTS.filter(lr => lr.impacts.length > 0);
}

// ---- REVIEW TASKS (CEO-assigned ad-hoc tasks) ----

export type ReviewTask = {
  id: string;
  description: string;
  assigneeIds: string[];
  assignedBy: string; // CEO
  priority: "low" | "medium" | "high";
  dueDate?: string;
  status: "pending" | "in_progress" | "completed";
  sourceType: "deliverable" | "milestone" | "task"; // what it was assigned from
  sourceTitle: string; // title of the deliverable/milestone/task
  projectId: string;
  projectTitle: string;
  createdAt: string;
};

// Mutable store for review tasks (prototype only)
export const REVIEW_TASKS: ReviewTask[] = [
  {
    id: "rt-1",
    description: "Review rate limiter PR - check error handling and Redis failover logic",
    assigneeIds: ["u5"],
    assignedBy: "u1",
    priority: "high",
    dueDate: "Apr 5, 2026",
    status: "pending",
    sourceType: "deliverable",
    sourceTitle: "Rate Limiter PR",
    projectId: "p1",
    projectTitle: "API Gateway & Rate Limiting Service",
    createdAt: new Date().toISOString(),
  },
  {
    id: "rt-2",
    description: "Review architecture doc and validate tech stack decisions",
    assigneeIds: ["u2"],
    assignedBy: "u1",
    priority: "medium",
    status: "pending",
    sourceType: "deliverable",
    sourceTitle: "API Gateway Architecture Document v1",
    projectId: "p1",
    projectTitle: "API Gateway & Rate Limiting Service",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "rt-3",
    description: "Validate SHAP feature importance results against domain knowledge",
    assigneeIds: ["u3"],
    assignedBy: "u1",
    priority: "medium",
    status: "pending",
    sourceType: "milestone",
    sourceTitle: "SHAP Analysis Report",
    projectId: "p2",
    projectTitle: "Customer Churn Prediction Model",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export function addReviewTask(task: Omit<ReviewTask, "id" | "createdAt" | "status">): ReviewTask {
  const newTask: ReviewTask = {
    ...task,
    id: `rt-${Date.now()}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  REVIEW_TASKS.push(newTask);
  return newTask;
}

export function getReviewTasksByUser(userId: string): ReviewTask[] {
  return REVIEW_TASKS.filter(rt => rt.assigneeIds.includes(userId));
}

export function getAllReviewTasks(): ReviewTask[] {
  return [...REVIEW_TASKS];
}

export function addTask(projectId: string, task: {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "planning" | "in_progress";
  assigneeIds: string[];
  category?: string;
  estimatedHours?: number;
  phaseId?: string;
  outcome?: {
    type: OutcomeType;
    expectedDeliverable: string;
  };
}): Task | null {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const newTask: Task = {
    id: `t${Date.now()}`,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeIds[0] || "",
    approach: "",
    planStatus: "ai_generated",
    priority: task.priority,
    status: task.status,
    estimatedHours: task.estimatedHours || 0,
    phaseId: task.phaseId,
    steps: [],
    successCriteria: [],
    killCriteria: [],
    milestones: [],
    updates: [],
    deadlineExtensions: [],
    createdAt: new Date().toISOString(),
    outcome: task.outcome ? {
      type: task.outcome.type,
      expectedDeliverable: task.outcome.expectedDeliverable,
      status: "pending",
    } : undefined,
  };
  project.tasks.push(newTask);
  return newTask;
}

export function addPhase(projectId: string, phase: {
  name: string;
  description: string;
  estimatedDuration: string;
  checklist?: { item: string; done: boolean }[];
  startDate?: string;
  endDate?: string;
}): Phase | null {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const newPhase: Phase = {
    id: `phase_${Date.now()}`,
    name: phase.name,
    description: phase.description,
    status: "pending",
    checklist: phase.checklist || [],
    discussions: [],
    attachments: [],
    signOffRequired: true,
    estimatedDuration: phase.estimatedDuration,
    order: project.phases.length + 1,
    startDate: phase.startDate,
    endDate: phase.endDate,
  };
  project.phases.push(newPhase);
  return newPhase;
}

export function updatePhase(projectId: string, phaseId: string, updates: Partial<Pick<Phase, "name" | "description" | "status" | "estimatedDuration" | "checklist" | "order" | "startDate" | "endDate">>): Phase | null {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const phase = project.phases.find(p => p.id === phaseId);
  if (!phase) return null;
  Object.assign(phase, updates);
  return phase;
}

export function removePhase(projectId: string, phaseId: string): boolean {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return false;
  const idx = project.phases.findIndex(p => p.id === phaseId);
  if (idx === -1) return false;
  project.phases.splice(idx, 1);
  // Re-order remaining
  project.phases.forEach((p, i) => { p.order = i + 1; });
  return true;
}

export function generateAIPhases(projectCategory: string, projectTitle: string): { name: string; description: string; estimatedDuration: string; checklist: { item: string; done: boolean }[] }[] {
  // Pre-defined templates based on category
  const templates: Record<string, { name: string; description: string; estimatedDuration: string; checklist: { item: string; done: boolean }[] }[]> = {
    engineering: [
      { name: "Requirements & Planning", description: "Define scope, gather requirements, create project plan", estimatedDuration: "1-2 weeks", checklist: [{ item: "Requirements finalized", done: false }, { item: "Architecture approved", done: false }, { item: "Timeline agreed", done: false }] },
      { name: "Design & Architecture", description: "System design, API design, database schema, UI/UX wireframes", estimatedDuration: "1-2 weeks", checklist: [{ item: "Design document reviewed", done: false }, { item: "API contracts defined", done: false }, { item: "UI mockups approved", done: false }] },
      { name: "Development - Sprint 1", description: "Core feature implementation, foundational components", estimatedDuration: "2-3 weeks", checklist: [{ item: "Core modules built", done: false }, { item: "Unit tests written", done: false }, { item: "Code review completed", done: false }] },
      { name: "Development - Sprint 2", description: "Advanced features, integrations, refinements", estimatedDuration: "2-3 weeks", checklist: [{ item: "Feature complete", done: false }, { item: "Integration tests passing", done: false }, { item: "Performance benchmarks met", done: false }] },
      { name: "Testing & QA", description: "End-to-end testing, UAT, bug fixes, performance testing", estimatedDuration: "1-2 weeks", checklist: [{ item: "All test suites passing", done: false }, { item: "UAT sign-off", done: false }, { item: "Bug backlog cleared", done: false }] },
      { name: "Deployment & Launch", description: "Staging deployment, production release, monitoring setup", estimatedDuration: "3-5 days", checklist: [{ item: "Staging verified", done: false }, { item: "Production deployed", done: false }, { item: "Monitoring active", done: false }] },
    ],
    data_science: [
      { name: "Problem Definition & Data Audit", description: "Define objectives, audit available data sources, assess data quality", estimatedDuration: "1 week", checklist: [{ item: "Problem statement finalized", done: false }, { item: "Data sources identified", done: false }, { item: "Data quality assessed", done: false }] },
      { name: "Data Collection & Preparation", description: "Gather data, clean, transform, feature engineering", estimatedDuration: "1-2 weeks", checklist: [{ item: "Data pipeline built", done: false }, { item: "Data cleaned & validated", done: false }, { item: "Feature set defined", done: false }] },
      { name: "Exploratory Analysis & Modeling", description: "EDA, model selection, training, hyperparameter tuning", estimatedDuration: "2-3 weeks", checklist: [{ item: "EDA complete", done: false }, { item: "Baseline model trained", done: false }, { item: "Model performance evaluated", done: false }] },
      { name: "Validation & Review", description: "Cross-validation, bias checks, stakeholder review", estimatedDuration: "1 week", checklist: [{ item: "Validation metrics met", done: false }, { item: "Bias audit passed", done: false }, { item: "Results reviewed by stakeholders", done: false }] },
      { name: "Deployment & Monitoring", description: "Model deployment, API integration, monitoring dashboard", estimatedDuration: "1 week", checklist: [{ item: "Model deployed to production", done: false }, { item: "Monitoring dashboard live", done: false }, { item: "Handover documentation complete", done: false }] },
    ],
    design: [
      { name: "Research & Discovery", description: "User research, competitive analysis, stakeholder interviews", estimatedDuration: "1 week", checklist: [{ item: "User interviews completed", done: false }, { item: "Competitive analysis done", done: false }, { item: "Research findings documented", done: false }] },
      { name: "Ideation & Wireframing", description: "Concept development, low-fidelity wireframes, information architecture", estimatedDuration: "1-2 weeks", checklist: [{ item: "Wireframes created", done: false }, { item: "IA defined", done: false }, { item: "Concept reviewed", done: false }] },
      { name: "Visual Design & Prototyping", description: "High-fidelity mockups, interactive prototypes, design system updates", estimatedDuration: "2-3 weeks", checklist: [{ item: "Visual designs complete", done: false }, { item: "Prototype built", done: false }, { item: "Design system updated", done: false }] },
      { name: "User Testing & Iteration", description: "Usability testing, feedback incorporation, design refinement", estimatedDuration: "1-2 weeks", checklist: [{ item: "Usability tests conducted", done: false }, { item: "Feedback incorporated", done: false }, { item: "Final designs approved", done: false }] },
      { name: "Handoff & Documentation", description: "Developer handoff, specs documentation, asset delivery", estimatedDuration: "3-5 days", checklist: [{ item: "Design specs documented", done: false }, { item: "Assets exported", done: false }, { item: "Developer handoff completed", done: false }] },
    ],
    default: [
      { name: "Discovery & Planning", description: "Define objectives, scope, stakeholders, and timeline", estimatedDuration: "1 week", checklist: [{ item: "Objectives defined", done: false }, { item: "Stakeholders identified", done: false }, { item: "Timeline set", done: false }] },
      { name: "Research & Analysis", description: "Gather information, analyze requirements, identify risks", estimatedDuration: "1-2 weeks", checklist: [{ item: "Research complete", done: false }, { item: "Requirements documented", done: false }, { item: "Risks identified", done: false }] },
      { name: "Execution", description: "Core work execution, deliverables creation", estimatedDuration: "2-4 weeks", checklist: [{ item: "Primary deliverables in progress", done: false }, { item: "Quality checks passed", done: false }, { item: "Milestone reviews done", done: false }] },
      { name: "Review & Refinement", description: "Stakeholder review, feedback incorporation, quality assurance", estimatedDuration: "1 week", checklist: [{ item: "Stakeholder review complete", done: false }, { item: "Feedback addressed", done: false }, { item: "Final QA passed", done: false }] },
      { name: "Delivery & Closeout", description: "Final delivery, documentation, knowledge transfer", estimatedDuration: "3-5 days", checklist: [{ item: "Final deliverable submitted", done: false }, { item: "Documentation complete", done: false }, { item: "Project retrospective done", done: false }] },
    ],
  };
  return templates[projectCategory] || templates.default;
}

export function updateTaskReviewStatus(projectId: string, taskId: string, status: "approved" | "changes_requested" | "rejected", reviewerId: string, feedback?: string): boolean {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return false;
  const task = project.tasks.find(t => t.id === taskId);
  if (!task) return false;
  // Store review info on the task - we'll add a reviewStatus field
  (task as any).reviewStatus = status;
  (task as any).reviewedBy = reviewerId;
  (task as any).reviewedAt = new Date().toISOString();
  (task as any).reviewFeedback = feedback;
  return true;
}

export function addDocument(projectId: string, doc: {
  type: DocumentType;
  title: string;
  description: string;
  createdBy: string;
}): ProjectDocument | null {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  const newDoc: ProjectDocument = {
    id: `doc_${Date.now()}`,
    type: doc.type,
    title: doc.title,
    description: doc.description,
    currentVersion: 1,
    status: "draft",
    createdBy: doc.createdBy,
    createdAt: new Date().toISOString().slice(0, 10),
    lastUpdated: new Date().toISOString().slice(0, 10),
    sections: [],
    changes: [],
    discussions: [],
  };
  if (!project.documents) project.documents = [];
  project.documents.push(newDoc);
  return newDoc;
}

export function removeDocument(projectId: string, documentId: string): boolean {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project || !project.documents) return false;
  const idx = project.documents.findIndex(d => d.id === documentId);
  if (idx === -1) return false;
  project.documents.splice(idx, 1);
  return true;
}

export function addEditChange(projectId: string, change: Omit<EditChange, "id" | "status" | "changedAt">): EditChange | null {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return null;
  if (!project.editHistory) project.editHistory = [];
  const newChange: EditChange = {
    ...change,
    id: `edit_${Date.now()}`,
    changedAt: new Date().toISOString(),
    status: "pending_approval",
  };
  project.editHistory.push(newChange);
  return newChange;
}

export function approveEditChange(projectId: string, changeId: string, approverId: string): boolean {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project || !project.editHistory) return false;
  const change = project.editHistory.find(c => c.id === changeId);
  if (!change) return false;
  change.status = "approved";
  change.approvedBy = approverId;
  change.approvedAt = new Date().toISOString();
  return true;
}

export function rejectEditChange(projectId: string, changeId: string, approverId: string, reason: string): boolean {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project || !project.editHistory) return false;
  const change = project.editHistory.find(c => c.id === changeId);
  if (!change) return false;
  change.status = "rejected";
  change.approvedBy = approverId;
  change.approvedAt = new Date().toISOString();
  change.rejectionReason = reason;
  return true;
}

export function computeImpactAreas(projectId: string, section: EditChange["section"], sectionId: string): { area: string; description: string; severity: "low" | "medium" | "high" }[] {
  const project = PROJECTS.find(p => p.id === projectId);
  if (!project) return [];
  const impacts: { area: string; description: string; severity: "low" | "medium" | "high" }[] = [];

  if (section === "phase") {
    // Phase changes impact tasks in that phase
    const tasksInPhase = project.tasks.filter(t => (t as any).phaseId === sectionId);
    if (tasksInPhase.length > 0) {
      impacts.push({ area: "Tasks", description: `${tasksInPhase.length} task(s) linked to this phase may need timeline adjustments`, severity: "high" });
    }
    // May affect documents
    if (project.documents && project.documents.length > 0) {
      impacts.push({ area: "Documents", description: "Related requirement/design documents may need updating", severity: "medium" });
    }
    // May affect downstream phases
    const phase = project.phases.find(p => p.id === sectionId);
    if (phase) {
      const downstreamPhases = project.phases.filter(p => p.order > phase.order);
      if (downstreamPhases.length > 0) {
        impacts.push({ area: "Downstream Phases", description: `${downstreamPhases.length} subsequent phase(s) may shift`, severity: "medium" });
      }
    }
    impacts.push({ area: "Timeline", description: "Project timeline and milestones may be affected", severity: "medium" });
  }

  if (section === "task") {
    const task = project.tasks.find(t => t.id === sectionId);
    if (task && task.milestones.length > 0) {
      impacts.push({ area: "Milestones", description: `${task.milestones.length} milestone(s) may need revision`, severity: "high" });
    }
    impacts.push({ area: "Phase Progress", description: "Phase completion metrics will be recalculated", severity: "medium" });
    if (project.documents && project.documents.length > 0) {
      impacts.push({ area: "Requirements", description: "Requirement documents may need change requests", severity: "low" });
    }
    impacts.push({ area: "Team Workload", description: "Assignee workload and sprint planning affected", severity: "medium" });
  }

  if (section === "document" || section === "requirement") {
    const inProgressTasks = project.tasks.filter(t => t.status === "in_progress");
    if (inProgressTasks.length > 0) {
      impacts.push({ area: "In-Progress Tasks", description: `${inProgressTasks.length} active task(s) may need scope adjustment`, severity: "high" });
    }
    impacts.push({ area: "Design", description: "Design specifications may need updating", severity: "medium" });
    impacts.push({ area: "Development", description: "Development work may need re-planning", severity: "medium" });
    impacts.push({ area: "Testing", description: "Test plans and test cases may need revision", severity: "low" });
  }

  if (section === "outcome") {
    impacts.push({ area: "Deliverables", description: "Final deliverable expectations changed", severity: "high" });
    impacts.push({ area: "Timeline", description: "Project completion timeline may shift", severity: "medium" });
  }

  if (section === "checkpoint") {
    impacts.push({ area: "Project Direction", description: "Checkpoint changes may alter project trajectory", severity: "high" });
    impacts.push({ area: "Resource Allocation", description: "Team assignments may need reassessment", severity: "medium" });
  }

  return impacts;
}

// ---- AI CAPTURE TYPES & DATA ----

export type CaptureItemType = "todo" | "follow_up" | "commitment" | "meeting" | "review_reminder" | "timeline";

export type CaptureItem = {
  id: string;
  type: CaptureItemType;
  rawText: string;
  title: string;
  description: string;
  assigneeIds: string[];
  department: string;
  dueDate: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "converted" | "dismissed";
  convertedTo?: { type: string; id: string };
  projectId?: string;
  createdAt: string;
};

export type CaptureSession = {
  id: string;
  rawInput: string;
  items: CaptureItem[];
  createdAt: string;
};

export const CAPTURE_SESSIONS: CaptureSession[] = [
  {
    id: "cs1",
    rawInput: "Asked Arjun to finalize the API gateway architecture doc by Thursday. Meeting with data science team on Monday to review churn model progress. Committed to provide quarterly TPD report to marketing by end of month. Need to review Vikram's rate limiter PR before Friday.",
    items: [
      {
        id: "ci1",
        type: "follow_up",
        rawText: "Asked Arjun to finalize the API gateway architecture doc by Thursday",
        title: "Finalize API gateway architecture doc",
        description: "Arjun to complete the architecture documentation for the API gateway project",
        assigneeIds: ["u3"],
        department: "Engineering",
        dueDate: "2026-04-09",
        priority: "high",
        status: "pending",
        projectId: "p1",
        createdAt: "2026-04-02T10:00:00Z",
      },
      {
        id: "ci2",
        type: "meeting",
        rawText: "Meeting with data science team on Monday to review churn model progress",
        title: "Data Science team — churn model review",
        description: "Review progress on the customer churn prediction model with the DS team",
        assigneeIds: ["u2", "u4"],
        department: "Data Science",
        dueDate: "2026-04-06",
        priority: "medium",
        status: "pending",
        createdAt: "2026-04-02T10:00:00Z",
      },
      {
        id: "ci3",
        type: "commitment",
        rawText: "Committed to provide quarterly TPD report to marketing by end of month",
        title: "Quarterly TPD report for Marketing",
        description: "Deliver the quarterly TPD report to the marketing department",
        assigneeIds: [],
        department: "Marketing",
        dueDate: "2026-04-30",
        priority: "high",
        status: "pending",
        createdAt: "2026-04-02T10:00:00Z",
      },
      {
        id: "ci4",
        type: "review_reminder",
        rawText: "Need to review Vikram's rate limiter PR before Friday",
        title: "Review Vikram's rate limiter PR",
        description: "Code review for the rate limiter pull request submitted by Vikram",
        assigneeIds: ["u5"],
        department: "Engineering",
        dueDate: "2026-04-10",
        priority: "high",
        status: "pending",
        projectId: "p1",
        createdAt: "2026-04-02T10:00:00Z",
      },
    ],
    createdAt: "2026-04-02T10:00:00Z",
  },
];

let captureItemCounter = 10;

export function addCaptureSession(rawInput: string, items: CaptureItem[]): CaptureSession {
  const session: CaptureSession = {
    id: `cs${Date.now()}`,
    rawInput,
    items,
    createdAt: new Date().toISOString(),
  };
  CAPTURE_SESSIONS.unshift(session);
  return session;
}

export function generateCaptureItemId(): string {
  return `ci${++captureItemCounter}`;
}

export function updateCaptureItem(sessionId: string, itemId: string, updates: Partial<CaptureItem>) {
  const session = CAPTURE_SESSIONS.find(s => s.id === sessionId);
  if (!session) return;
  const item = session.items.find(i => i.id === itemId);
  if (!item) return;
  Object.assign(item, updates);
}

export function dismissCaptureItem(sessionId: string, itemId: string) {
  updateCaptureItem(sessionId, itemId, { status: "dismissed" });
}

export function convertCaptureItem(sessionId: string, itemId: string, targetType: string, targetId: string) {
  updateCaptureItem(sessionId, itemId, {
    status: "converted",
    convertedTo: { type: targetType, id: targetId },
  });
}

export function getPendingCaptureItems(): CaptureItem[] {
  return CAPTURE_SESSIONS.flatMap(s => s.items.filter(i => i.status === "pending"));
}
