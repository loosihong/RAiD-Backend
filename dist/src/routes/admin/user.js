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
exports.userRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
require("../../utils/string.extension");
const UserContract = __importStar(require("../../../contract/admin/user"));
const PurchaseContract = __importStar(require("../../../contract/customer/purchase"));
const PurchaseItemContract = __importStar(require("../../../contract/customer/purchaseItem"));
exports.userRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const [isValidSessionDuration, sessionDurationValue] = String.tryGetInteger(process.env.SESSION_DURATION || "60");
const sessionDuration = Number(isValidSessionDuration ? sessionDurationValue : 60);
/*
    UserLogin: Authenticate and login a user.
    Request: UserContract.UserLoginApiRequestBody
    Response: UserContract.UserLoginApiResponseBody
*/
exports.userRouter.post("/login", async (request, response, nextFunction) => {
    const requestBody = request.body;
    // Validate request
    if (!String.validateLength(requestBody.loginName, 200)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    // Authenticate user
    const user = await prisma.user.findFirst({
        where: {
            loginName: requestBody.loginName,
            isDeleted: false
        }
    });
    if (user === null) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Get a valid session.
    let userSession = await prisma.userSession.findFirst({
        where: {
            userId: user.id,
            expiredOn: {
                gte: new Date()
            }
        }
    });
    // Set new session expiry.
    let newExpiredOn = new Date();
    newExpiredOn.setMinutes(newExpiredOn.getMinutes() + sessionDuration);
    try {
        // Create session if not exist
        if (userSession === null) {
            userSession = await prisma.userSession.create({
                data: {
                    userId: user.id,
                    expiredOn: newExpiredOn
                }
            });
        }
        // Update existing session
        else {
            userSession = await prisma.userSession.update({
                where: {
                    id: userSession.id
                },
                data: {
                    expiredOn: newExpiredOn,
                    modifiedOn: new Date(),
                    versionNumber: {
                        increment: 1,
                    }
                }
            });
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    if (userSession !== null) {
        response.json(new UserContract.UserLoginApiResponseBody(userSession.id));
    }
});
/*
    GetUser: Get profile of a user.
    Params: sessionId
    Response: GetUserApiResponseBody
*/
exports.userRouter.get("/:sessionId/current", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
        if (userSessionResult === null) {
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
    response.json(new UserContract.UserApiResponseBody(userSessionResult.user.loginName, userSessionResult.user.store?.id || null));
});
/*
    GetUserPurchasesActive: Get all active purchases of a user.
    Response: GetPurchaseItemApiReponseBodyItem list
*/
exports.userRouter.get("/purchases/active", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Result
    let purchaseResults;
    try {
        purchaseResults = await prisma.purchase.findMany({
            where: {
                userId: request.userId,
                purchaseStatus: {
                    isEndState: false
                },
                isDeleted: false
            },
            orderBy: {
                purchasedOn: "asc"
            },
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
        });
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
    response.json(getPurchaseApiReponseBodyItems);
});
/*
    SearchUserPurchaseItemsHistory: Search for historic purchase items of a user.
    Query: keyword, offset, fetch
    Response: SearchPurchaseItemApiResponseBody
*/
exports.userRouter.get("/purchase-items/history", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { keyword, offset, fetch } = request.query;
    // Validate query
    if (typeof (keyword) !== "string" ||
        typeof (offset) !== "string" ||
        typeof (fetch) !== "string") {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const keywordText = String(keyword).trim().toLowerCase();
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
    let purchaseItemSearchResults;
    let resultCount;
    const query = {
        where: {
            purchase: {
                userId: request.userId,
                purchaseStatus: {
                    code: "R"
                }
            },
            product: {
                name: {
                    contains: keywordText.length === 0 ? undefined : keywordText,
                    mode: "insensitive"
                }
            },
            isDeleted: false
        }
    };
    try {
        [purchaseItemSearchResults, resultCount] = await prisma.$transaction([
            prisma.purchaseItem.findMany({
                where: query.where,
                orderBy: {
                    purchase: {
                        receivedDateTime: "desc"
                    }
                },
                skip: offsetValue,
                take: fetchValue,
                include: {
                    product: {
                        include: {
                            store: true,
                            unitOfMeasure: true
                        }
                    },
                    purchase: true
                }
            }),
            prisma.purchaseItem.count({
                where: query.where
            })
        ]);
    }
    catch (error) {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let searchPurchaseItemApiResponseBodyItems = [];
    purchaseItemSearchResults.forEach(purchaseItemSearchResult => {
        searchPurchaseItemApiResponseBodyItems.push(new PurchaseItemContract.SearchPurchaseItemApiResponseBodyItem(purchaseItemSearchResult.id, purchaseItemSearchResult.product.storeId, purchaseItemSearchResult.product.store.name, purchaseItemSearchResult.productId, purchaseItemSearchResult.product.name, purchaseItemSearchResult.quantity, purchaseItemSearchResult.product.unitOfMeasure.shortName, Number(purchaseItemSearchResult.unitPrice), Number(purchaseItemSearchResult.purchase.totalPrice), purchaseItemSearchResult.createdOn.toISOString(), purchaseItemSearchResult.purchase.deliveredDateTime !== null ? purchaseItemSearchResult.purchase.deliveredDateTime.toISOString() : null));
    });
    response.json(new PurchaseItemContract.SearchPurchaseItemApiResponseBody(resultCount, searchPurchaseItemApiResponseBodyItems));
});
