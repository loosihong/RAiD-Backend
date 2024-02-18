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
exports.productRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
const CommonUtil = __importStar(require("../../utils/commonUtil"));
require("../../utils/string.extension");
require("../../utils/number.extension");
const CommonContract = __importStar(require("../../../contract/common"));
const ProductContract = __importStar(require("../../../contract/stock/product"));
exports.productRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    SearchProducts: Search for products.
    Query: keyword, sort, order, offset, fetch
    Response: SearchProductApiResponseBodyItem list
*/
exports.productRouter.get("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
            name: {
                contains: keywordText.length === 0 ? undefined : keywordText,
                mode: "insensitive"
            },
            isDeleted: false
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
                    productStock: true
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
    let searchProductApiResponseBodyItems = [];
    productResults.forEach(productResult => {
        searchProductApiResponseBodyItems.push(new ProductContract.SearchProductApiResponseBodyItem(productResult.id, productResult.name, productResult.unitOfMeasure.shortName, Number(productResult.unitPrice), productResult.productStock?.quantitySold || 0));
    });
    response.json(new ProductContract.SearchProductApiResponseBody(resultCount, searchProductApiResponseBodyItems));
});
/*
    GetProduct: Get details of a product.
    Params: id
    Response: GetProductApiResponseBody
*/
exports.productRouter.get("/:id", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    const { id } = request.params;
    //Validate params
    const [idIsValue, idValue] = String.tryGetInteger(id);
    if (!idIsValue) {
        nextFunction((0, http_errors_1.default)(400));
    }
    // Result
    let productResult = null;
    try {
        productResult = await prisma.product.findFirst({
            where: {
                id: idValue,
                isDeleted: false
            },
            include: {
                productDescription: true,
                unitOfMeasure: true,
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
    response.json(new ProductContract.GetProductApiResponseBody(productResult.id, productResult.skuCode || "", productResult.productDescription?.description || "", productResult.unitOfMeasure.shortName, Number(productResult.unitPrice), productResult.store.name, Number(productResult.productStock?.quantityAvailable) || 0, Number(productResult.productStock?.quantitySold) || 0));
});
/*
    CreateProduct: Create a new product.
    Request: SaveProductApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.productRouter.post("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!String.validateLength(requestBody.name, 200) ||
        !String.validateLength(requestBody.skuCode, 200) ||
        !String.validateLength(requestBody.description, 10000)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryNumber(requestBody.unitPrice, 0, CommonUtil.CURRENCY_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryIdentifier(requestBody.unitOfMeasureId)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    let store = null;
    try {
        const unitOfMeasure = await prisma.unitOfMeasure.findFirst({
            where: {
                id: requestBody.unitOfMeasureId,
                isDeleted: false
            }
        });
        if (unitOfMeasure === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        store = await prisma.store.findFirst({
            where: {
                userId: request.userId,
                isDeleted: false
            }
        });
        if (store === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    // Create product
    let product;
    try {
        product = await prisma.product.create({
            data: {
                name: requestBody.name,
                skuCode: requestBody.skuCode,
                unitOfMeasureId: requestBody.unitOfMeasureId,
                unitPrice: requestBody.unitPrice.toFixed(2),
                storeId: store.id,
                createdByUserId: request.userId,
                modifiedByUserId: request.userId,
                productDescription: {
                    create: {
                        description: requestBody.description
                    }
                },
                productStock: {
                    create: {}
                }
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(product.id, product.versionNumber));
});
/*
    UpdateProduct: Update a product.
    Request: SaveProductApiRequestBody
    Response: SaveRecordApiResponseBody
*/
exports.productRouter.put("/", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Validate request
    if (!Number.tryIdentifier(request.userId)) {
        nextFunction((0, http_errors_1.default)(401));
        return;
    }
    const requestBody = request.body;
    if (!Number.tryIdentifier(requestBody.id)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!String.validateLength(requestBody.name, 200) ||
        !String.validateLength(requestBody.skuCode, 200) ||
        !String.validateLength(requestBody.description, 10000)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryNumber(requestBody.unitPrice, 0, CommonUtil.CURRENCY_MAX)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryIdentifier(requestBody.unitOfMeasureId)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    if (!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction((0, http_errors_1.default)(400));
        return;
    }
    try {
        const unitOfMeasure = await prisma.unitOfMeasure.findFirst({
            where: {
                id: requestBody.unitOfMeasureId,
                isDeleted: false
            }
        });
        if (unitOfMeasure === null) {
            nextFunction((0, http_errors_1.default)(400));
            return;
        }
        const productResult = await prisma.product.findFirst({
            where: {
                id: requestBody.id,
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
    let product;
    // Update product    
    try {
        product = await prisma.product.update({
            where: {
                id: requestBody.id,
                versionNumber: requestBody.versionNumber
            },
            data: {
                name: requestBody.name,
                skuCode: requestBody.skuCode,
                unitOfMeasureId: requestBody.unitOfMeasureId,
                unitPrice: requestBody.unitPrice.toFixed(2),
                modifiedByUserId: request.userId,
                modifiedOn: new Date(),
                versionNumber: {
                    increment: 1
                },
                productDescription: {
                    update: {
                        description: requestBody.description
                    }
                }
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    response.json(new CommonContract.SaveRecordApiResponseBody(product.id, product.versionNumber));
});
/*
    DeleteProduct: Soft delete a product.
    Params: id
*/
exports.productRouter.delete("/:id", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
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
    let productResult;
    try {
        productResult = await prisma.product.findFirst({
            where: {
                id: idValue,
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
    let product;
    // Soft delete product    
    try {
        product = await prisma.product.update({
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
