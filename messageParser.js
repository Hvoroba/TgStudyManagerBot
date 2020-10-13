function ParseTaskAddingMessage(text, errorList) {
    let addData = []

    let firstIndex = -1
    let secondIndex = -1

    for (let i = 0; i < text.length; i++) {
        if (text[i] == ':') {
            firstIndex == -1 ? firstIndex = i : secondIndex = i
        }
    }

    addData.push(text.slice(0, firstIndex - 1).trim()) // 0 — Subject

    if (secondIndex == -1) {
        addData.push(text.slice(firstIndex + 1, text.length).trim()) // 1 — Task
        //addData.push('NEXT DATE') // 2 — TODO GetNextSubjectData() to find next date
    } else {
        addData.push(text.slice(firstIndex + 1, secondIndex - 1).trim()) // 1 — Task
        addData.push(text.slice(secondIndex + 1, text.length).trim()) // 2 — Date
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

//
GetNextSubjectDate([9])
//

function GetNextSubjectDate(numberOfdaysWithSubject) {
    let numberOfDay = new Date().getDay()
    if (IsEvenWeek() == false) numberOfDay += 7
    let closestDay = null

    if (numberOfdaysWithSubject.length == 1) {
        closestDay = numberOfdaysWithSubject[0]
    } else {
        for (let i = 0; i < numberOfdaysWithSubject.length; i++) {
            if (numberOfdaysWithSubject[i] > numberOfDay) {
                closestDay = numberOfdaysWithSubject[i]
                break;
            }
        }

        if (closestDay == null) closestDay = numberOfdaysWithSubject[0]
        // bc numberOfdaysWithSubject filled in from eMonday to oSunday, so the closest one will always be the first one
    }

    let daysDiff
    closestDay > numberOfDay ? daysDiff = closestDay - numberOfDay : daysDiff = closestDay + 14 - numberOfDay

    let closestDate = new Date()

    closestDate.setDate(closestDate.getDate() + daysDiff)
    let closestDateToStr = closestDate.getDate() + '.' + (closestDate.getMonth() + 1) + '.' + closestDate.getFullYear()

    return closestDateToStr
}

function IsEvenWeek() {
    let today = new Date()
    let firstSeptember
    if (today.getMonth() >= 8) {
        firstSeptember = new Date(today.getFullYear(), 8, 1)
    } else {
        let year = today.getFullYear()
        firstSeptember = new Date(--year, 8, 1)
    }

    let weekNumb = (Math.ceil((((today - firstSeptember) / 86400000) + firstSeptember.getDay() + 1) / 7))

    if (weekNumb % 2 == 0) return true
    return false
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

function MakeRemindMessage(deadlines) {

}

module.exports = { ParseTaskAddingMessage, ParseSubjectEditMessage, MakeRemindMessage, GetNextSubjectDate }