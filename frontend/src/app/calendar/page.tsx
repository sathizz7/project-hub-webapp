import { PageHeader, EmptyState } from "@/components/primitives";
import { CalendarDays } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Org-wide calendar view" />
      <EmptyState
        icon={CalendarDays}
        title="Calendar coming soon"
        description="The org calendar — milestones, leaves, deadlines — will be available in a future update."
      />
    </div>
  );
}
