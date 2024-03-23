var mermaid;
var code = "";

async function loadmodule() {
    const module = await import("https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.esm.mjs");
    mermaid = module.default;
    mermaid.initialize({
        securityLevel: "loose",
    });
}


var dec_id = 0;
function ScopeMarker(start,end) {
    input.deltaDecorations(dec_id,[])
    const decorations = []
    console.log(getLineAndCol(start),getLineAndCol(end))
    decorations.push({range: new monaco.Range(...getLineAndCol(start),...getLineAndCol(end)),options:{inlineClassName: 'nvgl_scope'}})
    dec_id = input.deltaDecorations([],decorations)
}

function getLineAndCol(i) {
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

function drawGraphView(obj,_code,graphview) {
    code = _code;
    graphview.removeAttribute('data-processed');
    graphview.innerHTML = "";
    const graphDefinition = {main:`%%{init:{'theme':'dark'}}%%\ngraph TD\n!(root)\nclick ! call ScopeMarker(0,${code.length})\n`};
    addGraphObj(graphDefinition,obj,"!",0);
    console.log(graphDefinition.main)
    graphview.innerHTML = graphDefinition.main;
    mermaid.init();
}
function addGraphObj(txt,obj,name,i) {
    if (obj==null) {return}
    const keys = Object.keys(obj);
    console.log(keys)
    if (keys.length!=1) {console.warn("Invalid AST");}
    const key = keys[0];
    const val = obj[key];
    switch (key) {
        case "String":
        case "Number":
            txt.main += `${name} --${key}--> ${name}${i}(${val.val})\n`;
            break;
        case "Var":
            txt.main += `${name} --var--> ${name}${i}(${val})\n`;
            break;
        case "UOpr":
            txt.main += `${name} --> ${name}${i}["${val.opr}""]\n`;
            addGraphObj(txt,val.r,`${name}${i}`,"r");
            break;
        case "Opr":
            txt.main += `${name} --> ${name}${i}["${val.opr}"]\n`;
            addGraphObj(txt,val.l,`${name}${i}`,"l");
            addGraphObj(txt,val.r,`${name}${i}`,"r");
            break;
        case "Stat":
            txt.main += `${name} --> ${name}${i}["Stat"]\n`;
            console.log(obj,key)
            addGraphObj(txt,val.expr,`${name}${i}`,"e");
            break;
    }
    txt.main += `click ${name}${i} call ScopeMarker(${val.pos.start},${val.pos.end})\n`;
}


export {loadmodule as init, ScopeMarker};
export default drawGraphView;