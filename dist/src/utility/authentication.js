"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiAuthentication = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Authentication valid sessionId
const apiAuthentication = async (request, response, nextFunction) => {
    const sessionId = request.header("sessionId");
    if (sessionId === undefined) {
        nextFunction((0, http_errors_1.default)(401));
    }
    let userSession = null;
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
        if (userSession === null) {
            nextFunction((0, http_errors_1.default)(401));
            return 0;
        }
        request.userId = userSession.userId;
    }
    catch {
        nextFunction((0, http_errors_1.default)(500));
        return 0;
    }
    nextFunction();
};
exports.apiAuthentication = apiAuthentication;
