mod nvglnodetype;
use js_sys::Object;
use nvglnodetype::*;

use std::str;
use peg::parser;
use colors_transform::*;
use serde::Serialize;

peg::parser! {
    pub grammar parser() for str {
        pub rule root() -> Vec<Node>
            = __ e:rootObj() ** __  __ {e}
        rule rootObj() -> Node
            = start:position!() "@includes" _ b:IncludesBlock() __ end:position!() { Node::Includes(IncludesNode{val:Box::new(b),pos:NodePos{start:start,end:end}}) }
            / start:position!() "@init" _ e:Block() __ end:position!() { Node::Init(InitNode{val:Box::new(e),pos:NodePos{start:start,end:end}}) }
            / start:position!() "@item" ___ i:key() _ e:Block() __ end:position!() { Node::Tmp() }
            / start:position!() "@obj" ___ i:key() _ startE:position!() "{" __ e:objObj() ** __ __ "}" endE:position!() __ end:position!() { Node::Tmp() }
            / start:position!() "@timeline" _ startE:position!() "{" __ e:TLObjStat() ** __ __ "}" endE:position!() __ end:position!() { Node::TLObj(TLObjNode{val:e,pos:NodePos{start:start,end:end}}) }
        rule objObj() -> Node
            = start:position!() "&init" _ e:Block() __ end:position!() { Node::Tmp() }
            / start:position!() "&length" _ e:Block() __ end:position!() { Node::Tmp() }
            / start:position!() "&tlelm" _ e:Block() __ end:position!() { Node::Tmp() }
            / start:position!() "&frame" _ e:Block() __ end:position!() { Node::Tmp() }
        rule TLObjStat() -> Node
            = start:position!() f:key() _ "("  __ a:objelm() ** (_ "," __) __ ");" end:position!() { Node::TLObjStat(TLObjStatNode{objname:Box::new(f),args:a,pos:NodePos{start:start,end:end}}) }
        rule Block() -> Node
            = start:position!() "{" __ e:(Stat()/Struct()) ** __  __ "}" end:position!() { Node::Block(BlockNode{stats:e,pos:NodePos{start:start,end:end}}) }
        rule IncludesBlock() -> Node
            = start:position!() "{" __ e:includeselm() ** (_ "," __) (",")? __ "}" end:position!() { Node::IncludesBlock(IncludesBlockNode{val:e,pos:NodePos{start:start,end:end}}) }
        rule includeselm() -> IncludesElmNode
            = start:position!() k:includekey() _ "as" _ v:key() end:position!() {IncludesElmNode{module:Node::Key(k),name:Box::new(v),pos:NodePos{start:start,end:end}}}
            / start:position!() k:includekey() end:position!() {IncludesElmNode{module:Node::Key(k.clone()),name:k.r,pos:NodePos{start:start,end:end}}}
        #[cache_left_rec]
        rule includekey() -> KeyNode
            = precedence! {
                start:position!() l:includekey() _ "::" _ r:key() end:position!() { KeyNode{l:Box::new(Node::Key(l)), r:Box::new(r),pos:NodePos{start:start,end:end}} }
                --
                b:key() start:position!() end:position!() { KeyNode{l:Box::new(Node::Scope()), r:Box::new(b),pos:NodePos{start:start,end:end}} }
            }
        rule Struct() -> Node
            = start:position!() "!if" _ c:expr() _ th:Block() endif:position!() __ v:ElseIfBlock() ** __ __ startelse:position!() "else" endelkw:position!() _ el:Block() end:position!() { let mut a = vec![IfElmNode{cond:c,block:th,pos:NodePos{start:start,end:endif}}];a.extend(v);a.push(IfElmNode{cond:Node::Bool(BoolNode{val:true,pos:NodePos{start:startelse,end:endelkw}}),block:el,pos:NodePos{start:startelse,end:end}});Node::If(IfNode{val:a,pos:NodePos{start:start,end:end}}) } // if elseif* else
            / start:position!() "!if" _ c:expr() _ th:Block() endif:position!() __ v:ElseIfBlock() ** __ __ end:position!() { let mut a = vec![IfElmNode{cond:c,block:th,pos:NodePos{start:start,end:endif}}];a.extend(v);Node::If(IfNode{val:a,pos:NodePos{start:start,end:end}}) } // if elseif*
            / start:position!() "!while" _ c:expr() _ th:Block() end:position!() { Node::Tmp() } // while
            / start:position!() "!times" _ c:expr() _ th:Block() end:position!() { Node::Tmp() } // times
            / b:Block() { Node::Tmp() }
        rule ElseIfBlock() -> IfElmNode
            = start:position!() ("elif"/"elseif"/"else if") _ c:expr() _ th:Block() end:position!() { IfElmNode{cond:c,block:th,pos:NodePos{start:start,end:end}} }
        rule Stat() -> Node
            = precedence! {
                start:position!() "!return" _ ";" end:position!() { Node::Tmp() }
                start:position!() "!break" _ ";" end:position!() { Node::Tmp() }
                start:position!() "!continue" _ ";" end:position!() { Node::Tmp() }
                start:position!() "!return" _ startE:position!() e:expr() endE:position!() _ ";" end:position!() { Node::ReturnStat(ReturnStatNode{expr:Box::new(e),pos:NodePos{start:start,end:end}})}
                start:position!() e:expr() _ ";" end:position!() { Node::Stat(StatNode{expr:Box::new(e),pos:NodePos{start:start,end:end}})}
                start:position!() lv:lval() _ "<:" _ e:expr() _ ";" end:position!() { Node::AStat(AStatNode{loc:Box::new(lv),expr:Box::new(e),pos:NodePos{start:start,end:end}}) }
                start:position!() e:expr() _ ":>" _ lv:lval() _ ";" end:position!() { Node::AStat(AStatNode{loc:Box::new(lv),expr:Box::new(e),pos:NodePos{start:start,end:end}}) }
                start:position!() lv:lval() _ "<::" _ val:multilineText() end:position!() { Node::MLTAStat(MLTAStatNode{loc:Box::new(lv),val:val,pos:NodePos{start:start,end:end}}) }
                start:position!() lv:lval() _ "<::" _ e:expr() _ val:multilineText() end:position!() { Node::PMLTAStat(PMLTAStatNode{loc:Box::new(lv),val:val,expr:Box::new(e),pos:NodePos{start:start,end:end}}) }
            }
        #[cache_left_rec]
        rule lval() -> Node
            = precedence! {
                start:position!() l:lval() _ "::" _ r:key() end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:lval() _ ":[" _ r:expr() "]" end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                b:key() start:position!() end:position!() { Node::Key(KeyNode{l:Box::new(Node::Scope()), r:Box::new(b),pos:NodePos{start:start,end:end}}) }
            }
        #[cache_left_rec]
        rule expr() -> Node = l9()
        #[cache_left_rec]
        rule l9() -> Node
            = precedence! {
                start:position!() l:l9() _ "&&" _ r:l8() end:position!() { Node::Opr(OprNode{opr:"&&".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l9() _ "||" _ r:l8() end:position!() { Node::Opr(OprNode{opr:"||".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("and"/"&&") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"&&".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("or"/"||") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"||".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l8() {c}
            }
        #[cache_left_rec]
        rule l8() -> Node
            = precedence! {
                start:position!() l:l8() _ "="   _ r:l7() end:position!() { Node::Opr(OprNode{opr:"=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l8() _ "=="  _ r:l7() end:position!() { Node::Opr(OprNode{opr:"==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l8() _ "!="  _ r:l7() end:position!() { Node::Opr(OprNode{opr:"!=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l8() _ "!==" _ r:l7() end:position!() { Node::Opr(OprNode{opr:"!==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("eq"/"=") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("equ"/"==") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("neq"/"!=") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"!=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("nequ"/"!==") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"!==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l7() {c}
            }
        #[cache_left_rec]
        rule l7() -> Node
            = precedence! {
                start:position!() l:l7() _ "<"  _ r:l6() end:position!() { Node::Opr(OprNode{opr:"<".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l7() _ "<=" _ r:l6() end:position!() { Node::Opr(OprNode{opr:"<=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l7() _ ">"  _ r:l6() end:position!() { Node::Opr(OprNode{opr:">".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l7() _ ">=" _ r:l6() end:position!() { Node::Opr(OprNode{opr:">=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("<"/"lt")_sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"<".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("<="/"le") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"<=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ (">"/"gt")_sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:">".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ (">="/"ge") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:">=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l6() {c}
            }
        #[cache_left_rec]
        rule l6() -> Node
            = precedence! {
                start:position!() l:l6() _ "+" _ r:l5() end:position!() { Node::Opr(OprNode{opr:"+".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l6() _ "-" _ r:l5() end:position!() { Node::Opr(OprNode{opr:"-".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("add"/"+") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"+".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("sub"/"-") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"-".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l5() {c}
            }
        #[cache_left_rec]
        rule l5() -> Node
            = precedence! {
                start:position!() l:l5() _ "*" _ r:l4() end:position!() { Node::Opr(OprNode{opr:"*".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l5() _ "/" _ r:l4() end:position!() { Node::Opr(OprNode{opr:"/".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l5() _ "%" _ r:l4() end:position!() { Node::Opr(OprNode{opr:"%".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("mul"/"*") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"*".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("div"/"/") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"/".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("mod"/"%") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"%".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l4() {c}
            }
        #[cache_left_rec]
        rule l4() -> Node
            = precedence! {
                start:position!() l:l3() _ "^" _ r:l4() end:position!() { Node::Opr(OprNode{opr:"^".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("pow"/"^") _sexpr() l:expr() _sexpr() r:expr() __ ")" end:position!() { Node::Opr(OprNode{opr:"^".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l3() {c}
            }
        #[cache_left_rec]
        rule l3() -> Node
            = precedence! {
                start:position!() _ "!" _ r:l3() end:position!() { Node::UOpr(UOprNode{opr:"!".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "+" _ r:l3() end:position!() { Node::UOpr(UOprNode{opr:"+".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "-" _ r:l3() end:position!() { Node::UOpr(UOprNode{opr:"-".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "√" _ r:l3() end:position!() { Node::UOpr(UOprNode{opr:"√".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("fac"/"!") _sexpr() r:expr() __ ")" end:position!() { Node::UOpr(UOprNode{opr:"!".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("plus"/"+") _sexpr() r:expr() __ ")" end:position!() { Node::UOpr(UOprNode{opr:"+".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("min"/"-") _sexpr() r:expr() __ ")" end:position!() { Node::UOpr(UOprNode{opr:"-".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() "\\(" _ ("sqr"/"√") _sexpr() r:expr() __ ")" end:position!() { Node::UOpr(UOprNode{opr:"√".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l2() {c}
            }
        rule l2() -> Node = l2_1()
        #[cache_left_rec]
        rule l2_1() -> Node
            = precedence! {
                start:position!() a1:l2_1() _ "->" _ f:l1() _ "(" __ a_:expr() ** (_ "," __) __ ")" end:position!() { let mut a = vec![a1];a.extend(a_);Node::FuncCall(FuncCallNode{func:Box::new(f),args:a,pos:NodePos{start:start,end:end}}) }
                c:l2_2() {c}
            }
        #[cache_left_rec]
        rule l2_2() -> Node
            = precedence! {
                start:position!() f:l2_2() _ "("  __ a:expr() ** (_ "," __) __ ")" end:position!() { Node::FuncCall(FuncCallNode{func:Box::new(f),args:a,pos:NodePos{start:start,end:end}}) }
                start:position!() f:l2_2() _ "@(" __ a:expr() ** (_ "," __) __ ")" end:position!() { Node::NewFuncCall(NewFuncCallNode{func:Box::new(f),args:a,pos:NodePos{start:start,end:end}}) }
                c:l1() {c}
            }
        #[cache_left_rec]
        rule l1() -> Node
            = precedence! {
                start:position!() l:l1() _ "::" _ r:key()      end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:l1() _ ":[" _ r:expr() "]" end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                c:l0() {c}
            }
        #[cache_left_rec]
        rule l0() -> Node
            = precedence! {
                "(" _ c:expr() _ ")" { c }
                n:literal() { n }
                i:var() { i }
            }
        rule literal() -> Node
            = start:position!() n:$(['0'..='9']+"."['0'..='9']+) end:position!() { Node::Number(NumberNode{val:n.parse().unwrap(),pos:NodePos{start:start,end:end}}) }
            / start:position!() n:$(['0'..='9']+) end:position!() { Node::Number(NumberNode{val:n.parse().unwrap(),pos:NodePos{start:start,end:end}}) }
            / start:position!() n:$("true") end:position!()  { Node::Bool(BoolNode{val:true,pos:NodePos{start:start,end:end}}) }
            / start:position!() n:$("false") end:position!()  { Node::Bool(BoolNode{val:false,pos:NodePos{start:start,end:end}}) }
            / start:position!() "\"" s:$((("\\\"")/[^'\"'])*) "\"" end:position!() { Node::String(StringNode{val:s.to_string(),pos:NodePos{start:start,end:end}}) }
            / start:position!() c:colorLiteral() end:position!() { Node::String(StringNode{val:c,pos:NodePos{start:start,end:end}}) }
            / start:position!() "{" __ e:expr() ** (_ "," __) (",")? __ "}" end:position!() { Node::Array(ArrayNode{val:e,pos:NodePos{start:start,end:end}}) }
            / start:position!() "{" __ e:objelm() ** (_ "," __) (",")? __ "}" end:position!() { Node::Object(ObjNode{val:e,pos:NodePos{start:start,end:end}}) }
        rule colorLiteral() -> String
            = c:colorCode() {c}
        rule colorCode() -> String
            = "#" d1:$(colorcodeD2()) d2:$(colorcodeD2()) d3:$(colorcodeD2()) d4:$(colorcodeD2()) {format!("{}{}{}{}",d1,d2,d3,d4)}
            / "#" d1:$(colorcodeD2()) d2:$(colorcodeD2()) d3:$(colorcodeD2()) {format!("{}{}{}FF",d1,d2,d3)}
            / "#" d1:$(colorcodeD1()) d2:$(colorcodeD1()) d3:$(colorcodeD1()) d4:$(colorcodeD1()) {format!("{}{}{}{}{}{}{}{}",d1,d1,d2,d2,d3,d3,d4,d4)}
            / "#" d1:$(colorcodeD1()) d2:$(colorcodeD1()) d3:$(colorcodeD1()) {format!("{}{}{}{}{}{}FF",d1,d1,d2,d2,d3,d3)}
        rule colorcodeD1() = (['0'..='9']/['a'..='f']/['A'..='F'])
        rule colorcodeD2() -> String
            = d:$(colorcodeD1() colorcodeD1()) {d.to_string()}
        rule objelm() -> ObjElmNode
            = start:position!() k:expr() _ ":" _ v:expr() end:position!() {ObjElmNode{key:k,val:v,pos:NodePos{start:start,end:end}}}
        rule var() -> Node
            = start:position!() s:$(((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*)/"~") end:position!() { Node::Id(IdNode{val:s.to_string(),pos:NodePos{start:start,end:end}}) }
        rule key() -> Node
            = start:position!() s:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::Id(IdNode{val:s.to_string(),pos:NodePos{start:start,end:end}}) }
        rule multilineText() -> String
            = "\n" _ ":" val:$([^'\n']+) ** ("\n" _ ":") {val.join("\n")}
        rule lineComment()
            = quiet!{ "#" [^'\n']+ }
        rule blockComment()
            = quiet!{ "#*" $(!"*#" ([_]/"\n"))* "*#" }
        rule _() // space
            = quiet!{ " "* }
        rule ___() // space needed
            = quiet!{ " "+ }
        rule __() // space | LF | comment
            = quiet!{ ( "\n" / " " / blockComment() / lineComment())* }
        rule _sexpr() // space | LF | comment needed
            = quiet!{ ( "\n" / " " ) ( "\n" / " " / blockComment() / lineComment())* }
    }
}


#[derive(Debug,Serialize,Clone)]
pub struct ErrorMessage {
    pub location: Location,
    pub expected: String,
}
#[derive(Debug,Serialize,Clone)]
pub struct Location {
    pub line: usize,
    pub column: usize,
    pub offset: usize,
}

#[derive(Debug,Serialize,Clone)]
pub struct OkResult {
    pub isOk: bool,
    pub res: Vec<Node>,
}
#[derive(Debug,Serialize,Clone)]
pub struct ErrResult {
    pub isOk: bool,
    pub res: ErrorMessage,
}

pub fn parseNVGL(input: &str) -> String {
    match parser::root(input) {
        Ok(val) =>{
            return serde_json::to_string(&OkResult{isOk:true,res:val}).unwrap();
        }
        Err(err) =>{
            let expstr = format!("{:?}", err.expected);
            let errmsg = ErrorMessage {
                location: Location {
                    line: err.location.line,
                    column: err.location.column,
                    offset: err.location.offset,
                },
                expected: expstr[25..expstr.len()-3].to_string(),
            };
            return serde_json::to_string(&ErrResult{isOk:false,res:errmsg}).unwrap();
        }
    }
}