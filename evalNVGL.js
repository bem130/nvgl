
function evalNVGL(expr,scope) {
    if (expr==null) {return}
    const keys = Object.keys(expr);
    if (keys.length!=1) {console.warn("Invalid AST");}
    const key = keys[0];
    const opr = expr[key][0];
    switch (key) {
        case "String":
        case "Number":
            return expr[key];
        case "Var":
            return scope[expr[key]];
        case "Key":
            const kl = evalNVGL(expr[key][0],scope);
            console.log(kl,expr[key][1])
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
            return evalNVGL(expr[key],scope);
    }
    throw( Error(`NVGL Eval Error: ${key}`) );
}

export default evalNVGL;