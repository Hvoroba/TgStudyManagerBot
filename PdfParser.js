const pdfparse = require('pdf-parse');
const fs = require('fs');
const { group } = require('console');

const pdfFile = fs.readFileSync('3_kurs_4_f-t.pdf')

const parsedPdf = pdfparse(pdfFile)

function GetSchedule(group) {
    parsedPdf.then(function (data) {
        ParseText(data.text, group)

    }).catch(function (error) {
        console.error(error);
    })
}

function ParseText(text, group) {
    let firstIndex = text.search(group)

    text = text.slice(firstIndex, text.length - 1)

    let reg = /ПОНЕДЕЛЬНИК|ВТОРНИК|СРЕДА|ЧЕТВЕРГ|ПЯТНИЦА/gi
    text = text.replace(reg, '')

    text = text.replace(new RegExp(group, 'g'), '')
    text = text.replace(new RegExp(group - 1, 'g'), '')
    text = text.replace(new RegExp(group + 1, 'g'), '')

    let columnsCount = CountColumns(text, group)

    fs.writeFile('sample.txt', text, function (err) {
        if (err) return console.log(err);
    })
}

function CountColumns(text, group) {
    let firstIndex = null
    let secondIndex = null

    for (let i = 0; i < text.length; i++) {

        if (firstIndex != null & secondIndex != null) break;

        if (IsParagraphBorder(text, i, group)) {
            if (firstIndex != null & secondIndex == null) secondIndex = i
            if (firstIndex == null) firstIndex = i
        }
    }

    let paragraph = text.slice(firstIndex, secondIndex-1)

    //
    //paragraph = text.slice(secondIndex, secondIndex+187)
    //
    paragraph = paragraph.split(' ').join('')
    
    let lbCounter = 0;
    for (let i = 0; i < paragraph.length - 1; i++) {
        if (paragraph[i] == '\n'/* & paragraph[i + 1] == '\n'*/) lbCounter++, console.log(i)
    }

    console.log('PARAGRAPH START')
    console.log(paragraph + '\n\n' + lbCounter)
    console.log('PARAGRAPH END')
}

function IsParagraphBorder(text, i, group) {

    if (!isNaN(parseInt(text[i])) & !isNaN(parseInt(text[i + 1])) & !isNaN(parseInt(text[i + 3])) & !isNaN(parseInt(text[i + 4]))
        & !isNaN(parseInt(text[i + 6])) & !isNaN(parseInt(text[i + 7])) & !isNaN(parseInt(text[i + 9])) & !isNaN(parseInt(text[i + 10]))) {

        return true
    }

    return false
}

module.exports = { GetSchedule }