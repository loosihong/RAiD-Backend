export class SelectionApiResponseBodyItem {
    constructor(
        public id: number,
        public name: string,
        public shortName: string,
    ) {}
}

export class SaveRecordApiResponseBody {
    constructor(
        readonly id: number,
        readonly versionNumber: number
    ) {}
}