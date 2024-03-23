use wasm_bindgen::prelude::*;
use std::str;
use serde::Serialize;

fn _debug(text: String) {
    web_sys::console::log_1(&JsValue::from(text));
}

#[derive(Debug,Serialize,Clone)]
pub enum Node {
    // literal type
    Number(NumberNode),
    Bool(BoolNode),
    String(StringNode),
    // identifier
    Var(VarNode),
    Key(KeyNode),
    // operation
    Opr(OprNode),
    UOpr(UOprNode),
    // statement
    Stat(StatNode),
    AssignStat(AssignStatNode),
    ReturnStat(ReturnStatNode),
    Scope(),
}

#[derive(Debug,Serialize,Clone)]
pub struct NumberNode {
    val: f64,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct BoolNode {
    val: bool,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct StringNode {
    val: String,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct VarNode {
    val: String,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct KeyNode {
    l: Box<Node>,
    r: Box<Node>,
    pos: NodePos,
}

#[derive(Debug,Serialize,Clone)]
pub struct OprNode {
    opr: String,
    l: Box<Node>,
    r: Box<Node>,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct UOprNode {
    opr: String,
    r: Box<Node>,
    pos: NodePos,
}

#[derive(Debug,Serialize,Clone)]
pub struct ExprNode {
    expr: Box<Node>,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct StatNode {
    expr: Box<Node>,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct AssignStatNode {
    loc: Box<Node>,
    expr: Box<Node>,
    pos: NodePos,
}
#[derive(Debug,Serialize,Clone)]
pub struct ReturnStatNode {
    expr: Box<Node>,
    pos: NodePos,
}


#[derive(Debug,Serialize,Clone)]
pub struct NodePos {
    start: usize,
    end: usize,
}

peg::parser! {
    grammar parser() for str {
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
        rule var() -> Node
            = start:position!() i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::Var(VarNode{val:i.to_string(),pos:NodePos{start:start,end:end}}) }
        rule key() -> Node
            = start:position!() s:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::String(StringNode{val:s.to_string(),pos:NodePos{start:start,end:end}}) }
        rule _()
            = quiet!{ " "* }
    }
}

#[wasm_bindgen(js_name=Parse1)]
pub fn export_parse(input: &str) -> JsValue {
    match parser::stat(input) {
        Ok(val) =>{
            return JsValue::from(serde_json::to_string(&val).unwrap());
        }
        Err(err) =>{
            return JsValue::from(&format!("{:?}", err));
        }
    }
}

#[wasm_bindgen(js_name=Parse2)]
pub fn export_parse2(input: &str) -> JsValue {
    match parser::stat(input) {
        Ok(val) =>{
            //debug(format!("Done {:?}", val));
            return JsValue::from(&format!("{:?}", val));
        }
        Err(err) =>{
            //debug(format!("Err  {:?}", err));
            return JsValue::from(&format!("{:?}", err));
        }
    }
}