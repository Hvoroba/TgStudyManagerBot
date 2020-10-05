const xlsx = require('xlsx')


function GetExcelData() {

    let wb = xlsx.readFile("schedule.xlsx")
    let ws = wb.Sheets[wb.SheetNames[0]]

    let cellsData = xlsx.utils.sheet_to_json(ws)

    let week = {
        eMonday: null, eTuesday: null, eWednesday: null, eThursday: null, eFriday: null, eSaturday: null, eSunday: null,
        oMonday: null, oTuesday: null, oWednesday: null, oThursday: null, oFriday: null, oSaturday: null, oSunday: null
    }

    let eMonday = {}
    let eTuesday = {}
    let eWednesday = {}
    let eThursday = {}
    let eFriday = {}
    let eSaturday = {}
    let eSunday = {}
    let oMonday = {}
    let oTuesday = {}
    let oWednesday = {}
    let oThursday = {}
    let oFriday = {}
    let oSaturday = {}
    let oSunday = {}

    for (let i = 0; i < cellsData.length; i++) {
        if (typeof cellsData[i].Понедельник !== typeof undefined) eMonday[i] = { [cellsData[i].Четная]: cellsData[i].Понедельник }
        if (typeof cellsData[i].Вторник !== typeof undefined) eTuesday[i] = { [cellsData[i].Четная]: cellsData[i].Вторник }
        if (typeof cellsData[i].Среда !== typeof undefined) eWednesday[i] = { [cellsData[i].Четная]: cellsData[i].Среда }
        if (typeof cellsData[i].Четверг !== typeof undefined) eThursday[i] = { [cellsData[i].Четная]: cellsData[i].Четверг }
        if (typeof cellsData[i].Пятница !== typeof undefined) eFriday[i] = { [cellsData[i].Четная]: cellsData[i].Пятница }
        if (typeof cellsData[i].Суббота !== typeof undefined) eSaturday[i] = { [cellsData[i].Четная]: cellsData[i].Суббота }
        if (typeof cellsData[i].Воскресенье !== typeof undefined) eSunday[i] = { [cellsData[i].Четная]: cellsData[i].Воскресенье }
        if (typeof cellsData[i].Понедельник_1 !== typeof undefined) oMonday[i] = { [cellsData[i].Четная]: cellsData[i].Понедельник_1 }
        if (typeof cellsData[i].Вторник_1 !== typeof undefined) oTuesday[i] = { [cellsData[i].Четная]: cellsData[i].Вторник_1 }
        if (typeof cellsData[i].Среда_1 !== typeof undefined) oWednesday[i] = { [cellsData[i].Четная]: cellsData[i].Среда_1 }
        if (typeof cellsData[i].Четверг_1 !== typeof undefined) oThursday[i] = { [cellsData[i].Четная]: cellsData[i].Четверг_1 }
        if (typeof cellsData[i].Пятница_1 !== typeof undefined) oFriday[i] = { [cellsData[i].Четная]: cellsData[i].Пятница_1 }
        if (typeof cellsData[i].Суббота_1 !== typeof undefined) oSaturday[i] = { [cellsData[i].Четная]: cellsData[i].Суббота_1 }
        if (typeof cellsData[i].Воскресенье_1 !== typeof undefined) oSunday[i] = { [cellsData[i].Четная]: cellsData[i].Воскресенье_1 }
    }

    if (Object.keys(eMonday).length != 0) week.eMonday = eMonday
    if (Object.keys(eTuesday).length != 0) week.eTuesday = eTuesday
    if (Object.keys(eWednesday).length != 0) week.eWednesday = eWednesday
    if (Object.keys(eThursday).length != 0) week.eThursday = eThursday
    if (Object.keys(eFriday).length != 0) week.eFriday = eFriday
    if (Object.keys(eSaturday).length != 0) week.eSaturday = eSaturday
    if (Object.keys(eSunday).length != 0) week.eSunday = eSunday
    if (Object.keys(oMonday).length != 0) week.oMonday = oMonday
    if (Object.keys(oTuesday).length != 0) week.oTuesday = oTuesday
    if (Object.keys(oWednesday).length != 0) week.oWednesday = oWednesday
    if (Object.keys(oThursday).length != 0) week.oThursday = oThursday
    if (Object.keys(oFriday).length != 0) week.oFriday = oFriday
    if (Object.keys(oSaturday).length != 0) week.oSaturday = oSaturday
    if (Object.keys(oSunday).length != 0) week.oSunday = oSunday

    for (let i = Object.keys(week).length; i >= 0; i--) {

        if (Object.values(week)[i] == null) delete week[Object.keys(week)[i]]
    }

    return week
}


module.exports = { GetExcelData }