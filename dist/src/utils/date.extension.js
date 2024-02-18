"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
Date.prototype.toDate = function () {
    let date = this;
    date.toISOString().slice(0, 10);
    return date;
};
Date.prototype.addDays = function (days) {
    let date = this;
    date.setDate(date.getDate() + days);
    return date;
};
