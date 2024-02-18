import { Router, Request, Response } from "express";

export const indexRouter = Router();

indexRouter.get('/', async (req:Request, res:Response) => {
    res.send("Home");
});