"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
Date.prototype.toStringInDate = function () {
    return this.toISOString().slice(0, 10);
};
Date.prototype.addDays = function (days) {
    let date = this;
    date.setDate(date.getDate() + days);
    return date;
};
