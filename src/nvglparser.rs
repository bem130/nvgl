mod nvglnodetype;
use nvglnodetype::*;

use std::str;
use peg::parser;
use colors_transform::*;
use serde::Serialize;

peg::parser! {
    pub grammar parser() for str {
        pub rule stat() -> Node
            = start:position!() "return" _ startE:position!() e:expr() endE:position!() _ ";" end:position!() { Node::ReturnStat(ReturnStatNode{expr:Box::new(e),pos:NodePos{start:start,end:end}})}
            / start:position!() e:expr() _ ";" end:position!() { Node::Stat(StatNode{expr:Box::new(e),pos:NodePos{start:start,end:end}})}
            / start:position!() lv:lval() _ "<:" _ e:expr() _ ";" end:position!() { Node::AssignStat(AssignStatNode{loc:Box::new(lv),expr:Box::new(e),pos:NodePos{start:start,end:end}}) }
            / start:position!() e:expr() _ ":>" _ lv:lval() _ ";" end:position!() { Node::AssignStat(AssignStatNode{loc:Box::new(lv),expr:Box::new(e),pos:NodePos{start:start,end:end}}) }
        #[cache_left_rec]
        pub rule lval() -> Node
            = precedence! {
                start:position!() l:lval() _ "::" _ r:key() end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:lval() _ ":[" _ r:expr() "]" end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                b:key() start:position!() end:position!() { Node::Key(KeyNode{l:Box::new(Node::Scope()), r:Box::new(b),pos:NodePos{start:start,end:end}}) }
            }
        #[cache_left_rec]
        rule expr() -> Node
            = precedence! {
                start:position!() l:expr() _ "&&" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"&&".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "||" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"||".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "=" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "==" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "!=" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"!=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "!==" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"!==".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "<" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"<".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "<=" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"<=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ ">" _ r:expr() end:position!() { Node::Opr(OprNode{opr:">".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ ">=" _ r:expr() end:position!() { Node::Opr(OprNode{opr:">=".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "+" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"+".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "-" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"-".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "*" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"*".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "/" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"/".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "%" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"%".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "^" _ r:expr() end:position!() { Node::Opr(OprNode{opr:"^".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() _ "!" _ r:expr() end:position!() { Node::UOpr(UOprNode{opr:"!".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "+" _ r:expr() end:position!() { Node::UOpr(UOprNode{opr:"+".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "-" _ r:expr() end:position!() { Node::UOpr(UOprNode{opr:"-".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() _ "√" _ r:expr() end:position!() { Node::UOpr(UOprNode{opr:"√".to_string(),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
                start:position!() l:expr() _ "::" _ r:key() end:position!() { Node::Key(KeyNode{l:Box::new(l), r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ ":[" _ r:expr() "]" end:position!() { Node::Opr(OprNode{opr:":[]".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "(" _ r:expr() ")" end:position!() { Node::Opr(OprNode{opr:"()".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                start:position!() l:expr() _ "expr()(" _ r:expr() ")" end:position!() { Node::Opr(OprNode{opr:"expr()()".to_string(),l:Box::new(l),r:Box::new(r),pos:NodePos{start:start,end:end}}) }
                --
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
        rule var() -> Node
            = start:position!() i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::Var(VarNode{val:i.to_string(),pos:NodePos{start:start,end:end}}) }
        rule key() -> Node
            = start:position!() s:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::String(StringNode{val:s.to_string(),pos:NodePos{start:start,end:end}}) }
        rule _()
            = quiet!{ " "* }
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
    pub res: Node,
}
#[derive(Debug,Serialize,Clone)]
pub struct ErrResult {
    pub isOk: bool,
    pub res: ErrorMessage,
}

pub fn parseNVGL(input: &str) -> String {
    match parser::stat(input) {
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