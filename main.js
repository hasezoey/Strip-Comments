#! /usr/bin/env node

/*
This module is used to convert js code
to js code without Comments
usage: `strip_comments input.js output.js`
*/
const strip = require('./strip');
const fs = require('fs');
const path = require('path');

var args = process.argv.slice(2);

function error(err) {
    console.error(err);
    process.exit(-1);
}
if (typeof args[0] != 'string' || args[0].trim().length <= 0) error(`Args[0] is not a string or does not contain anything!`);
if (typeof args[1] != 'string' || args[1].trim().length <= 0) error(`Args[1] is not a string or does not contain anything!`);

if (fs.existsSync(args[0])) {
    fs.stat(args[0], (err, stat) => {
        if (err) error(err);

        if (stat.isFile()) {
            if (fs.existsSync(args[1]) && !fs.statSync(args[1]).isFile()) error(`"${args[1]}" is not a File`);

            fs.readFile(args[0], { flag: "r" }, (err, data) => {
                var toConvert = data.toString();
                var Converted = strip(toConvert, false);

                fs.writeFile(args[1], Converted, {}, (err) => {
                    if (err) error(err);

                    console.log('Converted!');
                });
            });
        } else error('Currently only single Files can be converted!');
    });
} else error(`"${args[0]}" does not exists!`);