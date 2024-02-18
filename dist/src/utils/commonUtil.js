"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIdentifier = exports.KeyValuePair = exports.INTEGER_MAX = exports.CURRENCY_MAX = void 0;
exports.CURRENCY_MAX = 999999999999999.99;
exports.INTEGER_MAX = 2147483647;
class KeyValuePair {
    constructor(key, value) {
        this.key = key;
        this.value = value;
    }
}
exports.KeyValuePair = KeyValuePair;
const validateIdentifier = (identifiers) => {
    let isValid = (identifiers !== undefined && identifiers.length > 0);
    if (isValid) {
        for (let item of identifiers) {
            if (!Number.tryIdentifier(item)) {
                isValid = false;
                break;
            }
        }
    }
    return isValid;
};
exports.validateIdentifier = validateIdentifier;
