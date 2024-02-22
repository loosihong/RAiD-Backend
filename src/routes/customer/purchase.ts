import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, ProductBatch, Purchase, PurchaseItem, Store } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import  "../../utils/string.extension";
import  "../../utils/date.extension";
import * as CommonUtil from "../../utils/commonUtil";
import * as CommonContract from "../../../contract/common";
import * as PurchaseContract from "../../../contract/customer/purchase";

export const purchaseRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    CreatePurchases: Purchase cart items.
    Request: CreatePurchaseApiRequestBody
    Response: SaveApiResponseBody list
*/
purchaseRouter.post("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.CreatePurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.cartItemIds)) {
        nextFunction(createError(400));
        return;
    }

    let cartItemResults: CartItemCreateResult[];

    try
    {
        cartItemResults = await prisma.cartItem.findMany({
            where: {
                userId: request.userId,
                isDeleted: false,
                id: {
                    in: requestBody.cartItemIds
                }
            },
            include: {
                product: {
                    include: {
                        store: true,
                        productStock: true
                    }
                }   
            }
        });

        if(cartItemResults.length !== requestBody.cartItemIds.length) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }
    
    // Pre-check enough stock for all products
    let errors: CommonUtil.KeyValuePair[] = [];

    for(let item of cartItemResults) {
        if(item.quantity > (item.product.productStock?.quantityAvailable || 0)) {
            errors.push(new CommonUtil.KeyValuePair(item.id.toString(), "Not enough stock."));
        }
    }

    if(errors.length > 0) {
        nextFunction(createError(400, JSON.stringify(errors)));
        return;
    }

    // Separate stores
    const storeDict: { [storeId: number]: CartItemCreateResult[] } = {};    
    let storeDictValues: CartItemCreateResult[];

    for(let item of cartItemResults) {
        storeDictValues = storeDict[item.product.storeId];

        if(storeDictValues === undefined) {
            storeDictValues = [];
            storeDict[item.product.storeId] = storeDictValues;
        }

        storeDictValues.push(item);
    };

    // Get product batches, first to expire on top
    const productIds: number[] = [];

    for(let item of cartItemResults) {
        productIds.push(item.productId);
    };

    const productBatches: ProductBatch[] = await prisma.productBatch.findMany({
        where: {
            productId: {
                in: productIds
            },
            quantityLeft: {
                gt: 0
            },
            isDeleted: false
        },
        orderBy: [
            {
                productId: "asc"
            },
            {
                expiredDate: {
                    sort: "asc",
                    nulls: "last"
                }
            }
        ]
    });

    // Make purchases
    // Same transaction scope to maintain data integrity
    const purchases: Purchase[] = [];

    try {
        await prisma.$transaction(async () => {
            // Update product stocks
            for(let item of cartItemResults) {
                await prisma.productStock.update({
                    where: {
                        productId: item.productId,
                        quantityAvailable: {
                            gte: item.quantity
                        }
                    },
                    data: {
                        quantityAvailable: {
                            decrement: item.quantity
                        },
                        quantitySold: {
                            increment: item.quantity
                        },
                    }
                });
            }

            // Update product batches
            let quantityLeft, quantityTotalLeft;
            let slicedProductBatches: ProductBatch[];

            for(let item of cartItemResults) {
                quantityTotalLeft = item.quantity;
                slicedProductBatches = productBatches.filter(i => i.productId === item.productId);

                for(let i = 0; i < slicedProductBatches.length && quantityTotalLeft > 0; i++) {
                    quantityTotalLeft -= slicedProductBatches[i].quantityLeft;
                    quantityLeft = Math.max(-quantityTotalLeft, 0)
                    await prisma.productBatch.update({
                        where: {
                            id: slicedProductBatches[i].id,
                            versionNumber: slicedProductBatches[i].versionNumber
                        },
                        data: {
                            quantityLeft: quantityLeft,
                            modifiedByUserId: request.userId,
                            modifiedOn: new Date(),
                            versionNumber: {
                                increment: 1
                            }
                        }
                    });
                }
            }

            // Create new purchases
            let totalPrice: number;

            for(let key in storeDict) {
                totalPrice = 0;
                for(let item of storeDict[key]) {
                    totalPrice += item.quantity * Number(item.product.unitPrice);
                }
        
                purchases.push(await prisma.purchase.create({
                    data: {
                        userId: request.userId,
                        storeId: Number(key),
                        totalPrice: totalPrice,
                        estimatedDeliveryDate: new Date().addDays(storeDict[key][0].product.store.deliveryLeadDay),
                        purchaseStatusCode: "PP",
                        createdByUserId: request.userId,
                        modifiedByUserId: request.userId
                    }
                }));
            }

            // Create purchase items
            const purchaseItems: PurchaseItem[] = [];
            const purchaseDict: { [storeId: number]: number } = {};
            
            for(let item of purchases) {
                purchaseDict[item.storeId] = item.id;
            }

            for(let item of cartItemResults) {
                purchaseItems.push(await prisma.purchaseItem.create({
                    data: {
                        purchaseId: purchaseDict[item.product.storeId],
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.product.unitPrice,
                        createdByUserId: request.userId,
                        modifiedByUserId: request.userId
                    }
                }));
            }

            //Update cart items with purchase items
            let purchaseItem: PurchaseItem;

            for(let item of cartItemResults) {
                purchaseItem = purchaseItems.filter(i => i.productId === item.productId)[0];

                await prisma.cartItem.update({
                    where: {
                        id: item.id,
                        versionNumber: item.versionNumber
                    },
                    data: {
                        purchaseItemId: purchaseItem.id,
                        modifiedByUserId: request.userId,
                        modifiedOn: new Date(),
                        versionNumber: {
                            increment: 1
                        }
                    }
                });
            }
        });
    }
    catch (error) {
        nextFunction(createError(500));
        return;
    }

    let saveRecordApiResponseBodies: CommonContract.SaveRecordApiResponseBody[] = [];

    purchases.forEach(item => {
        saveRecordApiResponseBodies.push(new CommonContract.SaveRecordApiResponseBody(item.id, item.versionNumber));
    })

    response.json(saveRecordApiResponseBodies);
});

type CartItemCreateResult = Prisma.CartItemGetPayload<{
    include: {
        product: {
            include: {
                store: true,
                productStock: true
            }
        }   
    }
}>;

/*
    PayPurchases: Pay for purchases. Status from "PP" to "O"
    Request: PutPurchaseApiRequestBody
*/
purchaseRouter.put("/pay", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.PutPurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction(createError(400));
        return;
    }

    try
    {
        const purchases: Purchase[] = await prisma.purchase.findMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "PP",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });

        if(purchases.length !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update purchases to Ordered status
    let purchaseResults: PurchasePutResult[] = [];

    try
    {
        const batchResponse: Prisma.BatchPayload = await prisma.purchase.updateMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "PP",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            },
            data: {
                purchaseStatusCode: "O",
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });

        if(batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        purchaseResults = await prisma.purchase.findMany({
            where: {
                id: {
                    in: requestBody.purchaseIds
                }
            },
            include: {
                purchaseStatus: true   
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let putPurchaseApiResponseBodyItems: PurchaseContract.PutPurchaseApiResponseBodyItem[] = [];

    for(let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(
            item.id,
            item.purchaseStatusCode,
            item.purchaseStatus.name,
            item.versionNumber
        ));
    }

    response.send(putPurchaseApiResponseBodyItems);
});

type PurchasePutResult = Prisma.PurchaseGetPayload<{
    include: {
        purchaseStatus: true   
    }
}>;

/*
    ConfirmPurchases: Confirm customer's purchases. Status from "O" to "OC".
    Request: PutPurchaseApiRequestBody
*/
purchaseRouter.put("/confirm", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.PutPurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction(createError(400));
        return;
    }

    let leadDay: number = 0;

    try
    {
        const purchases: Purchase[] = await prisma.purchase.findMany({
            where: {
                store: {
                    userId: request.userId
                },
                purchaseStatusCode: "O",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });

        if(purchases.length !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        const store: Store | null = await prisma.store.findFirst({
            where: {
                userId: request.userId
            }
        });

        if(store === null) {
            nextFunction(createError(400));
            return;
        }

        leadDay = store.deliveryLeadDay
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update purchases to Order Confirmed status
    let purchaseResults: PurchasePutResult[] = [];

    try
    {
        const batchResponse: Prisma.BatchPayload = await prisma.purchase.updateMany({
            where: {
                store: {
                    userId : request.userId
                },
                purchaseStatusCode: "O",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            },
            data: {
                purchaseStatusCode: "OC",
                estimatedDeliveryDate: new Date().addDays(leadDay),
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });

        if(batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        purchaseResults = await prisma.purchase.findMany({
            where: {
                id: {
                    in: requestBody.purchaseIds
                }
            },
            include: {
                purchaseStatus: true   
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let putPurchaseApiResponseBodyItems: PurchaseContract.PutPurchaseApiResponseBodyItem[] = [];

    for(let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(
            item.id,
            item.purchaseStatusCode,
            item.purchaseStatus.name,
            item.versionNumber
        ));
    }

    response.send(putPurchaseApiResponseBodyItems);
});

/*
    SendPurchases: Send customer's purchases. Status from "OC" to "OD".
    Request: PutPurchaseApiRequestBody
*/
purchaseRouter.put("/send", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.PutPurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction(createError(400));
        return;
    }

    try
    {
        const purchases: Purchase[] = await prisma.purchase.findMany({
            where: {
                store: {
                    userId: request.userId
                },
                purchaseStatusCode: "OC",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });

        if(purchases.length !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update purchases to Order Confirmed status
    let purchaseResults: PurchasePutResult[] = [];

    try
    {
        const batchResponse: Prisma.BatchPayload = await prisma.purchase.updateMany({
            where: {
                store: {
                    userId : request.userId
                },
                purchaseStatusCode: "OC",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            },
            data: {
                purchaseStatusCode: "OD",
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });

        if(batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        purchaseResults = await prisma.purchase.findMany({
            where: {
                id: {
                    in: requestBody.purchaseIds
                }
            },
            include: {
                purchaseStatus: true   
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let putPurchaseApiResponseBodyItems: PurchaseContract.PutPurchaseApiResponseBodyItem[] = [];

    for(let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(
            item.id,
            item.purchaseStatusCode,
            item.purchaseStatus.name,
            item.versionNumber
        ));
    }

    response.send(putPurchaseApiResponseBodyItems);
});

/*
    DeliveredPurchases: Confirm customer's purchases. Status from "OD" to "D".
    Request: PutPurchaseApiRequestBody
*/
purchaseRouter.put("/delivered", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.PutPurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction(createError(400));
        return;
    }

    try
    {
        const purchases: Purchase[] = await prisma.purchase.findMany({
            where: {
                store: {
                    userId: request.userId
                },
                purchaseStatusCode: "OD",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });

        if(purchases.length !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update purchases to Order Confirmed status
    let purchaseResults: PurchasePutResult[] = [];

    try
    {
        const batchResponse: Prisma.BatchPayload = await prisma.purchase.updateMany({
            where: {
                store: {
                    userId : request.userId
                },
                purchaseStatusCode: "OD",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            },
            data: {
                purchaseStatusCode: "D",
                deliveredDateTime: new Date(),
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });

        if(batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        purchaseResults = await prisma.purchase.findMany({
            where: {
                id: {
                    in: requestBody.purchaseIds
                }
            },
            include: {
                purchaseStatus: true   
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let putPurchaseApiResponseBodyItems: PurchaseContract.PutPurchaseApiResponseBodyItem[] = [];

    for(let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(
            item.id,
            item.purchaseStatusCode,
            item.purchaseStatus.name,
            item.versionNumber
        ));
    }

    response.send(putPurchaseApiResponseBodyItems);
});

/*
    ReceivePurchases: Receive purchases. Status from "D" to "R"
    Request: PutPurchaseApiRequestBody
*/
purchaseRouter.put("/receive", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: PurchaseContract.PutPurchaseApiRequestBody = request.body;

    if(!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction(createError(400));
        return;
    }

    try
    {
        const purchases: Purchase[] = await prisma.purchase.findMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "D",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });

        if(purchases.length !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update purchases to Ordered status
    let purchaseResults: PurchasePutResult[] = [];

    try
    {
        const batchResponse: Prisma.BatchPayload = await prisma.purchase.updateMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "D",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            },
            data: {
                purchaseStatusCode: "R",
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });

        if(batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction(createError(400));
            return;
        }

        purchaseResults = await prisma.purchase.findMany({
            where: {
                id: {
                    in: requestBody.purchaseIds
                }
            },
            include: {
                purchaseStatus: true   
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let putPurchaseApiResponseBodyItems: PurchaseContract.PutPurchaseApiResponseBodyItem[] = [];

    for(let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(
            item.id,
            item.purchaseStatusCode,
            item.purchaseStatus.name,
            item.versionNumber
        ));
    }

    response.send(putPurchaseApiResponseBodyItems);
});
