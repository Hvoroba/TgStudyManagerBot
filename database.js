const parserModule = require('./messageParser')
const sqlite = require('sqlite-sync');
const { con } = require('sqlite-sync');

sqlite.connect('db.db');

function AddStuff(text, addData, errorList) {
    switch (addData[0].adding) {
        case 'task':
            parserModule.ParseTaskAddingMessage(text, addData, errorList)
            try {
                sqlite.run('INSERT INTO task VALUES('
                    + addData[0].chatId + ', '
                    + addData[0].subjectId + ', \''
                    + addData[0].task + '\', \''
                    + addData[0].deadline + '\')')
            } catch (e) {
                errorList.push(e)
            }
            break;
        case 'subject':

            break;
        case 'schedule':

            break;
        default:
            return;
    }
}

function GetSubjectId(subject, errorList) {

    for (let i = 0; i < subject.length; i++) {
        if (subject[i] == '-') {
            subject = subject.slice(0, i - 1).trim()
            break;
        }
    }

    try {
        return sqlite.run('SELECT _id FROM Subject WHERE FullName = \'' + subject + '\' OR ShortName = \'' + subject + '\'')[0]._id
    } catch (e) {
        errorList.push(e)

    }
}

function GetAllTasks(user_id) {
    return (sqlite.run('SELECT T.Task_id AS №, S.FullName AS Предмет, T.Task AS Задача, T.Deadline AS До FROM Subject AS S '
        + 'INNER JOIN Task AS T ON '
        + 'S._id = T.Subject_id WHERE T.User_id = ' + user_id))
}

function DeleteTask(user_id, task_id) {

    sqlite.run('DELETE FROM Task WHERE User_id = ' + user_id + ' AND task_id = ' + task_id)
}

function InsertSchedule(user_id, week, errorList) {

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

function IfScheduleAlreadyExists(user_id) {
    let columns = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    let rowsCounter = 0;
    for (let i = 0; i < columns.length; i++) {
        rowsCounter += Number.parseInt(Object.values(sqlite.run('SELECT COUNT (User_id) FROM e' + columns[i]
            + ' WHERE User_id = ' + user_id)[0]))
    } // EVEN AND ODD DAYS OF WEEK
    for (let i = 0; i < columns.length; i++) {
        rowsCounter += Number.parseInt(Object.values(sqlite.run('SELECT COUNT (User_id) FROM o' + columns[i]
            + ' WHERE User_id = ' + user_id)[0]))
    }

    return rowsCounter
}

module.exports = { AddStuff, GetSubjectId, GetAllTasks, DeleteTask, InsertSchedule, IfScheduleAlreadyExists }