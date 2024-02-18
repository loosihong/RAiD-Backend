"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
require("../../utils/string.extension");
require("../../utils/date.extension");
const CommonUtil = __importStar(require("../../utils/commonUtil"));
const CommonContract = __importStar(require("../../../contract/common"));
const PurchaseContract = __importStar(require("../../../contract/customer/purchase"));
exports.purchaseRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    CreatePurchases: Purchase cart items.
    Request: CreatePurchaseApiRequestBody
    Response: SaveApiResponseBody list
*/
exports.purchaseRouter.post("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.cartItemIds)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let cartItemResults;
    try {
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
        if (cartItemResults.length !== requestBody.cartItemIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Pre-check enough stock for all products
    let errors = [];
    for (let item of cartItemResults) {
        if (item.quantity > (item.product.productStock?.quantityAvailable || 0)) {
            errors.push(new CommonUtil.KeyValuePair(item.id.toString(), "Not enough stock."));
        }
    }
    if (errors.length > 0) {
        nextFunction((0, http_errors_1.default)(400, JSON.stringify(errors)));
        return;
    }
    // Separate stores
    const storeDict = {};
    let storeDictValues;
    for (let item of cartItemResults) {
        storeDictValues = storeDict[item.product.storeId];
        if (storeDictValues === undefined) {
            storeDictValues = [];
            storeDict[item.product.storeId] = storeDictValues;
        }
        storeDictValues.push(item);
    }
    ;
    // Get product batches, first to expire on top
    const productIds = [];
    for (let item of cartItemResults) {
        productIds.push(item.productId);
    }
    ;
    const productBatches = await prisma.productBatch.findMany({
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
    const purchases = [];
    try {
        await prisma.$transaction(async () => {
            // Update product stocks
            for (let item of cartItemResults) {
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
            let slicedProductBatches;
            for (let item of cartItemResults) {
                quantityTotalLeft = item.quantity;
                slicedProductBatches = productBatches.filter(i => i.productId === item.productId);
                for (let i = 0; i < slicedProductBatches.length && quantityTotalLeft > 0; i++) {
                    quantityTotalLeft -= slicedProductBatches[i].quantityLeft;
                    quantityLeft = Math.max(-quantityTotalLeft, 0);
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
            let totalPrice;
            for (let key in storeDict) {
                totalPrice = 0;
                for (let item of storeDict[key]) {
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
            const purchaseItems = [];
            const purchaseDict = {};
            for (let item of purchases) {
                purchaseDict[item.storeId] = item.id;
            }
            for (let item of cartItemResults) {
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
            let purchaseItem;
            for (let item of cartItemResults) {
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let saveRecordApiResponseBodies = [];
    purchases.forEach(item => {
        saveRecordApiResponseBodies.push(new CommonContract.SaveRecordApiResponseBody(item.id, item.versionNumber));
    });
    response.json(saveRecordApiResponseBodies);
});
/*
    PayPurchases: Pay for purchases. Status from "PP" to "O"
    Request: PutPurchaseApiRequestBody
*/
exports.purchaseRouter.put("/pay", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const purchases = await prisma.purchase.findMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "PP",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });
        if (purchases.length !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update purchases to Ordered status
    let purchaseResults = [];
    try {
        const batchResponse = await prisma.purchase.updateMany({
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
        if (batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let putPurchaseApiResponseBodyItems = [];
    for (let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(item.id, item.purchaseStatusCode, item.purchaseStatus.name, item.versionNumber));
    }
    response.send(putPurchaseApiResponseBodyItems);
});
/*
    ConfirmPurchases: Confirm customer's purchases. Status from "O" to "OC".
    Request: PutPurchaseApiRequestBody
*/
exports.purchaseRouter.put("/confirm", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let leadDay = 0;
    try {
        const purchases = await prisma.purchase.findMany({
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
        if (purchases.length !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        const store = await prisma.store.findFirst({
            where: {
                userId: request.userId
            }
        });
        if (store === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        leadDay = store.deliveryLeadDay;
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update purchases to Order Confirmed status
    let purchaseResults = [];
    try {
        const batchResponse = await prisma.purchase.updateMany({
            where: {
                userId: request.userId,
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
        if (batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let putPurchaseApiResponseBodyItems = [];
    for (let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(item.id, item.purchaseStatusCode, item.purchaseStatus.name, item.versionNumber));
    }
    response.send(putPurchaseApiResponseBodyItems);
});
/*
    SendPurchases: Send customer's purchases. Status from "OC" to "OD".
    Request: PutPurchaseApiRequestBody
*/
exports.purchaseRouter.put("/send", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const purchases = await prisma.purchase.findMany({
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
        if (purchases.length !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update purchases to Order Confirmed status
    let purchaseResults = [];
    try {
        const batchResponse = await prisma.purchase.updateMany({
            where: {
                userId: request.userId,
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
        if (batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let putPurchaseApiResponseBodyItems = [];
    for (let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(item.id, item.purchaseStatusCode, item.purchaseStatus.name, item.versionNumber));
    }
    response.send(putPurchaseApiResponseBodyItems);
});
/*
    DeliveredPurchases: Confirm customer's purchases. Status from "OD" to "D".
    Request: PutPurchaseApiRequestBody
*/
exports.purchaseRouter.put("/delivered", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const purchases = await prisma.purchase.findMany({
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
        if (purchases.length !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update purchases to Order Confirmed status
    let purchaseResults = [];
    try {
        const batchResponse = await prisma.purchase.updateMany({
            where: {
                userId: request.userId,
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
        if (batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let putPurchaseApiResponseBodyItems = [];
    for (let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(item.id, item.purchaseStatusCode, item.purchaseStatus.name, item.versionNumber));
    }
    response.send(putPurchaseApiResponseBodyItems);
});
/*
    ReceivePurchases: Receive purchases. Status from "D" to "R"
    Request: PutPurchaseApiRequestBody
*/
exports.purchaseRouter.put("/receive", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!CommonUtil.validateIdentifier(requestBody.purchaseIds) || requestBody.purchaseIds.length === 0) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const purchases = await prisma.purchase.findMany({
            where: {
                userId: request.userId,
                purchaseStatusCode: "D",
                isDeleted: false,
                id: {
                    in: requestBody.purchaseIds
                }
            }
        });
        if (purchases.length !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update purchases to Ordered status
    let purchaseResults = [];
    try {
        const batchResponse = await prisma.purchase.updateMany({
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
        if (batchResponse.count !== requestBody.purchaseIds.length) {
            nextFunction((0, http_errors_1.default)(400));
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
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let putPurchaseApiResponseBodyItems = [];
    for (let item of purchaseResults) {
        putPurchaseApiResponseBodyItems.push(new PurchaseContract.PutPurchaseApiResponseBodyItem(item.id, item.purchaseStatusCode, item.purchaseStatus.name, item.versionNumber));
    }
    response.send(putPurchaseApiResponseBodyItems);
});
