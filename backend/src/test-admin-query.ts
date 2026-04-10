import prisma from './utils/prisma';

async function main() {
    try {
        console.log("Testing Prisma Queries for Admin Stats...");

        console.log("totalUsers");
        const totalUsers = await prisma.user.count();
        console.log(totalUsers);

        console.log("totalRevenueResult");
        const totalRevenueResult = await prisma.order.aggregate({
            _sum: { amountCents: true },
            where: { status: 'SUCCESS' }
        });
        console.log(totalRevenueResult);

        console.log("totalScans");
        const totalScans = await prisma.scanHistory.count();
        console.log(totalScans);

        console.log("fakeScans");
        const fakeScans = await prisma.scanHistory.count({ where: { isFake: true } });
        console.log(fakeScans);

        console.log("recentUsers");
        const recentUsers = await prisma.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, displayName: true, createdAt: true, authProvider: true }
        });
        console.log(recentUsers);

        console.log("recentOrders");
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            where: { status: 'SUCCESS' },
            select: { orderNo: true, amountCents: true, packageType: true, paidAt: true, user: { select: { displayName: true } } }
        });
        console.log(recentOrders);

        console.log("Success");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
