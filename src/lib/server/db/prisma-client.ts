import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

async function checkConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("Database is connected!");
  } catch (error) {
    console.error("Connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.env.NODE_ENV === 'production') {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  prisma = new PrismaClient({ adapter });
} else {
  if (!global.prisma) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    global.prisma = new PrismaClient({ adapter });
  }
  prisma = global.prisma;
  //checkConnection();
}

export default prisma;

declare global {
  var prisma: PrismaClient | undefined;
}