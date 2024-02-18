export class SearchPurchaseItemApiResponseBody {
    constructor(
        public totalCount: number,
        public purchaseItems: SearchPurchaseItemApiResponseBodyItem[],
    ) {}
}

export class SearchPurchaseItemApiResponseBodyItem {
    constructor(
        public id: number,
        public storeId: number,
        public storeName: string,
        public productId: number,
        public productName: string,
        public quantity: number,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
        public totalPrice: number,
        public purchasedOn: string,
        public deliveredOn: string | null
    ) {}
}