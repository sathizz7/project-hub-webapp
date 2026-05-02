import { PageHeader, KPIStat, EmptyState } from "@/components/primitives";
import { Inbox } from "lucide-react";

export function CeoCommandCenterStub({ name }: { name: string }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Good morning, ${name}.`}
        description="Command Center will land in Plan 4 — this is the CEO landing stub."
      />
      <div className="grid grid-cols-4 gap-4">
        <KPIStat label="Active Projects" value="—" />
        <KPIStat label="Pending Reviews" value="—" />
        <KPIStat label="Completed" value="—" />
        <KPIStat label="Team Members" value="—" />
      </div>
      <EmptyState
        icon={Inbox}
        title="No data wired yet"
        description="Plan 3 connects this to the database."
      />
    </div>
  );
}
