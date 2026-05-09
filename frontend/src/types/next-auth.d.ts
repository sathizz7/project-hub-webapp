import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      roleType: "ceo" | "team_member";
      jobTitle: string;
      avatarColor: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roleType?: "ceo" | "team_member";
    jobTitle?: string;
    avatarColor?: string;
  }
}
