export const CURRENCY_MAX: number = 999999999999999.99;
export const INTEGER_MAX: number = 2147483647;

export class KeyValuePair {
    constructor(
        readonly key: string,
        readonly value: string
    ) {}
}

export const validateIdentifier = (identifiers: number[]): boolean => {
    let isValid: boolean = (identifiers !== undefined && identifiers.length > 0);

    if(isValid) {
        for(let item of identifiers) {
            if(!Number.tryIdentifier(item)) {
                isValid = false;
                break;
            }
        }
    }
    
    return isValid;
}