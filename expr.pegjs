{
    let mode = options.mode??"js";
    function Res(parse,js,evalu) {
        switch (mode) {
            case "parse":
                return parse;
            case "js":
                return js;
            case "eval":
                return evalu;
        }
    }
    let variables = options.vars??{};
}

start
    = stat2

stat1
    = "return" s v:top s? ";" {return Res(mode=="parse"?{group:"stat",type:"return",expr:v,eval:v.eval}:null,`return ${v};`,mode=="eval"?v:null)}
    / n:name s? "<:" s? v:top s? ";" {return Res(mode=="parse"?{group:"stat",type:"assign",assign:n,expr:v,eval:v.eval}:null,`${n} = ${v};`,mode=="eval"?v:null)}
    / v:top s? ";" {return Res(mode=="parse"?{group:"stat",type:"expr",expr:v,eval:v.eval}:null,`${v};`,mode=="eval"?v:null)}

stat2
    = "return" s v:top s? ";"? {return Res(mode=="parse"?{group:"stat",type:"return",expr:v,eval:v.eval}:null,`return ${v};`,mode=="eval"?v:null)}
    / n:name s? "<:" s? v:top s? ";"? {return Res(mode=="parse"?{group:"stat",type:"assign",assign:n,expr:v,eval:v.eval}:null,`${n} = ${v};`,mode=="eval"?v:null)}
    / v:top s? ";"? {return Res(mode=="parse"?{group:"stat",type:"expr",expr:v,eval:v.eval}:null,`${v};`,mode=="eval"?v:null)}

top
    = l9

l0
    = s? "(" v:top s? ")" {return Res({group:"group",expr:v,eval:mode=="parse"?(v.eval):null},`(${v})`,mode=="eval"?(v):null)}
    / literal
    / name_

l1
    = l:l0 c:l1cont {return c(l)}
    / l0
l1cont
    = s? "::" r:name c:l1cont {return (l)=>{return c(Res({group:"call",l:l,r:r,type:"::",eval:(mode=="parse"?(l.eval[r.eval]):null)},`${l}[${r}]`,mode=="eval"?(l[r]):null))}}
    / s? ":[" r:top "]" c:l1cont {return (l)=>{return c(Res({group:"call",l:l,r:r,type:":[]",eval:(mode=="parse"?(l.eval[r.eval]):null)},`${l}[${r}]`,mode=="eval"?(l[r]):null))}}
    / s? "(" r:top ")" c:l1cont {return (l)=>{return c(Res({group:"call",l:l,r:r,type:"()",eval:(mode=="parse"?(l.eval(r.eval)):null)},`${l}(${r})`,mode=="eval"?(l(r)):null))}}
    / s? "@(" r:top ")" c:l1cont {return (l)=>{return c(Res({group:"call",l:l,r:r,type:"@()",eval:(mode=="parse"?(new l.eval(r.eval)):null)},`new ${l}(${r})`,mode=="eval"?(new l(r)):null))}}
    / s_? {return (l)=>{return l}}

l2
    = l1

l3
    = s? "!" v:l4 {return Res({group:"opr",r:v,type:"_!",eval:mode=="parse"?(!v.eval):null},`(!${v})`,mode=="eval"?(!v):null)}
    / s? "+" v:l4 {return Res({group:"opr",r:v,type:"_+",eval:mode=="parse"?(+v.eval):null},`+${v}`,mode=="eval"?(+v):null)}
    / s? "-" v:l4 {return Res({group:"opr",r:v,type:"_-",eval:mode=="parse"?(-v.eval):null},`-${v}`,mode=="eval"?(-v):null)}
    / s? "√" v:l4 {return Res({group:"opr",r:v,type:"_√",eval:mode=="parse"?(Math.sqrt(v.eval)):null},`(Math.sqrt(${v}))`,mode=="eval"?(Math.sqrt(v)):null)}
    / l2


l4
    = l:l3 "^" r:l4 {return Res({group:"opr",l:l,r:r,type:"^",eval:mode=="parse"?(l.eval**r.eval):null},`(${l}**${r})`,mode=="eval"?(l**r):null)}
    / l3

l5
    = l:l4 c:l5cont {return c(l)}
    / l4
l5cont
    = s? "*" r:l4 c:l5cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"*",eval:mode=="parse"?(l.eval*r.eval):null},`${l}*${r}`,mode=="eval"?(l*r):null))}}
    / s? "/" r:l4 c:l5cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"/",eval:mode=="parse"?(l.eval/r.eval):null},`${l}/${r}`,mode=="eval"?(l/r):null))}}
    / s? "%" r:l4 c:l5cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"%",eval:mode=="parse"?(l.eval%r.eval):null},`${l}%${r}`,mode=="eval"?(l%r):null))}}
    / s_? {return (l)=>{return l}}

l6
    = l:l5 c:l6cont {return c(l)}
    / l5
l6cont
    = s? "+" r:l5 c:l6cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"+",eval:mode=="parse"?(l.eval+r.eval):null},`${l}+${r}`,mode=="eval"?(l+r):null))}}
    / s? "-" r:l5 c:l6cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"-",eval:mode=="parse"?(l.eval-r.eval):null},`${l}-${r}`,mode=="eval"?(l-r):null))}}
    / s_? {return (l)=>{return l}}

l7
    = l:l6 c:l7cont {return c(l)}
    / l6
l7cont
    = s? "<" r:l6 c:l7cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"<",eval:mode=="parse"?((l.eval)<(r.eval)):null},`(${l})<(${r})`,mode=="eval"?((l)<(r)):null))}}
    / s? "<=" r:l6 c:l7cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"<=",eval:mode=="parse"?((l.eval)<=(r.eval)):null},`(${l})<=(${r})`,mode=="eval"?((l)<=(r)):null))}}
    / s? ">" r:l6 c:l7cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:">",eval:mode=="parse"?((l.eval)>(r.eval)):null},`(${l})>(${r})`,mode=="eval"?((l)>(r)):null))}}
    / s? ">=" r:l6 c:l7cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:">=",eval:mode=="parse"?((l.eval)>=(r.eval)):null},`(${l})>=(${r})`,mode=="eval"?((l)>=(r)):null))}}
    / s_? {return (l)=>{return l}}

l8
    = l:l7 c:l8cont {return c(l)}
    / l7
l8cont
    = s? "=" r:l7 c:l8cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"=",eval:mode=="parse"?((l.eval)==(r.eval)):null},`(${l})==(${r})`,mode=="eval"?((l)==(r)):null))}}
    / s? "!=" r:l7 c:l8cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"!=",eval:mode=="parse"?((l.eval)!=(r.eval)):null},`(${l})!=(${r})`,mode=="eval"?((l)!=(r)):null))}}
    / s? "==" r:l7 c:l8cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"==",eval:mode=="parse"?((l.eval)===(r.eval)):null},`(${l})===(${r})`,mode=="eval"?((l)===(r)):null))}}
    / s? "!==" r:l7 c:l8cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"!==",eval:mode=="parse"?((l.eval)!==(r.eval)):null},`(${l})!==(${r})`,mode=="eval"?((l)!==(r)):null))}}
    / s_? {return (l)=>{return l}}

l9
    = l:l8 c:l9cont {return c(l)}
    / l8
l9cont
    = s? "&&" r:l8 c:l9cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"&&",eval:mode=="parse"?((l.eval)==(r.eval)):null},`(${l})&&(${r})`,mode=="eval"?((l)&&(r)):null))}}
    / s? "||" r:l8 c:l9cont {return (l)=>{return c(Res({group:"opr",l:l,r:r,type:"||",eval:mode=="parse"?((l.eval)||(r.eval)):null},`(${l})||(${r})`,mode=="eval"?((l)||(r)):null))}}
    / s_? {return (l)=>{return l}}


s
    = " "+
s_
    = " "

literal
    = v:number {return v}
    / v:boolean {return v}
    / v:string {return v}
    / v:array {return v}
    / v:object {return v}

key
    = v:number {return v}
    / v:name {return v}
    / v:string {return v}

number
    = int:[0-9]+ "." dec:[0-9]+ {
        let ret = int.join("")+"."+dec.join("")
        return Res({group:"literal",type:"num",value:ret,eval:Number(ret)},ret,Number(ret))
    }
    / int:[0-9]+ { return Res({group:"literal",type:"num",value:int.join(""),eval:Number(int.join(""))},int.join(""),Number(int.join(""))) }

boolean
    = "true" {return Res({group:"literal",type:"bool",value:"true",eval:true},`true`,true)}
    / "true" {return Res({group:"literal",type:"bool",value:"false",eval:true},`false`,false)}

string
    = "\"" content:([a-zA-Z]*) "\"" {return Res({group:"literal",type:"str",value:content.join(""),eval:content.join("")},`'${content.join("")}'`,content.join(""))}

name_
    = content:([a-zA-Z]+) {
        let ret = content.join("");
        return Res(
            {group:"name",value:ret,eval:variables[ret]},
            ret,
            variables[ret]
        )}
name
    = content:([a-zA-Z]+) {let ret = content.join("");return Res({group:"name",value:ret,eval:ret},`"${ret}"`,ret)}

array
    = "{" v:( top "," )* v2:top? "}" {
        let ret = v.map((x)=>{return x[0]})
        if (v2!=null) {ret.push(v2)}
        return Res({group:"literal",type:"arr",eval:ret},"["+ret.join(",")+"]",ret)
    }

object
    = "{" v:( key ":" top "," )* v2:( key ":" top )? "}" {
        let ret = {};
        let ret2 = [];
        if (mode=="eval") {
            for (let x of v) {ret[x[0]]=x[2]}
            if (v2!=null) {ret[v2[0]]=v2[2]}
        }
        else if (mode=="parse") {
            for (let x of v) {ret[x[0].eval]=x[2].eval}
            if (v2!=null) {ret[v2[0].eval]=v2[2].eval}
        }
        else if (mode=="js") {
            ret2 = v.map((x)=>{return [x[0],x[2]]})
            if (v2!=null) {ret2.push([v2[0],v2[2]])}
        }
        return Res({group:"literal",type:"obj",eval:ret},"{"+ret2.map((x)=>{return `${x[0]}:${x[1]}`}).join(",")+"}",ret)
    }