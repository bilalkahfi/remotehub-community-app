// CLI seed runner - use with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Check if already seeded
  const existingCategories = await prisma.forumCategory.count();
  if (existingCategories > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  const passwordHash = await hashPassword("password123");

  // Create dummy users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Budi Santoso",
        email: "budi@example.com",
        phone: "081234567890",
        passwordHash,
        bio: "Full-stack developer, remote worker sejak 2020. Suka kopi dan coding.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Siti Rahmawati",
        email: "siti@example.com",
        phone: "081234567891",
        passwordHash,
        bio: "UI/UX Designer. Remote work enthusiast. Love minimalist design.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Ahmad Hidayat",
        email: "ahmad@example.com",
        phone: "081234567892",
        passwordHash,
        bio: "DevOps Engineer, cloud native, CI/CD pipeline builder.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Dewi Lestari",
        email: "dewi@example.com",
        phone: "081234567893",
        passwordHash,
        bio: "Content writer & digital marketer. Remote worker since 2019.",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rudi Hermawan",
        email: "rudi@example.com",
        phone: "081234567894",
        passwordHash,
        bio: "Mobile developer (Flutter & React Native). Work from Bali.",
      },
    }),
  ]);

  // Create forum categories
  const categories = await Promise.all([
    prisma.forumCategory.create({
      data: {
        name: "Pengumuman",
        description: "Pengumuman dan informasi penting untuk anggota komunitas",
        slug: "pengumuman",
      },
    }),
    prisma.forumCategory.create({
      data: {
        name: "Diskusi Umum",
        description: "Tempat diskusi bebas tentang remote working",
        slug: "diskusi-umum",
      },
    }),
    prisma.forumCategory.create({
      data: {
        name: "Tips & Trik",
        description: "Berbagi tips produktivitas, tools, dan workflow remote work",
        slug: "tips-trik",
      },
    }),
    prisma.forumCategory.create({
      data: {
        name: "Lowongan Kerja",
        description: "Info lowongan remote work untuk berbagai posisi",
        slug: "lowongan-kerja",
      },
    }),
    prisma.forumCategory.create({
      data: {
        name: "Tools & Technology",
        description: "Diskusi tentang tools, software, dan teknologi untuk remote work",
        slug: "tools-technology",
      },
    }),
    prisma.forumCategory.create({
      data: {
        name: "Showcase",
        description: "Pamerkan project atau hasil kerja kamu di sini",
        slug: "showcase",
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);
  console.log(`✅ Created ${categories.length} categories`);
  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
