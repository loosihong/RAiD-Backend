"use strict";
String.tryGetBoolean = function (text) {
    let isValid = false;
    let result = false;
    if (text !== undefined && text !== null) {
        const input = text.trim().toLowerCase();
        if (input === "true") {
            isValid = true;
            result = true;
        }
        else if (input === "false") {
            isValid = true;
            result = false;
        }
    }
    return [isValid, result];
};
String.tryGetDate = function (text) {
    let isValid = false;
    let result = new Date();
    if (text !== undefined && text !== null) {
        result = new Date(text.trim());
        isValid = !isNaN(result.getTime());
    }
    return [isValid, result];
};
String.tryGetInteger = function (text) {
    let isValid = false;
    let result = 0;
    if (text !== undefined && text !== null) {
        result = Number(text.trim());
        isValid = !Number.isNaN(result) && Number.isInteger(result);
    }
    return [isValid, result];
};
String.tryGetNumber = function (text) {
    let isValid = false;
    let result = 0;
    if (text !== undefined && text !== null) {
        result = Number(text.trim());
        isValid = !Number.isNaN(result);
    }
    return [isValid, result];
};
String.tryGetQueryOrder = function (text) {
    let isValid = false;
    let result = "";
    if (text !== undefined && text !== null) {
        result = text.trim().toLowerCase();
        isValid = (result === "asc" || result === "desc");
    }
    return [isValid, result];
};
String.validateLength = function (text, length) {
    return text !== undefined && length >= 0 && text.length <= length;
};
