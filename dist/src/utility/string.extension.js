"use strict";
String.prototype.tryGetBoolean = function () {
    const input = this.trim().toLowerCase();
    let isValid = false;
    let result = false;
    if (input === "true") {
        isValid = true;
        result = true;
    }
    else if (input === "false") {
        isValid = true;
        result = false;
    }
    return [isValid, result];
};
String.prototype.tryGetInteger = function () {
    let result = Number(this.trim());
    let isValid = !Number.isNaN(result) && Number.isInteger(result);
    return [isValid, result];
};
String.prototype.tryGetNumber = function () {
    let result = Number(this.trim());
    let isValid = !Number.isNaN(result);
    return [isValid, result];
};
String.prototype.tryGetQueryOrder = function () {
    const input = this.trim().toLowerCase();
    return [input === "asc" || input === "desc", input];
};
String.validateLength = function (text, length) {
    let isValid = false;
    if (text !== undefined && length >= 1) {
        isValid = (text.length <= length);
    }
    return isValid;
};
