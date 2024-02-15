var NVGLang = (function () {
    function NVGLang(filename) {
        this.indentSpace = 4;
        this.filename = filename;
        {
            if (typeof require != "undefined") {
                var fs_1 = require('fs');
                this.fRead = function (filename) {
                    return fs_1.readFileSync(filename, 'utf8').replace(/\r\n/g, "\n");
                };
            }
            else {
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
        var nodes = [];
        var i = nodes_span[0];
        var indentstat = false;
        var lineinfo = [];
        while (i < nodes_span[1]) {
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
        lineinfo.push(["eos", i + 1]);
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
                    this.parseTree.init = this.parseTree_node([lineinfo[j + 1][1], lineinfo[k][1] - 1], indent + 1, "init", "line");
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
            j++;
        }
        return nodes;
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
    return NVGLang;
}());
