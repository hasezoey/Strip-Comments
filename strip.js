const Lexer = require('./lexer');

Array.prototype.last = function () {
    return this[this.length - 1];
};

RegExp.prototype.getFlags = (function () {
    var flagMap = [
        ["global", "g"]
        , ["ignoreCase", "i"]
        , ["multiline", "m"]
        , ["sticky", "y"]
    ];

    return function () {
        var flags = "";
        for (var i = 0; i < flagMap.length; ++i) {
            if (this[flagMap[i][0]]) {
                flags += flagMap[i][1];
            }
        }
        return flags;
    };
})();

RegExp.concat = function (/*r1, r2, ..., rN [, flagMerger] */) {
    var regexes = Array.prototype.slice.call(arguments);
    var regexStr = "";
    var flags = (regexes[0].getFlags && regexes[0].getFlags()) || "";
    var flagMerger = RegExp.concat.INTERSECT_FLAGS;
    if (typeof regexes.last() === "function") {
        flagMerger = regexes.pop();
    }
    for (var j = 0; j < regexes.length; ++j) {
        var regex = regexes[j];
        if (typeof regex === "string") {
            flags = flagMerger(flags, "");
            regexStr += regex;
        }
        else {
            flags = flagMerger(flags, regex.getFlags());
            regexStr += regex.source;
        }
    }
    return new RegExp(regexStr, flags);
};

(function () {
    function setToString(set) {
        var str = "";
        for (var prop in set) {
            if (set.hasOwnProperty(prop) && set[prop]) {
                str += prop;
            }
        }
        return str;
    }

    function toSet(str) {
        var set = {};
        for (var i = 0; i < str.length; ++i) {
            set[str.charAt(i)] = true;
        }
        return set;
    }

    function union(set1, set2) {
        for (var prop in set2) {
            if (set2.hasOwnProperty(prop)) {
                set1[prop] = true;
            }
        }
        return set1;
    }

    function intersect(set1, set2) {
        for (var prop in set2) {
            if (set2.hasOwnProperty(prop) && !set2[prop]) {
                delete set1[prop];
            }
        }
        return set1;
    }

    RegExp.concat.UNION_FLAGS = function (flags1, flags2) {
        return setToString(union(toSet(flags1), toSet(flags2)));
    }

    RegExp.concat.INTERSECT_FLAGS = function (flags1, flags2) {
        return setToString(intersect(toSet(flags1), toSet(flags2)));
    };

})();

RegExp.prototype.group = function () {
    return RegExp.concat("(?:", this, ")", RegExp.concat.UNION_FLAGS);
};

RegExp.prototype.optional = function () {
    return RegExp.concat(this.group(), "?", RegExp.concat.UNION_FLAGS);
};

RegExp.prototype.or = function (regex) {
    return RegExp.concat(this, "|", regex, RegExp.concat.UNION_FLAGS).group();
};

RegExp.prototype.many = function () {
    return RegExp.concat(this.group(), "*", RegExp.concat.UNION_FLAGS);
};

RegExp.prototype.many1 = function () {
    return RegExp.concat(this.group(), "+", RegExp.concat.UNION_FLAGS);
};

function id(x) {
    return x;
}

/*************************************************************************************/

var eof = /(?![\S\s])/m;
var newline = /\r?\n/m;
var spaces = /[\t ]*/m;
var leadingSpaces = RegExp.concat(/^/m, spaces);
var trailingSpaces = RegExp.concat(spaces, /$/m);

var lineComment = /\/\/(?!@).*/m;
var blockComment = /\/\*(?!@)(?:[^*]|\*[^/])*\*\//m;
var comment = lineComment.or(blockComment);
var comments = RegExp.concat(comment, RegExp.concat(spaces, comment).many());
var eofComments = RegExp.concat(leadingSpaces, comments, trailingSpaces, eof);
var entireLineComments = RegExp.concat(leadingSpaces, comments, trailingSpaces, newline);

var lineCondComp = /\/\/@.*/;
var blockCondComp = /\/\*@(?:[^*]|\*[^@]|\*@[^/])*@*\*\//;

var doubleQuotedString = /"(?:[^\\"]|\\.)*"/;
var singleQuotedString = /'(?:[^\\']|\\.)*'/;

var regexLiteral = /\/(?![/*])(?:[^/\\[]|\\.|\[(?:[^\]\\]|\\.)*\])*\//;

var anyChar = /[\S\s]/;

/*************************************************************************************/

var stripper = new Lexer();

stripper.addRule(entireLineComments, Lexer.NULL_LEXEME);

stripper.addRule(
    RegExp.concat(newline, entireLineComments.many(), eofComments)
    , Lexer.NULL_LEXEME
);

stripper.addRule(
    RegExp.concat(comment, RegExp.concat(trailingSpaces, newline, eofComments).optional())
    , Lexer.NULL_LEXEME
);

stripper.addRule(lineCondComp, id);
stripper.addRule(blockCondComp, id);

stripper.addRule(doubleQuotedString, id);
stripper.addRule(singleQuotedString, id);

stripper.addRule(regexLiteral, id);

stripper.addRule(anyChar, id);

/*************************************************************************************/

module.exports = (code) => {
    return stripper.lex(code).join("");
}