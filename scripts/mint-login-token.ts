import "dotenv/config";
import { createHash, randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("usage: mint-token.ts <email>");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });
  const token = randomBytes(32).toString("base64url");
  await db.loginToken.create({
    data: {
      tokenHash: createHash("sha256").update(token).digest("hex"),
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  console.log(token);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
