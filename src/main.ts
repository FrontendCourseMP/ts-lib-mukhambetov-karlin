import InValid from "./InValid"

const form = document.querySelector('#formTest') as HTMLFormElement

const validator = new InValid(form, {autoBindEvents: true})

validator.addField('name', {minLength: 3})



form.addEventListener('submit', (e) => {
    e.preventDefault()
    const results = validator.validate()

    if (!results.valid) {
        for (const result in results.fields) {
          const errAlert = document.createElement('span')
          const input = document.querySelector(`#${result}`)
          input?.after(errAlert)
          errAlert.textContent = `Ошибка в поле  ${result}: ${results.fields[result].errors.join(', ')}`;
        return
    }
    }
})


