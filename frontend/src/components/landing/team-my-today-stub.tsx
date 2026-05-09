import { PageHeader, KPIStat, EmptyState } from "@/components/primitives";
import { ListTodo } from "lucide-react";

export function TeamMyTodayStub({ name }: { name: string }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hey ${name}.`}
        description="My Today will land in Plan 7 — this is the team-member landing stub."
      />
      <div className="grid grid-cols-3 gap-4">
        <KPIStat label="Tasks today" value="—" />
        <KPIStat label="Awaiting review" value="—" />
        <KPIStat label="Upcoming leaves" value="—" />
      </div>
      <EmptyState
        icon={ListTodo}
        title="No tasks yet"
        description="Plan 3 wires real task data."
      />
    </div>
  );
}
