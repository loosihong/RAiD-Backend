declare global {
    interface Date {
        toDate(): Date;
        addDays(days: number, useThis?: boolean): Date;
        toDateType(): void;
    }
}

Date.prototype.toDate = function(): Date {
    let date: Date = this;

    date.toISOString().slice(0, 10);

    return date;
};

Date.prototype.addDays = function (days: number): Date {
    let date: Date = this;
    
    date.setDate(date.getDate() + days);
 
    return date;
};

export {};