﻿function Lexer() {
    this.setIndex = false;
    this.useNew = false;
    for (var i = 0; i < arguments.length; ++i) {
        var arg = arguments[i];
        if (arg === Lexer.USE_NEW) {
            this.useNew = true;
        }
        else if (arg === Lexer.SET_INDEX) {
            this.setIndex = Lexer.DEFAULT_INDEX;
        }
        else if (arg instanceof Lexer.SET_INDEX) {
            this.setIndex = arg.indexProp;
        }
    }
    this.rules = [];
    this.errorLexeme = null;
}

Lexer.NULL_LEXEME = {};

Lexer.ERROR_LEXEME = {
    toString: function () {
        return "[object Lexer.ERROR_LEXEME]";
    }
};

Lexer.DEFAULT_INDEX = "index";

Lexer.USE_NEW = {};

Lexer.SET_INDEX = function (indexProp) {
    if (!(this instanceof arguments.callee)) {
        return new arguments.callee.apply(this, arguments);
    }
    if (indexProp === undefined) {
        indexProp = Lexer.DEFAULT_INDEX;
    }
    this.indexProp = indexProp;
};

(function () {
    var New = (function () {
        var fs = [];
        return function () {
            var f = fs[arguments.length];
            if (f) {
                return f.apply(this, arguments);
            }
            var argStrs = [];
            for (var i = 0; i < arguments.length; ++i) {
                argStrs.push("a[" + i + "]");
            }
            f = new Function("var a=arguments;return new this(" + argStrs.join() + ");");
            if (arguments.length < 100) {
                fs[arguments.length] = f;
            }
            return f.apply(this, arguments);
        };
    })();

    var flagMap = [
        ["global", "g"]
        , ["ignoreCase", "i"]
        , ["multiline", "m"]
        , ["sticky", "y"]
    ];

    function getFlags(regex) {
        var flags = "";
        for (var i = 0; i < flagMap.length; ++i) {
            if (regex[flagMap[i][0]]) {
                flags += flagMap[i][1];
            }
        }
        return flags;
    }

    function not(x) {
        return function (y) {
            return x !== y;
        };
    }

    function Rule(regex, lexeme) {
        if (!regex.global) {
            var flags = "g" + getFlags(regex);
            regex = new RegExp(regex.source, flags);
        }
        this.regex = regex;
        this.lexeme = lexeme;
    }

    Lexer.prototype = {
        constructor: Lexer

        , addRule: function (regex, lexeme) {
            var rule = new Rule(regex, lexeme);
            this.rules.push(rule);
        }

        , setErrorLexeme: function (lexeme) {
            this.errorLexeme = lexeme;
        }

        , runLexeme: function (lexeme, exec) {
            if (typeof lexeme !== "function") {
                return lexeme;
            }
            var args = exec.concat(exec.index, exec.input);
            if (this.useNew) {
                return New.apply(lexeme, args);
            }
            return lexeme.apply(null, args);
        }

        , lex: function (str) {
            var index = 0;
            var lexemes = [];
            if (this.setIndex) {
                lexemes.push = function () {
                    for (var i = 0; i < arguments.length; ++i) {
                        if (arguments[i]) {
                            arguments[i][this.setIndex] = index;
                        }
                    }
                    return Array.prototype.push.apply(this, arguments);
                };
            }
            while (index < str.length) {
                var bestExec = null;
                var bestRule = null;
                for (var i = 0; i < this.rules.length; ++i) {
                    var rule = this.rules[i];
                    rule.regex.lastIndex = index;
                    var exec = rule.regex.exec(str);
                    if (exec) {
                        var doUpdate = !bestExec
                            || (exec.index < bestExec.index)
                            || (exec.index === bestExec.index && exec[0].length > bestExec[0].length)
                            ;
                        if (doUpdate) {
                            bestExec = exec;
                            bestRule = rule;
                        }
                    }
                }
                if (!bestExec) {
                    if (this.errorLexeme) {
                        lexemes.push(this.errorLexeme);
                        return lexemes.filter(not(Lexer.NULL_LEXEME));
                    }
                    ++index;
                }
                else {
                    if (this.errorLexeme && index !== bestExec.index) {
                        lexemes.push(this.errorLexeme);
                    }
                    var lexeme = this.runLexeme(bestRule.lexeme, bestExec);
                    lexemes.push(lexeme);
                    index = bestRule.regex.lastIndex;
                }
            }
            return lexemes.filter(not(Lexer.NULL_LEXEME));
        }
    };
})();

if (!Array.prototype.filter) {
    Array.prototype.filter = function (fun) {
        var len = this.length >>> 0;
        var res = [];
        var thisp = arguments[1];
        for (var i = 0; i < len; ++i) {
            if (i in this) {
                var val = this[i];
                if (fun.call(thisp, val, i, this)) {
                    res.push(val);
                }
            }
        }
        return res;
    };
}

module.exports = Lexer;