"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetCartItemQuantityApiResponseBody = exports.GetCartItemApiResponseBodyItem = exports.SaveCartItemApiRequestBody = void 0;
class SaveCartItemApiRequestBody {
    constructor(id, productId, quantity, versionNumber) {
        this.id = id;
        this.productId = productId;
        this.quantity = quantity;
        this.versionNumber = versionNumber;
    }
}
exports.SaveCartItemApiRequestBody = SaveCartItemApiRequestBody;
class GetCartItemApiResponseBodyItem {
    constructor(id, storeId, storeName, productId, productName, quantity, unitOfMeasureShortName, unitPrice, quantityAvailable, versionNumber) {
        this.id = id;
        this.storeId = storeId;
        this.storeName = storeName;
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
        this.quantityAvailable = quantityAvailable;
        this.versionNumber = versionNumber;
    }
}
exports.GetCartItemApiResponseBodyItem = GetCartItemApiResponseBodyItem;
class GetCartItemQuantityApiResponseBody {
    constructor(quantity) {
        this.quantity = quantity;
    }
}
exports.GetCartItemQuantityApiResponseBody = GetCartItemQuantityApiResponseBody;
