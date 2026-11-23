import { seedUsers } from "./accounts";
import { seedBoard } from "./board-seed";
import { prisma } from "./db";
import { seedAll } from "./seed";

let ready: Promise<void> | null = null;

async function seedIfEmpty() {
  const count = await prisma.engine.count();
  if (count === 0) {
    await prisma.$transaction((tx) => seedAll(tx), { timeout: 120_000, maxWait: 10_000 });
  } else if ((await prisma.boardItem.count()) === 0) {
    await prisma.$transaction((tx) => seedBoard(tx), { timeout: 60_000, maxWait: 10_000 });
  }
  if ((await prisma.appUser.count()) === 0) await seedUsers(prisma);
}

export function ensureDatabase() {
  if (!ready) {
    ready = seedIfEmpty().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
