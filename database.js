const parserModule = require('./messageParser')
const sqlite = require('sqlite-sync');

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
                errorList[0].insertError = e
                errorList[0].wasErrors = true
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

function GetSubjectId(subject, addData, errorList) {

    for (let i = 0; i < subject.length; i++) {
        if (subject[i] == '-') {
            subject = subject.slice(0, i - 1).trim()
            break;
        }
    }

    try {
        return sqlite.run('SELECT _id FROM Subject WHERE FullName = \'' + subject + '\' OR ShortName = \'' + subject + '\'')[0]._id
    } catch (e) {
        errorList[0].idSelectError = e
        errorList[0].wasErrors = true
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

module.exports = { AddStuff, GetSubjectId, GetAllTasks, DeleteTask }