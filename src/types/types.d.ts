export interface ConstraintValidationMessages {
    valueMissing?: string;
    typeMismatch?: string;
    patternMismatch?: string;
    tooLong?: string;
    tooShort?: string;
    rangeUnderflow?: string;
    rangeOverflow?: string;
    stepMismatch?: string;
    customError?: string;
}

export interface ExtendedValidityState {
    builtIn: ValidityState;
    customErrors: string[];
    allErrors: string[];
}

export interface StringRules {
    required?: boolean | string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string) => true | string;
}

export interface NumberRules {
    required?: boolean | string;
    min?: number;
    max?: number;
    custom?: (value: number) => true | string;
}

export interface ArrayRules {
    required?: boolean | string;
    arrayMin?: number;
    arrayMax?: number;
    custom?: (values: string[]) => true | string;
}

export type FieldRules = StringRules | NumberRules | ArrayRules;

export interface FieldValidationResult {
    valid: boolean;
    errors: string[];
    validity: ExtendedValidityState;
}

export interface FormValidationResult {
    valid: boolean;
    fields: Record<string, FieldValidationResult>;
}

export interface TrustValidatorOptions {
    suppressWarnings?: boolean;
    autoBindEvents?: boolean;
    messages?: ConstraintValidationMessages;
}

export default class TrustValidator {
    constructor(form: HTMLFormElement, options?: TrustValidatorOptions);
    addField(fieldName: string, rules: FieldRules): void;
    validate(): FormValidationResult;
    validateField(fieldName: string): FieldValidationResult;
    getFieldValidity(
        field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    ): ExtendedValidityState;
    checkFormStructure(): void;
}