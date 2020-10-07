function ParseTaskAddingMessage(text, errorList) {
    let addData = []

    let firstIndex = -1
    let secondIndex = -1

    for (let i = 0; i < text.length; i++) {
        if (text[i] == ':') {
            firstIndex == -1 ? firstIndex = i : secondIndex = i
        }
    }

    addData.push(text.slice(0, firstIndex - 1).trim()) // Subject

    if (secondIndex == -1) {
        addData.push(text.slice(firstIndex + 1, text.length).trim()) // Task
        addData.push('NEXT DATE') // TODO GetNextSubjectData() to find next date
    } else {
        addData.push(text.slice(firstIndex + 1, secondIndex - 1).trim()) // Task
        addData.push(text.slice(secondIndex + 1, text.length).trim()) // Date
    }

    if (DateIsValid(addData[2]) == false) {
        errorList.push('Неверный ввод даты.')
    }

    if (addData[2].toUpperCase() == 'БС') addData[2] = 'Бессрочное задание'

    return addData
}

function DateIsValid(dateString) {

    //Бессрочная задача
    if (dateString.toUpperCase() == 'БС') return true

    let naDate = dateString.slice(3, 6) + dateString.slice(0, 3) + dateString.slice(6, 10);

    if (Date.parse(naDate)) {
        if (Date.now() < new Date(naDate)) {
            return true
        }
    }

    return false
}

function GetNextSubjectData(subject) {
    ///////
}

function ParseSubjectEditMessage(text) {
    let addData = []
    for (let i = 0; i < text.length; i++) {
        if (text[i] == ':') {
            addData.push(text.slice(0, i - 1).trim()) //id
            addData.push(text.slice(i + 1, text.length).trim()) //shortName
            return addData
        }
    }
}

module.exports = { ParseTaskAddingMessage, ParseSubjectEditMessage }