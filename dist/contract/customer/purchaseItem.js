"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchPurchaseItemApiResponseBodyItem = exports.SearchPurchaseItemApiResponseBody = void 0;
class SearchPurchaseItemApiResponseBody {
    constructor(totalCount, purchaseItems) {
        this.totalCount = totalCount;
        this.purchaseItems = purchaseItems;
    }
}
exports.SearchPurchaseItemApiResponseBody = SearchPurchaseItemApiResponseBody;
class SearchPurchaseItemApiResponseBodyItem {
    constructor(id, storeId, storeName, productId, productName, quantity, unitOfMeasureShortName, unitPrice, totalPrice, purchasedOn, deliveredOn) {
        this.id = id;
        this.storeId = storeId;
        this.storeName = storeName;
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
        this.totalPrice = totalPrice;
        this.purchasedOn = purchasedOn;
        this.deliveredOn = deliveredOn;
    }
}
exports.SearchPurchaseItemApiResponseBodyItem = SearchPurchaseItemApiResponseBodyItem;
