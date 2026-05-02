"use client";

import {
  PageHeader,
  KPIStat,
  ProjectCard,
  TaskRow,
  ActionInboxItem,
  InsightCard,
  PhaseTracker,
  EmptyState,
} from "@/components/primitives";
import { AppShell } from "@/components/shell/app-shell";
import { Inbox } from "lucide-react";

export default function DesignDemoPage() {
  return (
    <AppShell
      role="ceo"
      user={{ name: "Rahul Gupta", email: "rahul@projecthub.test", roleLabel: "CEO" }}
      badges={{ reviews: 7, capture: 12 }}
      notificationCount={3}
      commandItems={[
        { id: "p", group: "Navigate", label: "Open Projects", run: () => location.assign("/projects") },
        { id: "r", group: "Navigate", label: "Open Reviews", run: () => location.assign("/reviews") },
        { id: "n", group: "Create", label: "New Project", run: () => location.assign("/projects/new") },
      ]}
    >
      <div className="space-y-10">
        <PageHeader
          title="Design demo"
          description="Every shared primitive in light + dark. Toggle the theme in the topbar."
          breadcrumb={<span>Internal / Design demo</span>}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">KPI Stats</h2>
          <div className="grid grid-cols-4 gap-4">
            <KPIStat label="Active Projects" value={12} delta={{ value: "+2 this week", direction: "up" }} />
            <KPIStat label="Pending Reviews" value={7} delta={{ value: "3 overdue", direction: "down" }} tone="danger" />
            <KPIStat label="Completed" value={34} delta={{ value: "+5 this month", direction: "up" }} />
            <KPIStat label="Team Members" value={8} />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Phase Tracker</h2>
          <PhaseTracker
            steps={[
              { id: "1", label: "Requirements", status: "completed" },
              { id: "2", label: "Design", status: "completed" },
              { id: "3", label: "Development", status: "active" },
              { id: "4", label: "Review", status: "pending" },
              { id: "5", label: "Deploy", status: "pending" },
              { id: "6", label: "Done", status: "pending" },
            ]}
          />
        </section>

        <section className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Action Inbox</h2>
            <ActionInboxItem
              kind="review"
              title="API Gateway rate limiter v2"
              context="Priya · API Gateway"
              age="2h ago"
              primaryAction={{ label: "Review", onClick: () => {} }}
              secondaryAction={{ label: "Defer", onClick: () => {} }}
            />
            <ActionInboxItem
              kind="capture"
              title="Follow-up: Karthik Q2 plan by Friday"
              context="from Wed standup"
              age="5h ago"
              primaryAction={{ label: "Convert", onClick: () => {} }}
              secondaryAction={{ label: "Skip", onClick: () => {} }}
            />
            <ActionInboxItem
              kind="extension"
              title="+3 days for Churn data prep"
              context="Arjun · Churn Model"
              age="8h ago"
              primaryAction={{ label: "Approve", onClick: () => {} }}
              secondaryAction={{ label: "Note", onClick: () => {} }}
            />
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">AI Insights</h2>
            <InsightCard
              severity="risk"
              title="Churn model deadline at risk"
              description="ML pipeline blocked on data access · 2 day delay projected"
              action={{ label: "View project", onClick: () => {} }}
            />
            <InsightCard
              severity="opportunity"
              title="Reuse RAG infrastructure"
              description="API Gateway team's auth service applies to Internal Search"
              action={{ label: "Suggest reuse", onClick: () => {} }}
            />
            <InsightCard
              severity="blocker"
              title="DevOps capacity tight next week"
              description="3 deploys scheduled, only 1 DevOps engineer available"
            />
            <InsightCard
              severity="suggestion"
              title="Karthik response time trending up"
              description="30% slower on review feedback this sprint"
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Project Cards</h2>
          <div className="grid grid-cols-3 gap-4">
            <ProjectCard
              href="#"
              title="API Gateway & Rate Limiting"
              type="engineering"
              priority="high"
              status="active"
              phaseLabel="Phase 3 of 6 · Development"
              progress={52}
              daysRemaining={8}
              assigneeNames={["Priya Sharma", "Arjun Mehta", "Vikram Patel"]}
            />
            <ProjectCard
              href="#"
              title="Churn Prediction Model"
              type="data_science"
              priority="critical"
              status="active"
              phaseLabel="Phase 2 of 5 · Experiment"
              progress={38}
              daysRemaining={4}
              assigneeNames={["Meera Iyer", "Priya Sharma"]}
            />
            <ProjectCard
              href="#"
              title="Onboarding Flow Redesign"
              type="design"
              priority="medium"
              status="active"
              phaseLabel="Phase 4 of 5 · Review"
              progress={71}
              daysRemaining={12}
              assigneeNames={["Sneha Kapoor", "Karthik Verma", "Ananya Roy", "Rahul Gupta"]}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Task Rows</h2>
          <div className="rounded-md border border-border bg-bg p-2">
            <TaskRow title="Implement Redis-based throttling" assigneeName="Priya" due="Fri" priority="high" />
            <TaskRow title="Build rate-limit middleware" assigneeName="Arjun" due="Mon" priority="medium" />
            <TaskRow title="Token bucket impl" assigneeName="Priya" due="Today" priority="critical" />
            <TaskRow title="Initial design doc" assigneeName="Rahul" priority="low" done />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-subtle">Empty State</h2>
          <EmptyState
            icon={Inbox}
            title="You're caught up"
            description="No pending reviews. Take a breath."
          />
        </section>
      </div>
    </AppShell>
  );
}
