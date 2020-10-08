const sqlite = require('sqlite-sync');

sqlite.connect('db.db');

const columns = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const columnsRu = ['ПОНЕДЕЛЬНИК', 'ВТОРНИК', 'СРЕДА', 'ЧЕТВЕРГ', 'ПЯТНИЦА', 'СУББОТА', 'ВОСКРЕСЕНЬЕ']

function InsertTask(user_id, addData, errorList) {
    let subject_id = GetSubjectId(addData[0], errorList)
    let task = addData[1]
    let date = addData[2]

    task_id = CountTasks(user_id) + 1

    // console.log(subject_id + '\n' + task + '\n' + date + '\n' + task_id)

    if (errorList.length != 0) return

    try {
        sqlite.run('INSERT INTO Task VALUES(' + task_id + ', ' + user_id + ', ' + subject_id + ', \''
            + task + '\', \'' + date + '\')')
    } catch (e) {
        errorList.push(e)
    }
}

function CountTasks(user_id) {
    return Number.parseInt(sqlite.run('SELECT COUNT (*) AS \'count\' FROM Task WHERE User_id = ' + user_id)[0].count)
}

function GetSubjectId(subject, errorList) {
    let subjFirstCapital = subject.toLowerCase()
    subjFirstCapital = subjFirstCapital.replace(subjFirstCapital[0], subjFirstCapital[0].toUpperCase())

    try {
        return sqlite.run('SELECT _id FROM Subject WHERE FullName = \'' + subject + '\' OR ShortName = \'' + subject + '\''
            + ' OR FullName = \'' + subjFirstCapital + '\' OR ShortName = \'' + subjFirstCapital + '\'')[0]._id
    } catch (e) {
        errorList.push(e)
    }
}

function GetAllTasks(user_id) {
    return (sqlite.run('SELECT T.Task_id AS №, S.FullName AS Предмет, T.Task AS Задача, T.Deadline AS До FROM Subject AS S '
        + 'INNER JOIN Task AS T ON '
        + 'S._id = T.Subject_id WHERE T.User_id = ' + user_id))
}

function ShowSubjects(user_id) {
    return sqlite.run('SELECT FullName AS \'Полное название\', ShortName AS \'Сокращенное название\' FROM Subject '
        + 'WHERE UserId = ' + user_id)
}

function EditSubject(addData, user_id, errorList) {
    let subject_id
    let taskShortName

    try {
        subject_id = addData[0]
        taskShortName = addData[1]
    } catch (e) {
        errorList.push('Проверьте правильность ввода.')
        return false
    }

    try {
        let obj = sqlite.run('SELECT * FROM Subject WHERE _id = ' + subject_id + ' AND UserId = ' + user_id)
        if (obj.length == 0) {
            errorList.push('Неверный номер предмета.')
            return false
        }
    } catch (e) {
        errorList.push(e)
        return false
    }


    if (taskShortName == '_') {
        try {
            sqlite.run('UPDATE Subject SET ShortName = NULL WHERE _id = ' + subject_id + ' AND UserId = ' + user_id)
            return true
        } catch (e) {
            errorList.push(e)
            return false
        }
    }

    if (IsShortNameAlreadyTaken(user_id, taskShortName)) {
        errorList.push('Такое сокращенное имя уже есть. Сокращенные имена должны отличаться.')
        return false
    }

    try {
        sqlite.run('UPDATE Subject SET ShortName = \'' + taskShortName + '\' WHERE _id = ' + subject_id + ' AND UserId = ' + user_id)
        return true
    } catch (e) {
        errorList.push(e)
        return false
    }
}

function GetAllSubjects(user_id) {
    return sqlite.run('SELECT _id AS \'Номер предмета\', FullName AS \'Полное название\', ShortName AS '
        + '\'Сокращенное название\' FROM Subject WHERE UserId = ' + user_id)
}

function DeleteTask(user_id, task_id) {

    sqlite.run('DELETE FROM Task WHERE User_id = ' + user_id + ' AND task_id = ' + task_id)
}

function InsertSubject(user_id, week, errorList) {
    let subjList = []
    for (let i = 0; i < Object.keys(week).length; i++) {
        for (let j = 0; j < Object.keys(week[Object.keys(week)[i]]).length; j++) {
            let subj = Object.values(Object.values(week[Object.keys(week)[i]])[j])[0]
            subj = subj.trim()
            if (subjList.includes(subj) == false) {
                try {
                    sqlite.run('INSERT INTO Subject VALUES((SELECT COUNT(_id) FROM Subject) + 1,'
                        + user_id + ', \'' + subj + '\', NULL)')
                } catch (e) {
                    errorList.push(e)
                }
            }
            subjList.push(subj)
        }
    }
}

function DeleteAllTasks(user_id) {
    sqlite.run('DELETE FROM Task WHERE User_id = ' + user_id)
}

function InsertSchedule(user_id, week, errorList) {

    if (IsScheduleAlreadyExists(user_id)) DeleteSchedule(user_id)

    InsertSubject(user_id, week, errorList)

    for (let i = 0; i < Object.keys(week).length; i++) {
        for (let j = 0; j < Object.keys(week[Object.keys(week)[i]]).length; j++) {

            let subj = Object.values(Object.values(week[Object.keys(week)[i]])[j])[0]
            subj = subj.trim()

            try {
                sqlite.run('INSERT INTO ' + Object.keys(week)[i] + ' VALUES('
                    + user_id + ', \'' + Object.keys((Object.values(week[Object.keys(week)[i]])[j]))[0]
                    + '\', (SELECT _id FROM Subject WHERE FullName = \''
                    + subj + '\' OR ShortName = \'' + subj + '\'))')
            } catch (e) {
                errorList.push(e)
            }
        }
    }

}

function IsScheduleAlreadyExists(user_id) {

    let rowsCounter = 0;
    for (let i = 0; i < columns.length; i++) {
        rowsCounter += Number.parseInt(Object.values(sqlite.run('SELECT COUNT (User_id) FROM e' + columns[i]
            + ' WHERE User_id = ' + user_id)[0]))
        rowsCounter += Number.parseInt(Object.values(sqlite.run('SELECT COUNT (User_id) FROM o' + columns[i]
            + ' WHERE User_id = ' + user_id)[0]))
    } // EVEN(e) AND ODD(o) DAYS OF WEEK

    if (rowsCounter == 0) return false
    return true
}

function DeleteSchedule(user_id) {
    for (let i = 0; i < columns.length; i++) {
        sqlite.run('DELETE FROM e' + columns[i] + ' WHERE User_id = ' + user_id)
        sqlite.run('DELETE FROM o' + columns[i] + ' WHERE User_id = ' + user_id)
    }

    sqlite.run('DELETE FROM Subject WHERE UserId = ' + user_id)
}

function ShowSchedule(user_id) {

    if (IsScheduleAlreadyExists(user_id) == false) return 'У Вас еще нет расписания.'

    let obj = {}
    let objCounter = 0

    let reply = ''
    let evenDays = ''
    let oddDays = ''

    for (let i = 0; i < columns.length; i++) {
        obj[objCounter] = (Object.values((sqlite.run('SELECT Time AS Время, FullName AS Предмет FROM e' + columns[i] + ' AS day '
            + 'INNER JOIN Subject AS s ON day.Subject_id = s._id '
            + 'WHERE day.User_id = ' + user_id))))
        obj[objCounter + 1] = (Object.values((sqlite.run('SELECT Time AS Время, FullName AS Предмет FROM o' + columns[i] + ' AS day '
            + 'INNER JOIN Subject AS s ON day.Subject_id = s._id '
            + 'WHERE day.User_id = ' + user_id))))
        objCounter += 2
    }

    for (let i = 0; i < Object.keys(obj).length; i++) {

        if (i % 2 == 0 & Object.keys(obj[i]).length != 0) {
            evenDays += '\nЧЕТ. ' + columnsRu[Math.floor(i / 2)] + ':\n'
        } else if (i % 2 != 0 & Object.keys(obj[i]).length != 0) {
            oddDays += '\nНЕЧЕТ. ' + columnsRu[Math.floor(i / 2)] + ':\n'
        }

        for (let j = 0; j < Object.keys(Object.values(obj[i])).length; j++) {
            if (i % 2 == 0) {
                evenDays += (Object.values(Object.values(obj[i])[j])[0] + ': ' + Object.values(Object.values(obj[i])[j])[1] + '\n')
            } else {
                oddDays += (Object.values(Object.values(obj[i])[j])[0] + ': ' + Object.values(Object.values(obj[i])[j])[1] + '\n')
            }
        }
    }

    reply = evenDays + oddDays

    return reply

}

function IsShortNameAlreadyTaken(user_id, shortName) {
    let shortNameObj = sqlite.run('SELECT ShortName FROM Subject WHERE UserId = ' + user_id
        + ' AND ShortName = \'' + shortName + '\'')

    if (shortNameObj.length != 0) return true

    return false
}

module.exports = {
    InsertTask, GetSubjectId, GetAllTasks, DeleteTask, InsertSchedule, IsScheduleAlreadyExists, ShowSchedule, EditSubject,
    GetAllSubjects, ShowSubjects, CountTasks, DeleteAllTasks
}