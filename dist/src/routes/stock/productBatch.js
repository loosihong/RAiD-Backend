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
exports.productBatchRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
const commonUtil_1 = require("../../utils/commonUtil");
require("../../utils/string.extension");
const CommonUtil = __importStar(require("../../utils/commonUtil"));
const CommonContract = __importStar(require("../../../contract/common"));
const ProductBatchContract = __importStar(require("../../../contract/stock/productBatch"));
exports.productBatchRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    GetProductBatches: Get all batches of a product.
    Query: sort, order, offset, fetch
    Params: productId
    Response: GetProductBatchApiResponseBody
*/
exports.productBatchRouter.get("/:productId/product-batches", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { sort, order, offset, fetch } = request.query;
    const { productId } = request.params;
    // Validate query
    if (typeof (sort) !== "string" ||
        typeof (order) !== "string" ||
        typeof (offset) !== "string" ||
        typeof (fetch) !== "string") {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const sortText = String(sort).trim().toLowerCase();
    if (!Object.values(ProductBatchContract.GetProductBatchOrderBy).includes(sortText)) {
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
    // Validate params
    const [productIdIsValue, productIdValue] = String.tryGetInteger(productId);
    if (!productIdIsValue) {
        nextFunction((0, http_errors_1.default)(400));
    }
    let productResult;
    try {
        productResult = await prisma.product.findFirst({
            where: {
                id: productIdValue,
                isDeleted: false
            },
            include: {
                store: true
            }
        });
        if (productResult === null) {
            nextFunction((0, http_errors_1.default)(404));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    if (productResult.store.userId !== request.userId) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    // Dynamic ordering
    let orderBy = {};
    if (sortText === ProductBatchContract.GetProductBatchOrderBy.QuantityTotal) {
        orderBy = {
            quantityTotal: queryOrder
        };
    }
    else if (sortText === ProductBatchContract.GetProductBatchOrderBy.QuantityLeft) {
        orderBy = {
            quantityLeft: queryOrder
        };
    }
    else if (sortText === ProductBatchContract.GetProductBatchOrderBy.ArrivedOn) {
        orderBy = {
            arrivedOn: queryOrder
        };
    }
    else if (sortText === ProductBatchContract.GetProductBatchOrderBy.ExpiredOn) {
        orderBy = {
            expiredDate: queryOrder
        };
    }
    // Result
    let productBatches;
    let resultCount;
    const query = {
        where: {
            isDeleted: false
        }
    };
    try {
        [productBatches, resultCount] = await prisma.$transaction([
            prisma.productBatch.findMany({
                where: query.where,
                orderBy,
                skip: offsetValue,
                take: fetchValue
            }),
            prisma.productBatch.count({
                where: query.where
            })
        ]);
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let getProductBatchApiResponseBodyItems = [];
    productBatches.forEach(productBatch => {
        getProductBatchApiResponseBodyItems.push(new ProductBatchContract.GetProductBatchApiResponseBodyItem(productBatch.id, productBatch.productId, productBatch.batchNumber, productBatch.quantityTotal, productBatch.quantityLeft, productBatch.arrivedOn.toISOString(), productBatch.expiredDate !== null ? productBatch.expiredDate.toISOString() : null, productBatch.versionNumber));
    });
    response.json(new ProductBatchContract.GetProductBatchApiResponseBody(resultCount, getProductBatchApiResponseBodyItems));
});
/*
    CreateProductBatch: Create a new product batch.
    Request: SaveProductBatchApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.productBatchRouter.post("/product-batches", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
    if (!String.validateLength(requestBody.batchNumber, 100)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.quantityTotal, 0, commonUtil_1.INTEGER_MAX) || !Number.tryInteger(requestBody.quantityLeft, 0, commonUtil_1.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (requestBody.quantityTotal < requestBody.quantityLeft) {
        nextFunction((0, http_errors_1.default)(400, JSON.stringify(new CommonUtil.KeyValuePair("quantityLeft", "Quantity left cannot be more than total quantity."))));
        return;
    }
    const [arrivedOnIsValid, arrivedOnValue] = String.tryGetDate(requestBody.arrivedOn);
    if (!arrivedOnIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [expiredDateIsValid, expiredDateValue] = String.tryGetDate(requestBody.expiredDate);
    if (!expiredDateIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const productResult = await prisma.product.findFirst({
            where: {
                id: requestBody.productId,
                isDeleted: false
            },
            include: {
                store: true,
            }
        });
        if (productResult === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        if (productResult.store.userId !== request.userId) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Create productBatch and update product stock
    // Same transaction scope to maintain data integrity   
    let productBatch = {};
    try {
        [productBatch,] = await prisma.$transaction([
            prisma.productBatch.create({
                data: {
                    productId: requestBody.productId,
                    quantityTotal: requestBody.quantityTotal,
                    quantityLeft: requestBody.quantityLeft,
                    arrivedOn: arrivedOnValue,
                    expiredDate: expiredDateValue,
                    createdByUserId: request.userId,
                    modifiedByUserId: request.userId
                }
            }),
            prisma.productStock.update({
                where: {
                    productId: requestBody.productId
                },
                data: {
                    quantityAvailable: {
                        increment: requestBody.quantityLeft
                    }
                }
            })
        ]);
    }
    catch (error) {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(productBatch.id, productBatch.versionNumber));
});
/*
    UpdateProductBatch: Update a product batch.
    Request: SaveProductBatchApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.productBatchRouter.put("/product-batches", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
    if (!String.validateLength(requestBody.batchNumber, 100)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryInteger(requestBody.quantityTotal, 0, commonUtil_1.INTEGER_MAX) || !Number.tryInteger(requestBody.quantityLeft, 0, commonUtil_1.INTEGER_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (requestBody.quantityTotal < requestBody.quantityLeft) {
        nextFunction((0, http_errors_1.default)(400, JSON.stringify(new CommonUtil.KeyValuePair("quantityLeft", "Quantity left cannot be more than total quantity."))));
        return;
    }
    const [arrivedOnIsValid, arrivedOnValue] = String.tryGetDate(requestBody.arrivedOn);
    if (!arrivedOnIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    const [expiredDateIsValid, expiredDateValue] = String.tryGetDate(requestBody.expiredDate);
    if (!expiredDateIsValid) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let productBatchResult;
    try {
        productBatchResult = await prisma.productBatch.findFirst({
            where: {
                id: requestBody.id,
                isDeleted: false
            },
            include: {
                product: {
                    include: {
                        store: true
                    }
                }
            }
        });
        if (productBatchResult === null || productBatchResult.product.isDeleted) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        if (productBatchResult.product.store.userId !== request.userId) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Update productBatch and update product stock
    // Same transaction scope to maintain data integrity
    let productBatch = {};
    try {
        [productBatch,] = await prisma.$transaction([
            prisma.productBatch.update({
                where: {
                    id: requestBody.id,
                    versionNumber: requestBody.versionNumber
                },
                data: {
                    quantityTotal: requestBody.quantityTotal,
                    quantityLeft: requestBody.quantityLeft,
                    arrivedOn: arrivedOnValue,
                    expiredDate: expiredDateValue,
                    modifiedByUserId: request.userId,
                    modifiedOn: new Date(),
                    versionNumber: {
                        increment: 1
                    }
                }
            }),
            prisma.productStock.update({
                where: {
                    productId: requestBody.productId
                },
                data: {
                    quantityAvailable: {
                        increment: requestBody.quantityLeft - (productBatchResult?.quantityLeft || 0)
                    }
                }
            })
        ]);
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(productBatch.id, productBatch.versionNumber));
});
/*
    DeleteProductBatch: Soft delete a product batch.
    Params: id
*/
exports.productBatchRouter.delete("/product-batches/:id", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
    let productBatchResult;
    try {
        productBatchResult = await prisma.productBatch.findFirst({
            where: {
                id: idValue,
                isDeleted: false
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
        if (productBatchResult === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        if (productBatchResult.product.store.userId !== request.userId) {
            nextFunction((0, http_errors_1.default)(401));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Soft delete product batch and update product stock
    // Same transaction scope to maintain data integrity
    try {
        await prisma.$transaction([
            prisma.productBatch.update({
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
            }),
            prisma.productStock.update({
                where: {
                    productId: productBatchResult?.productId
                },
                data: {
                    quantityAvailable: {
                        decrement: productBatchResult?.quantityLeft
                    }
                }
            })
        ]);
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.end();
});
