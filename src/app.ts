import express, { Express, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser"
import dotenv from "dotenv";
import createError, { HttpError } from "http-errors";
import { indexRouter } from "./routes/index";
import { cartItemRouter } from "./routes/customer/cartItem";
import { productRouter } from "./routes/stock/product";
import { productBatchRouter } from "./routes/stock/productBatch";
import { purchaseRouter } from "./routes/customer/purchase";
import { storeRouter } from "./routes/stock/store";
import { unitOfMeasureRouter } from "./routes/admin/unitOfMeasure";
import { userRouter } from "./routes/admin/user";


dotenv.config();

const app: Express = express();
const port: String = process.env.PORT || "3000";

//Start server
app.listen(port, () => {
    console.log(`[server: Server is running at http://localhost:${port}.`);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, sessionId");
    res.header("Access-Control-Allow-Methods", "*");
    next();
});

//Routes
app.use("/", indexRouter);
app.use("/cart-items", cartItemRouter);
app.use("/products", productRouter);
app.use("/products", productBatchRouter);
app.use("/purchases", purchaseRouter);
app.use("/stores", storeRouter);
app.use("/users", userRouter);
app.use("/unit-measures", unitOfMeasureRouter);

app.use(function(request:Request, response:Response, nextFunction:NextFunction) {
    nextFunction(createError(404));
});

//Error handler
app.use(function(error:HttpError, request:Request, response:Response, nextFunction:NextFunction) {
    if(request.app.get('env') === "development") {
        console.log(error.stack);
    }
    
    response.status(error.statusCode).send(error.message);
});