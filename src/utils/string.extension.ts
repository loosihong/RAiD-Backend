interface StringConstructor {
    tryGetBoolean(text: string | null |  undefined): [boolean, boolean];
    tryGetDate(text: string | null |  undefined): [boolean, Date];
    tryGetInteger(text: string | null |  undefined): [boolean, number];
    tryGetNumber(text: string | null |  undefined): [boolean, number];
    tryGetQueryOrder(text: string | null |  undefined): [boolean, string];
    validateLength(text: string | null |  undefined, length: number): boolean;
}

String.tryGetBoolean = function(text: string | null | undefined): [boolean, boolean] {
    let isValid: boolean = false;
    let result: boolean = false;

    if(text !== undefined && text !== null) {
        const input = text.trim().toLowerCase();

        if(input === "true") {
            isValid = true;
            result = true;
        }
        else if(input === "false") {
            isValid = true;
            result = false;
        }
    }

    return [isValid, result];
}

String.tryGetDate = function(text: string | null |  undefined): [boolean, Date] {
    let isValid: boolean = false;
    let result: Date = new Date();

    if(text !== undefined && text !== null) {
        result = new Date(text.trim());
        isValid = !isNaN(result.getTime());
    }

    return [isValid, result];
}

String.tryGetInteger = function(text: string | null |  undefined): [boolean, number] {
    let isValid: boolean = false;
    let result: number = 0;
    
    if(text !== undefined && text !== null) {
        result = Number(text.trim());
        isValid = !Number.isNaN(result) && Number.isInteger(result);
    }

    return [isValid, result];
}

String.tryGetNumber = function(text: string | null |  undefined): [boolean, number] {
    let isValid: boolean = false;
    let result: number = 0; 

    if(text !== undefined && text !== null) {
        result = Number(text.trim());
        isValid = !Number.isNaN(result);
    }

    return [isValid, result];
}

String.tryGetQueryOrder = function(text: string | null |  undefined): [boolean, string] {
    let isValid: boolean = false;
    let result: string = ""; 

    if(text !== undefined && text !== null) {
        result = text.trim().toLowerCase();
        isValid = (result === "asc" || result === "desc");
    }
    return [isValid, result];
}

String.validateLength = function(text: string | undefined, length: number): boolean {
    return text !== undefined && length >= 0 && text.length <= length;
}