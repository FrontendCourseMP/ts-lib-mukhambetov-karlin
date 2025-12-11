import type {
  TrustValidatorOptions,
  FieldRules,
  FormValidationResult,
  FieldValidationResult,
  ExtendedValidityState,
  ConstraintValidationMessages,
  StringRules,
  NumberRules,
  ArrayRules,
} from "./types/types";

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export default class InValid {
  private formElement: HTMLFormElement;
  private settings: TrustValidatorOptions;
  private fieldRulesMap: Record<string, FieldRules> = {};

  constructor(form: HTMLFormElement, options: TrustValidatorOptions = {}) {
    this.formElement = form;
    this.settings = options;

    if (!options.suppressWarnings) this.checkFormStructure();
    if (options.autoBindEvents) this.autoBind();
  }

  addField(fieldName: string, rules: FieldRules): void {
    this.fieldRulesMap[fieldName] = rules;
    if (!this.settings.suppressWarnings) this.checkConflicts(fieldName, rules);
  }

  validate(): FormValidationResult {
    const result: FormValidationResult = { valid: true, fields: {} };
    for (const name in this.fieldRulesMap) {
      result.fields[name] = this.validateField(name);
      if (!result.fields[name].valid) result.valid = false;
    }
    return result;
  }

  validateField(fieldName: string): FieldValidationResult {
    const field = this.findElement(fieldName);
    const rules = this.fieldRulesMap[fieldName];

    if (!field) {
      return {
        valid: false,
        errors: [`Поле "${fieldName}" не найдено`],
        validity: { builtIn: {} as ValidityState, customErrors: [], allErrors: [] },
      };
    }

    const builtInValidity = field.validity;
    const customErrors: string[] = [];
    const allErrors: string[] = [];

    const messages = this.buildMessages();

    if (builtInValidity.valueMissing) allErrors.push(messages.valueMissing || "Поле обязательно");
    if (builtInValidity.typeMismatch) allErrors.push(messages.typeMismatch || "Неверный тип данных");
    if (builtInValidity.patternMismatch) allErrors.push(messages.patternMismatch || "Неверный формат");
    if (builtInValidity.tooShort) allErrors.push(messages.tooShort || "Слишком коротко");
    if (builtInValidity.tooLong) allErrors.push(messages.tooLong || "Слишком длинно");
    if (builtInValidity.rangeOverflow) allErrors.push(messages.rangeOverflow || "Слишком большое значение");
    if (builtInValidity.rangeUnderflow) allErrors.push(messages.rangeUnderflow || "Слишком маленькое значение");

    const value = this.extractFieldValue(field);
    this.applyRules(field, value, rules, customErrors);
    allErrors.push(...customErrors);

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      validity: { builtIn: builtInValidity, customErrors, allErrors },
    };
  }

  getFieldValidity(field: FieldElement): ExtendedValidityState {
    return { builtIn: field.validity, customErrors: [], allErrors: [] };
  }

  checkFormStructure(): void {
    const inputs = this.formElement.querySelectorAll<FieldElement>("[name]");
    inputs.forEach((el) => {
      const name = el.getAttribute("name") || "";
      const id = el.id;
      if (id && !this.formElement.querySelector(`label[for="${id}"]`)) this.emitWarning(`У поля "${name}" нет <label for>`);
      const errorSlot =
        el.parentElement?.querySelector<HTMLElement>(`.error-${name}`) ||
        this.formElement.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (!errorSlot) this.emitWarning(`У поля "${name}" нет места для вывода ошибок`);
    });
  }

  private findElement(name: string): FieldElement | null {
    return this.formElement.querySelector<FieldElement>(`[name="${name}"]`);
  }

  private extractFieldValue(field: FieldElement): string | number | string[] | null {
    if (field instanceof HTMLInputElement && field.type === "checkbox") {
      const group = Array.from(this.formElement.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${field.name}"]`));
      const checked = group.filter((el) => el.checked).map((el) => el.value);
      return checked.length > 0 ? checked : [];
    }

    if (field instanceof HTMLInputElement && field.type === "number") {
      return field.value === "" ? null : parseFloat(field.value);
    }

    return field.value?.trim() || "";
  }

  private applyRules(
    _field: FieldElement, 
    value: string | number | string[] | null, 
    rules: FieldRules, 
    errors: string[]
  ): void {
    if (typeof value === "string") {
      const strRules = rules as StringRules;
      if (strRules.required && value.trim() === "") errors.push(this.resolveMessage(strRules.required, "Поле обязательно"));
      if (strRules.minLength && value.length < this.extractValue(strRules.minLength))
        errors.push(this.resolveMessage(strRules.minLength, `Минимальная длина ${this.extractValue(strRules.minLength)}`));
      if (strRules.maxLength && value.length > this.extractValue(strRules.maxLength))
        errors.push(this.resolveMessage(strRules.maxLength, `Максимальная длина ${this.extractValue(strRules.maxLength)}`));
      if (strRules.pattern && !this.extractPattern(strRules.pattern).test(value)) 
        errors.push(this.resolveMessage(strRules.pattern, "Неверный формат"));
      if (strRules.custom) {
        const res = strRules.custom(value);
        if (res !== true) errors.push(res);
      }
    }

    if (typeof value === "number") {
      const numRules = rules as NumberRules;
      if (numRules.required && (value === null || isNaN(value))) errors.push(this.resolveMessage(numRules.required, "Введите число"));
      if (numRules.min && value < this.extractValue(numRules.min)) 
        errors.push(this.resolveMessage(numRules.min, `Минимум ${this.extractValue(numRules.min)}`));
      if (numRules.max && value > this.extractValue(numRules.max)) 
        errors.push(this.resolveMessage(numRules.max, `Максимум ${this.extractValue(numRules.max)}`));
      if (numRules.custom) {
        const res = numRules.custom(value);
        if (res !== true) errors.push(res);
      }
    }

    if (Array.isArray(value)) {
      const arrRules = rules as ArrayRules;
      if (arrRules.required && value.length === 0) errors.push("Выберите хотя бы один вариант");
      if (arrRules.arrayMin && value.length < this.extractValue(arrRules.arrayMin))
        errors.push(`Минимум ${this.extractValue(arrRules.arrayMin)} вариантов`);
      if (arrRules.arrayMax && value.length > this.extractValue(arrRules.arrayMax))
        errors.push(`Максимум ${this.extractValue(arrRules.arrayMax)} вариантов`);
      if (arrRules.custom) {
        const res = arrRules.custom(value);
        if (res !== true) errors.push(res);
      }
    }
  }

  private autoBind(): void {
    for (const name in this.fieldRulesMap) {
      const field = this.findElement(name);
      if (!field) continue;
      field.addEventListener("input", () => this.handleValidation(name));
      field.addEventListener("blur", () => this.handleValidation(name));
    }
  }

  private handleValidation(name: string): void {
    const result = this.validateField(name);
    const field = this.findElement(name);
    const errorSlot =
      field?.parentElement?.querySelector<HTMLElement>(`.error-${name}`) ||
      this.formElement.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (errorSlot) errorSlot.textContent = result.errors.join(", ");
  }

  private emitWarning(message: string): void {
    const event = new CustomEvent("trustvalidator:warning", { detail: { message } });
    this.formElement.dispatchEvent(event);
  }

  private checkConflicts(name: string, rules: FieldRules) {
    const field = this.findElement(name);
    if (!field) return;
    if ("minLength" in rules && field.getAttribute("minlength")) 
      this.emitWarning(`JS minLength и HTML minlength одновременно у поля "${name}"`);
    if ("pattern" in rules && field.getAttribute("pattern")) 
      this.emitWarning(`JS pattern и HTML pattern одновременно у поля "${name}"`);
  }

  private buildMessages(): ConstraintValidationMessages {
    return {
      valueMissing: "Поле обязательно",
      typeMismatch: "Неверный тип данных",
      patternMismatch: "Неверный формат",
      tooShort: "Слишком коротко",
      tooLong: "Слишком длинно",
      rangeOverflow: "Слишком большое значение",
      rangeUnderflow: "Слишком маленькое значение",
      customError: "Ошибка проверки",
      ...(this.settings.messages || {}),
    };
  }

  private resolveMessage(
    rule: boolean | string | number | RegExp | { value?: string | number | RegExp; message?: string },
    defaultMessage: string
  ): string {
    if (typeof rule === "string") return rule;
    if (typeof rule === "boolean") return defaultMessage;
    if (typeof rule === "number") return defaultMessage;
    if (rule instanceof RegExp) return defaultMessage;
    if (typeof rule === "object" && rule.message) return rule.message;
    return defaultMessage;
  }

  private extractValue(rule: number | { value: number; message?: string }): number {
    return typeof rule === "object" ? rule.value : rule;
  }

  private extractPattern(rule: RegExp | { value: RegExp; message?: string }): RegExp {
    return rule instanceof RegExp ? rule : rule.value;
  }
}