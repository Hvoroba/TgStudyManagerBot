const { Telegraf } = require('telegraf');
const fs = require('fs')
const Axios = require('axios');
const Path = require('path')
const needle = require('needle');
const CronJob = require('cron').CronJob

const dbModule = require('./database')
const messageParser = require('./messageParser')
const excelParser = require('./excelParser')
const reminder = require('./reminder');
const { debug } = require('console');

const tokenTg = fs.readFileSync('tg_token.txt', 'utf8')

const bot = new Telegraf(tokenTg)
const InlineKeyboardCancelBtn = [{ text: 'Отмена', callback_data: 'cancel' }]

bot.startPolling();

bot.start((ctx) => ctx.reply('Привет! Чтобы начать отслеживать свои текущие задачи, пожалуйста, укажите актуальное расписание: /schedule_add\n'
    + 'Для настройки уведомлений /setup_options'))

/*
1* Seconds: 0-59
2* Minutes: 0-59
3* Hours: 0-23
4* Day of Month: 1-31
5* Months: 0-11 (Jan-Dec)
6* Day of Week: 0-6 (Sun-Sat)
*/

//Уведомление о дедлайнах
let job = new CronJob('* * */24 * * *', function () {
    if (reminder.GetExpiringDeadlines() != false) {
        let dataToSend = reminder.GetExpiringDeadlines()
        let tasksArr

        for (let i = 0; i < Object.keys(dataToSend).length; i++) {
            for (let j = 0; j < dataToSend[i].deadlinesList.length; j++) {
                tasksArr = dbModule.GetTasksArray(dataToSend[i].userId, dataToSend[i].deadlinesList[j])
                let message = 'Задачи на ' + dataToSend[i].deadlinesList[j] + ':\n'
                for (let k = 0; k < tasksArr.length; k++) {
                    message += '\n' + tasksArr[k]
                }
                bot.telegram.sendMessage(dataToSend[i].userId, message)
            }
        }
    }
}, null, true, 'Europe/Moscow')
job.start()


//Удаление задачи
let totalTasks;
bot.command('task_delete', (ctx) => {
    if (dbModule.CountTasks(ctx.chat.id) == 0) {
        ctx.reply('У Вас нет активных задач. Добавить задачу /task_add')
        return
    }

    let keyboard = []
    let allTasksObj = dbModule.GetAllTasks(ctx.chat.id)

    for (let i = 0; i < Object.keys(allTasksObj).length; i++) {
        keyboard.push([{ text: Object.values(allTasksObj[i])[0], callback_data: 'TaskToDeleteId' + Object.values(allTasksObj[i])[0] }])
    }
    keyboard.push(InlineKeyboardCancelBtn)

    ctx.reply('Выберите номер нужной задачи:\n\n' + ReplyWithAllTasks(ctx.chat.id), {
        reply_markup: { inline_keyboard: keyboard }
    })
})

bot.action(/TaskToDeleteId(.+)/, (ctx) => {
    let task_id = ctx.update.callback_query.data.replace('TaskToDeleteId', '')
    dbModule.DeleteTask(ctx.chat.id, task_id)

    let keyboard = []
    let allTasksObj = dbModule.GetAllTasks(ctx.chat.id)

    for (let i = 0; i < Object.keys(allTasksObj).length; i++) {
        keyboard.push([{ text: Object.values(allTasksObj[i])[0], callback_data: 'TaskToDeleteId' + Object.values(allTasksObj[i])[0] }])
    }

    keyboard.push(InlineKeyboardCancelBtn)

    ctx.reply('Задача удалена. Для удаления ещё одной задачи выберите её номер. /cancel для отмены\n'
        + ReplyWithAllTasks(ctx.chat.id), { reply_markup: { inline_keyboard: keyboard } })
})


//Настройка уведомлений
bot.command('setup_options', (ctx) => {
    setupMode = true

    ctx.reply('За сколько дней Вы бы хотели получать уведмоления о дедлайне?', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'За день', callback_data: 'SetOptions1' }, { text: 'За три дня', callback_data: 'SetOptions3' }, { text: 'За неделю', callback_data: 'SetOptions7' }],
                [{ text: 'За день и за три дня', callback_data: 'SetOptions13' }, { text: 'За день и за неделю', callback_data: 'SetOptions17' }],
                [{ text: 'За три дня и за неделю', callback_data: 'SetOptions37' }],
                [{ text: 'За день, за три дня и за неделю', callback_data: 'SetOptions137' }],
                InlineKeyboardCancelBtn
            ]
        }
    })
})

bot.action(/SetOptions(.+)/, (ctx) => {
    ctx.deleteMessage()

    let daysBeforeDeadline = ctx.update.callback_query.data.replace('SetOptions', '')

    dbModule.InsertOptions(ctx.chat.id, daysBeforeDeadline)

    ctx.reply('Настройки обновлены.')
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
let deadlineAddMode = new Boolean(false)
let errorList = []
bot.command('task_add', (ctx) => {
    if (dbModule.IsScheduleAlreadyExists(ctx.chat.id) == false) {
        ctx.reply('Сперва добавьте расписание.\n/schedule_add')
        return
    }

    let textObj = dbModule.ShowSubjects(ctx.chat.id)
    let keyboard = []

    for (let i = 0; i < Object.keys(textObj).length; i++) {
        let subjectId = dbModule.GetSubjectId(Object.values(textObj[i])[0], errorList) + ''
        if (Object.values(textObj[i])[0] != '—' & Object.values(textObj[i])[0] != '-' & Object.values(textObj[i])[0] != '_') {
            keyboard.push([{ text: Object.values(textObj[i])[0], callback_data: 'Task_add' + subjectId }])
        }
    }
    keyboard.push(InlineKeyboardCancelBtn)

    ctx.reply('Выберите предмет по которому появилось задание:', {
        reply_markup: { inline_keyboard: keyboard }
    })
})

let taskToAdd
let taskAddingSubjectId
let taskAddingDeadline
bot.action(/Task_add(.+)/, (ctx) => {
    ctx.deleteMessage()
    taskAddingSubjectId = ctx.update.callback_query.data.replace('Task_add', '')
    ctx.reply('Введите появившееся задание.')
    taskAddMode = true
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
        dbModule.SetOptions(ctx.chat.id)
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
    ctx.reply('Отмена.')
    ResetAllModes()

    errorList = []
})

bot.action(/cancel/, (ctx) => {
    ctx.deleteMessage()
    ctx.reply('Отмена.')
    ResetAllModes()

    errorList = []
})


//Обработка сообщения
bot.on('message', (msg) => {
    // ДОБАВЛЕНИЕ ЗАДАЧИ
    if (taskAddMode & msg.message.text != '/cancel') {
        taskToAdd = msg.message.text
        msg.reply('Выберите подходящий способ ввода дедлайна:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'Бессрочный дедлайн', callback_data: 'DeadlineAddEndless' }],
                    [{ text: 'К ближайшей паре', callback_data: 'DeadlineAddClosest' }],
                    [{ text: 'Ввод вручную', callback_data: 'ManualDeadlineAdd' }],
                    InlineKeyboardCancelBtn
                ]
            }
        })
    }
    //Добавление дедлайна при ручном способе добавления задачи
    if (deadlineAddMode & msg.message.text != '/cancel') {
        if (DateIsValid(msg.message.text)) {
            taskAddingDeadline = msg.message.text
            dbModule.InsertTask(msg.chat.id, taskToAdd, taskAddingSubjectId, taskAddingDeadline, errorList)
            if (errorList.length == 0) {
                msg.reply('Новая задача успешно добавлена.')
                deadlineAddMode = false
                return
            }

            msg.reply(MakeErrorReport())
        }
    }


    //ОЧИСТКА ЗАДАЧ
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

bot.action(/DeadlineAdd(.+)/, (ctx) => {
    ctx.deleteMessage()
    let deadlineAddingOption = ctx.update.callback_query.data.replace('DeadlineAdd', '')

    switch (deadlineAddingOption) {
        case 'Endless':
            taskAddingDeadline = 'Бессрочное задание'
            break;
        case 'Closest':
            numberOfDaysWithSubject = dbModule.GetAllDaysWithSubject(taskAddingSubjectId, ctx.chat.id)
            taskAddingDeadline = messageParser.GetNextSubjectDate(numberOfDaysWithSubject)
            break;
        default:
            break
    }

    dbModule.InsertTask(ctx.chat.id, taskToAdd, taskAddingSubjectId, taskAddingDeadline, errorList)

    taskAddMode = false
    if (errorList.length != 0) {
        ctx.reply(MakeErrorReport())
        return
    }

    ctx.reply('Новая задача успешно добавлена.')
})

bot.action(/ManualDeadlineAdd/, (ctx) => {
    ctx.deleteMessage()
    ctx.reply('Введите дедлайн в формате dd.mm.yyyy:')
    taskAddMode = false
    deadlineAddMode = true
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

function IsExcelFile(fileUrl) {
    let excelFormats = ['.xlsx', '.xlsm', '.xltm']
    if (fileUrl.length <= 5) return false

    let format = fileUrl.slice(fileUrl.length - 5, fileUrl.length)

    for (let i = 0; i < excelFormats.length; i++) {
        if (format == excelFormats[i]) return true
    }

    return false
}

function ResetAllModes() {
    taskAddMode = false
    scheduleAddMode = false
    subjectAddMode = false
    deleteAllMode = false
    deadlineAddMode = false
}

bot.launch()