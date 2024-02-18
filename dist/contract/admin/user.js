"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserLoginApiResponseBody = exports.UserApiResponseBody = exports.UserLoginApiRequestBody = void 0;
class UserLoginApiRequestBody {
    constructor(loginName) {
        this.loginName = loginName;
    }
}
exports.UserLoginApiRequestBody = UserLoginApiRequestBody;
class UserApiResponseBody {
    constructor(loginName, storeId) {
        this.loginName = loginName;
        this.storeId = storeId;
    }
}
exports.UserApiResponseBody = UserApiResponseBody;
class UserLoginApiResponseBody {
    constructor(sessionId) {
        this.sessionId = sessionId;
    }
}
exports.UserLoginApiResponseBody = UserLoginApiResponseBody;
