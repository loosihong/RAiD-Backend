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
exports.cartItemRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
require("../../utils/string.extension");
const CommonUtil = __importStar(require("../../utils/commonUtil"));
const CommonContract = __importStar(require("../../../contract/common"));
const CartItemContract = __importStar(require("../../../contract/customer/cartItem"));
exports.cartItemRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    GetCartItems: Get all user's cart items that are not purchased.
    Response: GetCertItemApiResponseBodyItem list
*/
exports.cartItemRouter.get("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Result
    let cartItemResults;
    try {
        cartItemResults = await prisma.cartItem.findMany({
            where: {
                userId: request.userId,
                purchaseItemId: null,
                isDeleted: false
            },
            include: {
                product: {
                    include: {
                        store: true,
                        unitOfMeasure: true,
                        productStock: true
                    }
                }
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let cartItemResponseBodyItems = [];
    cartItemResults.forEach(cartItemResult => {
        cartItemResponseBodyItems.push(new CartItemContract.GetCartItemApiResponseBodyItem(cartItemResult.id, cartItemResult.product.storeId, cartItemResult.product.store.name, cartItemResult.productId, cartItemResult.product.name, cartItemResult.quantity, cartItemResult.product.unitOfMeasure.shortName, Number(cartItemResult.product.unitPrice), cartItemResult.product.productStock?.quantityAvailable || 0, cartItemResult.versionNumber));
    });
    response.json(cartItemResponseBodyItems);
});
/*
    GetCartItemQuantity: Get quantity of a user's cart items that is not purchased.
    Response: GetCartItemQuantityApiResponseBody
*/
exports.cartItemRouter.get("/products/:id/quantity", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
    let cartItem;
    try {
        cartItem = await prisma.cartItem.findFirst({
            where: {
                userId: request.userId,
                productId: idValue,
                purchaseItemId: null,
                isDeleted: false
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CartItemContract.GetCartItemQuantityApiResponseBody(cartItem?.quantity || 0));
});
/*
    CreateCartItem: Create a new cart item.
    Request: SaveCartItemApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.cartItemRouter.post("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!Number.tryIdentifier(requestBody.productId)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.quantity, 1, CommonUtil.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let cartItem;
    let quantityTotal = requestBody.quantity;
    try {
        const productStock = await prisma.productStock.findFirst({
            where: {
                productId: requestBody.productId
            }
        });
        if (productStock === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        // Get cart item with same product
        cartItem = await prisma.cartItem.findFirst({
            where: {
                productId: requestBody.productId,
                userId: request.userId,
                purchaseItemId: null,
                isDeleted: false
            }
        });
        if (cartItem !== null) {
            quantityTotal += cartItem.quantity;
        }
        if (productStock.quantityAvailable < quantityTotal) {
            nextFunction((0, http_errors_1.default)(400, JSON.stringify(new CommonUtil.KeyValuePair("quantityAvailable", "Cannot add more than quantity available."))));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    try {
        // Create new cart item when no existing cart item
        if (cartItem === null) {
            cartItem = await prisma.cartItem.create({
                data: {
                    userId: request.userId,
                    productId: requestBody.productId,
                    quantity: requestBody.quantity,
                    createdByUserId: request.userId,
                    modifiedByUserId: request.userId
                }
            });
        }
        // Update existing cart item
        else {
            cartItem = await prisma.cartItem.update({
                where: {
                    id: cartItem.id
                },
                data: {
                    userId: request.userId,
                    productId: requestBody.productId,
                    quantity: {
                        increment: requestBody.quantity
                    },
                    createdByUserId: request.userId,
                    modifiedByUserId: request.userId,
                    versionNumber: {
                        increment: 1
                    }
                }
            });
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(cartItem.id, cartItem.versionNumber));
});
/*
    UpdateCartItem: Update a cart item.
    Request: SaveCartItemApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.cartItemRouter.put("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!Number.tryIdentifier(requestBody.id) || !Number.tryIdentifier(requestBody.productId)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.quantity, 0, CommonUtil.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let cartItem;
    try {
        cartItem = await prisma.cartItem.findFirst({
            where: {
                id: requestBody.id,
                isDeleted: false
            }
        });
        if (cartItem === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        if (cartItem.userId !== request.userId) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
        const productStock = await prisma.productStock.findFirst({
            where: {
                productId: requestBody.productId
            }
        });
        if (productStock === null || productStock.quantityAvailable < requestBody.quantity) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update cart item    
    try {
        cartItem = await prisma.cartItem.update({
            where: {
                id: requestBody.id,
                versionNumber: requestBody.versionNumber
            },
            data: {
                quantity: requestBody.quantity,
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
    response.json(new CommonContract.SaveRecordApiResponseBody(cartItem.id, cartItem.versionNumber));
});
/*
    DeleteCartItem: Soft delete a cart item.
    Params: id
*/
exports.cartItemRouter.delete("/:id", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    //Validate params
    const { id } = request.params;
    const [idIsValue, idValue] = String.tryGetInteger(id);
    if (!idIsValue) {
        nextFunction((0, http_errors_1.default)(400));
    }
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    let cartItem;
    try {
        cartItem = await prisma.cartItem.findFirst({
            where: {
                id: idValue,
                isDeleted: false
            }
        });
        if (cartItem === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        if (cartItem.userId !== request.userId) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Soft delete cart item    
    try {
        cartItem = await prisma.cartItem.update({
            where: {
                id: idValue,
                isDeleted: false
            },
            data: {
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                },
                isDeleted: true
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.end();
});
