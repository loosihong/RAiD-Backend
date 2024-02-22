import { PrismaClient, User } from '@prisma/client';

const prisma = new PrismaClient();

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
            { name: "Unit", shortName: "unit" },
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

    // const user: User | null  = await prisma.user.findFirst({
    //     where: {
    //         loginName: "jenny"
    //     }
    // });

    // if(user != null) {
    //     await prisma.store.create({
    //         data: {
    //             userId: user.id,
    //             name: "Jenny's Store",
    //             deliveryLeadDay: 7
    //         }
    //     });
    // }
}
main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    })