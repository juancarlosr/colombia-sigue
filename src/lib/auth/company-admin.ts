import { UserRole, type Company } from "@prisma/client";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole, type CurrentUser } from "./guards";

// Every admin query and mutation is scoped to the company this user
// administers — never to a company id coming from the client.
export async function requireCompanyAdmin(): Promise<{ user: CurrentUser; company: Company }> {
  const user = await requireRole(UserRole.COMPANY_ADMIN);
  const company = await db.company.findFirst({ where: { adminUserId: user.id } });
  if (!company) redirect("/login");
  return { user, company };
}
