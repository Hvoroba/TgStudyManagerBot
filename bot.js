const { Telegraf } = require('telegraf');
const fs = require('fs')
const Axios = require('axios');
const Path = require('path')
const needle = require('needle');

const dbModule = require('./database')
const excelParser = require('./excelParser');
const { ShowSchedule } = require('./database');

const tokenTg = fs.readFileSync('tg_token.txt', 'utf8')

const bot = new Telegraf(tokenTg)

bot.startPolling();

bot.start((ctx) => ctx.reply('Привет! Чтобы начать отслеживать свои текущие задачи, пожалуйста, укажите актуальное расписание: /schedule_add'))

bot.help((ctx) => ctx.reply('Send me a sticker'))

bot.on('sticker', (ctx) => ctx.reply('Нормально'))

bot.hears('hi', (ctx) => ctx.reply('Прнвт'))

//Удаление задачи
let deleteMode = new Boolean(false)
let totalTasks;
bot.command('task_delete', (ctx) => {
    deleteMode = true
    ctx.reply('Выбирете номер нужной задачи:\n\n' + ReplyWithAllTasks(ctx.chat.id))
})

//Просмотр актуальных задач
bot.command('task_show', (ctx) => {
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
const addData = {}
let errorList = []
bot.command('task_add', (ctx) => {
    ctx.reply('Чтобы добавить задачу введите сообщение в следующем формате: \n'
        + 'Предмет - задание - дедлайн(dd.mm.yyyy)\n'
        + 'Для того, чтобы задание записалось до следующей ближайшей пары, то оставь поле дедлайна пустым')
    taskAddMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'task' }
})

//Добавление предметов
subjectAddMode = new Boolean(false)
bot.command('subject_add', (ctx) => {
    ctx.reply('Чтобы добавить предметы к уже существующим введи список новых предметов через запятую:\n'
        + 'Премет1, предмет2, предмет 3')

    subjectAddMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'subject', subjectId: null, task: null, deadline: null }
})

//Добавление короткого названия предмета
let subjectEditMode = new Boolean(false)
bot.command('subject_edit', (ctx) => {
    ctx.reply('Для добавления короткого названия предмета выбирете номер предмета из списка и напишите нужное сокращенное название'
        + ' в следующем формате:\n2 - ИПС\nСписок предметов:\n\n' + ReplyWithAllSubjects(ctx.chat.id))
})

//Добавление расписания
let scheduleAddMode = new Boolean(false)
bot.command('schedule_add', (ctx) => {
    ctx.reply('Чтобы добавить расписание отправь мне excel файл формата:\n')
    ctx.replyWithPhoto({ source: 'sampleExcel.png' })

    scheduleAddMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'schedule' }
})

bot.on('document', async (ctx) => {
    //ДОБАВЛЕНИЕ РАСПИСАНИЯ
    if (scheduleAddMode == true) {

        const { file_id: fileId } = ctx.update.message.document;
        const fileUrl = await ctx.telegram.getFileLink(fileId);


        var out = fs.createWriteStream('schedule.xlsx');
        needle.get(fileUrl).pipe(out).on('finish', function () {


            dbModule.InsertSchedule(ctx.chat.id, excelParser.GetExcelData(), errorList)
            ctx.reply('Расписание добавлено')

        });

        scheduleAddMode = false
    }

})

//Отобразить расписание
bot.command('schedule_show', (ctx) => ctx.reply(ShowSchedule(ctx.chat.id)))

//Отмена
bot.command('cancel', (ctx) => {
    ctx.reply('Отмена')
    taskAddMode = false
    scheduleAddMode = false
    subjectAddMode = false

    delete addData[0]
    errorList = []
})

bot.on('message', (msg) => {
    // ДОБАВЛЕНИЕ ЗАДАЧИ
    if (taskAddMode & msg.message.text != '/cancel') {

        addData[0].subjectId = dbModule.GetSubjectId(msg.message.text, errorList)

        if (errorList.length == 0) {
            dbModule.AddStuff(msg.message.text, addData, errorList)
        }

        if (errorList.length == 0) {
            msg.reply('Объекты успешно добавлены\nВыход из режима добавления')
        } else {
            msg.reply(MakeErrorReport())
        }
        taskAddMode = false
        delete addData[0]
    }
    //УДАЛЕНИЕ
    if (deleteMode & msg.message.text != '/cancel') {
        let numb = parseInt(msg.message.text, 10)
        if (numb > 1 & numb <= totalTasks) {
            dbModule.DeleteTask(msg.chat.id, totalTasks)
            msg.reply('Задача удалена\n' + ReplyWithAllTasks(msg.chat.id) + '\n'
                + 'Выход из режима удаления')
        } else {
            msg.reply('Неверно выбран номер задачи\nВыход из реждима удаления')
        }

        deleteMode = false
    }
    //ДОБАВЛЕНИЕ РАСПИСАНИЯ
    if (scheduleAddMode & msg.message.text != '/cancel') {
        if (dbModule.IfScheduleAlreadyExists(ctx.chat.id) != 0) {
            ctx.reply('У Вас уже есть расписание. При отправке документа расписание будет перезаписано.\n'
                + '/cancel для отмены.')
        }
    }
    //РЕДАКТИРОВАНИЕ ПРЕДМЕТОВ
    if (subjectEditMode & msg.message.text != '/cancel') {
        if (dbModule.EditSubject(msg.message.text, errorList)) {
            msg.reply('Предмет обновлен. /show_subject для просмотра предметов.')
            subjectEditMode = false
        } else msg.reply(MakeErrorReport())
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

    if (Object.keys(replyMsgObj).length == 0) {
        ctx.reply('У Вас нет активных задач.')
        return;
    }

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

    if (Object.keys(replyMsgObj).length == 0) {
        return 'Вы еще не добавили расписание.'
    }

    subjectEditMode = true

    let relplyMsgStr = ''

    totalSubjects = Object.keys(replyMsgObj).length
    for (let i = 0; i < totalSubjects; i++) {
        let myJSON = JSON.stringify(replyMsgObj[i])

        relplyMsgStr += myJSON + '\n\n'
    }

    return relplyMsgStr.replace(/"|{|}|[|]/g, '').replace(/,/g, '\n').replace(/:/g, ': ')
}

bot.launch()