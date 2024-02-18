export class SaveStoreApiRequestBody {
    constructor(
        public name: string,
        public deliveryLeadDay: number,
        public versionNumber: number,
    ) {}
}