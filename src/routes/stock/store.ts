import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, Product, Store } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import { INTEGER_MAX } from "../../utils/commonUtil";
import  "../../utils/string.extension";
import * as CommonContract from "../../../contract/common";
import * as StoreContract from "../../../contract/stock/store";
import * as ProductContract from "../../../contract/stock/product";
import * as PurchaseContract from "../../../contract/customer/purchase";

export const storeRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    CreateStore: Create user's store.
    Request: SaveStoreApiRequestBody
    Response: SaveApiResponseBody
*/
storeRouter.post("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: StoreContract.SaveStoreApiRequestBody = request.body;

    if(!String.validateLength(requestBody.name, 200)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.deliveryLeadDay, 1, INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    let store: Store | null = null;

    try
    {
        store = await prisma.store.findFirst({
            where: {
                userId: request.userId,
                isDeleted: false
            }
        });

        if(store !== null) {
            nextFunction(createError(401));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        store.id,
        store.versionNumber
    ));
});

/*
    UpdateStore: Update user's store.
    Request: SaveStoreApiRequestBody
    Response: SaveApiResponseBody
*/
storeRouter.put("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: StoreContract.SaveStoreApiRequestBody = request.body;

    if(!String.validateLength(requestBody.name, 200)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.deliveryLeadDay, 1, INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    // Update store
    let store: Store | null = null;
    
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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        store.id,
        store.versionNumber
    ));
});

/*
    SearchStoreProducts: Search for products in the user's store.
    Query: keyword, sort, order, offset, fetch
    Response: SearchStoreProductApiResponseBodyItem list
*/
storeRouter.get("/products", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { keyword, sort, order, offset, fetch } = request.query;
   
    // Validate query
    if(typeof(keyword) !== "string" ||
        typeof(sort) !== "string" ||
        typeof(order) !== "string" ||
        typeof(offset) !== "string" ||
        typeof(fetch) !== "string") {
        nextFunction(createError(400));
        return;
    }

    const keywordText: string = String(keyword).trim().toLowerCase();
    const sortText: string = String(sort).trim().toLowerCase();

    if(!Object.values(ProductContract.SearchProductOrderBy).includes(sortText as unknown as ProductContract.SearchProductOrderBy)) {
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

    // Dynamic ordering
    let orderBy: Prisma.ProductOrderByWithRelationAndSearchRelevanceInput = {};

    if(sortText === ProductContract.SearchProductOrderBy.Relevance) {
        orderBy = {
            _relevance: {
                fields: ["name"],
                search: keywordText,
                sort: queryOrder as Prisma.SortOrder
            }
        }
    }
    else if(sortText === ProductContract.SearchProductOrderBy.Price) {
        orderBy = {
            unitPrice: queryOrder as Prisma.SortOrder
        }
    }
    else if(sortText === ProductContract.SearchProductOrderBy.Sales) {
        orderBy = {
            productStock: {
                quantitySold: queryOrder as Prisma.SortOrder
            }
        }
    }

    // Result
    let productResults: ProductSearchResult[];
    let resultCount: number;
    const query: Prisma.ProductFindManyArgs = {
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
        nextFunction(createError(500));
        return;
    }

    let searchStoreProductApiResponseBodyItems: ProductContract.SearchStoreProductApiResponseBodyItem[] = [];

    productResults.forEach(productResult => {
        searchStoreProductApiResponseBodyItems.push(new ProductContract.SearchStoreProductApiResponseBodyItem(
            productResult.id,
            productResult.name,
            productResult.skuCode,
            productResult.unitOfMeasure.shortName,
            Number(productResult.unitPrice),
            productResult.productStock?.quantityAvailable || 0,
            productResult.productStock?.quantitySold || 0
        ))
    });

    response.json(new ProductContract.SearchStoreProductApiResponseBody(
        resultCount,
        searchStoreProductApiResponseBodyItems
    ));
});

type ProductSearchResult = Prisma.ProductGetPayload<{
    include: {
        unitOfMeasure: true,
        productStock: true,
        store: true
    }
}>;

/*
    GetStoreProduct: Get details of a store's product.
    Params: id
    Response: GetStoreProductApiResponseBody
*/
storeRouter.get("/products/:id", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { id } = request.params;

    //Validate params
    const [idIsValue, idValue] = String.tryGetInteger(id);

    if(!idIsValue) {
        nextFunction(createError(400));
    }

    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    // Result
    let productResult: ProductGetResult | null = null;
    
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
        nextFunction(createError(500));
        return;
    }

    if(productResult === null) {
        response.status(404).end();
        return;
    }
    
    response.json(new ProductContract.GetStoreProductApiResponseBody(
        productResult.id,
        productResult.name,
        productResult.skuCode || "",
        productResult.productDescription?.description || "",
        productResult.unitOfMeasureId,
        Number(productResult.unitPrice),
        Number(productResult.productStock?.quantityAvailable) || 0,
        Number(productResult.productStock?.quantitySold) || 0,
        productResult.versionNumber
    ));
});

type ProductGetResult = Prisma.ProductGetPayload<{
    include: {
        productDescription: true,
        store: true,
        productStock: true,    
    }
}>;

/*
    GetStorePurchases: Get all purchases in a store.
    Query: offset, fetch
    Response: GetPurchaseItemApiReponseBodyItem list
*/
storeRouter.get("/purchases", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { offset, fetch } = request.query;
   
    // Validate query
    if(typeof(offset) !== "string" ||
        typeof(fetch) !== "string") {
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

    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    // Result
    let purchaseResults: PurchaseStoreResult[];
    let resultCount: number;
    const query: Prisma.PurchaseFindManyArgs = {
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
        nextFunction(createError(500));
        return;
    }

    let getPurchaseItemApiReponseBodyItems: PurchaseContract.GetPurchaseItemApiReponseBodyItem[];
    let getPurchaseApiReponseBodyItems: PurchaseContract.GetPurchaseApiReponseBodyItem[] = [];

    for(let purchase of purchaseResults) {
        getPurchaseItemApiReponseBodyItems = [];
        purchase.purchaseItems.forEach(item => {
            getPurchaseItemApiReponseBodyItems.push(new PurchaseContract.GetPurchaseItemApiReponseBodyItem(
                item.productId,
                item.product.name,
                item.quantity,
                item.product.unitOfMeasure.shortName,
                Number(item.unitPrice)
            ));
        })

        getPurchaseApiReponseBodyItems.push(new PurchaseContract.GetPurchaseApiReponseBodyItem(
            purchase.id,
            purchase.userId,
            purchase.user.loginName,
            purchase.storeId,
            purchase.store.name,
            Number(purchase.totalPrice),
            purchase.purchasedOn.toISOString(),
            purchase.estimatedDeliveryDate.toISOString(),
            purchase.deliveredDateTime !== null ? purchase.deliveredDateTime.toISOString() : null,
            purchase.purchaseStatusCode,
            purchase.purchaseStatus.name,
            getPurchaseItemApiReponseBodyItems,
            purchase.versionNumber
        ));
    }    

    response.json(new PurchaseContract.GetPurchaseApiReponseBody(
        resultCount,
        getPurchaseApiReponseBodyItems));
});

type PurchaseStoreResult = Prisma.PurchaseGetPayload<{
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
}>;