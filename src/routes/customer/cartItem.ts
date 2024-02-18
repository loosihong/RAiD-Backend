import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, CartItem, Product, ProductStock } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import  "../../utils/string.extension";
import * as CommonUtil from "../../utils/commonUtil";
import * as CommonContract from "../../../contract/common";
import * as CartItemContract from "../../../contract/customer/cartItem";

export const cartItemRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    GetCartItems: Get all user's cart items that are not purchased.
    Response: GetCertItemApiResponseBodyItem list
*/
cartItemRouter.get("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    // Result
    let cartItemResults: CartItemGetResult[];
    
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
        nextFunction(createError(500));
        return;
    }

    let cartItemResponseBodyItems: CartItemContract.GetCartItemApiResponseBodyItem[] = [];

    cartItemResults.forEach(cartItemResult => {
        cartItemResponseBodyItems.push(new CartItemContract.GetCartItemApiResponseBodyItem(
            cartItemResult.id,
            cartItemResult.product.storeId,
            cartItemResult.product.store.name,
            cartItemResult.productId,
            cartItemResult.product.name,
            cartItemResult.quantity,
            cartItemResult.product.unitOfMeasure.shortName,
            Number(cartItemResult.product.unitPrice),
            cartItemResult.product.productStock?.quantityAvailable || 0,
            cartItemResult.versionNumber
        ))
    });
    
    response.json(cartItemResponseBodyItems);
});

type CartItemGetResult = Prisma.CartItemGetPayload<{
    include: {
        product: {
            include: {
                store: true,
                unitOfMeasure: true,
                productStock: true                
            }
        }             
    }
}>;

/*
    GetCartItemQuantity: Get quantity of a user's cart items that is not purchased.
    Response: GetCartItemQuantityApiResponseBody
*/
cartItemRouter.get("/products/:id/quantity", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
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
    let cartItem: CartItem | null;
    
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
        nextFunction(createError(500));
        return;
    }
    
    response.json(new CartItemContract.GetCartItemQuantityApiResponseBody(cartItem?.quantity || 0));
});

/*
    CreateCartItem: Create a new cart item.
    Request: SaveCartItemApiRequestBody
    Response: SaveRecordApiResponseBody
*/
cartItemRouter.post("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: CartItemContract.SaveCartItemApiRequestBody = request.body;
    
    if(!Number.tryIdentifier(requestBody.productId)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.quantity, 1, CommonUtil.INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    let cartItem: CartItem | null;
    let quantityTotal: number = requestBody.quantity;

    try
    {
        const productStock: ProductStock | null = await prisma.productStock.findFirst({
            where: {
                productId: requestBody.productId
            }
        });

        if(productStock === null) {
            nextFunction(createError(400));
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

        if(cartItem !== null) {
            quantityTotal += cartItem.quantity;
        }

        if(productStock.quantityAvailable < quantityTotal) {
            nextFunction(createError(400, JSON.stringify(
                new CommonUtil.KeyValuePair("quantityAvailable", "Cannot add more than quantity available.")
            )));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    try {
        // Create new cart item when no existing cart item
        if(cartItem === null) {
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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        cartItem.id,
        cartItem.versionNumber
    ));
});

/*
    UpdateCartItem: Update a cart item.
    Request: SaveCartItemApiRequestBody
    Response: SaveRecordApiResponseBody
*/
cartItemRouter.put("/", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    const requestBody: CartItemContract.SaveCartItemApiRequestBody = request.body;

    if(!Number.tryIdentifier(requestBody.id) || !Number.tryIdentifier(requestBody.productId)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryInteger(requestBody.quantity, 0, CommonUtil.INTEGER_MAX)) {
        nextFunction(createError(400));
        return;
    }

    if(!Number.tryIdentifier(requestBody.versionNumber)) {
        nextFunction(createError(400));
        return;
    }

    let cartItem: CartItem | null;

    try
    {
        cartItem = await prisma.cartItem.findFirst({
            where: {
                id: requestBody.id,
                isDeleted: false
            }
        });

        if(cartItem === null) {
            nextFunction(createError(400));
            return;
        }

        if(cartItem.userId !== request.userId) {
            nextFunction(createError(401));
            return;
        }

        const productStock: ProductStock | null = await prisma.productStock.findFirst({
            where: {
                productId: requestBody.productId
            }
        });

        if(productStock === null || productStock.quantityAvailable < requestBody.quantity) {
            nextFunction(createError(400));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
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
        nextFunction(createError(500));
        return;
    }

    response.json(new CommonContract.SaveRecordApiResponseBody(
        cartItem.id,
        cartItem.versionNumber
    ));
});

/*
    DeleteCartItem: Soft delete a cart item.
    Params: id
*/
cartItemRouter.delete("/:id", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
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

    let cartItem: CartItem | null;

    try
    {
        cartItem = await prisma.cartItem.findFirst({
            where: {
                id: idValue,
                isDeleted: false
            }
        });

        if(cartItem === null) {
            nextFunction(createError(400));
            return;
        }

        if(cartItem.userId !== request.userId) {
            nextFunction(createError(401));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
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
        nextFunction(createError(500));
        return;
    }

    response.end();
});