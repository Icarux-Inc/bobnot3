import { db } from "./src/server/db";

async function main() {
    const pageCount = await db.page.count();
    const pagesWithEmbeddings = await db.page.count({
        where: {
            embedding: {
                not: undefined
            }
        }
    });

    console.log(`Total Pages: ${pageCount}`);
    // Note: Checking for 'not: undefined' might not work directly for Unsupported types depending on Prisma version,
    // but let's try to fetch one and see.

    const samplePage = await db.page.findFirst();
    console.log("Sample Page:", samplePage ? { id: samplePage.id, title: samplePage.title, hasEmbedding: !!samplePage.embedding } : "None");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await db.$disconnect();
    });
