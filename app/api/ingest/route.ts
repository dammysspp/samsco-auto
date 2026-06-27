import { NextResponse } from "next/server";
import Parser from "rss-parser";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const parser = new Parser();

// Reliable RSS feeds for football/soccer news
const FEEDS = [
  "https://www.espn.com/espn/rss/soccer/news",
  "https://rss.nytimes.com/services/xml/rss/nyt/Soccer.xml",
];

export async function POST(req: Request) {
  try {
    // 1. Authenticate request (Dashboard Session or Cron secret)
    let userId: string | null = null;
    const session = await getServerSession(authOptions);

    if (session?.user) {
      userId = (session.user as any).id;
    } else {
      // System trigger fallback (e.g. cron scheduling)
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized request" }, { status: 401 });
      }

      // If cron triggers ingestion, associate with the first administrator user
      const defaultUser = await prisma.user.findFirst();
      if (!defaultUser) {
        return NextResponse.json({ error: "No user initialized in DB yet." }, { status: 400 });
      }
      userId = defaultUser.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch feeds
    const allItems: any[] = [];
    for (const url of FEEDS) {
      try {
        const feed = await parser.parseURL(url);
        allItems.push(...feed.items);
      } catch (feedErr) {
        console.error(`Feed fetch error for ${url}:`, feedErr);
      }
    }

    // 3. Filter for 2026 World Cup keywords to keep it highly context-specific
    const keywords = [
      "2026", "world cup", "fifa", "quarter-final", "semi-final", "final", 
      "group stage", "mbappe", "messi", "ronaldo", "bellingham", "vinicius", 
      "haaland", "saka", "penalty", "match", "kickoff", "usa", "mexico", "canada"
    ];

    const worldCupArticles = allItems.filter(item => {
      const titleLower = (item.title || "").toLowerCase();
      const descLower = (item.contentSnippet || item.content || "").toLowerCase();
      return keywords.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword));
    });

    const targetArticles = worldCupArticles.length > 0 ? worldCupArticles : allItems;

    // 4. Sort by date and grab the top 3 newest
    const sorted = targetArticles.sort((a, b) => {
      return new Date(b.pubDate || b.isoDate || 0).getTime() - new Date(a.pubDate || a.isoDate || 0).getTime();
    });

    const topThree = sorted.slice(0, 3);
    const addedItems = [];

    for (const article of topThree) {
      // Avoid duplicate news titles for the same user
      const existing = await prisma.contentQueue.findFirst({
        where: {
          userId,
          title: article.title,
        },
      });

      if (!existing) {
        const newRecord = await prisma.contentQueue.create({
          data: {
            userId,
            title: article.title || "FIFA 2026 World Cup Highlight Update",
            description: article.contentSnippet || article.content || "No details available.",
            sourceUrl: article.link || "",
            status: "draft",
          },
        });
        addedItems.push(newRecord);
      }
    }

    return NextResponse.json({
      success: true,
      count: addedItems.length,
      data: addedItems,
    });
  } catch (error: any) {
    console.error("Ingest API error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
