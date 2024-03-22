use wasm_bindgen::prelude::*;
use std::str;
use serde::Serialize;

fn _debug(text: String) {
    web_sys::console::log_1(&JsValue::from(text));
}

#[derive(Debug,Serialize,Clone)]
pub enum Node {
    // literal type
    Number(f64,usize,usize),
    Bool(bool,usize,usize),
    String(String,usize,usize),
    // identifier
    Var(String,usize,usize),
    Key(Box<Node>,String,usize,usize),
    // operation
    Opr(String,Box<Node>,Box<Node>,usize,usize),
    UOpr(String,Box<Node>,usize,usize),
    // expression
    Expr(Box<Node>,usize,usize),
    // statement
    Stat(Box<Node>,Box<Node>,usize,usize),
    Null(),
    Scope(),
}
peg::parser! {
    grammar parser() for str {
        pub rule stat() -> Node
            = start:position!() "return" _ startE:position!() e:expr() endE:position!() _ ";" end:position!() { Node::Stat(Box::new(Node::Null()),Box::new(Node::Expr(Box::new(e),startE,endE)),start,end) }
            / start:position!() startE:position!() e:expr() endE:position!() _ ";" end:position!() { Node::Stat(Box::new(Node::Null()),Box::new(Node::Expr(Box::new(e),startE,endE)),start,end) }
            / start:position!() lv:lval() _ "<:" _ startE:position!() e:expr() endE:position!() _ ";" end:position!() { Node::Stat(Box::new(lv),Box::new(Node::Expr(Box::new(e),startE,endE)),start,end) }
            / start:position!() startE:position!() e:expr() endE:position!() _ ":>" _ lv:lval() _ ";" end:position!() { Node::Stat(Box::new(lv),Box::new(Node::Expr(Box::new(e),startE,endE)),start,end) }
        #[cache_left_rec]
        pub rule lval() -> Node
            = precedence! {
                start:position!() l:lval() _ "::" _ r:key() end:position!() { Node::Key(Box::new(l), r,start,end) }
                --
                b:key() start:position!() end:position!() { Node::Key(Box::new(Node::Scope()),b,start,end) }
            }
        #[cache_left_rec]
        rule expr() -> Node
            = precedence! {
                start:position!() l:expr() _ "&&" _ r:expr() end:position!() { Node::Opr("&&".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "||" _ r:expr() end:position!() { Node::Opr("||".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "=" _ r:expr() end:position!() { Node::Opr("=".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "==" _ r:expr() end:position!() { Node::Opr("==".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "!=" _ r:expr() end:position!() { Node::Opr("!=".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "!==" _ r:expr() end:position!() { Node::Opr("!==".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "<" _ r:expr() end:position!() { Node::Opr("<".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "<=" _ r:expr() end:position!() { Node::Opr("<=".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ ">" _ r:expr() end:position!() { Node::Opr(">".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ ">=" _ r:expr() end:position!() { Node::Opr(">=".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "+" _ r:expr() end:position!() { Node::Opr("+".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "-" _ r:expr() end:position!() { Node::Opr("-".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "*" _ r:expr() end:position!() { Node::Opr("*".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "/" _ r:expr() end:position!() { Node::Opr("/".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "%" _ r:expr() end:position!() { Node::Opr("%".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "^" _ r:expr() end:position!() { Node::Opr("^".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                start:position!() _ "!" _ r:expr() end:position!() { Node::UOpr("!".to_string(), Box::new(r),start,end) }
                start:position!() _ "+" _ r:expr() end:position!() { Node::UOpr("+".to_string(), Box::new(r),start,end) }
                start:position!() _ "-" _ r:expr() end:position!() { Node::UOpr("-".to_string(), Box::new(r),start,end) }
                start:position!() _ "√" _ r:expr() end:position!() { Node::UOpr("√".to_string(), Box::new(r),start,end) }
                --
                start:position!() l:expr() _ "::" _ r:key() end:position!() { Node::Key(Box::new(l), r,start,end) }
                start:position!() l:expr() _ ":[" _ r:expr() "]" end:position!() { Node::Opr(":[]".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "(" _ r:expr() ")" end:position!() { Node::Opr("()".to_string(),Box::new(l), Box::new(r),start,end) }
                start:position!() l:expr() _ "expr()(" _ r:expr() ")" end:position!() { Node::Opr("expr()()".to_string(),Box::new(l), Box::new(r),start,end) }
                --
                "(" _ c:expr() _ ")" { c }
                n:literal() { n }
                i:var() { i }
            }
        rule literal() -> Node
            = start:position!() n:$(['0'..='9']+"."['0'..='9']+) end:position!() { Node::Number(n.parse().unwrap(),start,end) }
            / start:position!() n:$(['0'..='9']+) end:position!() { Node::Number(n.parse().unwrap(),start,end) }
            / start:position!() n:$("true") end:position!()  { Node::Bool(true,start,end) }
            / start:position!() n:$("false") end:position!()  { Node::Bool(false,start,end) }
            / start:position!() "\"" s:$((("\\\"")/[^'\"'])*) "\"" end:position!() { Node::String(s.to_string(),start,end) }
        rule var() -> Node
            = start:position!() i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { Node::Var(i.to_string(),start,end) }
        rule key() -> String
            = start:position!() i:$((['a'..='z'|'A'..='X']/"_")(['0'..='9'|'a'..='z'|'A'..='X']/"_")*) end:position!() { i.to_string() }
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