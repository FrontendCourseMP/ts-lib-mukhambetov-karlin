import InValid from "./InValid"

const form = document.querySelector('#formTest') as HTMLFormElement
const resultCont = document.querySelector('#result') as HTMLDivElement
const errCont = document.querySelector('#errs') as HTMLDivElement

const validator = new InValid(form, {autoBindEvents: true})

validator.addField('name', {required: true, minLength: 3})

console.log(validator)

form.addEventListener('submit', (e) => {
    e.preventDefault()
    const results = validator.validate()

    if (!results.valid) {
        for (const result in results) {
        errCont.textContent = `Поле ${result}`;
        console.log('але')
        return
    }
    }
    
    

    

    resultCont.textContent = 'круто'
})

form.addEventListener('trustvalidator:warning', (e: Event) => {
  const detail = (e as CustomEvent).detail;
  const div = document.createElement('div');
  div.textContent = `Warning: ${detail.message}`;
  div.style.color = 'orange';
  errCont.appendChild(div);
});