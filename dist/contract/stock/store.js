"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetStoreApiResponseBody = exports.SaveStoreApiRequestBody = void 0;
class SaveStoreApiRequestBody {
    constructor(name, deliveryLeadDay, versionNumber) {
        this.name = name;
        this.deliveryLeadDay = deliveryLeadDay;
        this.versionNumber = versionNumber;
    }
}
exports.SaveStoreApiRequestBody = SaveStoreApiRequestBody;
class GetStoreApiResponseBody {
    constructor(id, name, deliveryLeadDay, versionNumber) {
        this.id = id;
        this.name = name;
        this.deliveryLeadDay = deliveryLeadDay;
        this.versionNumber = versionNumber;
    }
}
exports.GetStoreApiResponseBody = GetStoreApiResponseBody;
