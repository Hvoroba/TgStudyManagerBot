const dbModule = require('./database')

function GetExpiringDeadlines() {
    let remindOptions = dbModule.GetAllOptions()

    let deadlinesToReport = {}
    let deadlinesToReportCounter = 0

    for (let i = 0; i < Object.keys(remindOptions).length; i++) {
        let userId = Object.values(remindOptions[i])[0]
        let daysLeft = Object.values(remindOptions[i])[1]
        if (CheckIfTime(userId, daysLeft) != false) {
            deadlinesToReport[deadlinesToReportCounter] = { userId: userId, deadlinesList: CheckIfTime(userId, daysLeft) }
            deadlinesToReportCounter++
        }
    }

    if (Object.keys(deadlinesToReport).length == 0) return false

    return deadlinesToReport
}

function CheckIfTime(userId, daysLeft) {
    let deadlinesToReport = []
    deadlines = dbModule.GetAllDeadlines(userId)

    for (let i = 0; i < deadlines.length; i++) {
        if (deadlines[i] != 'Бессрочное задание' & IsDeadline(deadlines[i], daysLeft) == true) {
            deadlinesToReport.push(deadlines[i])
        }
    }

    if (deadlinesToReport.length == 0) return false

    return deadlinesToReport
}

function IsDeadline(date, daysLeft) {
    today = new Date()
    today.setDate(today.getDate() + Number.parseInt(daysLeft))
    NAdate = date.slice(3, 6) + date.slice(0, 3) + date.slice(6, date.length)
    NAdate = new Date(NAdate)

    if (today.getFullYear() != NAdate.getFullYear()) return false
    if (today.getMonth() != NAdate.getMonth()) return false
    if (today.getDate() != NAdate.getDate()) return false

    return true
}


module.exports = { GetExpiringDeadlines }