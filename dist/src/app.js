"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_errors_1 = __importDefault(require("http-errors"));
const index_1 = require("./routes/index");
const cartItem_1 = require("./routes/customer/cartItem");
const product_1 = require("./routes/stock/product");
const productBatch_1 = require("./routes/stock/productBatch");
const purchase_1 = require("./routes/customer/purchase");
const store_1 = require("./routes/stock/store");
const unitOfMeasure_1 = require("./routes/admin/unitOfMeasure");
const user_1 = require("./routes/admin/user");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || "3000";
//Start server
app.listen(port, () => {
    console.log(`[server: Server is running at http://localhost:${port}.`);
});
app.use(body_parser_1.default.urlencoded({ extended: false }));
app.use(body_parser_1.default.json());
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, sessionId");
    res.header("Access-Control-Allow-Methods", "*");
    next();
});
//Routes
app.use("/", index_1.indexRouter);
app.use("/cart-items", cartItem_1.cartItemRouter);
app.use("/products", product_1.productRouter);
app.use("/products", productBatch_1.productBatchRouter);
app.use("/purchases", purchase_1.purchaseRouter);
app.use("/stores", store_1.storeRouter);
app.use("/users", user_1.userRouter);
app.use("/unit-measures", unitOfMeasure_1.unitOfMeasureRouter);
app.use(function (request, response, nextFunction) {
    nextFunction((0, http_errors_1.default)(404));
});
//Error handler
app.use(function (error, request, response, nextFunction) {
    if (request.app.get('env') === "development") {
        console.log(error.stack);
    }
    response.status(error.statusCode).send(error.message);
});
