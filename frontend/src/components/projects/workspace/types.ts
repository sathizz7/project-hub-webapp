export type AiPlan = {
  summary?: string;
  milestones?: Array<{ name: string; description: string; targetDay: number }>;
  killCriteria?: string[];
  risks?: Array<{ risk: string; mitigation: string; severity: string }>;
};

export type SerializedFeedback = {
  id: string;
  text: string;
  isAi: boolean;
  createdAt: string;
  fromUser: { id: string; name: string; avatarColor: string };
};

export type SerializedSubmission = {
  id: string;
  title: string;
  type: string;
  description: string;
  link: string;
  createdAt: string;
  user: { id: string; name: string; avatarColor: string };
  feedback: SerializedFeedback[];
};

export type SerializedPhase = {
  id: string;
  phaseName: string;
  status: string;
  order: number;
  checklist: string[];
  submissions: SerializedSubmission[];
};

export type SerializedTask = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  assignee: { id: string; name: string; avatarColor: string } | null;
};

export type SerializedExtension = {
  id: string;
  reason: string;
  reasonDetail: string;
  status: string;
  ceoComment: string;
  originalDeadline: string;
  requestedDeadline: string;
  escalationLevel: number;
  createdAt: string;
  task: { id: string; title: string; priority: string } | null;
  requestedBy: { id: string; name: string; avatarColor: string };
};

export type SerializedCheckpoint = {
  id: string;
  decision: string;
  notes: string;
  createdAt: string;
};

export type ProjectWorkspaceData = {
  id: string;
  title: string;
  requirement: string;
  type: string;
  priority: string;
  status: string;
  currentPhase: string;
  startDate: string;
  timeboxDays: number;
  techStack: string[];
  aiPlan: AiPlan;
  phases: SerializedPhase[];
  checkpoints: SerializedCheckpoint[];
  assignees: Array<{ user: { id: string; name: string; avatarColor: string } }>;
  tasks: SerializedTask[];
  extensions: SerializedExtension[];
};
