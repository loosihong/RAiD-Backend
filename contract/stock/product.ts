export class SaveProductApiRequestBody {
    constructor(
        public id: number,
        public name: string,
        public skuCode: string,
        public description: string,
        public unitOfMeasureId: number,
        public unitPrice: number,
        public versionNumber: number
    ) {}
}

export class SearchProductApiResponseBody {
    constructor(
        public totalCount: number,
        public products: SearchProductApiResponseBodyItem[],
    ) {}
}

export class SearchProductApiResponseBodyItem {
    constructor(
        public id: number,
        public name: string,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
        public quantitySold: number
    ) {}
}

export class SearchStoreProductApiResponseBody {
    constructor(
        public totalCount: number,
        public products: SearchStoreProductApiResponseBodyItem[],
    ) {}
}

export class SearchStoreProductApiResponseBodyItem {
    constructor(
        public id: number,
        public name: string,
        public skuCode: string | null,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
        public quantityAvailable: number,
        public quantitySold: number
    ) {}
}

export class GetProductApiResponseBody {
    constructor(
        public id: number,
        public name: string,
        public description: string,
        public unitOfMeasureShortName: string,
        public unitPrice: number,
        public storeName: string,
        public quantityAvailable: number,
        public quantitySold: number
    ) {}
}

export class GetStoreProductApiResponseBody {
    constructor(
        public id: number,
        public name: string,
        public skuCode: string,
        public description: string,
        public unitOfMeasureId: number,
        public unitPrice: number,
        public quantityAvailable: number,
        public quantitySold: number,
        public versionNumber: number
    ) {}
}

export enum SearchProductOrderBy {
    Relevance = "relevance",
    Price = "price",
    Sales = "sales"
}