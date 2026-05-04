import { prisma } from "@/lib/prisma";
import { deriveDepartment } from "@/lib/team-helpers";
import { PageHeader } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const DEPT_COLORS: Record<string, string> = {
  "Engineering":  "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  "Data Science": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  "Design":       "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  "Product":      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  "Leadership":   "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  "Other":        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export default async function ManageTeamPage() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, email: true, avatarColor: true, roleType: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Team" description={`${users.length} members`} />
      <div className="rounded-lg border border-border bg-bg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-bg-subtle">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Member</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-fg-muted">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(u => {
              const initials = u.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              const dept = deriveDepartment(u.role);
              const deptClass = DEPT_COLORS[dept] ?? DEPT_COLORS["Other"];
              return (
                <tr key={u.id} className="hover:bg-bg-subtle transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ backgroundColor: u.avatarColor }}
                      >
                        {initials}
                      </span>
                      <div>
                        <p className="font-medium text-fg">{u.name}</p>
                        <p className="text-xs text-fg-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{u.role}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-[11px]", deptClass)}>{dept}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[11px] capitalize">{u.roleType}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
