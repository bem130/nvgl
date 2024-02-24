var NVGLang = (function () {
    function NVGLang(filename, type) {
        this.indentSpace = 4;
        this.filename = filename;
        {
            console.log(type);
            if (type == "fs") {
                var fs_1 = require('fs');
                this.fRead = function (filename) {
                    return fs_1.readFileSync(filename, 'utf8').replace(/\r\n/g, "\n");
                };
            }
            else if (type == "http") {
                this.fRead = function (filename) {
                    var hr = new XMLHttpRequest();
                    hr.open("GET", filename, false);
                    hr.send(null);
                    if (hr.status == 200 || hr.status == 304) {
                        return hr.responseText.replace(/\r\n/g, "\n");
                    }
                    else {
                        throw "err " + filename;
                    }
                };
            }
            else {
                throw "err load-type not defined";
            }
        }
        this.code = this.fRead(filename);
    }
    NVGLang.prototype.getLineAndCol = function (i) {
        var j = 0;
        var line = 1;
        var col = 1;
        while (j < i) {
            if (this.code[j] == "\n") {
                line++;
                col = 0;
            }
            else {
                col++;
            }
            j++;
        }
        return [line, col];
    };
    NVGLang.prototype.parseTree_checkIndent = function (i) {
        var flag = true;
        for (var j = 0; j < this.indentSpace; j++) {
            if (this.code[i + j] != " ") {
                flag = false;
                break;
            }
        }
        return flag;
    };
    NVGLang.prototype.parseTree_root = function () {
        console.log(this.code);
        var nodes_span = [0, this.code.length];
        this.parseTree_TLnodes(nodes_span, 0);
        console.log(this.parseTree);
        return this.parseTree;
    };
    NVGLang.prototype.parseTree_TLnodes = function (nodes_span, indent) {
        this.parseTree = { type: "root", span: [0, this.code.length], include: null, init: null, timeline: null, obj: [], func: [] };
        var i = nodes_span[0];
        var indentstat = false;
        var lineinfo = [];
        while (i <= nodes_span[1]) {
            if (i == 0 || this.code[i - 1] == "\n") {
                if (indentstat && this.parseTree_checkIndent(i + indent * this.indentSpace)) {
                    lineinfo.push(["indents", i]);
                }
                else {
                    console.log(i, this.code.startsWith("@", i + indent * this.indentSpace));
                    indentstat = false;
                    if (this.code.startsWith("@include", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["include", i]);
                    }
                    else if (this.code.startsWith("@init", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["init", i]);
                    }
                    else if (this.code.startsWith("@timeline", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["timeline", i]);
                    }
                    else if (this.code.startsWith("@obj", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["obj", i]);
                    }
                    else if (this.code.startsWith("@func", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["func", i]);
                    }
                    else {
                        lineinfo.push(["invalid", i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos", i]);
        console.log(lineinfo);
        var j = 0;
        while (j < lineinfo.length) {
            if (lineinfo[j][0] == "include") {
                var k = j + 1;
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    this.parseTree.include = this.parseTree_node([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1, "include", "includeline");
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            if (lineinfo[j][0] == "init") {
                var k = j + 1;
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    this.parseTree.init = this.parseTree_func_body([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1);
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            if (lineinfo[j][0] == "timeline") {
                var k = j + 1;
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    this.parseTree.timeline = this.parseTree_node([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1, "timeline", "line");
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            if (lineinfo[j][0] == "obj") {
                var k = j + 1;
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    this.parseTree.obj.push(this.parseTree_obj([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1, "timeline", "line"));
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            if (lineinfo[j][0] == "func") {
                var k = j + 1;
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    var func = { type: "func", span: [lineinfo[j][1] + indent * this.indentSpace, lineinfo[k][1] - 1], child: null };
                    func.child = this.parseTree_func_body([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1);
                    this.parseTree.func.push(func);
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            j++;
        }
        return;
    };
    NVGLang.prototype.parseTree_node = function (nodes_span, indent, type, ctype) {
        var nodes = { type: type, span: nodes_span, child: [] };
        var i = nodes_span[0];
        var indentstat = false;
        var lineinfo = [];
        while (i < nodes_span[1]) {
            if (this.code[i - 1] == "\n") {
                if (indentstat && this.parseTree_checkIndent(i + indent * this.indentSpace)) {
                    lineinfo.push(["indents", i]);
                }
                else {
                    indentstat = false;
                    lineinfo.push(["contents", i]);
                }
            }
            i++;
        }
        lineinfo.push(["eos", i + 1]);
        console.log(lineinfo);
        var j = 0;
        while (j < lineinfo.length) {
            if (lineinfo[j][0] == "contents") {
                while (lineinfo[j][0] == "contents") {
                    nodes.child.push(this.parseTree_content([lineinfo[j][1] + indent * this.indentSpace, lineinfo[j + 1][1] - 1], indent, ctype));
                    j++;
                }
                j--;
            }
            j++;
        }
        return nodes;
    };
    NVGLang.prototype.parseTree_content = function (content_span, indent, type) {
        var text = "";
        var i = content_span[0];
        while (i < content_span[1]) {
            if (this.code[i - 1] == "\n") {
                i += indent * this.indentSpace;
            }
            text += this.code[i];
            i++;
        }
        return {
            type: type,
            span: content_span,
            text: text,
        };
    };
    NVGLang.prototype.parseTree_obj = function (nodes_span, indent) {
        var nodes = { type: "obj", span: nodes_span, child: {} };
        var i = nodes_span[0];
        var indentstat = false;
        var lineinfo = [];
        while (i < nodes_span[1]) {
            if (i == 0 || this.code[i - 1] == "\n") {
                if (indentstat && this.parseTree_checkIndent(i + indent * this.indentSpace)) {
                    lineinfo.push(["indents", i]);
                }
                else {
                    indentstat = false;
                    if (this.code.startsWith("&getframe", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["getframe", i]);
                    }
                    else if (this.code.startsWith("&length", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["length", i]);
                    }
                    else if (this.code.startsWith("&text", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["text", i]);
                    }
                    else if (this.code.startsWith("&textcolor", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["textcolor", i]);
                    }
                    else if (this.code.startsWith("&color", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["color", i]);
                    }
                    else {
                        lineinfo.push(["invalid", i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos", i + 1]);
        console.log("obj", lineinfo);
        var j = 0;
        while (j < lineinfo.length - 1) {
            if (lineinfo[j][0] != "invalid" && lineinfo[j][0] != "indents") {
                var k = j + 1;
                console.log(k, lineinfo[j]);
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    var paragraph = { type: "objnode", span: [lineinfo[j][1] + indent * this.indentSpace, lineinfo[j + 1][1] - 1], child: null };
                    paragraph.child = this.parseTree_func_body([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1);
                    nodes.child[lineinfo[j][0]] = paragraph;
                    j = k - 1;
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            j++;
        }
        return nodes;
    };
    NVGLang.prototype.parseTree_func_body = function (nodes_span, indent) {
        var nodes = { type: "funcblock", span: nodes_span, child: [] };
        var i = nodes_span[0];
        var indentstat = false;
        var lineinfo = [];
        while (i < nodes_span[1]) {
            if (i == 0 || this.code[i - 1] == "\n") {
                if (indentstat && this.parseTree_checkIndent(i + indent * this.indentSpace)) {
                    lineinfo.push(["indents", i]);
                }
                else {
                    indentstat = false;
                    if (this.code.startsWith("if ", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["if", i]);
                    }
                    else if (this.code.startsWith("else", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["else", i]);
                    }
                    else if (this.code.startsWith("while ", i + indent * this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["while", i]);
                    }
                    else {
                        lineinfo.push(["expr", i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos", i + 1]);
        console.log("obj", lineinfo);
        var j = 0;
        while (j < lineinfo.length - 1) {
            if (lineinfo[j][0] == "if") {
                var cond_expr = { type: "expr", span: [lineinfo[j][1] + indent * this.indentSpace + 3, lineinfo[j + 1][1] - 1], text: "" };
                cond_expr.text = this.code.slice(cond_expr.span[0], cond_expr.span[1]);
                var k = j + 1;
                console.log(k, lineinfo[j]);
                if (lineinfo[k][0] == "indents") {
                    while (lineinfo[k][0] == "indents") {
                        k++;
                    }
                    var control = { type: "if", span: [lineinfo[j][1] + indent * this.indentSpace, lineinfo[j + 1][1] - 1], cond: cond_expr, then: null };
                    control.then = this.parseTree_func_body([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1);
                    j = k - 1 + 1;
                    if (lineinfo[j][0] == "else") {
                        var k_1 = j + 1;
                        console.log(k_1, lineinfo[j]);
                        if (lineinfo[k_1][0] == "indents") {
                            while (lineinfo[k_1][0] == "indents") {
                                k_1++;
                            }
                            control.else = this.parseTree_func_body([lineinfo[j + 1][1], lineinfo[k_1][1] - 1], indent + 1);
                            j = k_1 - 1;
                        }
                    }
                    nodes.child.push(control);
                }
                else {
                    throw "error ".concat(this.getLineAndCol(i).toString());
                }
            }
            else {
                var expr = { type: "expr", span: [lineinfo[j][1] + indent * this.indentSpace, lineinfo[j + 1][1] - 1], text: "" };
                expr.text = this.code.slice(expr.span[0], expr.span[1]);
                nodes.child.push(expr);
            }
            j++;
        }
        return nodes;
    };
    return NVGLang;
}());
