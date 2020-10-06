function ParseTaskAddingMessage(text, addData, errorList) {
    let firstIndex = 0;
    let secondIndex = 0;
    text += '-'

    for (let i = 0; i < text.length; i++) {

        if (text[i] == '-' | text[i] == '—') {

            if (firstIndex == 0) {
                if (errorList.length > 0) {
                    return;
                }
                firstIndex = i
            } else if (secondIndex == 0) {
                secondIndex = i
                addData[0].task = text.slice(firstIndex + 1, secondIndex).trim()
            } else {
                if (DateIsValid(text.slice(secondIndex + 1, text.length - 1).trim()) == true) {
                    addData[0].deadline = text.slice(secondIndex + 1, text.length - 1).trim()
                } else {
                    errorList.push('Неверный формат даты')
                }
            }
        }
    }

    if (addData.deadline == null) {
        addData.deadline = GetNextSubjectData()
    }
}

function DateIsValid(dateString) {

    let naDate = dateString.slice(3, 6) + dateString.slice(0, 3) + dateString.slice(6, 10);

    if (Date.parse(naDate)) {
        if (Date.now() < new Date(naDate)) {
            return true
        }
    }
}

function GetNextSubjectData(subject) {
    ///////
}

function ParseSubjectEditMessage(text) {
    let message = []
    for (let i = 0; i < text.length; i++) {
        if (text[i] == '-' | text[i] == '—') {
            message.push(text.slice(0, i - 1).trim())
            message.push(text.slice(i + 1, text.length).trim())
            return message
        }
    }
}

module.exports = { ParseTaskAddingMessage, ParseSubjectEditMessage }