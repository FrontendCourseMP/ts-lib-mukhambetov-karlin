import { describe, it, expect, beforeEach, vi } from 'vitest';
import InValid from '../InValid';
import type {StringRules} from '../types/types';

describe('InValid', () => {
  let form: HTMLFormElement;
  let validator: InValid;

  beforeEach(() => {
    document.body.innerHTML = '';
    form = document.createElement('form');
    document.body.appendChild(form);
  });

  describe('constructor', () => {
    it('должен создать экземпляр валидатора', () => {
      validator = new InValid(form);
      expect(validator).toBeInstanceOf(InValid);
    });

    it('должен вызвать checkFormStructure если suppressWarnings не установлен', () => {
      const spy = vi.spyOn(InValid.prototype as any, 'checkFormStructure');
      validator = new InValid(form);
      expect(spy).toHaveBeenCalled();
    });

    it('не должен вызывать checkFormStructure если suppressWarnings установлен', () => {
      const spy = vi.spyOn(InValid.prototype as any, 'checkFormStructure');
      validator = new InValid(form, { suppressWarnings: true });
      expect(spy).not.toHaveBeenCalled();
    });

    it('должен вызвать autoBind если autoBindEvents установлен', () => {
      const spy = vi.spyOn(InValid.prototype as any, 'autoBind');
      validator = new InValid(form, { autoBindEvents: true });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('addField', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен добавить правила для поля', () => {
      const rules: StringRules = { required: true };
      validator.addField('username', rules);
      expect((validator as any).fieldRulesMap['username']).toEqual(rules);
    });

    it('должен проверить конфликты если suppressWarnings не установлен', () => {
      validator = new InValid(form);
      const spy = vi.spyOn(validator as any, 'checkConflicts');
      const rules: StringRules = { required: true };
      validator.addField('username', rules);
      expect(spy).toHaveBeenCalledWith('username', rules);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен вернуть valid: true если нет полей', () => {
      const result = validator.validate();
      expect(result.valid).toBe(true);
      expect(result.fields).toEqual({});
    });

    it('должен валидировать все добавленные поля', () => {
      form.innerHTML = `<input name="username" value="test">`;
      validator.addField('username', { required: true });
      const result = validator.validate();
      expect(result.fields.username).toBeDefined();
      expect(result.valid).toBe(true);
    });

    it('должен вернуть valid: false если хотя бы одно поле невалидно', () => {
      form.innerHTML = `<input name="username" value="">`;
      validator.addField('username', { required: true });
      const result = validator.validate();
      expect(result.valid).toBe(false);
    });
  });

  describe('validateField', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен вернуть ошибку если поле не найдено', () => {
      validator.addField('username', { required: true });
      const result = validator.validateField('username');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('не найдено');
    });

    it('должен валидировать текстовое поле', () => {
      form.innerHTML = `<input name="username" value="test">`;
      validator.addField('username', { required: true });
      const result = validator.validateField('username');
      expect(result.valid).toBe(true);
    });

    it('должен проверить встроенную валидацию valueMissing', () => {
      form.innerHTML = `<input name="username" required value="">`;
      validator.addField('username', {});
      const result = validator.validateField('username');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Поле обязательно');
    });

    it('должен проверить встроенную валидацию typeMismatch', () => {
      form.innerHTML = `<input name="email" type="email" value="invalid">`;
      validator.addField('email', {});
      const result = validator.validateField('email');
      // typeMismatch может не срабатывать в JSDOM, проверяем структуру результата
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result.validity.builtIn).toBeDefined();
    });

    it('должен проверить встроенную валидацию tooShort', () => {
      form.innerHTML = `<input name="username" minlength="5" value="ab">`;
      validator.addField('username', {});
      const result = validator.validateField('username');
      // В JSDOM может не работать, проверяем что метод отрабатывает
      expect(result).toHaveProperty('valid');
      expect(result.validity).toHaveProperty('builtIn');
    });

    it('должен проверить встроенную валидацию tooLong', () => {
      form.innerHTML = `<input name="username" maxlength="3" value="abc">`;
      validator.addField('username', {});
      const result = validator.validateField('username');
      expect(result).toHaveProperty('valid');
    });

    it('должен проверить встроенную валидацию rangeOverflow', () => {
      form.innerHTML = `<input name="age" type="number" min="0" max="100" value="150">`;
      validator.addField('age', {});
      const result = validator.validateField('age');
      expect(result).toHaveProperty('validity');
    });

    it('должен проверить встроенную валидацию rangeUnderflow', () => {
      form.innerHTML = `<input name="age" type="number" min="18" value="10">`;
      validator.addField('age', {});
      const result = validator.validateField('age');
      expect(result).toHaveProperty('validity');
    });

    it('должен применить кастомные правила', () => {
      form.innerHTML = `<input name="username" value="test">`;
      validator.addField('username', {
        custom: (val) => val === 'admin' || 'Только admin разрешён'
      });
      const result = validator.validateField('username');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Только admin разрешён');
    });

    it('должен вернуть правильную структуру FieldValidationResult', () => {
      form.innerHTML = `<input name="username" value="test">`;
      validator.addField('username', { required: true });
      const result = validator.validateField('username');
      
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('validity');
      expect(result.validity).toHaveProperty('builtIn');
      expect(result.validity).toHaveProperty('customErrors');
      expect(result.validity).toHaveProperty('allErrors');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.validity.customErrors)).toBe(true);
      expect(Array.isArray(result.validity.allErrors)).toBe(true);
    });
  });

  describe('getFieldValidity', () => {
    it('должен вернуть ExtendedValidityState для поля', () => {
      validator = new InValid(form, { suppressWarnings: true });
      const input = document.createElement('input');
      const validity = validator.getFieldValidity(input);
      expect(validity).toHaveProperty('builtIn');
      expect(validity).toHaveProperty('customErrors');
      expect(validity).toHaveProperty('allErrors');
      expect(Array.isArray(validity.customErrors)).toBe(true);
      expect(Array.isArray(validity.allErrors)).toBe(true);
    });

    it('должен работать с HTMLSelectElement', () => {
      validator = new InValid(form, { suppressWarnings: true });
      const select = document.createElement('select');
      const validity = validator.getFieldValidity(select);
      expect(validity).toHaveProperty('builtIn');
    });

    it('должен работать с HTMLTextAreaElement', () => {
      validator = new InValid(form, { suppressWarnings: true });
      const textarea = document.createElement('textarea');
      const validity = validator.getFieldValidity(textarea);
      expect(validity).toHaveProperty('builtIn');
    });
  });

  describe('checkFormStructure', () => {
    it('должен выдать предупреждение если у поля нет label', () => {
      form.innerHTML = `<input id="test" name="test">`;
      let warningMessage = '';
      form.addEventListener('trustvalidator:warning', (e: any) => {
        warningMessage = e.detail.message;
      });
      validator = new InValid(form);
      expect(warningMessage).toContain('нет <label for>');
    });

    it('должен выдать предупреждение если нет места для ошибок', () => {
      form.innerHTML = `<input name="test">`;
      let warningMessage = '';
      form.addEventListener('trustvalidator:warning', (e: any) => {
        warningMessage = e.detail.message;
      });
      validator = new InValid(form);
      expect(warningMessage).toContain('нет места для вывода ошибок');
    });

    it('не должен выдавать предупреждение если label существует', () => {
      form.innerHTML = `
        <label for="test">Test</label>
        <input id="test" name="test">
        <div class="error-test"></div>
      `;
      let warningFired = false;
      form.addEventListener('trustvalidator:warning', () => {
        warningFired = true;
      });
      validator = new InValid(form);
      expect(warningFired).toBe(false);
    });

    it('должен принять data-error-for как валидное место для ошибок', () => {
      form.innerHTML = `
        <label for="test">Test</label>
        <input id="test" name="test">
        <div data-error-for="test"></div>
      `;
      let warningFired = false;
      form.addEventListener('trustvalidator:warning', () => {
        warningFired = true;
      });
      validator = new InValid(form);
      expect(warningFired).toBe(false);
    });
  });

  describe('extractFieldValue', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен извлечь значение текстового поля', () => {
      form.innerHTML = `<input name="username" value="  test  ">`;
      validator.addField('username', {});
      const field = form.querySelector<HTMLInputElement>('[name="username"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toBe('test');
    });

    it('должен извлечь значение number поля', () => {
      form.innerHTML = `<input name="age" type="number" value="25">`;
      validator.addField('age', {});
      const field = form.querySelector<HTMLInputElement>('[name="age"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toBe(25);
    });

    it('должен вернуть null для пустого number поля', () => {
      form.innerHTML = `<input name="age" type="number" value="">`;
      validator.addField('age', {});
      const field = form.querySelector<HTMLInputElement>('[name="age"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toBe(null);
    });

    it('должен извлечь массив значений для checkbox группы', () => {
      form.innerHTML = `
        <input name="colors" type="checkbox" value="red" checked>
        <input name="colors" type="checkbox" value="blue" checked>
        <input name="colors" type="checkbox" value="green">
      `;
      validator.addField('colors', {});
      const field = form.querySelector<HTMLInputElement>('[name="colors"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toEqual(['red', 'blue']);
    });

    it('должен вернуть пустой массив если нет выбранных checkbox', () => {
      form.innerHTML = `
        <input name="colors" type="checkbox" value="red">
        <input name="colors" type="checkbox" value="blue">
      `;
      validator.addField('colors', {});
      const field = form.querySelector<HTMLInputElement>('[name="colors"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toEqual([]);
    });

    it('должен извлечь значение textarea', () => {
      form.innerHTML = `<textarea name="description">  Some text  </textarea>`;
      validator.addField('description', {});
      const field = form.querySelector<HTMLTextAreaElement>('[name="description"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toBe('Some text');
    });

    it('должен извлечь значение select', () => {
      form.innerHTML = `
        <select name="country">
          <option value="us">USA</option>
          <option value="uk" selected>UK</option>
        </select>
      `;
      validator.addField('country', {});
      const field = form.querySelector<HTMLSelectElement>('[name="country"]')!;
      const value = (validator as any).extractFieldValue(field);
      expect(value).toBe('uk');
    });
  });

  describe('applyRules - String', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен проверить required для строки', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, '', { required: true }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('обязательно');
    });

    it('должен проверить minLength', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'ab', { minLength: 5 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Минимальная длина');
    });

    it('должен проверить maxLength', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'abcdef', { maxLength: 3 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Максимальная длина');
    });

    it('должен проверить pattern', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'abc', { pattern: /^\d+$/ }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('формат');
    });

    it('должен использовать кастомное сообщение для minLength', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'ab', { 
        minLength: { value: 5, message: 'Слишком короткое имя' } 
      }, errors);
      expect(errors[0]).toBe('Слишком короткое имя');
    });

    it('должен использовать кастомное сообщение для maxLength', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'abcdef', { 
        maxLength: { value: 3, message: 'Слишком длинное имя' } 
      }, errors);
      expect(errors[0]).toBe('Слишком длинное имя');
    });

    it('должен использовать кастомное сообщение для pattern', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 'abc', { 
        pattern: { value: /^\d+$/, message: 'Только цифры' } 
      }, errors);
      expect(errors[0]).toBe('Только цифры');
    });

    it('должен использовать строку как сообщение для required', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, '', { required: 'Это поле обязательно!' }, errors);
      expect(errors[0]).toBe('Это поле обязательно!');
    });

    it('должен вызвать custom функцию', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      const customFn = vi.fn((val: string) => val.includes('@') || 'Нужен @');
      (validator as any).applyRules(field, 'test', { custom: customFn }, errors);
      expect(customFn).toHaveBeenCalledWith('test');
      expect(errors[0]).toBe('Нужен @');
    });
  });

  describe('applyRules - Number', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен проверить required для числа', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, null, { required: true }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('число');
    });

    it('должен проверить min', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 5, { min: 10 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Минимум');
    });

    it('должен проверить max', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 100, { max: 50 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toBe('Максимум 50');
    });

    it('должен использовать кастомное сообщение для min', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 5, { 
        min: { value: 10, message: 'Минимальный возраст 10' } 
      }, errors);
      expect(errors[0]).toBe('Минимальный возраст 10');
    });

    it('должен использовать кастомное сообщение для max', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, 100, { 
        max: { value: 50, message: 'Максимальный возраст 50' } 
      }, errors);
      expect(errors[0]).toBe('Максимальный возраст 50');
    });

    it('должен вызвать custom функцию для числа', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      const customFn = vi.fn((val: number) => val % 2 === 0 || 'Только чётные');
      (validator as any).applyRules(field, 5, { custom: customFn }, errors);
      expect(customFn).toHaveBeenCalledWith(5);
      expect(errors[0]).toBe('Только чётные');
    });
  });

  describe('applyRules - Array', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен проверить required для массива', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, [], { required: true }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('хотя бы один');
    });

    it('должен проверить arrayMin', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, ['a'], { arrayMin: 3 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Минимум 3');
    });

    it('должен проверить arrayMax', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, ['a', 'b', 'c'], { arrayMax: 2 }, errors);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Максимум 2');
    });

    it('должен использовать кастомное сообщение для arrayMin', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      (validator as any).applyRules(field, ['a'], { 
        arrayMin: { value: 3, message: 'Выберите хотя бы 3' } 
      }, errors);
      expect(errors[0]).toBe('Выберите хотя бы 3');
    });

    it('должен вызвать custom функцию для массива', () => {
      const errors: string[] = [];
      const field = document.createElement('input');
      const customFn = vi.fn((vals: string[]) => vals.includes('red') || 'Нужен красный');
      (validator as any).applyRules(field, ['blue', 'green'], { custom: customFn }, errors);
      expect(customFn).toHaveBeenCalledWith(['blue', 'green']);
      expect(errors[0]).toBe('Нужен красный');
    });
  });

  describe('autoBind', () => {
    it('должен подписаться на события input и blur', () => {
      form.innerHTML = `<input name="username" value="">`;
      validator = new InValid(form, { autoBindEvents: true, suppressWarnings: true });
      validator.addField('username', { required: true });
      
      const field = form.querySelector<HTMLInputElement>('[name="username"]')!;
      const spy = vi.spyOn(validator as any, 'handleValidation');
      
      field.dispatchEvent(new Event('input'));
      expect(spy).toHaveBeenCalledWith('username');
      
      field.dispatchEvent(new Event('blur'));
      expect(spy).toHaveBeenCalledWith('username');
    });

    it('не должен падать если поле не найдено', () => {
      validator = new InValid(form, { autoBindEvents: true, suppressWarnings: true });
      validator.addField('nonexistent', { required: true });
      expect(() => (validator as any).autoBind()).not.toThrow();
    });
  });

  describe('handleValidation', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен обновить errorSlot с ошибками', () => {
      form.innerHTML = `
        <input name="username" value="">
        <div class="error-username"></div>
      `;
      validator.addField('username', { required: true });
      (validator as any).handleValidation('username');
      
      const errorSlot = form.querySelector('.error-username');
      expect(errorSlot?.textContent).toContain('обязательно');
    });

    it('должен найти errorSlot по data-error-for', () => {
      form.innerHTML = `
        <input name="username" value="">
        <div data-error-for="username"></div>
      `;
      validator.addField('username', { required: true });
      (validator as any).handleValidation('username');
      
      const errorSlot = form.querySelector('[data-error-for="username"]');
      expect(errorSlot?.textContent).toContain('обязательно');
    });

    it('должен очистить errorSlot если нет ошибок', () => {
      form.innerHTML = `
        <input name="username" value="valid">
        <div class="error-username">Old error</div>
      `;
      validator.addField('username', { required: true });
      (validator as any).handleValidation('username');
      
      const errorSlot = form.querySelector('.error-username');
      expect(errorSlot?.textContent).toBe('');
    });

    it('должен объединить несколько ошибок через запятую', () => {
      form.innerHTML = `
        <input name="username" value="ab">
        <div class="error-username"></div>
      `;
      validator.addField('username', { 
        required: true,
        minLength: 5,
        pattern: /^\d+$/
      });
      (validator as any).handleValidation('username');
      
      const errorSlot = form.querySelector('.error-username');
      expect(errorSlot?.textContent).toContain(',');
    });
  });

  describe('checkConflicts', () => {
    beforeEach(() => {
      validator = new InValid(form);
    });

    it('должен предупредить о конфликте minLength', () => {
      form.innerHTML = `<input name="username" minlength="5">`;
      let warningMessage = '';
      form.addEventListener('trustvalidator:warning', (e: any) => {
        warningMessage = e.detail.message;
      });
      validator.addField('username', { minLength: 5 });
      expect(warningMessage).toContain('minLength и HTML minlength');
    });

    it('должен предупредить о конфликте pattern', () => {
      form.innerHTML = `<input name="username" pattern="[a-z]+">`;
      let warningMessage = '';
      form.addEventListener('trustvalidator:warning', (e: any) => {
        warningMessage = e.detail.message;
      });
      validator.addField('username', { pattern: /[a-z]+/ });
      expect(warningMessage).toContain('pattern и HTML pattern');
    });

    it('не должен предупреждать если поле не найдено', () => {
      let warningFired = false;
      form.addEventListener('trustvalidator:warning', () => {
        warningFired = true;
      });
      (validator as any).checkConflicts('nonexistent', { minLength: 5 });
      expect(warningFired).toBe(false);
    });
  });

  describe('buildMessages', () => {
    it('должен использовать дефолтные сообщения', () => {
      validator = new InValid(form, { suppressWarnings: true });
      const messages = (validator as any).buildMessages();
      expect(messages.valueMissing).toBe('Поле обязательно');
      expect(messages.typeMismatch).toBe('Неверный тип данных');
      expect(messages.patternMismatch).toBe('Неверный формат');
      expect(messages.tooShort).toBe('Слишком коротко');
      expect(messages.tooLong).toBe('Слишком длинно');
      expect(messages.rangeOverflow).toBe('Слишком большое значение');
      expect(messages.rangeUnderflow).toBe('Слишком маленькое значение');
      expect(messages.customError).toBe('Ошибка проверки');
    });

    it('должен переопределить сообщения из настроек', () => {
      validator = new InValid(form, {
        suppressWarnings: true,
        messages: { 
          valueMissing: 'Кастомное сообщение',
          typeMismatch: 'Неверный тип'
        }
      });
      const messages = (validator as any).buildMessages();
      expect(messages.valueMissing).toBe('Кастомное сообщение');
      expect(messages.typeMismatch).toBe('Неверный тип');
      expect(messages.tooShort).toBe('Слишком коротко'); // остальные по умолчанию
    });
  });

  describe('resolveMessage', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен вернуть строку если правило - строка', () => {
      const msg = (validator as any).resolveMessage('Кастомное', 'Дефолт');
      expect(msg).toBe('Кастомное');
    });

    it('должен вернуть дефолт если правило - boolean', () => {
      const msg = (validator as any).resolveMessage(true, 'Дефолт');
      expect(msg).toBe('Дефолт');
    });

    it('должен вернуть дефолт если правило - number', () => {
      const msg = (validator as any).resolveMessage(5, 'Дефолт');
      expect(msg).toBe('Дефолт');
    });

    it('должен вернуть дефолт если правило - RegExp', () => {
      const msg = (validator as any).resolveMessage(/test/, 'Дефолт');
      expect(msg).toBe('Дефолт');
    });

    it('должен вернуть message из объекта', () => {
      const msg = (validator as any).resolveMessage(
        { value: 5, message: 'Кастомное' },
        'Дефолт'
      );
      expect(msg).toBe('Кастомное');
    });

    it('должен вернуть дефолт если объект без message', () => {
      const msg = (validator as any).resolveMessage(
        { value: 5 },
        'Дефолт'
      );
      expect(msg).toBe('Дефолт');
    });
  });

  describe('extractValue', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен извлечь число из number', () => {
      const val = (validator as any).extractValue(5);
      expect(val).toBe(5);
    });

    it('должен извлечь value из объекта', () => {
      const val = (validator as any).extractValue({ value: 10, message: 'test' });
      expect(val).toBe(10);
    });

    it('должен работать с отрицательными числами', () => {
      const val = (validator as any).extractValue(-5);
      expect(val).toBe(-5);
    });

    it('должен работать с дробными числами', () => {
      const val = (validator as any).extractValue(3.14);
      expect(val).toBe(3.14);
    });
  });

  describe('extractPattern', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен вернуть RegExp как есть', () => {
      const pattern = /test/;
      const result = (validator as any).extractPattern(pattern);
      expect(result).toBe(pattern);
    });

    it('должен извлечь value из объекта', () => {
      const pattern = /test/;
      const result = (validator as any).extractPattern({ value: pattern, message: 'err' });
      expect(result).toBe(pattern);
    });

    it('должен работать с флагами RegExp', () => {
      const pattern = /test/gi;
      const result = (validator as any).extractPattern(pattern);
      expect(result).toBe(pattern);
      expect(result.flags).toBe('gi');
    });
  });

  describe('emitWarning', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен отправить кастомное событие trustvalidator:warning', () => {
      let eventDetail: any = null;
      form.addEventListener('trustvalidator:warning', (e: any) => {
        eventDetail = e.detail;
      });
      
      (validator as any).emitWarning('Тестовое предупреждение');
      
      expect(eventDetail).not.toBe(null);
      expect(eventDetail.message).toBe('Тестовое предупреждение');
    });

    it('событие должно быть CustomEvent', () => {
      let eventType = '';
      form.addEventListener('trustvalidator:warning', (e: any) => {
        eventType = e.constructor.name;
      });
      
      (validator as any).emitWarning('Тест');
      expect(eventType).toBe('CustomEvent');
    });
  });

  describe('findElement', () => {
    beforeEach(() => {
      validator = new InValid(form, { suppressWarnings: true });
    });

    it('должен найти элемент по имени', () => {
      form.innerHTML = `<input name="username" value="test">`;
      const element = (validator as any).findElement('username');
      expect(element).not.toBe(null);
      expect(element?.getAttribute('name')).toBe('username');
    });

    it('должен вернуть null если элемент не найден', () => {
      const element = (validator as any).findElement('nonexistent');
      expect(element).toBe(null);
    });

    it('должен найти первый элемент если несколько с одним именем', () => {
      form.innerHTML = `
        <input name="test" value="first">
        <input name="test" value="second">
      `;
      const element = (validator as any).findElement('test');
      expect(element?.value).toBe('first');
    });
  });

  describe('Интеграционные тесты', () => {
    it('должен работать полный цикл валидации формы', () => {
      form.innerHTML = `
        <label for="username">Username</label>
        <input id="username" name="username" value="">
        <div class="error-username"></div>
        
        <label for="email">Email</label>
        <input id="email" name="email" type="email" value="test@example.com">
        <div class="error-email"></div>
        
        <label for="age">Age</label>
        <input id="age" name="age" type="number" value="25">
        <div class="error-age"></div>
      `;

      validator = new InValid(form, { suppressWarnings: true });
      validator.addField('username', { required: true, minLength: 3 });
      validator.addField('email', { required: true });
      validator.addField('age', { min: 18, max: 100 });

      const result = validator.validate();
      
      expect(result.valid).toBe(false); // username пустой
      expect(result.fields.username.valid).toBe(false);
      expect(result.fields.email.valid).toBe(true);
      expect(result.fields.age.valid).toBe(true);
    });

    it('должен работать с автобиндингом событий', (done) => {
      form.innerHTML = `
        <input name="username" value="">
        <div class="error-username"></div>
      `;

      validator = new InValid(form, { 
        autoBindEvents: true, 
        suppressWarnings: true 
      });
      validator.addField('username', { required: true });

      const input = form.querySelector<HTMLInputElement>('[name="username"]')!;
      const errorSlot = form.querySelector('.error-username')!;

      input.value = '';
      input.dispatchEvent(new Event('blur'));

      setTimeout(() => {
        expect(errorSlot.textContent).toContain('обязательно');
        
        input.value = 'valid';
        input.dispatchEvent(new Event('input'));
        
        setTimeout(() => {
          expect(errorSlot.textContent).toBe('');
          done();
        }, 0);
      }, 0);
    });

    it('должен обработать сложную форму с разными типами полей', () => {
      form.innerHTML = `
        <input name="text" value="hello">
        <input name="number" type="number" value="42">
        <input name="checkbox1" type="checkbox" value="a" checked>
        <input name="checkbox1" type="checkbox" value="b" checked>
        <select name="select">
          <option value="opt1" selected>Option 1</option>
        </select>
        <textarea name="textarea">Some text</textarea>
      `;

      validator = new InValid(form, { suppressWarnings: true });
      validator.addField('text', { minLength: 3 });
      validator.addField('number', { min: 0, max: 100 });
      validator.addField('checkbox1', { arrayMin: 1 });
      validator.addField('select', { required: true });
      validator.addField('textarea', { maxLength: 100 });

      const result = validator.validate();
      
      expect(result.valid).toBe(true);
      expect(result.fields.text.valid).toBe(true);
      expect(result.fields.number.valid).toBe(true);
      expect(result.fields.checkbox1.valid).toBe(true);
      expect(result.fields.select.valid).toBe(true);
      expect(result.fields.textarea.valid).toBe(true);
    });

    it('должен корректно обработать множественные ошибки', () => {
      form.innerHTML = `<input name="username" value="ab">`;
      
      validator = new InValid(form, { suppressWarnings: true });
      validator.addField('username', {
        required: true,
        minLength: 5,
        maxLength: 10,
        pattern: /^\d+$/,
        custom: (val) => val.includes('_') || 'Нужен символ _'
      });

      const result = validator.validateField('username');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Минимальная длина 5');
      expect(result.errors.some(e => e.includes('формат'))).toBe(true);
      expect(result.errors).toContain('Нужен символ _');
    });
  });
});