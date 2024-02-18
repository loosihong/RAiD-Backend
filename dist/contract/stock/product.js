"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchProductOrderBy = exports.GetStoreProductApiResponseBody = exports.GetProductApiResponseBody = exports.SearchStoreProductApiResponseBodyItem = exports.SearchStoreProductApiResponseBody = exports.SearchProductApiResponseBodyItem = exports.SearchProductApiResponseBody = exports.SaveProductApiRequestBody = void 0;
class SaveProductApiRequestBody {
    constructor(id, name, skuCode, description, unitOfMeasureId, unitPrice, versionNumber) {
        this.id = id;
        this.name = name;
        this.skuCode = skuCode;
        this.description = description;
        this.unitOfMeasureId = unitOfMeasureId;
        this.unitPrice = unitPrice;
        this.versionNumber = versionNumber;
    }
}
exports.SaveProductApiRequestBody = SaveProductApiRequestBody;
class SearchProductApiResponseBody {
    constructor(totalCount, products) {
        this.totalCount = totalCount;
        this.products = products;
    }
}
exports.SearchProductApiResponseBody = SearchProductApiResponseBody;
class SearchProductApiResponseBodyItem {
    constructor(id, name, unitOfMeasureShortName, unitPrice, quantitySold) {
        this.id = id;
        this.name = name;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
        this.quantitySold = quantitySold;
    }
}
exports.SearchProductApiResponseBodyItem = SearchProductApiResponseBodyItem;
class SearchStoreProductApiResponseBody {
    constructor(totalCount, products) {
        this.totalCount = totalCount;
        this.products = products;
    }
}
exports.SearchStoreProductApiResponseBody = SearchStoreProductApiResponseBody;
class SearchStoreProductApiResponseBodyItem {
    constructor(id, name, skuCode, unitOfMeasureShortName, unitPrice, quantityAvailable, quantitySold) {
        this.id = id;
        this.name = name;
        this.skuCode = skuCode;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
        this.quantityAvailable = quantityAvailable;
        this.quantitySold = quantitySold;
    }
}
exports.SearchStoreProductApiResponseBodyItem = SearchStoreProductApiResponseBodyItem;
class GetProductApiResponseBody {
    constructor(id, name, description, unitOfMeasureShortName, unitPrice, storeName, quantityAvailable, quantitySold) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.unitOfMeasureShortName = unitOfMeasureShortName;
        this.unitPrice = unitPrice;
        this.storeName = storeName;
        this.quantityAvailable = quantityAvailable;
        this.quantitySold = quantitySold;
    }
}
exports.GetProductApiResponseBody = GetProductApiResponseBody;
class GetStoreProductApiResponseBody {
    constructor(id, name, skuCode, description, unitOfMeasureId, unitPrice, quantityAvailable, quantitySold, versionNumber) {
        this.id = id;
        this.name = name;
        this.skuCode = skuCode;
        this.description = description;
        this.unitOfMeasureId = unitOfMeasureId;
        this.unitPrice = unitPrice;
        this.quantityAvailable = quantityAvailable;
        this.quantitySold = quantitySold;
        this.versionNumber = versionNumber;
    }
}
exports.GetStoreProductApiResponseBody = GetStoreProductApiResponseBody;
var SearchProductOrderBy;
(function (SearchProductOrderBy) {
    SearchProductOrderBy["Relevance"] = "relevance";
    SearchProductOrderBy["Price"] = "price";
    SearchProductOrderBy["Sales"] = "sales";
})(SearchProductOrderBy || (exports.SearchProductOrderBy = SearchProductOrderBy = {}));
