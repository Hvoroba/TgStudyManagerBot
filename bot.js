const { Telegraf } = require('telegraf');
const pdfparse = require('pdf-parse');
const fs = require('fs')

const dbModule = require('./database')
const PdfModule = require('./PdfParser')

const tokenTg = fs.readFileSync('tg_token.txt', 'utf8')

const bot = new Telegraf(tokenTg)


//
PdfModule.GetSchedule(485)
//

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

//Добавление задачи
let addMode = new Boolean(false)
const addData = {}
const errorList = {}
errorList[0] = { idSelectError: null, insertError: null, dateError: null, wasErrors: false }
bot.command('task_add', (ctx) => {
    ctx.reply('Чтобы добавить задачу введите сообщение в следующем формате: \n'
        + 'Предмет - задание - дедлайн(dd.mm.yyyy)\n'
        + 'Для того, чтобы задание записалось до следующей ближайшей пары, то оставь поле дедлайна пустым')
    addMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'task' }
})

//Добавление предметов
bot.command('subject_add', (ctx) => {
    ctx.reply('Чтобы добавить предметы к уже существующим введи список новых предметов через запятую:\n'
        + 'Премет1, предмет2, предмет 3')

    addMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'subject', subjectId: null, task: null, deadline: null }
})

//Добавление расписания
bot.command('schedule_add', (ctx) => {
    ctx.reply('Чтобы добавить расписание отправь мне excel файл формата:\n'
        + 'ВСТАВИТЬ КАРТИНКУ')

    addMode = true
    addData[0] = { chatId: ctx.chat.id, adding: 'schedule' }
})

//Отмена
bot.command('cancel', (ctx) => {
    ctx.reply('Отмена')
    addMode = false
    delete addData[0]
})

bot.on('message', (msg) => {
    // ДОБАВЛЕНИЕ
    if (addMode & msg.message.text != '/cancel') {

        addData[0].subjectId = dbModule.GetSubjectId(msg.message.text, addData, errorList)

        if (errorList[0].wasErrors == false) {
            dbModule.AddStuff(msg.message.text, addData, errorList)
        }

        if (errorList[0].wasErrors == false) {
            msg.reply('Объекты успешно добавлены\nВыход из режима добавления')
        } else {
            msg.reply(MakeErrorReport())
        }
        addMode = false
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
})

function MakeErrorReport() {
    let errorMessage = 'При выполнении комманды произошла ошибка: '
    if (errorList[0].idSelectError != null) {
        errorMessage += errorList[0].idSelectError + ' — попытка использования несуществующего предмета; '
    }
    if (errorList[0].insertError != null) {
        errorMessage += errorList[0].insertError + ' — неверный формат записи; '
    }
    if (errorList[0].dateError != null) {
        errorMessage += errorList[0].dateError + '; '
    }
    errorMessage += '\nПопробуйте еще раз'

    errorList[0].idSelectError = null
    errorList[0].insertError = null
    errorList[0].dateError = null
    errorList[0].wasErrors = false

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

function DoPdfStuff() {
    const pdfFile = fs.readFileSync('3_kurs_4_f-t.pdf')

    pdfparse(pdfFile).then(function (data) {
        console.log(data.info)
    })
}

bot.launch()