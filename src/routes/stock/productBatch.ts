import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, ProductBatch } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import { INTEGER_MAX } from "../../utils/commonUtil";
import  "../../utils/string.extension";
import * as CommonUtil from "../../utils/commonUtil";
import * as CommonContract from "../../../contract/common";
import * as ProductBatchContract from "../../../contract/stock/productBatch";

export const productBatchRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    GetProductBatches: Get all batches of a product.
    Query: sort, order, offset, fetch
    Params: productId
    Response: GetProductBatchApiResponseBody
*/
productBatchRouter.get("/:productId/product-batches", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { sort, order, offset, fetch } = request.query;
    const { productId } = request.params;
   
    // Validate query
    if(typeof(sort) !== "string" ||
        typeof(order) !== "string" ||
        typeof(offset) !== "string" ||
        typeof(fetch) !== "string") {
        nextFunction(createError(400));
        return;
    }

    const sortText: string = String(sort).trim().toLowerCase();

    if(!Object.values(ProductBatchContract.GetProductBatchOrderBy).includes(sortText as unknown as ProductBatchContract.GetProductBatchOrderBy)) {
        nextFunction(createError(400));
        return;
    }

    const [orderIsValid, queryOrder] = String.tryGetQueryOrder(order);

    if(!orderIsValid) {
        nextFunction(createError(400));
        return;
    }

    const [offsetIsValid, offsetValue] = String.tryGetInteger(offset);

    if(!offsetIsValid) {
        nextFunction(createError(400));
        return;
    }

    const [fetchIsValid, fetchValue] = String.tryGetInteger(fetch);

    if(!fetchIsValid) {
        nextFunction(createError(400));
        return;
    }

    // Validate params
    const [productIdIsValue, productIdValue] = String.tryGetInteger(productId);

    if(!productIdIsValue) {
        nextFunction(createError(400));
    }

    let productResult: ProductGetResult | null;

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

        if(productResult === null) {
            nextFunction(createError(404));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    if(productResult.store.userId !== request.userId) {
        nextFunction(createError(401));
        return;
    }

    // Dynamic ordering
    let orderBy: Prisma.ProductBatchOrderByWithRelationAndSearchRelevanceInput = {};

    if(sortText === ProductBatchContract.GetProductBatchOrderBy.QuantityTotal) {
        orderBy = {
            quantityTotal: queryOrder as Prisma.SortOrder
        }
    }
    else if(sortText === ProductBatchContract.GetProductBatchOrderBy.QuantityLeft) {
        orderBy = {
            quantityLeft: queryOrder as Prisma.SortOrder
        }
    }
    else if(sortText === ProductBatchContract.GetProductBatchOrderBy.ArrivedOn) {
        orderBy = {
            arrivedOn: queryOrder as Prisma.SortOrder
        }
    }
    else if(sortText === ProductBatchContract.GetProductBatchOrderBy.ExpiredOn) {
        orderBy = {
            expiredDate: queryOrder as Prisma.SortOrder
        }
    }

    // Result
    let productBatches: ProductBatch[];
    let resultCount: number;
    const query: Prisma.ProductBatchFindManyArgs = {
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
        nextFunction(createError(500));
        return;
    }

    let getProductBatchApiResponseBodyItems: ProductBatchContract.GetProductBatchApiResponseBodyItem[] = [];

    productBatches.forEach(productBatch => {
        getProductBatchApiResponseBodyItems.push(new ProductBatchContract.GetProductBatchApiResponseBodyItem(
            productBatch.id,
            productBatch.productId,
            productBatch.batchNumber,
            productBatch.quantityTotal,
            productBatch.quantityLeft,
            productBatch.arrivedOn.toISOString(),
            productBatch.expiredDate !== null ? productBatch.expiredDate.toISOString() : null,
            productBatch.versionNumber
        ))
    })

    response.json(new ProductBatchContract.GetProductBatchApiResponseBody(
        resultCount,
        getProductBatchApiResponseBodyItems
    ));
});

type ProductGetResult = Prisma.ProductGetPayload<{
    include: {
        store: true  
    }
}>;

/*
    CreateProductBatch: Create a new product batch.
    Request: SaveProductBatchApiRequestBody
    Response: SaveRecordApiResponseBody
*/
productBatchRouter.post("/product-batches", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: ProductBatchContract.SaveProductBatchApiRequestBody = request.body;
    
    if(!Number.tryIdentifier(requestBody.productId)) {
        nextFunction(createError(400));
        return;
    }

    if(!String.validateLength(requestBody.batchNumber, 100)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.quantityTotal, 0, INTEGER_MAX) || !Number.tryInteger(requestBody.quantityLeft, 0, INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    if(requestBody.quantityTotal < requestBody.quantityLeft) {
        nextFunction(createError(400, JSON.stringify(
            new CommonUtil.KeyValuePair("quantityLeft", "Quantity left cannot be more than total quantity.")
        )));
        return;
    }
    const [arrivedOnIsValid, arrivedOnValue] = String.tryGetDate(requestBody.arrivedOn);

    if(!arrivedOnIsValid) {
        nextFunction(createError(400));
        return;
    }

    const [expiredDateIsValid, expiredDateValue] = String.tryGetDate(requestBody.expiredDate);

    if(!expiredDateIsValid) {
        nextFunction(createError(400));
        return;
    }

    try {
        const productResult: ProductCreateResult | null = await prisma.product.findFirst({
            where: {
                id: requestBody.productId,
                isDeleted: false
            },
            include: {
                store: true,
            }
        });

        if(productResult === null) {
            nextFunction(createError(400));
            return;
        }

        if(productResult.store.userId !== request.userId) {
            nextFunction(createError(401));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Create productBatch and update product stock
    // Same transaction scope to maintain data integrity   
    let productBatch: ProductBatch = {} as ProductBatch;
    
    try {         
        [productBatch, ] = await prisma.$transaction([
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
        nextFunction(createError(500));
        return;
    }
    
    response.json(new CommonContract.SaveRecordApiResponseBody(
        productBatch.id,
        productBatch.versionNumber
    ));
});

type ProductCreateResult = Prisma.ProductGetPayload<{
    include: {
        store: true
    }
}>;

/*
    UpdateProductBatch: Update a product batch.
    Request: SaveProductBatchApiRequestBody
    Response: SaveRecordApiResponseBody
*/
productBatchRouter.put("/product-batches", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: ProductBatchContract.SaveProductBatchApiRequestBody = request.body;

    if(!Number.tryIdentifier(requestBody.id) || !Number.tryIdentifier(requestBody.productId)) {
        nextFunction(createError(400));
        return;
    }

    if(!String.validateLength(requestBody.batchNumber, 100)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.quantityTotal, 0, INTEGER_MAX) || !Number.tryInteger(requestBody.quantityLeft, 0, INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    if(requestBody.quantityTotal < requestBody.quantityLeft) {
        nextFunction(createError(400, JSON.stringify(
            new CommonUtil.KeyValuePair("quantityLeft", "Quantity left cannot be more than total quantity.")
        )));
        return;
    }

    const [arrivedOnIsValid, arrivedOnValue] = String.tryGetDate(requestBody.arrivedOn);

    if(!arrivedOnIsValid) {
        nextFunction(createError(400));
        return;
    }

    const [expiredDateIsValid, expiredDateValue] = String.tryGetDate(requestBody.expiredDate);

    if(!expiredDateIsValid) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction(createError(400));
        return;
    }

    let productBatchResult: ProductBatchUpdateResult | null;

    try
    {
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

        if(productBatchResult === null || productBatchResult.product.isDeleted) {
            nextFunction(createError(400));
            return;
        }

        if(productBatchResult.product.store.userId !== request.userId) {
            nextFunction(createError(401));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Update productBatch and update product stock
    // Same transaction scope to maintain data integrity
    let productBatch: ProductBatch = {} as ProductBatch;
    
    try {
        [productBatch, ] = await prisma.$transaction([
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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        productBatch.id,
        productBatch.versionNumber
    ));
});

type ProductBatchUpdateResult = Prisma.ProductBatchGetPayload<{
    include: {
        product: {
            include: {
                store: true
            }
        }
    }
}>;

/*
    DeleteProductBatch: Soft delete a product batch.
    Params: id
*/
productBatchRouter.delete("/product-batches/:id", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    //Validate params
    const { id } = request.params;
    const [idIsValue, idValue] = String.tryGetInteger(id);

    if(!idIsValue) {
        nextFunction(createError(400));
    }
    
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    let productBatchResult: ProductBatchDeleteResult | null;

    try
    {
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

        if(productBatchResult === null) {
            nextFunction(createError(400));
            return;
        }

        if(productBatchResult.product.store.userId !== request.userId) {
            nextFunction(createError(401));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
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
        nextFunction(createError(500));
        return;
    }

    response.end();
});

type ProductBatchDeleteResult = Prisma.ProductBatchGetPayload<{
    include: {
        product: {
            include: {
                store: true
            }
        }
    }
}>;