import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST() {
  try {
    // Check if already seeded
    const existingCategories = await prisma.forumCategory.count();
    if (existingCategories > 0) {
      return NextResponse.json({
        message: "Database sudah terisi seed data",
      });
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

    // Create sample posts
    const posts = await Promise.all([
      prisma.forumPost.create({
        data: {
          title: "Selamat Datang di RemoteHub! 🎉",
          content:
            "Halo semuanya! Selamat datang di komunitas RemoteHub. Tempat ini dibuat untuk kita semua yang bekerja secara remote atau tertarik dengan remote working.\n\nSilakan perkenalkan diri kalian di sini! Ceritakan pengalaman remote working kalian, atau tanyakan hal-hal yang ingin kalian ketahui.\n\nJangan lupa baca aturan komunitas ya!",
          authorId: users[0].id,
          categoryId: categories[0].id,
        },
      }),
      prisma.forumPost.create({
        data: {
          title: "Tips Memulai Karir Remote untuk Pemula",
          content:
            "Halo teman-teman! Saya ingin berbagi beberapa tips buat yang baru mau memulai karir remote:\n\n1. **Bangun Portfolio** - Punya portfolio yang bagus itu nomor satu\n2. **Networking** - Bergabung dengan komunitas seperti ini\n3. **Skill Up** - Terus belajar skill yang relevan\n4. **Platform** - Daftar di Upwork, Freelancer, LinkedIn\n5. **Konsisten** - Jangan menyerah kalau belum dapet project\n\nAda yang mau nambahin?",
          authorId: users[1].id,
          categoryId: categories[2].id,
        },
      }),
      prisma.forumPost.create({
        data: {
          title: "Rekomendasi Tools untuk Remote Worker",
          content:
            "Berikut tools yang saya pakai sehari-hari sebagai remote worker:\n\n**Komunikasi:**\n- Slack / Discord\n- Zoom / Google Meet\n\n**Project Management:**\n- Notion\n- Trello / Jira\n\n**Productivity:**\n- Todoist\n- Focusmate\n\n**Cloud Storage:**\n- Google Drive\n- Dropbox\n\nKira-kira tools apa lagi yang recommended?",
          authorId: users[2].id,
          categoryId: categories[4].id,
        },
      }),
      prisma.forumPost.create({
        data: {
          title: "Looking for Remote Frontend Developer",
          content:
            "Halo semua! Tim kami sedang mencari Frontend Developer (React/Next.js) untuk join secara remote.\n\n**Requirements:**\n- Minimal 2 tahun pengalaman dengan React\n- Familiar dengan Next.js dan TypeScript\n- Bisa bekerja secara asynchronous\n- Komunikasi baik dalam Bahasa Inggris\n\n**Benefit:**\n- Fully remote\n- Gaji kompetitif\n- Flexible hours\n\nDM atau reply jika tertarik!",
          authorId: users[3].id,
          categoryId: categories[3].id,
        },
      }),
      prisma.forumPost.create({
        data: {
          title: "My Home Office Setup 2024",
          content:
            "Akhirnya beres setup home office setelah pindah! Sharing dikit:\n\n**Desk:** Autonomous SmartDesk Pro (standing desk)\n**Chair:** Herman Miller Aeron\n**Monitor:** LG 27\" 4K x 2\n**Keyboard:** Keychron Q1\n**Mouse:** Logitech MX Master 3\n**Webcam:** Logitech Brio 4K\n**Microphone:** Blue Yeti X\n\nTotal habis sekitar 30 jutaan tapi worth it banget buat produktivitas.\n\nShare setup kalian dong!",
          authorId: users[4].id,
          categoryId: categories[5].id,
        },
      }),
    ]);

    // Create some replies
    await prisma.forumReply.createMany({
      data: [
        {
          content: "Makasih info-nya! Setup nya keren banget. Saya masih pakai meja biasa dan laptop doang 😅",
          authorId: users[1].id,
          postId: posts[4].id,
        },
        {
          content: "Saya setuju banget sama poin portfolio! Itu yang bikin saya dapet project pertama.",
          authorId: users[2].id,
          postId: posts[1].id,
        },
        {
          content: "Untuk communication tools, saya juga recommend Twist. Lebih async friendly daripada Slack.",
          authorId: users[3].id,
          postId: posts[2].id,
        },
      ],
    });

    // Create a sample voice room
    await prisma.voiceRoom.create({
      data: {
        name: "Coffee Talk ☕",
        createdBy: users[0].id,
      },
    });

    return NextResponse.json({
      message: "Seed data berhasil dibuat!",
      users: users.length,
      categories: categories.length,
      posts: posts.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Gagal membuat seed data" },
      { status: 500 }
    );
  }
}
