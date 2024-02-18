"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PutPurchaseApiResponseBodyItem = exports.GetPurchaseItemApiReponseBodyItem = exports.GetPurchaseApiReponseBodyItem = exports.GetPurchaseApiReponseBody = exports.PutPurchaseApiRequestBody = exports.CreatePurchaseApiRequestBody = void 0;
class CreatePurchaseApiRequestBody {
    constructor(cartItemIds) {
        this.cartItemIds = cartItemIds;
    }
}
exports.CreatePurchaseApiRequestBody = CreatePurchaseApiRequestBody;
class PutPurchaseApiRequestBody {
    constructor(purchaseIds) {
        this.purchaseIds = purchaseIds;
    }
}
exports.PutPurchaseApiRequestBody = PutPurchaseApiRequestBody;
class GetPurchaseApiReponseBody {
    constructor(totalCount, purchases) {
        this.totalCount = totalCount;
        this.purchases = purchases;
    }
}
exports.GetPurchaseApiReponseBody = GetPurchaseApiReponseBody;
class GetPurchaseApiReponseBodyItem {
    constructor(id, userId, userLoginName, storeId, storeName, totalPrice, purchasedOn, estimatedDeliveryDate, deliveredOn, purchaseStatusCode, purchaseStatusName, purchaseItems, versionNumber) {
        this.id = id;
        this.userId = userId;
        this.userLoginName = userLoginName;
        this.storeId = storeId;
        this.storeName = storeName;
        this.totalPrice = totalPrice;
        this.purchasedOn = purchasedOn;
        this.estimatedDeliveryDate = estimatedDeliveryDate;
        this.deliveredOn = deliveredOn;
        this.purchaseStatusCode = purchaseStatusCode;
        this.purchaseStatusName = purchaseStatusName;
        this.purchaseItems = purchaseItems;
        this.versionNumber = versionNumber;
    }
}
exports.GetPurchaseApiReponseBodyItem = GetPurchaseApiReponseBodyItem;
class GetPurchaseItemApiReponseBodyItem {
    constructor(productId, productName, quantity, unitOfMeasureShortName, unitPrice) {
        this.productId = productId;
        this.productName = productName;
        this.quantity = quantity;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
    }
}
exports.GetPurchaseItemApiReponseBodyItem = GetPurchaseItemApiReponseBodyItem;
class PutPurchaseApiResponseBodyItem {
    constructor(id, purchaseStatusCode, purchaseStatusName, versionNumber) {
        this.id = id;
        this.purchaseStatusCode = purchaseStatusCode;
        this.purchaseStatusName = purchaseStatusName;
        this.versionNumber = versionNumber;
    }
}
exports.PutPurchaseApiResponseBodyItem = PutPurchaseApiResponseBodyItem;
