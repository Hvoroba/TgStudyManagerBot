const pdfparse = require('pdf-parse');
const fs = require('fs');

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

    text.replace('ПОНЕДЕЛЬНИК' | 'ВТОРНИК' | 'СРЕДА' | 'ЧЕТВЕРГ' | 'ПЯТНИЦА', '')

    fs.writeFile('sample.txt', text, function (err) {
        if (err) return console.log(err);
    })
}

module.exports = { GetSchedule }