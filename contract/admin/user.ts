export class UserLoginApiRequestBody {
    constructor(
        public loginName: string
    ) {}
}

export class UserApiResponseBody {
    constructor(
        public loginName: string,
        public storeId: number | null
    ) {}
}

export class UserLoginApiResponseBody {
    constructor(
        public sessionId: string
    ) {}
}