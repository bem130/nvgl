type span = [number,number];
interface NVGL_root {
    type: "root",
    span: span,
    include: NVGL_include|null,
    init: NVGL_init|null,
    timeline: NVGL_timeline|null,
    obj: Array<NVGL_obj>,
    func: Array<NVGL_func>,
}
type NVGL_node = NVGL_include|NVGL_init|NVGL_timeline|NVGL_obj|NVGL_func;

type NVGL_nodes = Array<NVGL_node>;

type NVGL_timeline_line = span;
type NVGL_obj_functype = span;
type NVGL_name = span;
interface NVGL_include_line {
    type: "includeline",
    span: span,
    text: string,
}
interface NVGL_line {
    type: "line",
    span: span,
    text: string,
}
interface NVGL_expr {
    type: "expr",
    span: span,
    text: string,
}

interface NVGL_include {
    type: "include",
    span: span,
    child: Array<NVGL_include_line>,
}
interface NVGL_init {
    type: "init",
    span: span,
    child: NVGL_block,
}
interface NVGL_timeline {
    type: "init",
    span: span,
    child: Array<NVGL_timeline_line>,
}
interface NVGL_obj {
    type: "obj",
    span: span,
    child: Object,
}
interface NVGL_obj_node {
    type: "objnode",
    span: span,
    name_text: span,
    child: NVGL_block,
}
interface NVGL_func {
    type: "func",
    span: span,
    child: NVGL_block,
}
interface NVGL_block {
    type: "funcblock",
    span: span,
    child: Array<NVGL_expr|NVGL_if|NVGL_while>,
}
interface NVGL_if {
    type: "if",
    span: span,
    cond: NVGL_expr,
    then: NVGL_block,
    else: NVGL_block,
}
interface NVGL_while {
    type: "while",
    span: span,
    cond: NVGL_expr,
    child: NVGL_block,
}

class NVGLang {
    private code:string;
    private filename:string;
    private fRead:Function;
    tokenizerstates:Array<string>;
    indentSpace:number;
    parseTree:NVGL_root;
    constructor(filename: string,type: string) {
        this.indentSpace = 4; // インデントのスペースの個数
        this.filename = filename;
        { // Define the fRead function
            console.log(type)
            if (type=="fs") {
                // @ts-ignore
                const fs:any = require('fs');
                this.fRead = function (filename): string {
                    return fs.readFileSync(filename,'utf8').replace(/\r\n/g,"\n");
                }
            }
            else if (type=="http") {
                this.fRead = function (filename): string {
                    let hr:any = new XMLHttpRequest()
                    hr.open("GET",filename,false);
                    hr.send(null);
                    if (hr.status==200||hr.status==304) {
                        return hr.responseText.replace(/\r\n/g,"\n");
                    }
                    else {
                        throw "err "+filename;
                    }
                }
            }
            else {
                throw "err load-type not defined"
            }
        }
        this.code = this.fRead(filename);
        //console.log(this.code)
    }
    getLineAndCol(i:number): object {
        let j:number = 0;
        let line:number = 1;
        let col:number = 1;
        while (j<i) {
            if (this.code[j]=="\n") {
                line++;
                col = 0;
            }
            else {
                col++;
            }
            j++;
        }
        return [line,col];
    }
    parseTree_checkIndent(i:number) {
        let flag = true;
        for (let j:number=0;j<this.indentSpace;j++) {
            if (this.code[i+j]!=" ") { flag=false;break; }
        }
        return flag;
    }
    parseTree_root():NVGL_root {
        console.log(this.code)
        let nodes_span:span = [0,this.code.length];
        this.parseTree_TLnodes(nodes_span,0);
        console.log(this.parseTree)
        return this.parseTree;
    }
    parseTree_TLnodes(nodes_span:span,indent:number) {
        this.parseTree ={ type:"root",span:[0,this.code.length],include:null,init:null,timeline:null,obj:[],func:[]};
        let i:number = nodes_span[0];
        let indentstat:boolean = false; // インデントを受け付けるか
        let lineinfo:Array<["include"|"init"|"timeline"|"obj"|"func"|"indents"|"invalid"|"eos",number]> = [];
        while (i<=nodes_span[1]) {
            if (i==0||this.code[i-1]=="\n") { // 行頭
                if (indentstat&&this.parseTree_checkIndent(i+indent*this.indentSpace)) { // インデント有り
                    lineinfo.push(["indents",i]);
                }
                else { // インデント無し
                    console.log(i,this.code.startsWith("@",i+indent*this.indentSpace))
                    indentstat = false;
                    if (this.code.startsWith("@include",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["include",i]);
                    }
                    else if (this.code.startsWith("@init",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["init",i]);
                    }
                    else if (this.code.startsWith("@timeline",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["timeline",i]);
                    }
                    else if (this.code.startsWith("@obj",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["obj",i]);
                    }
                    else if (this.code.startsWith("@func",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["func",i]);
                    }
                    else {
                        lineinfo.push(["invalid",i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos",i]);
        console.log(lineinfo)
        let j:number = 0;
        while (j<lineinfo.length) {
            if (lineinfo[j][0]=="include") {
                let k:number = j+1;
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    this.parseTree.include = this.parseTree_node([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1,"include","includeline");
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            if (lineinfo[j][0]=="init") {
                let k:number = j+1;
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    this.parseTree.init = this.parseTree_func_body([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1);
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            if (lineinfo[j][0]=="timeline") {
                let k:number = j+1;
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    this.parseTree.timeline = this.parseTree_node([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1,"timeline","line");
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            if (lineinfo[j][0]=="obj") {
                let k:number = j+1;
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    this.parseTree.obj.push(this.parseTree_obj([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1,"timeline","line"));
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            if (lineinfo[j][0]=="func") {
                let k:number = j+1;
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    let func:NVGL_func = {type:"func",span:[lineinfo[j][1]+indent*this.indentSpace,lineinfo[k][1]-1],child:null};
                    func.child = this.parseTree_func_body([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1);
                    this.parseTree.func.push(func);
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            j++;
        }
        return
    }
    parseTree_node(nodes_span:span,indent:number,type:string,ctype:string):NVGL_node {
        let nodes:NVGL_include = {type:type,span:nodes_span,child:[]};
        let i:number = nodes_span[0];
        let indentstat:boolean = false; // インデントを受け付けるか (nmlnodeとblockの時は受け付ける)
        let lineinfo:Array<["indents"|"contents"|"eos",number]> = [];
        while (i<nodes_span[1]) {
            if (this.code[i-1]=="\n") { // 行頭
                if (indentstat&&this.parseTree_checkIndent(i+indent*this.indentSpace)) { // インデント有り
                    lineinfo.push(["indents",i]);
                }
                else { // インデント無し
                    indentstat = false;
                    lineinfo.push(["contents",i]);
                }
            }
            i++;
        }
        lineinfo.push(["eos",i+1]);
        console.log(lineinfo)
        let j:number = 0;
        while (j<lineinfo.length) {
            if (lineinfo[j][0]=="contents") {
                while (lineinfo[j][0]=="contents") {
                    nodes.child.push(this.parseTree_content([lineinfo[j][1]+indent*this.indentSpace,lineinfo[j+1][1]-1],indent,ctype));
                    j++;
                }
                j--;
            }
            j++;
        }
        return nodes
    }
    parseTree_content(content_span:span,indent:number,type:string) {
        let text:string = "";
        let i:number = content_span[0];
        while (i<content_span[1]) {
            if (this.code[i-1]=="\n") {
                i += indent*this.indentSpace;
            }
            text += this.code[i];
            i++;
        }
        return {
            type: type,
            span: content_span,
            text: text,
        }
    }
    parseTree_obj(nodes_span:span,indent:number):NVGL_obj {
        let nodes:NVGL_obj = {type:"obj",span:nodes_span,child:{}};
        let i:number = nodes_span[0];
        let indentstat:boolean = false; // インデントを受け付けるか (nmlnodeとblockの時は受け付ける)
        let lineinfo:Array<["indents"|"getframe"|"length"|"text"|"textcolor"|"color"|"invalid"|"eos",number]> = [];
        while (i<nodes_span[1]) {
            if (i==0||this.code[i-1]=="\n") { // 行頭
                if (indentstat&&this.parseTree_checkIndent(i+indent*this.indentSpace)) { // インデント有り
                    lineinfo.push(["indents",i]);
                }
                else { // インデント無し
                    indentstat = false;
                    if (this.code.startsWith("&getframe",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["getframe",i]);
                    }
                    else if (this.code.startsWith("&length",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["length",i]);
                    }
                    else if (this.code.startsWith("&text",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["text",i]);
                    }
                    else if (this.code.startsWith("&textcolor",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["textcolor",i]);
                    }
                    else if (this.code.startsWith("&color",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["color",i]);
                    }
                    else {
                        lineinfo.push(["invalid",i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos",i+1]);
        console.log("obj",lineinfo)
        let j:number = 0;
        while (j<lineinfo.length-1) {
            if (lineinfo[j][0]!="invalid"&&lineinfo[j][0]!="indents") {
                let k:number = j+1;
                console.log(k,lineinfo[j])
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    let paragraph:NVGL_obj_node = {type:"objnode",span:[lineinfo[j][1]+indent*this.indentSpace,lineinfo[j+1][1]-1],child:null};
                    paragraph.child = this.parseTree_func_body([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1);
                    nodes.child[lineinfo[j][0]] = paragraph;
                    j = k-1;
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            j++;
        }
        return nodes
    }
    parseTree_func_body(nodes_span:span,indent:number):NVGL_block {
        let nodes:NVGL_block = {type:"funcblock",span:nodes_span,child:[]};
        let i:number = nodes_span[0];
        let indentstat:boolean = false; // インデントを受け付けるか (nmlnodeとblockの時は受け付ける)
        let lineinfo:Array<["indents"|"if"|"else"|"while"|"expr"|"eos",number]> = [];
        while (i<nodes_span[1]) {
            if (i==0||this.code[i-1]=="\n") { // 行頭
                if (indentstat&&this.parseTree_checkIndent(i+indent*this.indentSpace)) { // インデント有り
                    lineinfo.push(["indents",i]);
                }
                else { // インデント無し
                    indentstat = false;
                    if (this.code.startsWith("if ",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["if",i]);
                    }
                    else if (this.code.startsWith("else",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["else",i]);
                    }
                    else if (this.code.startsWith("while ",i+indent*this.indentSpace)) {
                        indentstat = true;
                        lineinfo.push(["while",i]);
                    }
                    else {
                        lineinfo.push(["expr",i]);
                    }
                }
            }
            i++;
        }
        lineinfo.push(["eos",i+1]);
        console.log("obj",lineinfo)
        let j:number = 0;
        while (j<lineinfo.length-1) {
            if (lineinfo[j][0]=="if") {
                let cond_expr:NVGL_expr = {type:"expr",span:[lineinfo[j][1]+indent*this.indentSpace+3,lineinfo[j+1][1]-1],text:""};
                cond_expr.text = this.code.slice(cond_expr.span[0],cond_expr.span[1]);
                let k:number = j+1;
                console.log(k,lineinfo[j])
                if (lineinfo[k][0]=="indents") {
                    while (lineinfo[k][0]=="indents") {k++;}
                    let control:NVGL_if = {type:"if",span:[lineinfo[j][1]+indent*this.indentSpace,lineinfo[j+1][1]-1],cond:cond_expr,then:null};
                    control.then = this.parseTree_func_body([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1);
                    j = k-1 +1;
                    if (lineinfo[j][0]=="else") {
                        let k:number = j+1;
                        console.log(k,lineinfo[j])
                        if (lineinfo[k][0]=="indents") {
                            while (lineinfo[k][0]=="indents") {k++;}
                            control.else = this.parseTree_func_body([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1);
                            j = k-1;
                        }
                    }
                    nodes.child.push(control);
                }
                else {
                    throw `error ${this.getLineAndCol(i).toString()}`
                }
            }
            else {
                let expr:NVGL_expr = {type:"expr",span:[lineinfo[j][1]+indent*this.indentSpace,lineinfo[j+1][1]-1],text:""};
                expr.text = this.code.slice(expr.span[0],expr.span[1]);
                nodes.child.push(expr);
            }
            j++;
        }
        return nodes
    }
}