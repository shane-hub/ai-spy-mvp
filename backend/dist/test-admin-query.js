"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./utils/prisma"));
async function main() {
    try {
        console.log("Testing Prisma Queries for Admin Stats...");
        console.log("totalUsers");
        const totalUsers = await prisma_1.default.user.count();
        console.log(totalUsers);
        console.log("totalRevenueResult");
        const totalRevenueResult = await prisma_1.default.order.aggregate({
            _sum: { amountCents: true },
            where: { status: 'SUCCESS' }
        });
        console.log(totalRevenueResult);
        console.log("totalScans");
        const totalScans = await prisma_1.default.scanHistory.count();
        console.log(totalScans);
        console.log("fakeScans");
        const fakeScans = await prisma_1.default.scanHistory.count({ where: { isFake: true } });
        console.log(fakeScans);
        console.log("recentUsers");
        const recentUsers = await prisma_1.default.user.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: { id: true, displayName: true, createdAt: true, authProvider: true }
        });
        console.log(recentUsers);
        console.log("recentOrders");
        const recentOrders = await prisma_1.default.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            where: { status: 'SUCCESS' },
            select: { orderNo: true, amountCents: true, packageType: true, paidAt: true, user: { select: { displayName: true } } }
        });
        console.log(recentOrders);
        console.log("Success");
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
main();
