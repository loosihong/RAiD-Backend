export class CreatePurchaseApiRequestBody {
    constructor(
        public cartItemIds: number[]
    ) {}
}

export class PutPurchaseApiRequestBody {
    constructor(
        public purchaseIds: number[]
    ) {}
}

export class GetPurchaseApiReponseBody {
    constructor(
        public totalCount: number,
        public purchases: GetPurchaseApiReponseBodyItem[],
    ) {}
}

export class GetPurchaseApiReponseBodyItem {
    constructor(
        public id: number,
        public userId: number,
        public userLoginName: string,
        public storeId: number,
        public storeName: string,
        public totalPrice: number,
        public purchasedOn: string,
        public estimatedDeliveryDate: string,
        public deliveredOn: string | null,
        public purchaseStatusCode: string,
        public purchaseStatusName: string,
        public purchaseItems: GetPurchaseItemApiReponseBodyItem[],
        public versionNumber: number
    ) {}
}

export class GetPurchaseItemApiReponseBodyItem {
    constructor(
        public productId: number,
        public productName: string,
        public quantity: number,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
    ) {}
}

export class PutPurchaseApiResponseBodyItem {
    constructor(
        public id: number,
        public purchaseStatusCode: string,
        public purchaseStatusName: string,
        public versionNumber: number
    ) {}
}