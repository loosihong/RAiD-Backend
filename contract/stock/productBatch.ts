export class SaveProductBatchApiRequestBody {
    constructor(
        public id: number,
        public productId: number,
        public batchNumber: string,
        public quantityTotal: number,
        public quantityLeft: number,
        public arrivedOn: string,
        public expiredDate: string | null,
        public versionNumber: number
    ) {}
}

export class GetProductBatchApiResponseBody {
    constructor(
        public totalCount: number,
        public productBatches: GetProductBatchApiResponseBodyItem[]
    ) {}
}

export class GetProductBatchApiResponseBodyItem {
    constructor(
        public id: number,
        public productId: number,
        public batchNumber: string,
        public quantityTotal: number,
        public quantityLeft: number,
        public arrivedOn: string,
        public expiredDate: string | null,
        public versionNumber: number
    ) {}
}

export enum GetProductBatchOrderBy {
    QuantityTotal = "total",
    QuantityLeft = "left",
    ArrivedOn = "arrival",
    ExpiredOn = "expiry"
}