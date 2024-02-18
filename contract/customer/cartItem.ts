export class SaveCartItemApiRequestBody {
    constructor(
        public id: number,
        public productId: number,
        public quantity: number,
        public versionNumber: number
    ) {}
}

export class GetCartItemApiResponseBodyItem
 {
    constructor(
        public id: number,
        public storeId: number,
        public storeName: string,
        public productId: number,
        public productName: string,
        public quantity: number,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
        public quantityAvailable: number,
        public versionNumber: number
    ) {}
}

export class GetCartItemQuantityApiResponseBody
 {
    constructor(
        public quantity: number
    ) {}
}