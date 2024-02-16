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
type NVGL_func_node = NVGL_line|NVGL_func_if|NVGL_func_while;

type NVGL_nodes = Array<NVGL_node>;

type NVGL_timeline_line = span;
type NVGL_expr = span;
type NVGL_obj_functype = span;
type NVGL_name = span;

type NVGL_contents = NVGL_include_line|NVGL_line;
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

interface NVGL_include {
    type: "include",
    span: span,
    child: Array<NVGL_include_line>,
}
interface NVGL_init {
    type: "init",
    span: span,
    child: Array<NVGL_line>,
}
interface NVGL_timeline {
    type: "init",
    span: span,
    child: Array<NVGL_timeline_line>,
}
interface NVGL_obj {
    type: "obj",
    span: span,
    name: NVGL_name,
    child: NVGL_obj_node,
}
interface NVGL_obj_node {
    type: "objnode",
    span: span,
    functype: NVGL_obj_functype,
    child: NVGL_func_body,
}
interface NVGL_func {
    type: "func",
    span: span,
    child: NVGL_func_body,
}
interface NVGL_func_body {
    type: "funcbody",
    span: span,
    child: Array<NVGL_func_node>,
}
interface NVGL_func_if {
    type: "if",
    span: span,
    cond: NVGL_expr,
    then: NVGL_func_body,
    else: NVGL_func_body,
}
interface NVGL_func_while {
    type: "while",
    span: span,
    cond: NVGL_expr,
    child: NVGL_func_body,
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
    parseTree_TLnodes(nodes_span:span,indent:number):NVGL_nodes {
        this.parseTree ={ type:"root",span:[0,this.code.length],include:null,init:null,timeline:null,obj:[],func:[]};
        let nodes:NVGL_nodes = [];
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
        lineinfo.push(["eos",i+1]);
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
                    this.parseTree.init = this.parseTree_node([lineinfo[j+1][1],lineinfo[k][1]-1],indent+1,"init","line");
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
            j++;
        }
        return nodes
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
    parseTree_content(content_span:span,indent:number,type:string):NVGL_contents { // inline無し暫定版
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
}