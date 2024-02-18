"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductBatchOrderBy = exports.GetProductBatchApiResponseBodyItem = exports.GetProductBatchApiResponseBody = exports.SaveProductBatchApiRequestBody = void 0;
class SaveProductBatchApiRequestBody {
    constructor(id, productId, batchNumber, quantityTotal, quantityLeft, arrivedOn, expiredDate, versionNumber) {
        this.id = id;
        this.productId = productId;
        this.batchNumber = batchNumber;
        this.quantityTotal = quantityTotal;
        this.quantityLeft = quantityLeft;
        this.arrivedOn = arrivedOn;
        this.expiredDate = expiredDate;
        this.versionNumber = versionNumber;
    }
}
exports.SaveProductBatchApiRequestBody = SaveProductBatchApiRequestBody;
class GetProductBatchApiResponseBody {
    constructor(totalCount, productBatches) {
        this.totalCount = totalCount;
        this.productBatches = productBatches;
    }
}
exports.GetProductBatchApiResponseBody = GetProductBatchApiResponseBody;
class GetProductBatchApiResponseBodyItem {
    constructor(id, productId, batchNumber, quantityTotal, quantityLeft, arrivedOn, expiredDate, versionNumber) {
        this.id = id;
        this.productId = productId;
        this.batchNumber = batchNumber;
        this.quantityTotal = quantityTotal;
        this.quantityLeft = quantityLeft;
        this.arrivedOn = arrivedOn;
        this.expiredDate = expiredDate;
        this.versionNumber = versionNumber;
    }
}
exports.GetProductBatchApiResponseBodyItem = GetProductBatchApiResponseBodyItem;
var GetProductBatchOrderBy;
(function (GetProductBatchOrderBy) {
    GetProductBatchOrderBy["QuantityTotal"] = "total";
    GetProductBatchOrderBy["QuantityLeft"] = "left";
    GetProductBatchOrderBy["ArrivedOn"] = "arrival";
    GetProductBatchOrderBy["ExpiredOn"] = "expiry";
})(GetProductBatchOrderBy || (exports.GetProductBatchOrderBy = GetProductBatchOrderBy = {}));
