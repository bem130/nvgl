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


async function init(ast,filename,scope,code,importsDir) {
    const Msgs = [];
    const astcheck = await ASTchecker(ast,filename,Msgs);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    scope = await resolveIncludes(ast,filename,Msgs,scope);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    scope = await resolveImports(ast,filename,Msgs,astcheck.imports,scope,importsDir);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    scope = await runInit(ast,filename,Msgs,astcheck.init,scope);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    scope = await makeItems(ast,filename,Msgs,astcheck.items,scope);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    const timeline = await initTimeLine(ast,filename,Msgs,astcheck.timeline,astcheck.objs,scope);
    if (countErr(Msgs)) { return {type:"err",val:err2txt(Msgs,code),msgs:Msgs}; }
    return {type:"ok",scope:scope,msgs:Msgs,timeline:timeline,msgstxt:err2txt(Msgs,code)}
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

async function resolveImports(ast,filename,Msgs,imports,scope,importsDir) {
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
            await module.init();
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
    let ret = (await evalBlock(init.val.Block,Object.assign({},scope),true)).val;
    console.log("Init",ret)
    return Object.assign(scope,ret);
}

async function makeItems(ast,filename,Msgs,items,scope) {
    let ret = {}
    for (let n of Object.keys(items)) {
        console.log(items[n])
        ret[n] = (await evalBlock(items[n].Block,Object.assign({},scope),true)).val;
    }
    return Object.assign(scope,ret);
}

async function initTimeLine(ast,filename,Msgs,timeline,objs,scope) {
    console.log(timeline)
    console.log(objs)
    let ret = []
    for (let obj of timeline) {
        const objname = obj.TLObjStat.objname.Id.val;
        const tobj = objs[objname];
        const ret_obj = {type:obj.TLObjStat.objname.Id.val};
        ret.push(ret_obj);
        // args
        const args = {}
        for (let a of obj.TLObjStat.args) {
            if (a.key.Id.val in args) {
                Msgs.push(["warn",`引数 "${a.key.Id.val}" が複数宣言されています。`,filename,a.pos]);
            }
            args[a.key.Id.val] = (await evalExpr(a.val,Object.assign({},scope))).val;
        }
        console.log("ObjInitScope",args)
        // ObjConf
        const objconf = await evalObjConf(tobj.ObjConf,scope);
        ret_obj.conf = Object.assign(objconf,args);
        // init
        if (tobj.init!=null) {
            ret_obj.init = (await evalBlock(tobj.init.Block,Object.assign({},scope,ret_obj.conf),true)).val;
        } else { ret_obj.init = {}; }
        // length
        ret_obj.range = (await evalBlock(tobj.range.Block,Object.assign({},scope,ret_obj.conf,ret_obj.init),true)).val;
        // tlconf
        if (tobj.tlconf!=null) {
            ret_obj.tlconf = (await evalBlock(tobj.tlconf.Block,Object.assign({},scope,ret_obj.conf,ret_obj.init),true)).val;
        } else { ret_obj.tlconf = {}; }
        // audio
        if (tobj.audio!=null) {
            ret_obj.audio = (await evalBlock(tobj.audio.Block,Object.assign({},scope,ret_obj.conf,ret_obj.init),true)).val;
        } else { ret_obj.audio = null; }
        // frame
        console.log(tobj)
        const argname = tobj.ArgName;
        const frameblock = tobj.ObjFrame.Block;
        console.log(frameblock)
        const framescope = Object.assign({},scope,ret_obj.conf,ret_obj.init);
        ret_obj.frameFunc = async(frame)=>{const arg={};arg[argname]=frame;const ret = (await evalBlock(frameblock,Object.assign({},framescope,arg),true)).val;return ret;};
    }
    console.log("TimeLine",ret)
    return ret;
}
async function evalObjConf(ObjConf,scope) {
    let ret = {};
    for (let e of ObjConf) {
        switch (Object.keys(e)[0]) {
            case "ObjConfGElm":
                ret[e.ObjConfGElm.name] = (await evalExpr(e.ObjConfGElm.val,scope)).val;
                break;
            case "ObjConfRElm":
                ret[e.ObjConfRElm.name] = await evalObjConf(e.ObjConfRElm.val);
                break;
        }
    }
    return ret;
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
            const objelmcnt = {conf:0,init:0,range:0,tlconf:0,audio:0,frame:0};
            if (ObjNames.includes(objname)) {
                Msgs.push(["err",`Object "${objname}" の定義が重複しています。`,filename,ast[i].Obj.name.Id.pos]);
            }
            else {
                ObjNames.push(objname);
                //Objs[objname] = ast[i].Obj.val;
            }
            Objs[objname] = {};
            for (let j=0;j<ast[i].Obj.val.length;j++) {
                objelmcnt[ast[i].Obj.val[j].name]++;
                switch (Object.keys(ast[i].Obj.val[j])[0]) {
                    case "ObjFunc":
                        Objs[objname][ast[i].Obj.val[j].ObjFunc.name] = ast[i].Obj.val[j].ObjFunc.val;
                        objelmcnt[ast[i].Obj.val[j].ObjFunc.name]++;
                        break;
                    case "ObjConf":
                        Objs[objname].ObjConf = ast[i].Obj.val[j].ObjConf.val;
                        objelmcnt.conf++;
                        break;
                    case "ObjFrame":
                        Objs[objname].ObjFrame = ast[i].Obj.val[j].ObjFrame.val;
                        objelmcnt.frame++;
                        Objs[objname].ArgName = ast[i].Obj.val[j].ObjFrame.arg;
                        break;
                }
            }
            for (let j of Object.keys(objelmcnt)) {
                if (objelmcnt[j]==0) {
                    if (["conf","range","frame"].includes(j)) {
                        Msgs.push(["err",`Object "${objname}" に ${j} が必要です。`,filename,ast[i].Obj.pos]);
                    }
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
                if (Object.keys(x.Key1.l)[0]=="Key") {
                    return [...keyrec(x.Key1.l),x.Key1.r.Id];
                }
                return [x.Key1.r.Id]
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
        if (objtype=="TLObj") {
            TimeLine = ast[i].TLObj.val;
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

async function evalBlock(block,scope,fntop=false) {
    for (let stat of block.stats) {
        let res = await evalExpr(stat,scope);
        if (res.type=="ReturnStat"||res.type=="Return") {
            return res;
        }
        if (fntop&&(res.type=="Break"||res.type=="Continue")) {
            return res;
        }
    }
    return {type:"Block"};
}

async function evalExpr(expr,scope) {
    if (expr==null) {return}
    const keys = Object.keys(expr);
    if (keys.length!=1) {console.warn("Invalid AST");}
    const key = keys[0];
    const opr = expr[key].opr;
    switch (key) {
        case "Scope":
            return {type:key,val:scope};
        case "String":
            return {type:key,val:expr[key].val};
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
                return {type:key,val:async(_scope,_args)=>{return (await evalBlock(block.Block,Object.assign({},_scope,bindname(_args)),true)).val}};
            }
        case "Id":
            return {type:key,val:scope[expr[key].val]};
        case "Key1":
            {
                const kl = (await evalExpr(expr[key].l,scope)).val;
                return {type:key,val:kl[expr[key].r.Id.val]};
            }
        case "Key2":
            {
                const kl = (await evalExpr(expr[key].l,scope)).val;
                const kr = (await evalExpr(expr[key].r,scope)).val;
                return {type:key,val:kl[kr]};
            }
        case "FuncCall":
            let val = await ((await evalExpr(expr[key].func,scope)).val)(scope,await Promise.all(expr[key].args.map((async (x)=>{return (await evalExpr(x,scope)).val}))))
            return {type:"FuncCall",val:val}
        case "UOpr":
            const ur = (await evalExpr(expr[key].r,scope)).val;
            switch (opr) {
                case "!": return {type:key,val:!ur};
                case "+": return {type:key,val:+ur};
                case "-": return {type:key,val:-ur};
                case "√": return Math.sqrt(ur);
            }
            throw "err2";
        case "Opr":
            const l = (await evalExpr(expr[key].l,scope)).val;
            const r = (await evalExpr(expr[key].r,scope)).val;
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
                    obj[_key] = (await evalExpr(e.val,scope)).val
                }
                //evalExpr(.expr,scope).val;
                return {type:key,val:obj};
            }
        case "Array":
            {
                const arr = [];
                for (let e of expr[key].val) {
                    arr.push((await evalExpr(e,scope)).val);
                }
                return {type:key,val:arr};
            }
        case "If":
            {
                const _scope = Object.assign({},scope);
                for (let i of expr[key].val) {
                    if ((await evalExpr(i.cond,_scope)).val) {
                        const res = (await evalBlock(i.block.Block,_scope));
                        if (res.type=="ReturnStat"||res.type=="Return") {return res;}
                        for (let i of Object.keys(scope)) {scope[i] = _scope[i];}
                        return {type:"if"};
                    }
                }
                // const kl = evalExpr(expr[key].l,scope).val;
                // return {type:key,val:kl[expr[key].r.Id.val]};
                return {type:"if"};
            }
        case "While":
            {
                const _scope = Object.assign({},scope);
                while (true) {
                    if ((await evalExpr(expr[key].cond,_scope)).val) {
                        const res = await evalBlock(expr[key].block.Block,_scope);
                        if (res.type=="ReturnStat"||res.type=="Return") {return res;}
                    }
                    else {
                        for (let i of Object.keys(scope)) {scope[i] = _scope[i];}
                        break;
                    }
                }
                return {type:"While"};
            }
        case "Times":
            {
                console.warn(expr[key])
                const _scope = Object.assign({},scope);
                const num = (await evalExpr(expr[key].num,_scope)).val;
                let count = 0;
                while (count<num) {
                    const res = (await evalBlock(expr[key].block.Block,_scope));
                    if (res.type=="ReturnStat"||res.type=="Return") {return res;}
                    count++;
                }
                for (let i of Object.keys(scope)) {scope[i] = _scope[i];}
                return {type:"Times"};
            }
        case "TimesAs":
            {
                console.warn(expr[key])
                const _scope = Object.assign({},scope);
                const num = (await evalExpr(expr[key].num,_scope)).val;
                let count = 0;
                while (count<num) {
                    _scope[expr[key].loc.Id.val] = count;
                    const res = await evalBlock(expr[key].block.Block,_scope);
                    if (res.type=="ReturnStat"||res.type=="Return") {return res;}
                    count++;
                }
                for (let i of Object.keys(scope)) {scope[i] = _scope[i];}
                return {type:"Times"};
            }
        case "Stat":
            (await evalExpr(expr[key].expr,scope)).val;
            return {type:key};
        case "AStat":
            {
                const res = (await evalExpr(expr[key].expr,scope)).val;
                (await evalExpr(expr[key].loc.Key1.l,scope)).val[expr[key].loc.Key1.r.Id.val] = res;
                return {type:key};
            }
        case "MLTAStat":
            {
                (await evalExpr(expr[key].loc.Key1.l,scope)).val[expr[key].loc.Key1.r.Id.val] = expr[key].val;
                return {type:key};
            }
        case "ReturnStat":
            return {type:key,val:(await evalExpr(expr[key].expr,scope)).val};
        case "Return":
            return {type:key};
    }
    console.log(scope)
    throw( Error(`NVGL Eval Error: ${key}`) );
}

export {init as init,err2txt};