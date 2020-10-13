const { Telegraf } = require('telegraf');
const fs = require('fs')
const Axios = require('axios');
const Path = require('path')
const needle = require('needle');
const CronJob = require('cron').CronJob

const dbModule = require('./database')
const messageParser = require('./messageParser')
const excelParser = require('./excelParser')
const reminder = require('./reminder')

const tokenTg = fs.readFileSync('tg_token.txt', 'utf8')

const bot = new Telegraf(tokenTg)

bot.startPolling();

bot.start((ctx) => ctx.reply('Привет! Чтобы начать отслеживать свои текущие задачи, пожалуйста, укажите актуальное расписание: /schedule_add'))

let job = new CronJob('* */24 * * * *', function () {
    console.log(reminder.GetExpiringDeadlines()) //TODO: parse this to more readable view
}, null, true, 'Europe/Moscow')
job.start()

//Удаление задачи
let deleteMode = new Boolean(false)
let totalTasks;
bot.command('task_delete', (ctx) => {
    if (dbModule.CountTasks(ctx.chat.id) == 0) {
        ctx.reply('У Вас нет активных задач. Добавить задачу /task_add')
        return
    }

    deleteMode = true
    ctx.reply('Выбирете номер нужной задачи:\n\n' + ReplyWithAllTasks(ctx.chat.id))
})

//Удаление всех задач
let deleteAllMode = new Boolean(false)
bot.command('task_delete_all', (ctx) => {
    ctx.reply('Данная команда удалит все Ваши задачи. Вы уверены?\n'
        + 'Да для продолжения /cancel для отмены.')
    deleteAllMode = true
})

//Просмотр актуальных задач
bot.command('task_show', (ctx) => {
    if (dbModule.CountTasks(ctx.chat.id) == 0) {
        ctx.reply('У Вас нет активных задач. Добавить задачу /task_add')
        return
    }

    ctx.reply(ReplyWithAllTasks(ctx.chat.id))
})

//Просмотр предметов
bot.command('subject_show', (ctx) => {
    let textObj = dbModule.ShowSubjects(ctx.chat.id)

    if (textObj.length == 0) {
        ctx.reply('Вы еще не добавили расписание.')
        return
    }

    let text = ''

    for (let i = 0; i < Object.keys(textObj).length; i++) {
        for (let j = 0; j < Object.keys(Object.values(textObj[i])).length; j++) {
            text += Object.keys(textObj[i])[j] + ': ' + Object.values(textObj[i])[j] + '\n'
        }
        text += '\n'
    }

    text = text.replace(/NULL/gi, '—')

    ctx.reply(text.trim())
})

//Добавление задачи
let taskAddMode = new Boolean(false)
let errorList = []
bot.command('task_add', (ctx) => {
    if (dbModule.IsScheduleAlreadyExists(ctx.chat.id) == false) {
        ctx.reply('Сперва добавьте расписание.\n/schedule_add')
        return
    }
    ctx.reply('Чтобы добавить задачу введите сообщение в следующем формате: \n'
        + 'ИПС : сдать отчет : 20.09.2020\n\n'
        + 'Для записи задания на ближайшую пару оставь поле дедлайна пустым:\n'
        + 'ИПС : сдать отчет\n\n'
        + 'Для бессрочной записи:\nИПС : сдать отчет : БС')
    taskAddMode = true
})

//Добавление короткого названия предмета
let subjectEditMode = new Boolean(false)
bot.command('subject_edit', (ctx) => {
    ctx.reply('Для добавления сокращенного названия предмета выбирете номер предмета из списка и напишите нужное сокращенное название'
        + ' в следующем формате:\n2 : ИПС\nСписок предметов:\n'
        + 'Для удаления сокращенного название оставьте прочерк на месте названия:\n'
        + '2 : _\n\n' + ReplyWithAllSubjects(ctx.chat.id))
})

//Добавление расписания
let scheduleAddMode = new Boolean(false)
bot.command('schedule_add', (ctx) => {
    if (dbModule.IsScheduleAlreadyExists(ctx.chat.id) == true) {
        ctx.reply('Внимание! У Вас уже есть расписание. При отправке документа расписание будет перезаписано.\n'
            + '/cancel для отмены.')
    }
    ctx.replyWithDocument({ source: 'scheduleForm.xlsx' }, { caption: 'Чтобы добавить расписание отправь мне заполненный excel файл.' })

    scheduleAddMode = true
})
bot.on('document', async (ctx) => {
    //ДОБАВЛЕНИЕ РАСПИСАНИЯ
    if (scheduleAddMode == true) {
        const { file_id: fileId } = ctx.update.message.document;
        const fileUrl = await ctx.telegram.getFileLink(fileId);

        if (IsExcelFile(fileUrl) == false) {
            ctx.reply('Неверный формат файла. Только excel документы. Попробуйте еще раз.')
            return
        }

        var out = fs.createWriteStream('schedule.xlsx');
        needle.get(fileUrl).pipe(out).on('finish', function () {
            dbModule.InsertSchedule(ctx.chat.id, excelParser.GetExcelData(), errorList)
            ctx.reply('Расписание добавлено. /schedule_show для просмотра расписания.')

        });

        scheduleAddMode = false
    }
})

//Отобразить расписание
bot.command('schedule_show', (ctx) => ctx.reply(dbModule.ShowSchedule(ctx.chat.id)))

//Отмена
bot.command('cancel', (ctx) => {
    ctx.reply('Отмена')
    taskAddMode = false
    scheduleAddMode = false
    subjectAddMode = false
    subjectEditMode = false
    deleteMode = false
    deleteAllMode = false

    errorList = []
})

bot.on('message', (msg) => {
    // ДОБАВЛЕНИЕ ЗАДАЧИ
    if (taskAddMode & msg.message.text != '/cancel') {
        let addData = messageParser.ParseTaskAddingMessage(msg.message.text, errorList)
        if (errorList.length == 0) {
            if (addData.length == 2) {
                numberOfDaysWithSubject = dbModule.GetAllDaysWithSubject(addData[0], msg.chat.id)
                addData.push(messageParser.GetNextSubjectDate(numberOfDaysWithSubject))
            }

            dbModule.InsertTask(msg.chat.id, addData, errorList)
        }

        if (errorList.length == 0) {
            msg.reply('Объекты успешно добавлены.')
            taskAddMode = false
        } else {
            msg.reply(MakeErrorReport())
        }
    }

    //УДАЛЕНИЕ
    if (deleteMode & msg.message.text != '/cancel') {
        let numb = parseInt(msg.message.text, 10)
        if (numb >= 1 & numb <= totalTasks) {
            dbModule.DeleteTask(msg.chat.id, numb)
            msg.reply('Задача удалена\n' + ReplyWithAllTasks(msg.chat.id)
                + '\n\n/cancel для выхода из режима удаления.')
        } else {
            msg.reply('Неверно выбран номер задачи. Попробуйте еще раз.')
        }
    }

    //РЕДАКТИРОВАНИЕ ПРЕДМЕТОВ
    if (subjectEditMode & msg.message.text != '/cancel') {
        let addData = messageParser.ParseSubjectEditMessage(msg.message.text)
        if (dbModule.EditSubject(addData, msg.chat.id, errorList)) {
            msg.reply('Предмет обновлен. /subject_show для просмотра предметов.')
            subjectEditMode = false
        } else msg.reply(MakeErrorReport())
    }

    if (deleteAllMode & msg.message.text != '/cancel') {
        if (msg.message.text.trim().toLowerCase() != 'да' & msg.message.text.trim().toLowerCase() != 'д') {
            msg.reply('Ответ непонятен. Да для подтверждения /cancel для отмены.')
            return
        }

        dbModule.DeleteAllTasks(msg.chat.id)
        msg.reply('Задачи успешно удалены. Добавить задачу /task_add')
        deleteAllMode = false
    }
})

function MakeErrorReport() {
    let errorMessage = 'При выполнении комманды произошла ошибка: '

    for (let i = 0; i < errorList.length; i++) {
        errorMessage += '\n' + errorList[i] + '\n'
    }
    errorMessage += '\nПопробуйте еще раз'

    errorList = []

    return errorMessage;
}

function ReplyWithAllTasks(chatId) {
    let replyMsgObj = dbModule.GetAllTasks(chatId)

    let relplyMsgStr = ''

    totalTasks = Object.keys(replyMsgObj).length
    for (let i = 0; i < totalTasks; i++) {
        let myJSON = JSON.stringify(replyMsgObj[i])

        relplyMsgStr += myJSON + '\n\n'
    }

    return relplyMsgStr.replace(/"|{|}|[|]/g, '').replace(/,/g, '\n').replace(/:/g, ': ')
}

function ReplyWithAllSubjects(chatId) {
    let replyMsgObj = dbModule.GetAllSubjects(chatId)

    subjectEditMode = true

    let relplyMsgStr = ''

    totalSubjects = Object.keys(replyMsgObj).length
    for (let i = 0; i < totalSubjects; i++) {
        let myJSON = JSON.stringify(replyMsgObj[i])

        relplyMsgStr += myJSON + '\n\n'
    }

    return relplyMsgStr.replace(/"|{|}|[|]/g, '').replace(/,/g, '\n').replace(/:/g, ': ').replace(/NULL/gi, '—')
}

function IsExcelFile(fileUrl) {
    let excelFormats = ['.xlsx', '.xlsm', '.xltm']
    if (fileUrl.length <= 5) return false

    let format = fileUrl.slice(fileUrl.length - 5, fileUrl.length)

    for (let i = 0; i < excelFormats.length; i++) {
        if (format == excelFormats[i]) return true
    }

    return false
}

bot.launch()