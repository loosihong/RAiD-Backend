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
exports.unitOfMeasureRouter = void 0;
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const authentication_1 = require("../../utils/authentication");
require("../../utils/string.extension");
const CommonContract = __importStar(require("../../../contract/common"));
exports.unitOfMeasureRouter = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/*
    GetUnitOfMeasureSelections: Get all unit of measures.
    Response: SelectionApiResponseBodyItem list
*/
exports.unitOfMeasureRouter.get("/selection", authentication_1.apiAuthentication, async (request, response, nextFunction) => {
    // Result
    let unitOfMeasures;
    try {
        unitOfMeasures = await prisma.unitOfMeasure.findMany({
            where: {
                isDeleted: false
            }
        });
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return;
    }
    let selectionApiResponseBodyItems = [];
    unitOfMeasures.forEach(unitOfMeasure => {
        selectionApiResponseBodyItems.push(new CommonContract.SelectionApiResponseBodyItem(unitOfMeasure.id, unitOfMeasure.name, unitOfMeasure.shortName));
    });
    response.json(selectionApiResponseBodyItems);
});
