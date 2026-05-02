import { getSessionUser } from "@/lib/session";
import { CeoCommandCenterStub } from "@/components/landing/ceo-command-center-stub";
import { TeamMyTodayStub } from "@/components/landing/team-my-today-stub";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const firstName = user.name.split(" ")[0] || user.name;
  return user.roleType === "ceo"
    ? <CeoCommandCenterStub name={firstName} />
    : <TeamMyTodayStub name={firstName} />;
}
