import { Router, Request, Response, NextFunction } from "express";
import createError from "http-errors";
import { PrismaClient, UnitOfMeasure } from "@prisma/client";
import { apiAuthentication } from "../../utils/authentication";
import  "../../utils/string.extension";
import * as CommonContract from "../../../contract/common";

export const unitOfMeasureRouter: Router = Router();
const prisma: PrismaClient = new PrismaClient();

/*
    GetUnitOfMeasureSelections: Get all unit of measures.
    Response: SelectionApiResponseBodyItem list
*/
unitOfMeasureRouter.get("/selection", apiAuthentication, async (request: Request, response: Response, nextFunction: NextFunction) => {
    // Result
    let unitOfMeasures: UnitOfMeasure[];
    
    try {
        unitOfMeasures = await prisma.unitOfMeasure.findMany({
            where: {
                isDeleted: false
            }
        });
    }
    catch {
        nextFunction(createError(500));
        return;
    }

    let selectionApiResponseBodyItems: CommonContract.SelectionApiResponseBodyItem[] = [];

    unitOfMeasures.forEach(unitOfMeasure => {
        selectionApiResponseBodyItems.push(new CommonContract.SelectionApiResponseBodyItem(
            unitOfMeasure.id,
            unitOfMeasure.name,
            unitOfMeasure.shortName
        ))
    });
    
    response.json(selectionApiResponseBodyItems);
});