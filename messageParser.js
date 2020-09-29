function ParseTaskAddingMessage(text, addData, errorList) {
    let firstIndex = 0;
    let secondIndex = 0;
    text += '-'

    for (let i = 0; i < text.length; i++) {

        if (text[i] == '-') {

            if (firstIndex == 0) {
                if (errorList[0].wasErrors == true) {
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
                    errorList[0].dateError = 'Неверный формат даты'
                    errorList[0].wasErrors = true
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

module.exports = { ParseTaskAddingMessage }