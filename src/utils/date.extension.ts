declare global {
    interface Date {
        toStringInDate(): string;
        addDays(days: number, useThis?: boolean): Date;
        toDateType(): void;
    }
}

Date.prototype.toStringInDate = function(): string {
    return this.toISOString().slice(0, 10);
};

Date.prototype.addDays = function (days: number): Date {
    let date: Date = this;
    
    date.setDate(date.getDate() + days);
 
    return date;
};

export {};