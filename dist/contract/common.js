"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveRecordApiResponseBody = exports.SelectionApiResponseBodyItem = void 0;
class SelectionApiResponseBodyItem {
    constructor(id, name, shortName) {
        this.id = id;
        this.name = name;
        this.shortName = shortName;
    }
}
exports.SelectionApiResponseBodyItem = SelectionApiResponseBodyItem;
class SaveRecordApiResponseBody {
    constructor(id, versionNumber) {
        this.id = id;
        this.versionNumber = versionNumber;
    }
}
exports.SaveRecordApiResponseBody = SaveRecordApiResponseBody;
