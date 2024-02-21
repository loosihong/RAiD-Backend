export class SaveStoreApiRequestBody {
    constructor(
        public name: string,
        public deliveryLeadDay: number,
        public versionNumber: number,
    ) {}
}

export class GetStoreApiResponseBody {
    constructor(
        public id: number,
        public name: string,
        public deliveryLeadDay: number,
        public versionNumber: number,
    ) {}
}