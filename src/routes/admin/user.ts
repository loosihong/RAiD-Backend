import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, Prisma, User, UserSession, UnitOfMeasure } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import  "../../utils/string.extension";
import * as UserContract from "../../../contract/admin/user";
import * as PurchaseContract from "../../../contract/customer/purchase";
import * as PurchaseItemContract from "../../../contract/customer/purchaseItem";

export const userRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();
const [isValidSessionDuration, sessionDurationValue] = String.tryGetInteger(process.env.SESSION_DURATION || "60");
const sessionDuration: number = Number(isValidSessionDuration ? sessionDurationValue : 60);

/*
    UserLogin: Authenticate and login a user.
    Request: UserContract.UserLoginApiRequestBody
    Response: UserContract.UserLoginApiResponseBody
*/
userRouter.post("/login", async (request: Request, response: Response, nextFunction: NextFunction) => {
    const requestBody: UserContract.UserLoginApiRequestBody = request.body;

    // Validate request
    if(!String.validateLength(requestBody.loginName, 200)) {
        nextFunction(createError(400));
        return;
    }

    // Authenticate user
    const user: User | null = await prisma.user.findFirst({
        where: {
            loginName: requestBody.loginName,
            isDeleted: false
        }
    });

    if(user === null) {
        nextFunction(createError(401));
        return;
    }

    // Get a valid session.
    let userSession:UserSession | null = await prisma.userSession.findFirst({
        where: {
            userId: user.id,
            expiredOn: {
                gte: new Date()
            }
        }
    });

    // Set new session expiry.
    let newExpiredOn: Date = new Date();

    newExpiredOn.setMinutes(newExpiredOn.getMinutes() + sessionDuration);

    try {
        // Create session if not exist
        if(userSession === null) {
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
        nextFunction(createError(500));
        return;
    }

    if(userSession !== null) {
        response.json(new UserContract.UserLoginApiResponseBody(userSession.id));
    }
});

/*
    GetUser: Get profile of a user.
    Params: sessionId
    Response: GetUserApiResponseBody
*/
userRouter.get("/:sessionId/current", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { sessionId } = request.params;

    //Validate params
    if(!String.validateLength(sessionId, 36)) {
        nextFunction(createError(400));
    }

    // Result
    let userSessionResult: UserSessionGetResult | null = null;
    
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

        if(userSessionResult === null) {
            nextFunction(createError(404));
            return;
        }
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    if(userSessionResult.userId !== request.userId) {
        nextFunction(createError(401));
        return;
    }

    if(userSessionResult === null) {
        response.status(404).end();
        return;
    }
    
    response.json(new UserContract.UserApiResponseBody(
        userSessionResult.user.loginName,
        userSessionResult.user.store?.id || null
    ));
});

type UserSessionGetResult = Prisma.UserSessionGetPayload<{
    include: {
        user: {
            include: {
                store: true
            }
        }
    }
}>;

/*
    GetUserPurchasesActive: Get all active purchases of a user.
    Response: GetPurchaseItemApiReponseBodyItem list
*/
userRouter.get("/purchases/active", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Validate request
    if(!Number.tryIdentifier(request.userId)) {
        nextFunction(createError(401));
        return;
    }

    // Result
    let purchaseResults: PurchaseStoreResult[];

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

    response.json(getPurchaseApiReponseBodyItems);
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

/*
    SearchUserPurchaseItemsHistory: Search for historic purchase items of a user.
    Query: keyword, offset, fetch
    Response: SearchPurchaseItemApiResponseBody
*/
userRouter.get("/purchase-items/history", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    const { keyword, offset, fetch } = request.query;
   
    // Validate query
    if(typeof(keyword) !== "string" ||
        typeof(offset) !== "string" ||
        typeof(fetch) !== "string") {
        nextFunction(createError(400));
        return;
    }

    const keywordText: string = String(keyword).trim().toLowerCase();
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
    let purchaseItemSearchResults: PurchaseItemSearchResult[];
    let resultCount: number;
    const query: Prisma.PurchaseItemFindManyArgs = {
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
                            unitOfMeasure:true
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
        nextFunction(createError(500));
        return;
    }

    let searchPurchaseItemApiResponseBodyItems: PurchaseItemContract.SearchPurchaseItemApiResponseBodyItem[] = [];

    purchaseItemSearchResults.forEach(purchaseItemSearchResult => {
        searchPurchaseItemApiResponseBodyItems.push(new PurchaseItemContract.SearchPurchaseItemApiResponseBodyItem(
            purchaseItemSearchResult.id,
            purchaseItemSearchResult.product.storeId,
            purchaseItemSearchResult.product.store.name,
            purchaseItemSearchResult.productId,
            purchaseItemSearchResult.product.name,
            purchaseItemSearchResult.quantity,
            purchaseItemSearchResult.product.unitOfMeasure.shortName,
            Number(purchaseItemSearchResult.unitPrice),
            Number(purchaseItemSearchResult.purchase.totalPrice),
            purchaseItemSearchResult.createdOn.toISOString(),
            purchaseItemSearchResult.purchase.deliveredDateTime !== null ? purchaseItemSearchResult.purchase.deliveredDateTime.toISOString(): null
        ))
    });

    response.json(new PurchaseItemContract.SearchPurchaseItemApiResponseBody(
        resultCount,
        searchPurchaseItemApiResponseBodyItems
    ));
});

type PurchaseItemSearchResult = Prisma.PurchaseItemGetPayload<{
    include: {
        product: {
            include: {
                store: true,
                unitOfMeasure:true
            }
        },
        purchase: true
    }
}>;