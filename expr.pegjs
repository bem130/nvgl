{
    let mode = options.mode??"js";
    function resSwitch(parse,js) {
        return mode=="js"?js:parse;
    }
}

start
    = stat2

stat1
    = "return" s v:top s? ";" {return resSwitch({type:"return",expr:v},`return ${v};`)}
    / n:name s? "<:" s? v:top s? ";" {return resSwitch({type:"assign",assign:n,expr:v},`${n} = ${v};`)}
    / v:top s? ";" {return resSwitch({type:"expr",expr:v},`${v};`)}

stat2
    = "return" s v:top s? ";"? {return resSwitch({type:"return",expr:v},`return ${v};`)}
    / n:name s? "<:" s? v:top s? ";"? {return resSwitch({type:"assign",assign:n,expr:v},`${n} = ${v};`)}
    / v:top s? ";"? {return resSwitch({type:"expr",expr:v},`${v};`)}

top
    = l9

l0
    = s? "(" v:top s? ")" {return v}
    / literal
    / name

l1
    = l:l0 c:l1cont {return c(l)}
    / l0
l1cont
    = s? "::" r:l0 c:l1cont {return (l)=>{return c(resSwitch([l,r,"::"],`(${l}).${r}`))}}
    / s? {return (l)=>{return l}}

l2
    = l1

l3
    = s? "+" v:l4 {return resSwitch(["+",v],`+(${v})`)}
    / s? "-" v:l4 {return resSwitch(["-",v],`-(${v})`)}
    / l2


l4
    = l:l3 "^" r:l4 {return resSwitch([l,r,"^"],`${l}**(${r})`)}
    / l3

l5
    = l:l4 c:l5cont {return c(l)}
    / l4
l5cont
    = s? "*" r:l4 c:l5cont {return (l)=>{return c(resSwitch([l,r,"*"],`(${l}*${r})`))}}
    / s? "/" r:l4 c:l5cont {return (l)=>{return c(resSwitch([l,r,"/"],`(${l}/${r})`))}}
    / s? "%" r:l4 c:l5cont {return (l)=>{return c(resSwitch([l,r,"%"],`(${l}%${r})`))}}
    / s? {return (l)=>{return l}}

l6
    = l:l5 c:l6cont {return c(l)}
    / l5
l6cont
    = s? "+" r:l5 c:l6cont {return (l)=>{return c(resSwitch([l,r,"+"],`(${l}+${r})`))}}
    / s? "-" r:l5 c:l6cont {return (l)=>{return c(resSwitch([l,r,"-"],`(${l}-${r})`))}}
    / s? {return (l)=>{return l}}

l7
    = l:l6 c:l7cont {return c(l)}
    / l6
l7cont
    = s? "<" r:l6 c:l7cont {return (l)=>{return c(resSwitch([l,r,"<"],`(${l}<${r})`))}}
    / s? "<" r:l6 c:l7cont {return (l)=>{return c(resSwitch([l,r,"<="],`(${l}<=${r})`))}}
    / s? ">" r:l6 c:l7cont {return (l)=>{return c(resSwitch([l,r,">"],`(${l}>${r})`))}}
    / s? ">=" r:l6 c:l7cont {return (l)=>{return c(resSwitch([l,r,">="],`(${l}>=${r})`))}}
    / s? {return (l)=>{return l}}

l8
    = l:l7 c:l8cont {return c(l)}
    / l7
l8cont
    = s? "=" r:l7 c:l8cont {return (l)=>{return c(resSwitch([l,r,"="],`(${l}==${r})`))}}
    / s? "!=" r:l7 c:l8cont {return (l)=>{return c(resSwitch([l,r,"!="],`(${l}!=${r})`))}}
    / s? "==" r:l7 c:l8cont {return (l)=>{return c(resSwitch([l,r,"=="],`(${l}===${r})`))}}
    / s? "!==" r:l7 c:l8cont {return (l)=>{return c(resSwitch([l,r,"!=="],`(${l}!==${r})`))}}
    / s? {return (l)=>{return l}}

l9
    = l8



s
    = " "+

literal
    = v:number {return v}
    / v:boolean {return v}
    / v:string {return v}
    / v:array {return v}
    / v:object {return v}
    / v:function {return v}

key
    = v:number {return Number(v)}
    / v:string {return v}

number
    = integer_part:[0-9]+ "." decimal_part:[0-9]+ { return resSwitch({type:"num",value:integer_part.join("")+"."+decimal_part.join("")},integer_part.join("")+"."+decimal_part.join("")) }
    / integer_part:[0-9]+ { return resSwitch({type:"num",value:integer_part.join("")},integer_part.join("")) }

boolean
    = "true" {return resSwitch({type:"bool",value:"true"},`true`)}
    / "true" {return resSwitch({type:"bool",value:"false"},`false`)}

string
    = "\"" content:([a-z]*) "\"" {return resSwitch({type:"str",value:content.join("")},`'${content.join("")}'`)}

name
    = content:([a-z]+) {return resSwitch({type:"name",value:content.join("")},content.join(""))}

array
    = "{" v:( literal "," )* v2:literal? "}" {
        let ret = v.map((x)=>{return x[0]})
        if (v2!=null) {ret.push(v2)}
        return resSwitch({type:"arr",val:ret},"["+ret.join(",")+"]")
    }

object
    = "{" v:( key ":" literal "," )* v2:( key ":" literal )? "}" {
        let ret = v.map((x)=>{return [x[0],x[2]]})
        if (v2!=null) {ret.push([v2[0],v2[2]])}
        return resSwitch({type:"obj",val:ret},"{"+ret.map((x)=>{return `${x[0]}: ${x[1]}`}).join(",")+"}")
    }

function
    = "@" "(" args:( name "," )* larg:name? ")" "{" e:(stat1)* e2:stat2? "}" {
        let ret1 = larg==null?[]:args.map((x)=>{return x[0]}).concat(larg)
        let ret2 = e;
        if (e2!=null) {ret2.push(e2)}
        return resSwitch([ret1,ret2],`(${ret1.join(",")})=>{${ret2.join("")}}`)
    }