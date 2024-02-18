"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.user.createMany({
        data: [
            { loginName: "admin" },
            { loginName: "jenny" },
            { loginName: "peter" }
        ]
    });
    await prisma.unitOfMeasure.createMany({
        data: [
            { name: "Unit", shortName: "" },
            { name: "Gram", shortName: "g" },
            { name: "Millilitre", shortName: "ml" }
        ]
    });
    await prisma.purchaseStatus.createMany({
        data: [
            { code: "PP", name: "Pending Payment" },
            { code: "O", name: "Ordered" },
            { code: "OC", name: "Order Confirmed" },
            { code: "OD", name: "On Delivery" },
            { code: "D", name: "Delivered" },
            { code: "R", name: "Received" },
            { code: "ID", name: "In Dispute" },
            { code: "C", name: "Cancelled" }
        ]
    });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
