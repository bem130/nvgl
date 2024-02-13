{
    let mode = options.mode??"js";
    function resSwitch(parse,js) {
        return mode=="js"?js:parse;
    }
}


start
    = v:top s? {return v}

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
    = l:l3 c:l4cont {return c(l)}
    / l3
l4cont
    = s? "*" r:l3 c:l4cont {return (l)=>{return c(resSwitch([l,r,"*"],`(${l})*(${r})`))}}
    / s? "/" r:l3 c:l4cont {return (l)=>{return c(resSwitch([l,r,"/"],`(${l})/(${r})`))}}
    / s? {return (l)=>{return l}}

l5
    = l4

l6
    = l:l5 c:l6cont {return c(l)}
    / l5
l6cont
    = s? "+" r:l5 c:l6cont {return (l)=>{return c(resSwitch([l,r,"+"],`(${l})+(${r})`))}}
    / s? "-" r:l5 c:l6cont {return (l)=>{return c(resSwitch([l,r,"-"],`(${l})-(${r})`))}}
    / s? {return (l)=>{return l}}

l7
    = l6

l8
    = l7

l9
    = l8



s
    = " "+

literal
    = v:number {return v}
    / v:string {return v}
    / v:array {return v}
    / v:object {return v}

key
    = v:number {return Number(v)}
    / v:string {return v}

number
    = integer_part:[0-9]+ "." decimal_part:[0-9]+ { return resSwitch({type:"num",value:integer_part.join("")+"."+decimal_part.join("")},integer_part.join("")+"."+decimal_part.join("")) }
    / integer_part:[0-9]+ { return resSwitch({type:"num",value:integer_part.join("")},integer_part.join("")) }

string
    = "\"" content:([a-z]*) "\"" {return resSwitch({type:"str",value:content.join("")},`'${content.join("")}'`)}

name
    = content:([a-z]*) {return resSwitch({type:"name",value:content.join("")},content.join(""))}

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