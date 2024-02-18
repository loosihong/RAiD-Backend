import { Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, UserSession } from "@prisma/client";

const prisma: PrismaClient = new PrismaClient();

// Authentication valid sessionId
export const apiAuthentication = async (request: Request, response: Response, nextFunction: NextFunction) => {
    const sessionId: string | undefined = request.header("sessionId");

    if(sessionId === undefined) {
        nextFunction(createError(401));
    }

    let userSession: UserSession | null = null;

    try {
        userSession = await prisma.userSession.findFirst({
            where: {
                id: sessionId,
                expiredOn: {
                    gte: new Date()
                },
                isDeleted: false
            }
        });

        if(userSession === null) {
            nextFunction(createError(401));
            return 0;
        }

        request.userId = userSession.userId;
    }
    catch {
        nextFunction(createError(500));
        return 0;
    }
    
    nextFunction();
}