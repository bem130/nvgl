function getLineAndCol(i,code) {
    let j = 0;
    let line = 1;
    let col = 0;
    while (j<=i) {
        if (code[j]=="\n") {
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


async function init(ast,filename,scope,code) {
    const Msgs = [];
    const astcheck = await ASTchecker(ast,filename,Msgs);
    if (countErr(Msgs)) { return err2txt(Msgs,code); }
    scope = await resolveIncludes(ast,filename,Msgs,scope);
    if (countErr(Msgs)) { return err2txt(Msgs,code); }
    scope = await resolveImports(ast,filename,Msgs,astcheck.imports,scope);
    if (countErr(Msgs)) { return err2txt(Msgs,code); }
    scope = await runInit(ast,filename,Msgs,astcheck.init,scope);
    if (countErr(Msgs)) { return err2txt(Msgs,code); }
    scope = await makeItems(ast,filename,Msgs,astcheck.items,scope);
    if (countErr(Msgs)) { return err2txt(Msgs,code); }
    console.log(scope)
    if (Msgs.length==0) {
        return JSON.stringify(scope,null,4);
    }
    return err2txt(Msgs,code);
}

function countErr(Msgs) {
    let err = 0;
    for (let i of Msgs) {
        if (i[0]=="err") {err++;}
    }
    return err;
}

function err2txt(Msgs,code) {
    let rettxt = "";
    for (let errmsg of Msgs) {
        rettxt += `[${errmsg[0]}] ${errmsg[1]}\n  -> ${errmsg[2]} [${getLineAndCol(errmsg[3].start,code).join(":")}]:[${getLineAndCol(errmsg[3].end-1,code).join(":")}]\n\n`;
    }
    return rettxt;
}

async function resolveIncludes(ast,filename,Msgs,scope) {
    return scope;
}

async function resolveImports(ast,filename,Msgs,imports,scope) {
    const importsDir = "/importslib/"
    for (let _import of imports) {
        //console.log("imports",_import);
        console.log("imports",importsDir+_import[1][0].val+".js");
        var module,val;
        try {
            module = await import(importsDir+_import[1][0].val+".js");
        }
        catch {
            Msgs.push(["err",`"${_import[1].map((x)=>{return x.val}).join("::")}" を読み込めません。 "${_import[1][0].val}.js" が見つかりませんでした。`,filename,_import[1][0].pos]);
            continue;
        }
        //console.log(module)
        if (module.init==null) {
            Msgs.push(["err",`"${_import[1].map((x)=>{return x.val}).join("::")}" を読み込めません。 "${_import[1][0].val}.js" で init が定義されていません。`,filename,_import[1][0].pos]);
        }
        else {
            module.init();
        }
        if (module.val==null) {
            Msgs.push(["err",`"${_import[1].map((x)=>{return x.val}).join("::")}" を読み込めません。 "${_import[1][0].val}.js" で val が定義されていません。`,filename,_import[1][0].pos]);
        }
        else {
            //console.log(module.val);
            val = module.val;
        }
        if (module.init==null||module.val==null) {continue;}
        function recimports(val,x,i) {
            //console.log(i,x.length)
            if (i>0) {
                //console.log(x[i].val)
                const rec = recimports(val,x,i-1);
                if (rec[0]==false) {return [false];}
                if (x[i].val in rec[1]) {
                    return [true,rec[1][x[i].val]];
                }
                else {
                    Msgs.push(["err",`"${_import[1].map((x)=>{return x.val}).join("::")}" を読み込めません。 "${_import[1][0].val}.js" で "${_import[1].map((x)=>{return x.val}).slice(0,i+1).join("::")}" が定義されていません。`,filename,x[i].pos]);
                    return [false];
                }
            }
            else if (i==0) {
                return [true,val];
            }
            else {
                console.warn(i)
            }
        }
        if (_import[0].val in scope) {
            Msgs.push(["warn",`"${_import[0].val}" は既に定義されています。 "${_import[0].val}" は "${_import[1].map((x)=>{return x.val}).join("::")}" で置き換えられます`,filename,_import[1][0].pos]);
            delete scope[_import[0].val];
        }
        const value = recimports(val,_import[1],_import[1].length-1);
        if (value[0]==true) {
            scope[_import[0].val] = value[1];
        }
    }
    return scope;
}

async function runInit(ast,filename,Msgs,init,scope) {
    let ret = evalBlock(init.val.Block,Object.assign({},scope));
    console.log("Init",ret)
    return Object.assign(scope,ret);
}

async function makeItems(ast,filename,Msgs,items,scope) {
    let ret = {}
    for (let n of Object.keys(items)) {
        console.log(items[n])
        ret[n] = evalBlock(items[n].Block,Object.assign({},scope));
    }
    // console.log(scope)
    // evalBlock(init.val.Block,scope);
    // console.log("Init",ret)
    return Object.assign(scope,ret);
}


function ASTchecker(ast,filename,Msgs) {
    const objcnt = {Includes:0,Imports:0,Init:0,Item:0,Obj:0,TLObj:0};
    const Items = {};
    const Objs = {};
    const ItemNames = [];
    const ObjNames = [];
    var Includes;
    var Imports;
    var Init;
    var TimeLine;
    for (let i=0;i<ast.length;i++) {
        const objtype = Object.keys(ast[i])[0];
        objcnt[objtype]++;
        if (objtype=="Obj") {
            const objname = ast[i].Obj.name.Id.val;
            const objelmcnt = {conf:0,init:0,length:0,tlconf:0,frame:0};
            if (ObjNames.includes(objname)) {
                Msgs.push(["err",`Object "${objname}" の定義が重複しています。`,filename,ast[i].Obj.name.Id.pos]);
            }
            else {
                ObjNames.push(objname);
                Objs[objname] = ast[i].Obj.val;
            }
            for (let j=0;j<ast[i].Obj.val.length;j++) {
                objelmcnt[ast[i].Obj.val[j].name]++;
                switch (Object.keys(ast[i].Obj.val[j])[0]) {
                    case "ObjFunc":
                        objelmcnt[ast[i].Obj.val[j].ObjFunc.name]++;
                        break;
                    case "ObjConf":
                        objelmcnt.conf++;
                        break;
                    case "ObjFrame":
                        objelmcnt.frame++;
                        break;
                }
            }
            for (let j of Object.keys(objelmcnt)) {
                if (objelmcnt[j]==0) {
                    Msgs.push(["err",`Object "${objname}" に ${j} が必要です。`,filename,ast[i].Obj.pos]);
                }
                if (objelmcnt[j]>1) {
                    Msgs.push(["err",`Object "${objname}" の ${j} は1つにして下さい。`,filename,ast[i].Obj.pos]);
                }
            }
        }
        if (objtype=="Item") {
            const itemname = ast[i].Item.name.Id.val;
            console.log(itemname)
            if (ItemNames.includes(itemname)) {
                Msgs.push(["err",`Item "${itemname}" の定義が重複しています。`,filename,ast[i].Item.name.Id.pos]);
            }
            else {
                ItemNames.push(itemname);
                Items[itemname]  = ast[i].Item.val;
            }
        }
        if (objtype=="Includes") {
            const elms = [];
            for (let elm of ast[i].Includes.val.IncludesBlock.val) {
                elms.push(elm.module.Id);
            }
            Includes = elms;
        }
        if (objtype=="Imports") {
            function keyrec(x) {
                if (Object.keys(x.Key.l)[0]=="Key") {
                    return [...keyrec(x.Key.l),x.Key.r.Id];
                }
                return [x.Key.r.Id]
            }
            const elms = [];
            for (let elm of ast[i].Imports.val.ImportsBlock.val) {
                elms.push([elm.name.Id,keyrec(elm.module)]);
            }
            Imports = elms;
        }
        if (objtype=="Init") {
            Init = ast[i].Init;
        }
    }
    if (objcnt.Includes==0) {Msgs.push(["err",`Includes が必要です。`      ,filename,{start:0,end:0}])}
    if (objcnt.Imports==0) { Msgs.push(["err",`Imports が必要です。`       ,filename,{start:0,end:0}])}
    if (objcnt.Init==0) {    Msgs.push(["err",`Init が必要です。`          ,filename,{start:0,end:0}])}
    if (objcnt.ILObj==0) {   Msgs.push(["err",`TimeLine が必要です。`      ,filename,{start:0,end:0}])}
    if (objcnt.Includes>1) { Msgs.push(["err",`Includes は1つにして下さい。`,filename,{start:0,end:0}])}
    if (objcnt.Imports>1) {  Msgs.push(["err",`Imports は1つにして下さい。` ,filename,{start:0,end:0}])}
    if (objcnt.Init>1) {     Msgs.push(["err",`Init は1つにして下さい。`    ,filename,{start:0,end:0}])}
    if (objcnt.ILObj>1) {    Msgs.push(["err",`TLObj は1つにして下さい。`   ,filename,{start:0,end:0}])}
    return {itemnames:ItemNames,objnames:ObjNames,items:Items,objs:Objs,includes:Includes,imports:Imports,init:Init,timeline:TimeLine};
}

export {init as init};


function evalBlock(block,scope) {
    for (let stat of block.stats) {
        let res = evalExpr(stat,scope);
        if (res.type=="ReturnStat"||res.type=="Return") {
            return res.val;
        }
    }
    return;
}
function evalExpr(expr,scope) {
    if (expr==null) {return}
    const keys = Object.keys(expr);
    if (keys.length!=1) {console.warn("Invalid AST");}
    const key = keys[0];
    const opr = expr[key].opr;
    switch (key) {
        case "Scope":
            return {type:key,val:scope};
        case "String":
        case "Number":
        case "Bool":
            return {type:key,val:expr[key].val};
        case "Function":
            {
                const argname = expr[key].args.map((x)=>{return x.Id.val});
                const bindname = (args)=>{
                    const ret = {}
                    for (let i in argname) {
                        ret[argname[i]] = args[i];
                    }
                    return ret;
                }
                const block = expr[key].val;
                return {type:key,val:(_scope,_args)=>{return evalBlock(block.Block,Object.assign({},_scope,bindname(_args)))}};
            }
        case "Id":
            return {type:key,val:scope[expr[key].val]};
        case "Key":
            const kl = evalExpr(expr[key].l,scope).val;
            return {type:key,val:kl[expr[key].r.Id.val]};
        case "FuncCall":
            let val = evalExpr(expr[key].func,scope).val(scope,expr[key].args.map((x=>{return evalExpr(x).val})))
            return {type:"FuncCall",val:val}
            throw "err1";
        case "UOpr":
            const ur = evalExpr(expr[key].r,scope).val;
            switch (opr) {
                case "!": return {type:key,val:!ur};
                case "+": return {type:key,val:+ur};
                case "-": return {type:key,val:-ur};
                case "√": return Math.sqrt(ur);
            }
            throw "err2";
        case "Opr":
            const l = evalExpr(expr[key].l,scope).val;
            const r = evalExpr(expr[key].r,scope).val;
            switch (opr) {
                case "&&": return {type:key,val:l&&r};
                case "||": return {type:key,val:l||r};
                case "=":  return {type:key,val:l==r};
                case "==": return {type:key,val:l===r};
                case "!=": return {type:key,val:l!=r};
                case "!==":return {type:key,val:l!==r};
                case "<":  return {type:key,val:l<r};
                case "<=": return {type:key,val:l<=r};
                case ">":  return {type:key,val:l>r};
                case ">=": return {type:key,val:l>=r};
                case "+":  return {type:key,val:l+r};
                case "-":  return {type:key,val:l-r};
                case "*":  return {type:key,val:l*r};
                case "/":  return {type:key,val:l/r};
                case "%":  return {type:key,val:l%r};
                case "^":  return {type:key,val:l**r};
                case "??":  return {type:key,val:l??r};
            }
            throw "err3";
        case "Object":
            {
                const obj = {};
                for (let e of expr[key].val) {
                    let _key = e.key.Id.val;
                    if (_key in obj) {
                        throw "既にキーが存在します";
                    }
                    obj[_key] = evalExpr(e.val,scope).val
                }
                //evalExpr(.expr,scope).val;
                return {type:key,val:obj};
            }
        case "Stat":
            evalExpr(expr[key].expr,scope).val;
            return {type:key};
        case "AStat":
            delete evalExpr(expr[key].loc.Key.l,scope).val[expr[key].loc.Key.r.Id.val];
            evalExpr(expr[key].loc.Key.l,scope).val[expr[key].loc.Key.r.Id.val] = evalExpr(expr[key].expr,scope).val;
            return {type:key};
        case "MLTAStat":
            delete evalExpr(expr[key].loc.Key.l,scope).val[expr[key].loc.Key.r.Id.val];
            evalExpr(expr[key].loc.Key.l,scope).val[expr[key].loc.Key.r.Id.val] = expr[key].val;
            return {type:key};
        case "ReturnStat":
            return {type:key,val:evalExpr(expr[key].expr,scope).val};
        case "Return":
            return {type:key};
    }
    console.log(scope)
    throw( Error(`NVGL Eval Error: ${key}`) );
}