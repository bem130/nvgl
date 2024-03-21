
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
            return expr[key];
        case "Var":
            return scope[expr[key]];
        case "Key":
            const kl = evalNVGL(expr[key][0],scope);
            return kl[expr[key][1]];
        case "UOpr":
            const ur = evalNVGL(expr[key][1],scope);
            switch (opr) {
                case "!": return !ur;
                case "+": return +ur;
                case "-": return -ur;
                case "√": return Math.sqrt(ur);
            }
        case "Opr":
            const l = evalNVGL(expr[key][1],scope);
            const r = evalNVGL(expr[key][2],scope);
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
            const exprres = evalNVGL(expr[key],scope);
            console.log("expr res",exprres)
            return exprres;
        case "Stat":
            const el = evalNVGL(expr[key][1],scope);
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

export default evalNVGL;