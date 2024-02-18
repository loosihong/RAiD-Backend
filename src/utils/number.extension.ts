interface NumberConstructor {
    tryNumber(value: number | undefined, minValue: number, maxValue: number): boolean;
    tryInteger(value: number | undefined, minValue: number, maxValue: number): boolean;
    tryIdentifier(value: number | undefined): boolean;
}

Number.tryNumber = function(value: number | undefined, minValue: number, maxValue: number): boolean {
    return value !== undefined && typeof(value) === "number" && value >= minValue && value <= maxValue;
}

Number.tryInteger = function(value: number | undefined, minValue: number, maxValue: number): boolean {
    return value !== undefined && Number.isInteger(value) && value >= minValue && value <= maxValue;
}

Number.tryIdentifier = function(value: number | undefined): boolean {
    return value !== undefined && Number.isInteger(value) && value >= 0;
}