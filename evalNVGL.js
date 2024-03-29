
function evalNVGL(expr,scope) {
    if (expr==null) {return}
    const keys = Object.keys(expr);
    if (keys.length!=1) {console.warn("Invalid AST");}
    const key = keys[0];
    const opr = expr[key][0];
    switch (key) {
        case "Null":
            return null;
        case "Scope":
            return scope;
        case "String":
        case "Number":
        case "Bool":
            return expr[key][0];
        case "Var":
            return scope[expr[key][0]];
        case "Key":
            const kl = evalNVGL(expr[key][0][0],scope);
            return kl[expr[key][0][1]];
        case "UOpr":
            const ur = evalNVGL(expr[key][0][1],scope);
            switch (opr) {
                case "!": return !ur;
                case "+": return +ur;
                case "-": return -ur;
                case "√": return Math.sqrt(ur);
            }
        case "Opr":
            const l = evalNVGL(expr[key][0][1],scope);
            const r = evalNVGL(expr[key][0][2],scope);
            switch (opr) {
                case "&&": return l&&r;
                case "||": return l||r;
                case "=": return l==r;
                case "==": return l===r;
                case "!=": return l!=r;
                case "!==": return l!==r;
                case "<": return l<r;
                case "<=": return l<=r;
                case ">": return l>r;
                case ">=": return l>=r;
                case "+": return l+r;
                case "-": return l-r;
                case "*": return l*r;
                case "/": return l/r;
                case "%": return l%r;
                case "^": return l**r;
            }
        case "Expr":
            const exprres = evalNVGL(expr[key][0][0],scope);
            console.log("expr res",exprres)
            return exprres;
        case "Stat":
            const el = evalNVGL(expr[key][0][1],scope);
            switch (Object.keys(expr[key][0])[0]) {
                case "Null":
                    return;
                case "Key":
                    const t = expr[key][0].Key;
                    const base = evalNVGL(t[0],scope);
                    const name = t[1];
                    base[name] = el;
                    return;
            }
            // let lv = evalNVGL(expr[key][0],scope);
            // const ev = evalNVGL(expr[key][1],scope);
            // lv = ev;
            // console.log(lv,ev,scope);
            // return ev;
    }
    throw( Error(`NVGL Eval Error: ${key}`) );
}
function init(ast) {
    const astcheck = ASTchecker(ast);
    const errmsgs = astcheck.err;
    if (errmsgs.length>0) {
        return errmsgs;
    }
    return "init";
}

function ASTchecker(ast) {
    const errmsgs = [];
    const objcnt = {Includes:0,Imports:0,Init:0,Item:0,Obj:0,TLObj:0};
    const ItemNames = [];
    const ObjNames = [];
    for (let i=0;i<ast.length;i++) {
        const objtype = Object.keys(ast[i])[0];
        objcnt[objtype]++;
        if (objtype=="Obj") {
            const objname = ast[i].Obj.name.Id.val;
            const objelmcnt = {init:0,length:0,tlconf:0,frame:0}
            if (ObjNames.includes(objname)) {
                errmsgs.push(`Object "${objname}" の定義が重複しています。`);
            }
            else {
                ObjNames.push(objname);
            }
            for (let j=0;j<ast[i].Obj.val.length;j++) {
                objelmcnt[ast[i].Obj.val[j].name]++;
            }
            for (let j of Object.keys(objelmcnt)) {
                if (objelmcnt[j]==0) {
                    errmsgs.push(`Object "${objname}" に ${j} が必要です。`);
                }
                if (objelmcnt[j]>1) {
                    errmsgs.push(`Object "${objname}" の ${j} は1つにして下さい。`);
                }
            }
        }
        if (objtype=="Item") {
            const itemname = ast[i].Item.name.Id.val;
            console.log(itemname)
            if (ItemNames.includes(itemname)) {
                errmsgs.push(`Item "${itemname}" の定義が重複しています。`);
            }
            else {
                ItemNames.push(itemname);
            }
        }
    }
    if (objcnt.Includes==0) {errmsgs.push("Includes が必要です。")}
    if (objcnt.Imports==0) {errmsgs.push("Imports が必要です。")}
    if (objcnt.Init==0) {errmsgs.push("Init が必要です。")}
    if (objcnt.ILObj==0) {errmsgs.push("TimeLine が必要です。")}
    if (objcnt.Includes>1) {errmsgs.push("Includes は1つにして下さい。")}
    if (objcnt.Imports>1) {errmsgs.push("Imports は1つにして下さい。")}
    if (objcnt.Init>1) {errmsgs.push("Init は1つにして下さい。")}
    if (objcnt.ILObj>1) {errmsgs.push("TimeLine は1つにして下さい。")}
    return {err:errmsgs,itemnames:ItemNames,objnames:ObjNames};
}

export {init as init};
export default evalNVGL;