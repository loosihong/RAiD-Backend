import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, Product, Store, UnitOfMeasure } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import * as CommonUtil from "../../utils/commonUtil";
import  "../../utils/string.extension";
import  "../../utils/number.extension";
import * as CommonContract from "../../../contract/common";
import * as ProductContract from "../../../contract/stock/product";

export const productRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    SearchProducts: Search for products.
    Query: keyword, sort, order, offset, fetch
    Response: SearchProductApiResponseBodyItem list
*/
productRouter.get("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
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
        nextFunction(createError(500));
        return;
    }

    let searchProductApiResponseBodyItems: ProductContract.SearchProductApiResponseBodyItem[] = [];

    productResults.forEach(productResult => {
        searchProductApiResponseBodyItems.push(new ProductContract.SearchProductApiResponseBodyItem(
            productResult.id,
            productResult.name,
            productResult.unitOfMeasure.shortName,
            Number(productResult.unitPrice),
            productResult.productStock?.quantitySold || 0
        ))
    });

    response.json(new ProductContract.SearchProductApiResponseBody(
        resultCount,
        searchProductApiResponseBodyItems
    ));
});

type ProductSearchResult = Prisma.ProductGetPayload<{
    include: {
        unitOfMeasure: true,
        productStock: true
    }
}>;

/*
    GetProduct: Get details of a product.
    Params: id
    Response: GetProductApiResponseBody
*/
productRouter.get("/:id", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { id } = request.params;

    //Validate params
    const [idIsValue, idValue] = String.tryGetInteger(id);

    if(!idIsValue) {
        nextFunction(createError(400));
    }

    // Result
    let productResult: ProductGetResult | null = null;
    
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
        nextFunction(createError(500));
        return;
    }

    if(productResult === null) {
        response.status(404).end();
        return;
    }
    
    response.json(new ProductContract.GetProductApiResponseBody(
        productResult.id,
        productResult.skuCode || "",
        productResult.productDescription?.description || "",
        productResult.unitOfMeasure.shortName,
        Number(productResult.unitPrice),
        productResult.store.name,
        Number(productResult.productStock?.quantityAvailable) || 0,
        Number(productResult.productStock?.quantitySold) || 0
    ));
});

type ProductGetResult = Prisma.ProductGetPayload<{
    include: {
        productDescription: true,
        unitOfMeasure: true,
        store: true,
        productStock: true,    
    }
}>;

/*
    CreateProduct: Create a new product.
    Request: SaveProductApiRequestBody
    Response: SaveRecordApiResponseBody
*/
productRouter.post("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: ProductContract.SaveProductApiRequestBody = request.body;

    if(!String.validateLength(requestBody.name, 200) ||
        !String.validateLength(requestBody.skuCode, 200) ||
        !String.validateLength(requestBody.description, 10000)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryNumber(requestBody.unitPrice, 0, CommonUtil.CURRENCY_MAX)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryIdentifier(requestBody.unitOfMeasureId)) {
        nextFunction(createError(400));
        return;
    }

    let store: Store | null = null;

    try
    {
        const unitOfMeasure: UnitOfMeasure | null = await prisma.unitOfMeasure.findFirst({
            where: {
                id: requestBody.unitOfMeasureId,
                isDeleted: false
            }
        });

        if(unitOfMeasure === null) {
            nextFunction(createError(400));
            return;
        }

        store = await prisma.store.findFirst({
            where: {
                userId: request.userId,
                isDeleted: false
            }
        });

        if(store === null) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    // Create product
    let product: Product;
    
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
                    create: {
                    }
                }
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        product.id,
        product.versionNumber
    ));
});

/*
    UpdateProduct: Update a product.
    Request: SaveProductApiRequestBody
    Response: SaveRecordApiResponseBody
*/
productRouter.put("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: ProductContract.SaveProductApiRequestBody = request.body;

    if(!Number.tryIdentifier(requestBody.id)) {
        nextFunction(createError(400));
        return;
    }

    if(!String.validateLength(requestBody.name, 200) ||
        !String.validateLength(requestBody.skuCode, 200) ||
        !String.validateLength(requestBody.description, 10000)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryNumber(requestBody.unitPrice, 0, CommonUtil.CURRENCY_MAX)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryIdentifier(requestBody.unitOfMeasureId)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction(createError(400));
        return;
    }

    try
    {
        const unitOfMeasure: UnitOfMeasure | null = await prisma.unitOfMeasure.findFirst({
            where: {
                id: requestBody.unitOfMeasureId,
                isDeleted: false
            }
        });

        if(unitOfMeasure === null) {
            nextFunction(createError(400));
            return;
        }

        const productResult: ProductUpdateResult | null = await prisma.product.findFirst({
            where: {
                id: requestBody.id,
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

    let product: Product

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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        product.id,
        product.versionNumber
    ));
});

type ProductUpdateResult = Prisma.ProductGetPayload<{
    include: {
        store: true   
    }
}>;

/*
    DeleteProduct: Soft delete a product.
    Params: id
*/
productRouter.delete("/:id", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
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

    let productResult: ProductDeleteResult | null;

    try
    {
        productResult = await prisma.product.findFirst({
            where: {
                id: idValue,
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

    let product: Product

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
        nextFunction(createError(500));
        return;
    }

    response.end();
});

type ProductDeleteResult = Prisma.ProductGetPayload<{
    include: {
        store: true   
    }
}>;