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
exports.storeRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
const commonUtil_1 = require("../../utils/commonUtil");
require("../../utils/string.extension");
const CommonContract = __importStar(require("../../../contract/common"));
const StoreContract = __importStar(require("../../../contract/stock/store"));
const ProductContract = __importStar(require("../../../contract/stock/product"));
const PurchaseContract = __importStar(require("../../../contract/customer/purchase"));
exports.storeRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    GetUser: Get profile of a user's store.
    Params: sessionId
    Response: GetStoreApiResponseBody
*/
exports.storeRouter.get("/:sessionId/current", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { sessionId } = request.params;
    //Validate params
    if (!String.validateLength(sessionId, 36)) {
        nextFunction((0, http_errors_1.default)(400));
    }
    // Result
    let userSessionResult = null;
    try {
        userSessionResult = await prisma.userSession.findFirst({
            where: {
                id: sessionId,
                isDeleted: false
            },
            include: {
                user: {
                    include: {
                        store: true
                    }
                },
            }
        });
        if (userSessionResult === null || userSessionResult.user.store == null) {
            nextFunction((0, http_errors_1.default)(404));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    if (userSessionResult.userId !== request.userId) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    if (userSessionResult === null) {
        response.status(404).end();
        return;
    }
    response.json(new StoreContract.GetStoreApiResponseBody(userSessionResult.user.store.id, userSessionResult.user.store.name, userSessionResult.user.store.deliveryLeadDay, userSessionResult.user.store.versionNumber));
});
/*
    CreateStore: Create user's store.
    Request: SaveStoreApiRequestBody
    Response: SaveApiResponseBody
*/
exports.storeRouter.post("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!String.validateLength(requestBody.name, 200)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.deliveryLeadDay, 1, commonUtil_1.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let store = null;
    try {
        store = await prisma.store.findFirst({
            where: {
                userId: request.userId,
                isDeleted: false
            }
        });
        if (store !== null) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Create store
    try {
        store = await prisma.store.create({
            data: {
                name: requestBody.name,
                userId: request.userId,
                deliveryLeadDay: requestBody.deliveryLeadDay,
                createdByUserId: request.userId,
                modifiedByUserId: request.userId
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(store.id, store.versionNumber));
});
/*
    UpdateStore: Update user's store.
    Request: SaveStoreApiRequestBody
    Response: SaveApiResponseBody
*/
exports.storeRouter.put("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!String.validateLength(requestBody.name, 200)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.deliveryLeadDay, 1, commonUtil_1.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    // Update store
    let store = null;
    try {
        store = await prisma.store.update({
            where: {
                userId: request.userId,
                versionNumber: requestBody.versionNumber,
                isDeleted: false
            },
            data: {
                name: requestBody.name,
                deliveryLeadDay: requestBody.deliveryLeadDay,
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                }
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(store.id, store.versionNumber));
});
/*
    SearchStoreProducts: Search for products in the user's store.
    Query: keyword, sort, order, offset, fetch
    Response: SearchStoreProductApiResponseBodyItem list
*/
exports.storeRouter.get("/products", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { keyword, sort, order, offset, fetch } = request.query;
    // Validate query
    if (typeof (keyword) !== "string" ||
        typeof (sort) !== "string" ||
        typeof (order) !== "string" ||
        typeof (offset) !== "string" ||
        typeof (fetch) !== "string") {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const keywordText = String(keyword).trim().toLowerCase();
    const sortText = String(sort).trim().toLowerCase();
    if (!Object.values(ProductContract.SearchProductOrderBy).includes(sortText)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [orderIsValid, queryOrder] = String.tryGetQueryOrder(order);
    if (!orderIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [offsetIsValid, offsetValue] = String.tryGetInteger(offset);
    if (!offsetIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [fetchIsValid, fetchValue] = String.tryGetInteger(fetch);
    if (!fetchIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    // Dynamic ordering
    let orderBy = {};
    if (sortText === ProductContract.SearchProductOrderBy.Relevance) {
        orderBy = {
            _relevance: {
                fields: ["name"],
                search: keywordText,
                sort: queryOrder
            }
        };
    }
    else if (sortText === ProductContract.SearchProductOrderBy.Price) {
        orderBy = {
            unitPrice: queryOrder
        };
    }
    else if (sortText === ProductContract.SearchProductOrderBy.Sales) {
        orderBy = {
            productStock: {
                quantitySold: queryOrder
            }
        };
    }
    // Result
    let productResults;
    let resultCount;
    const query = {
        where: {
            AND: [
                {
                    OR: [
                        {
                            name: {
                                contains: keywordText.length === 0 ? undefined : keywordText,
                                mode: "insensitive"
                            },
                        },
                        {
                            skuCode: {
                                contains: keywordText.length === 0 ? undefined : keywordText,
                                mode: "insensitive"
                            }
                        }
                    ],
                    store: {
                        userId: request.userId
                    },
                    isDeleted: false
                }
            ]
        }
    };
    try {
        [productResults, resultCount] = await prisma.$transaction([
            prisma.product.findMany({
                where: query.where,
                orderBy,
                skip: offsetValue,
                take: fetchValue,
                include: {
                    unitOfMeasure: true,
                    productStock: true,
                    store: true
                }
            }),
            prisma.product.count({
                where: query.where
            })
        ]);
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let searchStoreProductApiResponseBodyItems = [];
    productResults.forEach(productResult => {
        searchStoreProductApiResponseBodyItems.push(new ProductContract.SearchStoreProductApiResponseBodyItem(productResult.id, productResult.name, productResult.skuCode, productResult.unitOfMeasure.shortName, Number(productResult.unitPrice), productResult.productStock?.quantityAvailable || 0, productResult.productStock?.quantitySold || 0));
    });
    response.json(new ProductContract.SearchStoreProductApiResponseBody(resultCount, searchStoreProductApiResponseBodyItems));
});
/*
    GetStoreProduct: Get details of a store's product.
    Params: id
    Response: GetStoreProductApiResponseBody
*/
exports.storeRouter.get("/products/:id", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { id } = request.params;
    //Validate params
    const [idIsValue, idValue] = String.tryGetInteger(id);
    if (!idIsValue) {
        nextFunction((0, http_errors_1.default)(400));
    }
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Result
    let productResult = null;
    try {
        productResult = await prisma.product.findFirst({
            where: {
                id: idValue,
                store: {
                    userId: request.userId
                },
                isDeleted: false
            },
            include: {
                productDescription: true,
                store: true,
                productStock: true,
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    if (productResult === null) {
        response.status(404).end();
        return;
    }
    response.json(new ProductContract.GetStoreProductApiResponseBody(productResult.id, productResult.name, productResult.skuCode || "", productResult.productDescription?.description || "", productResult.unitOfMeasureId, Number(productResult.unitPrice), Number(productResult.productStock?.quantityAvailable) || 0, Number(productResult.productStock?.quantitySold) || 0, productResult.versionNumber));
});
/*
    GetStorePurchases: Get all purchases in a store.
    Query: offset, fetch
    Response: GetPurchaseItemApiReponseBodyItem list
*/
exports.storeRouter.get("/purchases", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { offset, fetch } = request.query;
    // Validate query
    if (typeof (offset) !== "string" ||
        typeof (fetch) !== "string") {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [offsetIsValid, offsetValue] = String.tryGetInteger(offset);
    if (!offsetIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [fetchIsValid, fetchValue] = String.tryGetInteger(fetch);
    if (!fetchIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Result
    let purchaseResults;
    let resultCount;
    const query = {
        where: {
            store: {
                userId: request.userId
            },
            isDeleted: false
        },
    };
    try {
        [purchaseResults, resultCount] = await prisma.$transaction([
            prisma.purchase.findMany({
                where: query.where,
                orderBy: {
                    purchasedOn: "desc"
                },
                skip: offsetValue,
                take: fetchValue,
                include: {
                    user: true,
                    store: true,
                    purchaseStatus: true,
                    purchaseItems: {
                        include: {
                            product: {
                                include: {
                                    unitOfMeasure: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.purchase.count({
                where: query.where
            })
        ]);
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let getPurchaseItemApiReponseBodyItems;
    let getPurchaseApiReponseBodyItems = [];
    for (let purchase of purchaseResults) {
        getPurchaseItemApiReponseBodyItems = [];
        purchase.purchaseItems.forEach(item => {
            getPurchaseItemApiReponseBodyItems.push(new PurchaseContract.GetPurchaseItemApiReponseBodyItem(item.productId, item.product.name, item.quantity, item.product.unitOfMeasure.shortName, Number(item.unitPrice)));
        });
        getPurchaseApiReponseBodyItems.push(new PurchaseContract.GetPurchaseApiReponseBodyItem(purchase.id, purchase.userId, purchase.user.loginName, purchase.storeId, purchase.store.name, Number(purchase.totalPrice), purchase.purchasedOn.toISOString(), purchase.estimatedDeliveryDate.toISOString(), purchase.deliveredDateTime !== null ? purchase.deliveredDateTime.toISOString() : null, purchase.purchaseStatusCode, purchase.purchaseStatus.name, getPurchaseItemApiReponseBodyItems, purchase.versionNumber));
    }
    response.json(new PurchaseContract.GetPurchaseApiReponseBody(resultCount, getPurchaseApiReponseBodyItems));
});
