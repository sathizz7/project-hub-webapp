import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const projectRoot = path.resolve(process.cwd());

export async function createTestDb() {
  const dbFile = path.join(projectRoot, "prisma", `test-${randomUUID()}.db`);
  const url = `file:${dbFile}`;

  process.env.DATABASE_URL = url;

  execSync(`npx prisma migrate deploy`, {
    cwd: projectRoot,
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });

  const adapter = new PrismaBetterSqlite3({ url });
  const { PrismaClient } = await import("@/generated/prisma/client");
  const prisma = new PrismaClient({ adapter });

  const cleanup = async () => {
    await prisma.$disconnect();
    if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
    const journal = dbFile + "-journal";
    if (fs.existsSync(journal)) fs.unlinkSync(journal);
    const wal = dbFile + "-wal";
    if (fs.existsSync(wal)) fs.unlinkSync(wal);
    const shm = dbFile + "-shm";
    if (fs.existsSync(shm)) fs.unlinkSync(shm);
  };

  return { prisma, cleanup, dbUrl: url };
}
