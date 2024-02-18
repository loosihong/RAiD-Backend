"use strict";
Number.tryNumber = function (value, minValue, maxValue) {
    return value !== undefined && typeof (value) === "number" && value >= minValue && value <= maxValue;
};
Number.tryInteger = function (value, minValue, maxValue) {
    return value !== undefined && Number.isInteger(value) && value >= minValue && value <= maxValue;
};
Number.tryIdentifier = function (value) {
    return value !== undefined && Number.isInteger(value) && value >= 0;
};
